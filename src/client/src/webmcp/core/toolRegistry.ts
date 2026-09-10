import {
  ModelContext,
  ModelContextAgent,
  ModelContextToolDefinition,
  ToolResult,
} from './modelContext.types';
import {fail} from './toolResponse';
import {validateInputs} from './toolSchemas';
import {appendToolAuditLog} from './auditLogger';
import {WebMcpApiError} from './apiClient';

type ToolExecutor = (
  args: Record<string, unknown>,
  agent?: ModelContextAgent,
) => Promise<unknown>;

const toolExecutors = new Map<string, ToolExecutor>();

const getModelContext = (): ModelContext | null => {
  const navigatorWithModelContext = navigator as Navigator & {
    modelContext?: ModelContext;
  };
  return navigatorWithModelContext.modelContext || null;
};

const wrapExecutor = (tool: ModelContextToolDefinition): ToolExecutor => {
  return async (args: Record<string, unknown>, agent?: ModelContextAgent) => {
    const startedAt = new Date();

    const finish = (result: ToolResult): ToolResult => {
      const finishedAt = new Date();
      appendToolAuditLog({
        toolName: tool.name,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        success: result.success,
        errorCode: result.errorCode,
        input: args,
      });
      return result;
    };

    const validationError = validateInputs(args, tool.inputSchema ?? {});
    if (validationError) {
      return finish(validationError);
    }

    try {
      const result = (await tool.execute(args, agent)) as ToolResult;
      return finish(result ?? {success: true, message: 'Tool executed'});
    } catch (error) {
      if (error instanceof WebMcpApiError) {
        return finish(fail(error.message, error.errorCode) as ToolResult);
      }
      const message =
        error instanceof Error ? error.message : 'Unexpected tool error';
      return finish(fail(message, 'WEBMCP_EXECUTION_ERROR') as ToolResult);
    }
  };
};

/**
 * Register tool definitions. The internal executor map is always populated (so
 * `window.webmcp.executeTool` works for manual testing); when a
 * `navigator.modelContext` provider is present, tools are also registered with
 * it for external agents.
 *
 * Pass `{ signal }` for page-scoped tools: aborting it removes them from both
 * the executor map and the provider.
 */
export const registerTools = (
  tools: ModelContextToolDefinition[],
  options: {signal?: AbortSignal} = {},
): number => {
  const modelContext = getModelContext();

  tools.forEach((tool) => {
    const wrappedExecute = wrapExecutor(tool);
    toolExecutors.set(tool.name, wrappedExecute);
    options.signal?.addEventListener('abort', () => {
      toolExecutors.delete(tool.name);
    });
    modelContext?.registerTool(
      {...tool, execute: wrappedExecute},
      {signal: options.signal},
    );
  });

  return tools.length;
};

export const executeRegisteredTool = async (
  toolName: string,
  args: Record<string, unknown>,
  agent?: ModelContextAgent,
): Promise<unknown> => {
  const executor = toolExecutors.get(toolName);
  if (!executor) {
    return fail(
      `Tool '${toolName}' is not registered`,
      'WEBMCP_TOOL_NOT_FOUND',
    );
  }
  return executor(args, agent);
};

export const getRegisteredToolNames = (): string[] => {
  return Array.from(toolExecutors.keys());
};

/** Test helper — clears registered executors. */
export const resetToolRegistry = (): void => {
  toolExecutors.clear();
};
