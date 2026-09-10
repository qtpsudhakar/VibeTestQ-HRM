import axios, {AxiosError, AxiosInstance} from 'axios';

/**
 * Error raised by the API helpers with a WebMCP error code already resolved,
 * so the tool registry can turn it straight into a ToolResult.
 */
export class WebMcpApiError extends Error {
  readonly errorCode: string;
  readonly status?: number;

  constructor(message: string, errorCode: string, status?: number) {
    super(message);
    this.name = 'WebMcpApiError';
    this.errorCode = errorCode;
    this.status = status;
  }
}

const getBaseUrl = (): string => {
  const globalWindow = window as Window & {appGlobal?: {baseUrl?: string}};
  return globalWindow.appGlobal?.baseUrl ?? '';
};

const buildApiClient = (): AxiosInstance =>
  axios.create({
    baseURL: getBaseUrl(),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

export const apiClient = buildApiClient();

const extractApiMessage = (error: AxiosError): string => {
  const data = error.response?.data as {error?: unknown} | undefined;
  const apiError = data?.error;
  if (
    apiError &&
    typeof apiError === 'object' &&
    'message' in apiError &&
    typeof (apiError as {message?: unknown}).message === 'string'
  ) {
    return (apiError as {message: string}).message;
  }
  if (typeof apiError === 'string') {
    return apiError;
  }
  return error.message || 'OrangeHRM API request failed';
};

const toWebMcpError = (error: unknown): WebMcpApiError => {
  if (error instanceof WebMcpApiError) {
    return error;
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = extractApiMessage(error);
    if (status === 401) {
      return new WebMcpApiError(
        'Not authenticated with OrangeHRM. Sign in again.',
        'WEBMCP_UNAUTHENTICATED',
        status,
      );
    }
    if (status === 403) {
      return new WebMcpApiError(
        `Not permitted: ${message}`,
        'WEBMCP_FORBIDDEN',
        status,
      );
    }
    if (status === 404) {
      return new WebMcpApiError(message, 'WEBMCP_NOT_FOUND', status);
    }
    if (status === 422 || status === 400) {
      return new WebMcpApiError(message, 'WEBMCP_VALIDATION_ERROR', status);
    }
    return new WebMcpApiError(message, 'WEBMCP_API_ERROR', status);
  }
  return new WebMcpApiError(
    error instanceof Error ? error.message : 'Unexpected API error',
    'WEBMCP_API_ERROR',
  );
};

export const apiGet = async <T = unknown>(
  path: string,
  params?: Record<string, unknown>,
): Promise<T> => {
  try {
    const response = await apiClient.get(path, {params});
    return response.data as T;
  } catch (error) {
    throw toWebMcpError(error);
  }
};

export const apiPost = async <T = unknown>(
  path: string,
  data?: Record<string, unknown>,
): Promise<T> => {
  try {
    const response = await apiClient.post(path, data ?? {});
    return response.data as T;
  } catch (error) {
    throw toWebMcpError(error);
  }
};

export const apiPut = async <T = unknown>(
  path: string,
  data?: Record<string, unknown>,
): Promise<T> => {
  try {
    const response = await apiClient.put(path, data ?? {});
    return response.data as T;
  } catch (error) {
    throw toWebMcpError(error);
  }
};
