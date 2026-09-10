/**
 * WebMCP provider detection.
 *
 * The `modelContext` object is provided by the browser (Chrome behind
 * `chrome://flags/#webmcp-for-testing`, later an origin trial). It moved from
 * `navigator.modelContext` (early drafts, deprecated) to `document.modelContext`
 * (21 July 2026 draft onward), so we check both. We never fabricate it — if the
 * browser has no WebMCP support, nothing registers, exactly as with any other
 * unsupported web API.
 */
import {ModelContext} from './modelContext.types';

const at = (scope: unknown): ModelContext | undefined =>
  (scope as {modelContext?: ModelContext} | undefined)?.modelContext;

/** Every distinct browser-provided `modelContext` (document preferred). */
export const getModelContextProviders = (): ModelContext[] => {
  const doc = typeof document === 'undefined' ? undefined : at(document);
  const nav = typeof navigator === 'undefined' ? undefined : at(navigator);

  const providers: ModelContext[] = [];
  if (doc) {
    providers.push(doc);
  }
  if (nav && nav !== doc) {
    providers.push(nav);
  }
  return providers;
};

export const hasModelContext = (): boolean =>
  getModelContextProviders().length > 0;
