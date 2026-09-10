import {ModelContextAgent} from './modelContext.types';
import {fail, ok} from './toolResponse';

/**
 * WebMCP is opt-in. It is enabled when the build sets `VUE_APP_WEBMCP=true`,
 * and can be forced on/off per browser with `localStorage.WEBMCP_ENABLED`.
 */
export const isWebMcpEnabled = (): boolean => {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('WEBMCP_ENABLED');
  } catch {
    stored = null;
  }
  if (stored === 'true') {
    return true;
  }
  if (stored === 'false') {
    return false;
  }
  return process.env.VUE_APP_WEBMCP === 'true';
};

/**
 * Ask the human to approve a mutating action.
 *
 * Preference order:
 *   1. the driving agent's `requestUserInteraction` (real WebMCP client), then
 *   2. an in-page confirm dialog handler (see `webmcp:confirm` in main.ts), then
 *   3. the native `window.confirm` as a last resort.
 */
export const requestConfirmation = async (
  agent: ModelContextAgent | undefined,
  message: string,
) => {
  const decide = async (): Promise<boolean> => {
    if (agent?.requestUserInteraction) {
      return agent.requestUserInteraction(() => promptInPage(message));
    }
    return promptInPage(message);
  };

  const confirmed = await decide();
  return confirmed
    ? ok('Confirmed')
    : fail('Action cancelled by user', 'WEBMCP_CANCELLED');
};

type ConfirmEventDetail = {
  message: string;
  claim: () => Promise<boolean>;
  resolve: (value: boolean) => void;
};

const promptInPage = (message: string): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  let claimed = false;
  let resolveFn: (value: boolean) => void = () => undefined;
  const pending = new Promise<boolean>((resolve) => {
    resolveFn = resolve;
  });

  const detail: ConfirmEventDetail = {
    message,
    claim: () => {
      claimed = true;
      return pending;
    },
    resolve: (value: boolean) => resolveFn(value),
  };

  window.dispatchEvent(new CustomEvent('webmcp:confirm', {detail}));

  if (claimed) {
    return pending;
  }
  return Promise.resolve(window.confirm(message));
};
