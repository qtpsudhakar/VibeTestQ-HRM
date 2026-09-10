export interface ModelContextPropertySchema {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: unknown[];
  minimum?: number;
}

export interface ModelContextInputSchema {
  type: 'object';
  properties?: Record<string, ModelContextPropertySchema>;
  required?: string[];
}

export interface ModelContextToolDefinition {
  name: string;
  description: string;
  inputSchema?: ModelContextInputSchema;
  execute: (
    args: Record<string, unknown>,
    agent?: ModelContextAgent,
  ) => Promise<unknown> | unknown;
}

export interface ModelContextAgent {
  requestUserInteraction?<T>(callback: () => Promise<T> | T): Promise<T>;
}

export interface ModelContext {
  registerTool: (
    tool: ModelContextToolDefinition,
    options?: {signal?: AbortSignal},
  ) => void;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
}
