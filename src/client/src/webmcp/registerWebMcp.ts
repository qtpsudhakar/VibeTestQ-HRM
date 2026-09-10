import {hasModelContext} from './core/provider';
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
import {getNavigatorTools} from './tools/navigatorTools';
import {getReferenceTools} from './tools/referenceTools';
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
 * Register the GLOBAL WebMCP tools — navigation and reference-data reads — that
 * the current user's menu allows. Page components register their own
 * screen-scoped tools via the `webMcpTools()` option (see useWebMcp.ts).
 *
 * Registers with the provider only when the browser exposes a `modelContext`.
 */
export const registerWebMcpTools = (
  context: WebMcpBootstrapContext = {},
): number => {
  const allowedModules = resolveAllowedModules(
    context.topMenu,
    context.sideMenu,
  );
  attachWebMcpDebugApi(allowedModules);

  if (!hasModelContext() || !hasLoggedInUser(context)) {
    return 0;
  }

  const tools = [...getNavigatorTools(), ...getReferenceTools()].filter(
    (tool) => isToolAllowed(tool.name, allowedModules),
  );

  return registerTools(tools);
};
