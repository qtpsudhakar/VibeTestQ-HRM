/**
 * WebMCP tool-layer tests: provider detection, the registry, navigator +
 * reference tools, and the page mixin. Only the HTTP client and the navigation
 * helper are mocked.
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
import {getModelContextProviders, hasModelContext} from '../core/provider';
import {getNavigatorTools} from '../tools/navigatorTools';
import {getReferenceTools} from '../tools/referenceTools';
import {webMcpMixin} from '../useWebMcp';
import {ok} from '../core/toolResponse';
import {ModelContextToolDefinition} from '../core/modelContext.types';

const mockGet = apiGet as jest.MockedFunction<typeof apiGet>;
const mockNavigate = navigate as jest.MockedFunction<typeof navigate>;

interface FakeProvider {
  registerTool: jest.Mock;
  getTools: () => unknown[];
}

const installProvider = (): FakeProvider => {
  const tools = new Map<string, unknown>();
  const provider: FakeProvider = {
    getTools: () => Array.from(tools.values()),
    registerTool: jest.fn(
      (descriptor: {name: string}, opts?: {signal?: AbortSignal}) => {
        tools.set(descriptor.name, descriptor);
        opts?.signal?.addEventListener('abort', () =>
          tools.delete(descriptor.name),
        );
      },
    ),
  };
  Object.defineProperty(document, 'modelContext', {
    value: provider,
    configurable: true,
  });
  return provider;
};

const removeProvider = () => {
  Object.defineProperty(document, 'modelContext', {
    value: undefined,
    configurable: true,
  });
};

beforeEach(() => {
  resetToolRegistry();
  mockGet.mockReset();
  mockNavigate.mockReset();
  removeProvider();
});

describe('provider detection', () => {
  it('finds document.modelContext when present', () => {
    expect(hasModelContext()).toBe(false);
    installProvider();
    expect(hasModelContext()).toBe(true);
    expect(getModelContextProviders()).toHaveLength(1);
  });
});

describe('tool registry', () => {
  it('registers with the browser provider in MCP content shape', async () => {
    const provider = installProvider();
    registerTools([
      {name: 't', description: 'd', execute: () => ok('done', {n: 1})},
    ]);
    expect(provider.registerTool).toHaveBeenCalledTimes(1);
    const descriptor = provider.registerTool.mock.calls[0][0] as {
      execute: (a: Record<string, unknown>) => Promise<unknown>;
    };
    const out = (await descriptor.execute({})) as {
      content: {text: string}[];
      isError: boolean;
    };
    expect(out.isError).toBe(false);
    expect(out.content[0].text).toContain('done');
  });

  it('still records tools internally with no provider', async () => {
    registerTools([{name: 'x', description: 'd', execute: () => ok('hi')}]);
    expect(getRegisteredToolNames()).toContain('x');
    const result = (await executeRegisteredTool('x', {})) as {success: boolean};
    expect(result.success).toBe(true);
  });

  it('removes tools from the provider when the signal aborts', () => {
    const provider = installProvider();
    const controller = new AbortController();
    registerTools(
      [{name: 'scoped', description: 'd', execute: () => ok('x')}],
      {signal: controller.signal},
    );
    expect(provider.getTools()).toHaveLength(1);
    controller.abort();
    expect(provider.getTools()).toHaveLength(0);
  });

  it('validates required inputs before executing', async () => {
    const execute = jest.fn();
    registerTools([
      {
        name: 'needs_id',
        description: 'd',
        inputSchema: {
          type: 'object',
          properties: {id: {type: 'number'}},
          required: ['id'],
        },
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
});

describe('navigator tools', () => {
  const byName = (name: string) =>
    getNavigatorTools().find(
      (t) => t.name === name,
    ) as ModelContextToolDefinition;

  it('open_add_employee navigates and is read-only', async () => {
    const tool = byName('open_add_employee');
    expect(tool.annotations?.readOnlyHint).toBe(true);
    await tool.execute({});
    expect(mockNavigate).toHaveBeenCalledWith('/pim/addEmployee');
  });

  it('find_employee queries the API and trims the rows', async () => {
    mockGet.mockResolvedValue({
      data: [
        {empNumber: 3, firstName: 'Ada', lastName: 'Lovelace', secret: 'x'},
      ],
    });
    const result = (await byName('find_employee').execute({query: 'ada'})) as {
      data: {employees: Record<string, unknown>[]};
    };
    expect(mockGet).toHaveBeenCalledWith('/api/v2/pim/employees', {
      nameOrId: 'ada',
      limit: 20,
    });
    expect(result.data.employees[0]).not.toHaveProperty('secret');
  });
});

describe('reference tools', () => {
  it('are all read-only', () => {
    getReferenceTools().forEach((tool) => {
      expect(tool.annotations?.readOnlyHint).toBe(true);
    });
  });
});

describe('webMcpMixin', () => {
  const mount = (options: Record<string, unknown>) => {
    const vm = {$options: options, __webMcpController: undefined} as never;
    (webMcpMixin.mounted as (this: unknown) => void).call(vm);
    return vm as {__webMcpController?: AbortController};
  };

  it("registers a page's tools on mount and removes them on unmount", () => {
    const provider = installProvider();
    const vm = mount({
      webMcpTools() {
        return [{name: 'page_tool', description: 'd', execute: () => ok('x')}];
      },
    });
    expect(provider.getTools().length).toBe(1);

    (webMcpMixin.beforeUnmount as (this: unknown) => void).call(vm);
    expect(provider.getTools().length).toBe(0);
  });

  it('does nothing when the browser has no modelContext', () => {
    mount({
      webMcpTools() {
        return [{name: 'nope', description: 'd', execute: () => ok('x')}];
      },
    });
    expect(getRegisteredToolNames()).toHaveLength(0);
  });

  it('does nothing when the component has no webMcpTools option', () => {
    installProvider();
    mount({});
    expect(getRegisteredToolNames()).toHaveLength(0);
  });

  it('a page tool handler can drive its component', async () => {
    installProvider();
    const component = {
      employee: {firstName: 'Old'},
      onSave: jest.fn().mockResolvedValue(undefined),
    };
    mount({
      webMcpTools() {
        return [
          {
            name: 'update_personal_details',
            description: 'd',
            execute: async (args: Record<string, unknown>) => {
              if (args.firstName) {
                component.employee.firstName = String(args.firstName);
              }
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
