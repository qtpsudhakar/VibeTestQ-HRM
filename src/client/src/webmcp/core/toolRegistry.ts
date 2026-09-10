import {
  ModelContextAgent,
  ModelContextToolDefinition,
  ToolResult,
} from './modelContext.types';
import {fail} from './toolResponse';
import {validateInputs} from './toolSchemas';
import {appendToolAuditLog} from './auditLogger';
import {WebMcpApiError} from './apiClient';
import {getModelContextProviders} from './provider';

type ToolExecutor = (
  args: Record<string, unknown>,
  agent?: ModelContextAgent,
) => Promise<ToolResult>;

const toolExecutors = new Map<string, ToolExecutor>();

/** Wrap a ToolResult into the MCP content shape the agent expects. */
const toMcpResult = (result: ToolResult) => {
  const text =
    result.data === undefined
      ? result.message
      : `${result.message}\n${JSON.stringify(result.data)}`;
  return {
    content: [{type: 'text', text}],
    isError: !result.success,
    structuredContent: result.data,
  };
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
 * Register tool definitions with the browser's `modelContext` provider(s).
 * No-op for provider registration when the browser has no WebMCP support; the
 * internal executor map is still populated so `window.webmcp.executeTool` works
 * for local inspection.
 *
 * Pass `{ signal }` for page-scoped tools — aborting it removes them.
 */
export const registerTools = (
  tools: ModelContextToolDefinition[],
  options: {signal?: AbortSignal} = {},
): number => {
  const providers = getModelContextProviders();

  tools.forEach((tool) => {
    const wrappedExecute = wrapExecutor(tool);
    toolExecutors.set(tool.name, wrappedExecute);
    options.signal?.addEventListener('abort', () => {
      toolExecutors.delete(tool.name);
    });

    const descriptor = {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
      execute: async (args: Record<string, unknown>) =>
        toMcpResult(await wrappedExecute(args)),
    };

    providers.forEach((provider) => {
      try {
        const maybePromise = provider.registerTool(descriptor, {
          signal: options.signal,
        });
        if (
          maybePromise &&
          typeof (maybePromise as Promise<unknown>).then === 'function'
        ) {
          (maybePromise as Promise<unknown>).catch(() => undefined);
        }
      } catch {
        // provider rejected the descriptor — nothing else to do
      }
    });
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
