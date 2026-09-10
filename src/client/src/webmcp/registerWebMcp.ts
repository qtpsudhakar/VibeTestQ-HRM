import {isWebMcpEnabled} from './core/toolGuards';
import {ensureModelContext} from './core/modelContextPolyfill';
import {
  executeRegisteredTool,
  getRegisteredToolNames,
  registerTools,
} from './core/toolRegistry';
import {
  isToolAllowed,
  resolveAllowedModules,
  WebMcpModule,
} from './core/permissionPolicy';
import {getAdminReadTools} from './tools/adminReadTools';
import {getAdminWriteTools} from './tools/adminWriteTools';
import {getReadTools} from './tools/readTools';
import {getWriteTools} from './tools/writeTools';
import {clearToolAuditLogs, getToolAuditLogs} from './core/auditLogger';

export interface WebMcpBootstrapContext {
  /** `:topbar-menu-items` value rendered into the page by the backend. */
  topMenu?: unknown;
  /** `:sidepanel-menu-items` value rendered into the page by the backend. */
  sideMenu?: unknown;
  /** `:user` value; used only to confirm a user is logged in. */
  user?: {firstName?: string} | null;
}

const attachWebMcpDebugApi = (allowedModules: Set<WebMcpModule>): void => {
  window.webmcp = {
    tools: () => getRegisteredToolNames(),
    modules: () => Array.from(allowedModules),
    executeTool: (toolName: string, args: Record<string, unknown> = {}) =>
      executeRegisteredTool(toolName, args),
    auditLogs: () => getToolAuditLogs(),
    clearAuditLogs: () => clearToolAuditLogs(),
  };
};

const hasLoggedInUser = (context: WebMcpBootstrapContext): boolean =>
  Boolean(context.user && context.user.firstName);

/**
 * Register the WebMCP tools the current user is allowed to use.
 * No-op (returns 0) when the feature flag is off or no user is logged in.
 */
export const registerWebMcpTools = (
  context: WebMcpBootstrapContext = {},
): number => {
  if (!isWebMcpEnabled() || !hasLoggedInUser(context)) {
    return 0;
  }

  ensureModelContext();

  const allowedModules = resolveAllowedModules(
    context.topMenu,
    context.sideMenu,
  );

  const tools = [
    ...getReadTools(),
    ...getWriteTools(),
    ...getAdminReadTools(),
    ...getAdminWriteTools(),
  ].filter((tool) => isToolAllowed(tool.name, allowedModules));

  const registeredCount = registerTools(tools);
  attachWebMcpDebugApi(allowedModules);
  return registeredCount;
};
