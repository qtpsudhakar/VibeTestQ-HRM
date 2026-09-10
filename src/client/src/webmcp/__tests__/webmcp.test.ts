/**
 * WebMCP tool-layer tests: the registry, the page mixin, navigator + reference
 * tools, and a representative page-tool handler. Only the HTTP client and the
 * navigation helper are mocked.
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
  return {WebMcpApiError, apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn()};
});

jest.mock('@ohrm/core/util/helper/navigation', () => ({
  navigate: jest.fn(),
  reloadPage: jest.fn(),
}));

import {apiGet, WebMcpApiError} from '../core/apiClient';
import {navigate} from '@ohrm/core/util/helper/navigation';
import {
  executeRegisteredTool,
  getRegisteredToolNames,
  registerTools,
  resetToolRegistry,
} from '../core/toolRegistry';
import {getNavigatorTools} from '../tools/navigatorTools';
import {getReferenceTools} from '../tools/referenceTools';
import {webMcpMixin} from '../useWebMcp';
import {ok} from '../core/toolResponse';
import {ModelContextToolDefinition} from '../core/modelContext.types';

const mockGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockNavigate = navigate as jest.MockedFunction<typeof navigate>;

beforeEach(() => {
  resetToolRegistry();
  mockGet.mockReset();
  mockNavigate.mockReset();
  localStorage.clear();
  localStorage.setItem('WEBMCP_ENABLED', 'true');
});

// ── registry ────────────────────────────────────────────────────────────────
describe('tool registry', () => {
  it('runs a registered tool and returns its result', async () => {
    registerTools([
      {name: 't', description: 'd', execute: () => ok('done', {n: 1})},
    ]);
    const result = (await executeRegisteredTool('t', {})) as {
      success: boolean;
      data: {n: number};
    };
    expect(result.success).toBe(true);
    expect(result.data.n).toBe(1);
  });

  it('removes tools when the signal aborts', () => {
    const controller = new AbortController();
    registerTools(
      [{name: 'scoped', description: 'd', execute: () => ok('x')}],
      {signal: controller.signal},
    );
    expect(getRegisteredToolNames()).toContain('scoped');
    controller.abort();
    expect(getRegisteredToolNames()).not.toContain('scoped');
  });

  it('validates required inputs before executing', async () => {
    const execute = jest.fn();
    registerTools([
      {
        name: 'needs_id',
        description: 'd',
        inputSchema: {type: 'object', properties: {id: {type: 'number'}}, required: ['id']},
        execute,
      },
    ]);
    const result = (await executeRegisteredTool('needs_id', {})) as {
      errorCode: string;
    };
    expect(result.errorCode).toBe('WEBMCP_VALIDATION_ERROR');
    expect(execute).not.toHaveBeenCalled();
  });

  it('maps a WebMcpApiError to its error code', async () => {
    registerTools([
      {
        name: 'boom',
        description: 'd',
        execute: () => {
          throw new WebMcpApiError('no', 'WEBMCP_FORBIDDEN', 403);
        },
      },
    ]);
    const result = (await executeRegisteredTool('boom', {})) as {
      errorCode: string;
    };
    expect(result.errorCode).toBe('WEBMCP_FORBIDDEN');
  });

  it('reports an unknown tool', async () => {
    const result = (await executeRegisteredTool('nope', {})) as {
      errorCode: string;
    };
    expect(result.errorCode).toBe('WEBMCP_TOOL_NOT_FOUND');
  });
});

// ── navigator + reference tools ─────────────────────────────────────────────
describe('navigator tools', () => {
  const byName = (name: string) =>
    getNavigatorTools().find((t) => t.name === name) as ModelContextToolDefinition;

  it('open_add_employee navigates and is read-only', async () => {
    const tool = byName('open_add_employee');
    expect(tool.annotations?.readOnlyHint).toBe(true);
    await tool.execute({});
    expect(mockNavigate).toHaveBeenCalledWith('/pim/addEmployee');
  });

  it('open_user navigates with the id', async () => {
    await byName('open_user').execute({id: 7});
    expect(mockNavigate).toHaveBeenCalledWith('/admin/saveSystemUser/{id}', {
      id: 7,
    });
  });

  it('find_employee queries the API and trims the rows', async () => {
    mockGet.mockResolvedValue({
      data: [{empNumber: 3, firstName: 'Ada', lastName: 'Lovelace', secret: 'x'}],
    });
    const result = (await byName('find_employee').execute({query: 'ada'})) as {
      data: {employees: Record<string, unknown>[]};
    };
    expect(mockGet).toHaveBeenCalledWith('/api/v2/pim/employees', {
      nameOrId: 'ada',
      limit: 20,
    });
    expect(result.data.employees[0]).toEqual({
      empNumber: 3,
      firstName: 'Ada',
      middleName: undefined,
      lastName: 'Lovelace',
      employeeId: undefined,
    });
  });
});

describe('reference tools', () => {
  it('are all read-only', () => {
    getReferenceTools().forEach((tool) => {
      expect(tool.annotations?.readOnlyHint).toBe(true);
    });
  });
});

// ── page mixin ─────────────────────────────────────────────────────────────
describe('webMcpMixin', () => {
  const mount = (options: Record<string, unknown>) => {
    const vm = {$options: options, __webMcpController: undefined} as never;
    (webMcpMixin.mounted as (this: unknown) => void).call(vm);
    return vm as {__webMcpController?: AbortController};
  };

  it('registers a component\'s tools on mount and removes them on unmount', () => {
    const vm = mount({
      webMcpTools(this: unknown) {
        return [{name: 'page_tool', description: 'd', execute: () => ok('x')}];
      },
    });
    expect(getRegisteredToolNames()).toContain('page_tool');

    (webMcpMixin.beforeUnmount as (this: unknown) => void).call(vm);
    expect(getRegisteredToolNames()).not.toContain('page_tool');
  });

  it('does nothing when the component has no webMcpTools option', () => {
    mount({});
    expect(getRegisteredToolNames()).toHaveLength(0);
  });

  it('does nothing when the feature flag is off', () => {
    localStorage.setItem('WEBMCP_ENABLED', 'false');
    mount({
      webMcpTools() {
        return [{name: 'flagged', description: 'd', execute: () => ok('x')}];
      },
    });
    expect(getRegisteredToolNames()).toHaveLength(0);
  });

  it('a page tool handler can drive its component and confirm', async () => {
    // Mimic EmployeePersonalDetails.update_personal_details bound to `this`.
    const component = {
      employee: {firstName: 'Old', lastName: 'Name', middleName: ''},
      onSave: jest.fn().mockResolvedValue(undefined),
    };
    mount({
      webMcpTools() {
        return [
          {
            name: 'update_personal_details',
            description: 'd',
            execute: async (args: Record<string, unknown>) => {
              if (args.firstName) component.employee.firstName = String(args.firstName);
              await component.onSave();
              return ok('updated');
            },
          },
        ];
      },
    });

    const result = (await executeRegisteredTool('update_personal_details', {
      firstName: 'New',
    })) as {success: boolean};
    expect(result.success).toBe(true);
    expect(component.employee.firstName).toBe('New');
    expect(component.onSave).toHaveBeenCalledTimes(1);
  });
});
