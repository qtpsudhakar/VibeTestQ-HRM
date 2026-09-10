import {fail} from './toolResponse';
import {
  ModelContextPropertySchema,
  ModelContextInputSchema,
  ToolResult,
} from './modelContext.types';

export type ToolPropertySchema = ModelContextPropertySchema;
export type ToolInputSchema = Partial<ModelContextInputSchema>;

const isMissing = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  return typeof value === 'string' && value.trim().length === 0;
};

const typeMatches = (
  value: unknown,
  type: ToolPropertySchema['type'],
): boolean => {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return (
        typeof value === 'object' && value !== null && !Array.isArray(value)
      );
    default:
      return true;
  }
};

/**
 * Validate tool arguments against the declared JSON-schema subset:
 * required fields, primitive types, enums and numeric minimums.
 */
export const validateInputs = (
  payload: Record<string, unknown>,
  schema: ToolInputSchema,
): ToolResult | null => {
  const missing = (schema.required ?? []).filter((key) =>
    isMissing(payload[key]),
  );
  if (missing.length > 0) {
    return fail(
      `Missing required input: ${missing.join(', ')}`,
      'WEBMCP_VALIDATION_ERROR',
    );
  }

  const properties = schema.properties ?? {};
  for (const [key, rule] of Object.entries(properties)) {
    const value = payload[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (rule.type && !typeMatches(value, rule.type)) {
      return fail(
        `Input '${key}' must be of type ${rule.type}`,
        'WEBMCP_VALIDATION_ERROR',
      );
    }
    if (rule.enum && !rule.enum.includes(value)) {
      return fail(
        `Input '${key}' must be one of: ${rule.enum.join(', ')}`,
        'WEBMCP_VALIDATION_ERROR',
      );
    }
    if (
      typeof rule.minimum === 'number' &&
      typeof value === 'number' &&
      value < rule.minimum
    ) {
      return fail(
        `Input '${key}' must be >= ${rule.minimum}`,
        'WEBMCP_VALIDATION_ERROR',
      );
    }
  }

  return null;
};
