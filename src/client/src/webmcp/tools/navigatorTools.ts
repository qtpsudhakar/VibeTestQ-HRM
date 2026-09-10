import {navigate} from '@ohrm/core/util/helper/navigation';
import {apiGet} from '../core/apiClient';
import {ModelContextToolDefinition} from '../core/modelContext.types';
import {ok} from '../core/toolResponse';

const READ_ONLY = {readOnlyHint: true} as const;

type FindInput = {query?: string};
type EmpNumberInput = {empNumber: number};
type IdInput = {id: number};

const rows = <T = unknown>(response: unknown): T[] => {
  const payload = response as {data?: T[]};
  return Array.isArray(payload?.data) ? payload.data : [];
};

/**
 * Global tools available on every screen: look records up, and move the tab to
 * the screen whose own tools do the work. Kept deliberately small — anything
 * that changes data lives on its page.
 */
export const getNavigatorTools = (): ModelContextToolDefinition[] => [
  {
    name: 'find_employee',
    description:
      'Search employees by name or employee id. Returns empNumber, name and employeeId so a later tool can act on the right person.',
    inputSchema: {
      type: 'object',
      properties: {query: {type: 'string'}},
    },
    annotations: READ_ONLY,
    execute: async (args) => {
      const {query} = args as FindInput;
      const response = await apiGet('/api/v2/pim/employees', {
        nameOrId: query,
        limit: 20,
      });
      const employees = rows<Record<string, unknown>>(response).map((e) => ({
        empNumber: e.empNumber,
        firstName: e.firstName,
        middleName: e.middleName,
        lastName: e.lastName,
        employeeId: e.employeeId,
      }));
      return ok(`${employees.length} employee(s) found`, {employees});
    },
  },
  {
    name: 'find_user',
    description:
      'Search system users by username. Returns id, username, role and linked employee.',
    inputSchema: {
      type: 'object',
      properties: {query: {type: 'string'}},
    },
    annotations: READ_ONLY,
    execute: async (args) => {
      const {query} = args as FindInput;
      const response = await apiGet('/api/v2/admin/users', {
        username: query,
        limit: 20,
      });
      const users = rows<Record<string, unknown>>(response).map((u) => ({
        id: u.id,
        username: u.userName,
        role: (u.userRole as {displayName?: string} | undefined)?.displayName,
        status: u.status,
        employee: u.employee,
      }));
      return ok(`${users.length} user(s) found`, {users});
    },
  },
  {
    name: 'open_employee_list',
    description: 'Go to the PIM employee list screen.',
    annotations: READ_ONLY,
    execute: () => {
      navigate('/pim/viewEmployeeList');
      return ok('Opening the employee list');
    },
  },
  {
    name: 'open_add_employee',
    description:
      'Go to the Add Employee screen, where create_employee becomes available.',
    annotations: READ_ONLY,
    execute: () => {
      navigate('/pim/addEmployee');
      return ok('Opening the Add Employee form');
    },
  },
  {
    name: 'open_employee',
    description:
      "Open an employee's Personal Details screen by empNumber, where update_personal_details becomes available.",
    inputSchema: {
      type: 'object',
      properties: {empNumber: {type: 'number', minimum: 1}},
      required: ['empNumber'],
    },
    annotations: READ_ONLY,
    execute: (args) => {
      const {empNumber} = args as EmpNumberInput;
      navigate('/pim/viewPersonalDetails/empNumber/{empNumber}', {empNumber});
      return ok(`Opening employee ${empNumber}`);
    },
  },
  {
    name: 'open_employee_contact_details',
    description:
      "Open an employee's Contact Details screen by empNumber, where update_contact_details becomes available.",
    inputSchema: {
      type: 'object',
      properties: {empNumber: {type: 'number', minimum: 1}},
      required: ['empNumber'],
    },
    annotations: READ_ONLY,
    execute: (args) => {
      const {empNumber} = args as EmpNumberInput;
      navigate('/pim/contactDetails/empNumber/{empNumber}', {empNumber});
      return ok(`Opening contact details for employee ${empNumber}`);
    },
  },
  {
    name: 'open_system_users',
    description: 'Go to the Admin > User Management > Users screen.',
    annotations: READ_ONLY,
    execute: () => {
      navigate('/admin/viewSystemUsers');
      return ok('Opening the system users list');
    },
  },
  {
    name: 'open_add_user',
    description:
      'Go to the Add User screen, where create_user becomes available.',
    annotations: READ_ONLY,
    execute: () => {
      navigate('/admin/saveSystemUser');
      return ok('Opening the Add User form');
    },
  },
  {
    name: 'open_user',
    description:
      'Open a system user for editing by id, where update_user, change_user_password and set_user_status become available.',
    inputSchema: {
      type: 'object',
      properties: {id: {type: 'number', minimum: 1}},
      required: ['id'],
    },
    annotations: READ_ONLY,
    execute: (args) => {
      const {id} = args as IdInput;
      navigate('/admin/saveSystemUser/{id}', {id});
      return ok(`Opening user ${id}`);
    },
  },
];
