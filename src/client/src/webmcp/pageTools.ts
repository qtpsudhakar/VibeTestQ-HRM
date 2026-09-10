/**
 * Single import surface for page components that declare `webMcpTools()`.
 * Keeps the per-component footprint to one import line.
 */
export {ok, fail} from './core/toolResponse';
export {requestConfirmation} from './core/toolGuards';
export type {WebMcpTool} from './useWebMcp';
export type {ToolResult} from './core/modelContext.types';

/**
 * Copy only the provided keys from `args` onto `target` (skips undefined/null),
 * for pushing agent input into a component's reactive form model.
 */
export const applyFields = <T extends Record<string, unknown>>(
  target: T,
  args: Record<string, unknown>,
  keys: (keyof T)[],
): void => {
  keys.forEach((key) => {
    const value = args[key as string];
    if (value !== undefined && value !== null) {
      target[key] = value as T[keyof T];
    }
  });
};
