import {apiPost, apiPut} from '../core/apiClient';
import {ModelContextToolDefinition} from '../core/modelContext.types';
import {requestConfirmation} from '../core/toolGuards';
import {ok} from '../core/toolResponse';

type CreateEmployeeInput = {
  firstName: string;
  lastName: string;
  middleName?: string;
  employeeId?: string;
};

type ApplyLeaveInput = {
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  comment?: string;
};

type SubmitTimesheetInput = {
  timesheetId: number;
  action: string;
};

type ApproveLeaveInput = {
  leaveRequestId: number;
  action: string;
  comment?: string;
};

type ShortlistCandidateInput = {
  candidateId: number;
  note?: string;
};

const normalizeRecord = <T = unknown>(response: unknown): T | null => {
  const payload = response as {data?: T};
  return payload?.data ?? null;
};

export const getWriteTools = (): ModelContextToolDefinition[] => {
  return [
    {
      name: 'create_employee',
      description:
        'Create a new employee record in PIM. Requires PIM add permission.',
      inputSchema: {
        type: 'object',
        properties: {
          firstName: {type: 'string'},
          lastName: {type: 'string'},
          middleName: {type: 'string'},
          employeeId: {type: 'string'},
        },
        required: ['firstName', 'lastName'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as CreateEmployeeInput;
        const confirmation = await requestConfirmation(
          agent,
          `Create employee '${input.firstName} ${input.lastName}'?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPost('/api/v2/pim/employees', {
          firstName: input.firstName,
          middleName: input.middleName ?? '',
          lastName: input.lastName,
          employeeId: input.employeeId ?? '',
        });

        return ok('Employee created', {employee: normalizeRecord(response)});
      },
    },
    {
      name: 'apply_leave',
      description:
        'Apply a leave request for the logged-in employee. Single or multi day, full days only.',
      inputSchema: {
        type: 'object',
        properties: {
          leaveTypeId: {type: 'number', minimum: 1},
          fromDate: {type: 'string'},
          toDate: {type: 'string'},
          comment: {type: 'string'},
        },
        required: ['leaveTypeId', 'fromDate', 'toDate'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as ApplyLeaveInput;
        const confirmation = await requestConfirmation(
          agent,
          `Apply leave from ${input.fromDate} to ${input.toDate}?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPost('/api/v2/leave/leave-requests', {
          leaveTypeId: input.leaveTypeId,
          fromDate: input.fromDate,
          toDate: input.toDate,
          comment: input.comment ?? '',
        });

        return ok('Leave request submitted', {
          leaveRequest: normalizeRecord(response),
        });
      },
    },
    {
      name: 'submit_timesheet',
      description:
        'Act on a timesheet. action is one of SUBMIT, APPROVE, REJECT, RESET.',
      inputSchema: {
        type: 'object',
        properties: {
          timesheetId: {type: 'number', minimum: 1},
          action: {
            type: 'string',
            enum: ['SUBMIT', 'APPROVE', 'REJECT', 'RESET'],
          },
        },
        required: ['timesheetId', 'action'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as SubmitTimesheetInput;
        const confirmation = await requestConfirmation(
          agent,
          `Run '${input.action}' on timesheet ${input.timesheetId}?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPut(
          `/api/v2/time/timesheets/${input.timesheetId}`,
          {action: input.action},
        );

        return ok('Timesheet action completed', {
          timesheet: normalizeRecord(response),
        });
      },
    },
    {
      name: 'approve_leave_request',
      description:
        "Act on an employee's leave request. action is one of APPROVE, REJECT, CANCEL.",
      inputSchema: {
        type: 'object',
        properties: {
          leaveRequestId: {type: 'number', minimum: 1},
          action: {type: 'string', enum: ['APPROVE', 'REJECT', 'CANCEL']},
          comment: {type: 'string'},
        },
        required: ['leaveRequestId', 'action'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as ApproveLeaveInput;
        const confirmation = await requestConfirmation(
          agent,
          `Run '${input.action}' on leave request ${input.leaveRequestId}?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPut(
          `/api/v2/leave/employees/leave-requests/${input.leaveRequestId}`,
          {action: input.action, comment: input.comment ?? ''},
        );

        return ok('Leave request action completed', {
          leaveRequest: normalizeRecord(response),
        });
      },
    },
    {
      name: 'shortlist_candidate',
      description:
        'Shortlist a recruitment candidate. The candidate is already linked to a vacancy.',
      inputSchema: {
        type: 'object',
        properties: {
          candidateId: {type: 'number', minimum: 1},
          note: {type: 'string'},
        },
        required: ['candidateId'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as ShortlistCandidateInput;
        const confirmation = await requestConfirmation(
          agent,
          `Shortlist candidate ${input.candidateId}?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPut(
          `/api/v2/recruitment/candidates/${input.candidateId}/shortlist`,
          {note: input.note ?? ''},
        );

        return ok('Candidate shortlisted', {
          candidate: normalizeRecord(response),
        });
      },
    },
  ];
};
