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

type ToolUiEventDetail = {
  toolName: string;
  success: boolean;
  message: string;
  errorCode?: string;
  navigatedTo?: string;
};

/**
 * Optional: after a successful tool call, move the OrangeHRM tab to the screen
 * that reflects the change. Off by default because a full-page navigation resets
 * the app; enable per browser with `localStorage.WEBMCP_NAVIGATE = 'true'`.
 */
const TOOL_NAVIGATION_ROUTES: Record<string, string> = {
  create_employee: '/pim/viewEmployeeList',
  apply_leave: '/leave/viewMyLeaveList',
  approve_leave_request: '/leave/viewLeaveList',
  submit_timesheet: '/time/viewEmployeeTimesheet',
  shortlist_candidate: '/recruitment/viewCandidates',
  create_job_title: '/admin/viewJobTitleList',
  create_job_category: '/admin/jobCategory',
  create_employment_status: '/admin/employmentStatus',
  create_location: '/admin/viewLocations',
  create_pay_grade: '/admin/viewPayGrades',
  create_system_user: '/admin/viewSystemUsers',
};

const isNavigationEnabled = (): boolean => {
  try {
    return localStorage.getItem('WEBMCP_NAVIGATE') === 'true';
  } catch {
    return false;
  }
};

const getBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  const globalWindow = window as Window & {appGlobal?: {baseUrl?: string}};
  return globalWindow.appGlobal?.baseUrl || '';
};

const navigateForTool = (toolName: string): string | undefined => {
  if (typeof window === 'undefined' || !isNavigationEnabled()) {
    return undefined;
  }
  const route = TOOL_NAVIGATION_ROUTES[toolName];
  if (!route) {
    return undefined;
  }
  const target = `${getBaseUrl()}${route}`;
  if (window.location.href.startsWith(target)) {
    return undefined;
  }
  window.location.assign(target);
  return target;
};

const emitToolUiEvent = (detail: ToolUiEventDetail): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent('webmcp:tool-result', {detail}));
};

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
      const navigatedTo = result.success
        ? navigateForTool(tool.name)
        : undefined;
      emitToolUiEvent({
        toolName: tool.name,
        success: result.success,
        message: result.message,
        errorCode: result.errorCode,
        navigatedTo,
      });
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
 */
export const registerTools = (tools: ModelContextToolDefinition[]): number => {
  const modelContext = getModelContext();

  tools.forEach((tool) => {
    const wrappedExecute = wrapExecutor(tool);
    toolExecutors.set(tool.name, wrappedExecute);
    modelContext?.registerTool({...tool, execute: wrappedExecute});
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
