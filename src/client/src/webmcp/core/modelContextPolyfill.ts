/**
 * Minimal `navigator.modelContext` provider.
 *
 * WebMCP-capable browsers / extensions (e.g. MCP-B) inject a real
 * `navigator.modelContext` at document start. When one is already present we
 * leave it alone. When it is not, we install this local implementation so that:
 *   - `registerTool()` is callable and keeps a list of tool definitions, and
 *   - a page script / manual tester can enumerate and invoke them
 *     (`window.webmcp.*`, backed by the tool registry).
 *
 * This local implementation does not expose a transport to an external agent on
 * its own — that requires a WebMCP browser extension. It exists so the tool
 * layer behaves identically with or without one.
 */
import {ModelContext, ModelContextToolDefinition} from './modelContext.types';

interface RegisteredEntry {
  tool: ModelContextToolDefinition;
  signal?: AbortSignal;
}

export interface LocalModelContext extends ModelContext {
  readonly isWebMcpPolyfill: true;
  listTools: () => ModelContextToolDefinition[];
}

const createLocalModelContext = (): LocalModelContext => {
  const entries = new Map<string, RegisteredEntry>();

  return {
    isWebMcpPolyfill: true,
    registerTool: (tool, options) => {
      entries.set(tool.name, {tool, signal: options?.signal});
      options?.signal?.addEventListener('abort', () =>
        entries.delete(tool.name),
      );
    },
    listTools: () => Array.from(entries.values()).map((entry) => entry.tool),
  };
};

/**
 * Ensure `navigator.modelContext` exists. Returns true when this call installed
 * the local implementation, false when a provider was already present.
 */
export const ensureModelContext = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const nav = navigator as Navigator & {modelContext?: ModelContext};
  if (nav.modelContext) {
    return false;
  }

  try {
    Object.defineProperty(nav, 'modelContext', {
      value: createLocalModelContext(),
      configurable: true,
      writable: true,
    });
  } catch {
    (nav as {modelContext?: ModelContext}).modelContext =
      createLocalModelContext();
  }
  return true;
};
