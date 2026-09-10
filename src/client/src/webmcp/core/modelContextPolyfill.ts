/**
 * `modelContext` provider resolution + a local fallback.
 *
 * The WebMCP object moved from `navigator.modelContext` (earlier drafts / Chrome
 * 146-149, now deprecated) to `document.modelContext` (21 July 2026 draft /
 * Chrome 150+). Extensions read one or the other. So we:
 *   - use a native provider on `document` or `navigator` if either exists;
 *   - otherwise install one local instance and expose it at BOTH locations, so
 *     an extension or in-page agent finds it wherever it looks.
 *
 * The local instance also honours `{ signal }` for removal, exposes
 * `getTools()`, and fires `toolchange` when the set changes (so an agent
 * re-reads the list after a navigation swaps page-scoped tools).
 */
import {ModelContext, ModelContextToolDefinition} from './modelContext.types';

interface RegisteredEntry {
  tool: ModelContextToolDefinition;
  signal?: AbortSignal;
}

export interface LocalModelContext extends ModelContext, EventTarget {
  readonly isWebMcpPolyfill: true;
  getTools: () => ModelContextToolDefinition[];
}

type MaybeHost = {modelContext?: ModelContext};

const docHost = (): MaybeHost | null =>
  typeof document === 'undefined' ? null : (document as unknown as MaybeHost);
const navHost = (): MaybeHost | null =>
  typeof navigator === 'undefined' ? null : (navigator as unknown as MaybeHost);

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
  });
};

const define = (host: MaybeHost, value: ModelContext): void => {
  try {
    Object.defineProperty(host, 'modelContext', {
      value,
      configurable: true,
      writable: true,
    });
  } catch {
    host.modelContext = value;
  }
};

/**
 * Every distinct `modelContext` a browser/extension has exposed. When none
 * exists, install one local fallback at BOTH `document` and `navigator` and
 * return it — so whichever location an agent reads, it finds the tools.
 * Tools are registered with all of these.
 */
export const resolveModelContexts = (): ModelContext[] => {
  const doc = docHost();
  const nav = navHost();

  const found: ModelContext[] = [];
  if (doc?.modelContext) {
    found.push(doc.modelContext);
  }
  if (nav?.modelContext && nav.modelContext !== doc?.modelContext) {
    found.push(nav.modelContext);
  }
  if (found.length > 0) {
    return found;
  }
  if (!doc && !nav) {
    return [];
  }

  const local = createLocalModelContext();
  if (doc) {
    define(doc, local);
  }
  if (nav) {
    define(nav, local);
  }
  return [local];
};

/** Primary provider (prefers `document.modelContext`); installs the fallback. */
export const resolveModelContext = (): ModelContext | null =>
  resolveModelContexts()[0] ?? null;

/** @deprecated kept for callers that only need the side effect */
export const ensureModelContext = (): boolean =>
  resolveModelContexts().length > 0;
