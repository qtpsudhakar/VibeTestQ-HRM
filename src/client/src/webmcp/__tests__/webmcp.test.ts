/**
 * WebMCP tool-layer tests. Exercises the real registry, schema validation,
 * permission gating and confirmation flow. Only the HTTP client is mocked.
 */
/* eslint-env jest */
/* global jest */

jest.mock('../core/apiClient', () => {
  class WebMcpApiError extends Error {
    errorCode: string;
    status?: number;
    constructor(message: string, errorCode: string, status?: number) {
      super(message);
      this.name = 'WebMcpApiError';
      this.errorCode = errorCode;
      this.status = status;
    }
  }
  return {
    WebMcpApiError,
    apiGet: jest.fn(),
    apiPost: jest.fn(),
    apiPut: jest.fn(),
  };
});

import {apiGet, apiPost, apiPut, WebMcpApiError} from '../core/apiClient';
import {
  executeRegisteredTool,
  getRegisteredToolNames,
  registerTools,
  resetToolRegistry,
} from '../core/toolRegistry';
import {registerWebMcpTools} from '../registerWebMcp';
import {getReadTools} from '../tools/readTools';
import {getWriteTools} from '../tools/writeTools';
import {getAdminReadTools} from '../tools/adminReadTools';
import {getAdminWriteTools} from '../tools/adminWriteTools';
import {resolveAllowedModules, isToolAllowed} from '../core/permissionPolicy';
import {clearToolAuditLogs, getToolAuditLogs} from '../core/auditLogger';

const mockGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockPost = apiPost as jest.MockedFunction<typeof apiPost>;
const mockPut = apiPut as jest.MockedFunction<typeof apiPut>;

const ALL_TOOLS = [
  ...getReadTools(),
  ...getWriteTools(),
  ...getAdminReadTools(),
  ...getAdminWriteTools(),
];

const fullMenu = [
  {url: '/admin/viewAdminModule'},
  {url: '/pim/viewPimModule'},
  {url: '/leave/viewLeaveModule'},
  {url: '/time/viewTimeModule'},
  {url: '/recruitment/viewRecruitmentModule'},
];

beforeEach(() => {
  resetToolRegistry();
  clearToolAuditLogs();
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  localStorage.clear();
  localStorage.setItem('WEBMCP_ENABLED', 'true');
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('tool catalog', () => {
  it('exposes 34 tools with unique verb_noun names', () => {
    expect(ALL_TOOLS).toHaveLength(34);
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    names.forEach((n) => expect(n).toMatch(/^[a-z]+(_[a-z]+)+$/));
  });

  it('every tool maps to a known module', () => {
    ALL_TOOLS.forEach((tool) => {
      expect(isToolAllowed(tool.name, new Set())).toBe(false);
      expect(isToolAllowed(tool.name, resolveAllowedModules(fullMenu))).toBe(
        true,
      );
    });
  });
});

describe('permission gating at registration', () => {
  it('registers only tools whose module is in the user menu', () => {
    const count = registerWebMcpTools({
      user: {firstName: 'Tester'},
      topMenu: [{url: '/leave/viewLeaveModule'}],
    });
    const names = getRegisteredToolNames();
    expect(count).toBeGreaterThan(0);
    expect(names).toContain('list_leave_types');
    expect(names).not.toContain('list_system_users');
    expect(names).not.toContain('list_vacancies');
  });

  it('registers nothing when no user is logged in', () => {
    expect(registerWebMcpTools({topMenu: fullMenu})).toBe(0);
    expect(getRegisteredToolNames()).toHaveLength(0);
  });
});

describe('schema validation', () => {
  beforeEach(() => registerTools(ALL_TOOLS));

  it('rejects missing required fields', async () => {
    const result = (await executeRegisteredTool(
      'get_employee_profile',
      {},
    )) as {
      success: boolean;
      errorCode: string;
    };
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('WEBMCP_VALIDATION_ERROR');
  });

  it('rejects wrong types', async () => {
    const result = (await executeRegisteredTool('get_employee_profile', {
      empNumber: 'abc',
    })) as {success: boolean; errorCode: string};
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('WEBMCP_VALIDATION_ERROR');
  });

  it('rejects values outside an enum', async () => {
    const result = (await executeRegisteredTool('approve_leave_request', {
      leaveRequestId: 5,
      action: 'DELETE',
    })) as {success: boolean; errorCode: string};
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('WEBMCP_VALIDATION_ERROR');
    expect(mockPut).not.toHaveBeenCalled();
  });
});

describe('read tool execution', () => {
  beforeEach(() => registerTools(ALL_TOOLS));

  it('returns a normalized collection', async () => {
    mockGet.mockResolvedValue({data: [{id: 1}, {id: 2}]});
    const result = (await executeRegisteredTool('list_projects', {})) as {
      success: boolean;
      data: {count: number};
    };
    expect(mockGet).toHaveBeenCalledWith('/api/v2/time/projects');
    expect(result.success).toBe(true);
    expect(result.data.count).toBe(2);
  });

  it('turns an API 403 into WEBMCP_FORBIDDEN', async () => {
    mockGet.mockRejectedValue(
      new WebMcpApiError('nope', 'WEBMCP_FORBIDDEN', 403),
    );
    const result = (await executeRegisteredTool('list_system_users', {})) as {
      success: boolean;
      errorCode: string;
    };
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('WEBMCP_FORBIDDEN');
  });
});

describe('write tool confirmation', () => {
  beforeEach(() => registerTools(ALL_TOOLS));

  it('calls the API after the user confirms', async () => {
    (window.confirm as jest.Mock).mockReturnValue(true);
    mockPost.mockResolvedValue({data: {id: 9}});
    const result = (await executeRegisteredTool('create_job_title', {
      name: 'Engineer',
    })) as {success: boolean};
    expect(result.success).toBe(true);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v2/admin/job-titles',
      expect.objectContaining({name: 'Engineer'}),
    );
  });

  it('aborts and does not call the API when the user cancels', async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);
    const result = (await executeRegisteredTool('create_job_title', {
      name: 'Engineer',
    })) as {success: boolean; errorCode: string};
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('WEBMCP_CANCELLED');
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('audit log', () => {
  beforeEach(() => registerTools(ALL_TOOLS));

  it('records one entry per invocation with outcome and duration', async () => {
    mockGet.mockResolvedValue({data: []});
    await executeRegisteredTool('list_projects', {});
    await executeRegisteredTool('get_employee_profile', {});
    const logs = getToolAuditLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].toolName).toBe('list_projects');
    expect(logs[0].success).toBe(true);
    expect(logs[1].toolName).toBe('get_employee_profile');
    expect(logs[1].success).toBe(false);
    expect(typeof logs[0].durationMs).toBe('number');
  });
});

describe('unknown tool', () => {
  it('returns WEBMCP_TOOL_NOT_FOUND', async () => {
    const result = (await executeRegisteredTool('nope', {})) as {
      success: boolean;
      errorCode: string;
    };
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('WEBMCP_TOOL_NOT_FOUND');
  });
});
