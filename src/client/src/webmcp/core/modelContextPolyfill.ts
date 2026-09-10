/**
 * Minimal `navigator.modelContext` provider.
 *
 * WebMCP-capable browsers / extensions (e.g. MCP-B) inject a real
 * `navigator.modelContext` at document start. When one is already present we
 * leave it alone. When it is not, we install this local implementation so that:
 *   - `registerTool()` is callable and honours `{ signal }` for removal,
 *   - `getTools()` enumerates what is currently registered,
 *   - a `toolchange` event fires whenever the set changes (so an in-page agent
 *     re-reads the list after a navigation swaps page-scoped tools), and
 *   - `window.webmcp.*` (backed by the registry) can drive tools for testing.
 *
 * It does not expose a transport to an external agent on its own — that needs a
 * WebMCP browser extension. It exists so the tool layer behaves the same with or
 * without one.
 */
import {ModelContext, ModelContextToolDefinition} from './modelContext.types';

interface RegisteredEntry {
  tool: ModelContextToolDefinition;
  signal?: AbortSignal;
}

export interface LocalModelContext extends ModelContext, EventTarget {
  readonly isWebMcpPolyfill: true;
  getTools: () => ModelContextToolDefinition[];
  /** @deprecated use getTools */
  listTools: () => ModelContextToolDefinition[];
}

const createLocalModelContext = (): LocalModelContext => {
  const entries = new Map<string, RegisteredEntry>();
  const target = new EventTarget();
  const emitChange = () => target.dispatchEvent(new Event('toolchange'));

  const getTools = () =>
    Array.from(entries.values()).map((entry) => entry.tool);

  return Object.assign(target, {
    isWebMcpPolyfill: true as const,
    registerTool: (
      tool: ModelContextToolDefinition,
      options?: {signal?: AbortSignal},
    ) => {
      entries.set(tool.name, {tool, signal: options?.signal});
      options?.signal?.addEventListener('abort', () => {
        entries.delete(tool.name);
        emitChange();
      });
      emitChange();
    },
    getTools,
    listTools: getTools,
  });
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
