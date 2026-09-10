interface ToolAuditEntry {
  toolName: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  success: boolean;
  errorCode?: string;
  input: Record<string, unknown>;
}

const AUDIT_KEY = 'WEBMCP_TOOL_AUDIT_LOGS';
const MAX_AUDIT_ENTRIES = 500;

const parseAuditLogs = (rawValue: string | null): ToolAuditEntry[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as ToolAuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readRaw = (): string | null => {
  try {
    return localStorage.getItem(AUDIT_KEY);
  } catch {
    return null;
  }
};

export const appendToolAuditLog = (entry: ToolAuditEntry): void => {
  const logs = parseAuditLogs(readRaw());
  logs.push(entry);

  if (logs.length > MAX_AUDIT_ENTRIES) {
    logs.splice(0, logs.length - MAX_AUDIT_ENTRIES);
  }

  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
  } catch {
    // storage unavailable (private mode / quota) — audit is best-effort
  }
};

export const getToolAuditLogs = (): ToolAuditEntry[] => {
  return parseAuditLogs(readRaw());
};

export const clearToolAuditLogs = (): void => {
  try {
    localStorage.removeItem(AUDIT_KEY);
  } catch {
    // ignore
  }
};
