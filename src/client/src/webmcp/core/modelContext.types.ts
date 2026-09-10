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

export interface ModelContextToolAnnotations {
  /** Tool does not modify state — skip the confirmation gate. */
  readOnlyHint?: boolean;
  /** Tool performs a destructive update (delete) — always confirm. */
  destructiveHint?: boolean;
}

export interface ModelContextToolDefinition {
  name: string;
  description: string;
  inputSchema?: ModelContextInputSchema;
  annotations?: ModelContextToolAnnotations;
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
  ) => void | Promise<unknown>;
  getTools?: () => unknown[] | Promise<unknown[]>;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
}
