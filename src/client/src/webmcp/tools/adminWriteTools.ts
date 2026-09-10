import {apiPost} from '../core/apiClient';
import {ModelContextToolDefinition} from '../core/modelContext.types';
import {requestConfirmation} from '../core/toolGuards';
import {ok} from '../core/toolResponse';

type CreateJobTitleInput = {
  name: string;
  description?: string;
  note?: string;
};

type CreateJobCategoryInput = {
  name: string;
};

type CreateEmploymentStatusInput = {
  name: string;
};

type CreateLocationInput = {
  name: string;
  countryCode: string;
  province?: string;
  city?: string;
  address?: string;
  zipCode?: string;
  phone?: string;
  fax?: string;
  note?: string;
};

type CreatePayGradeInput = {
  name: string;
};

type CreateSystemUserInput = {
  username: string;
  password: string;
  userRoleId: number;
  empNumber: number;
  status: boolean;
};

const normalizeRecord = <T = unknown>(response: unknown): T | null => {
  const payload = response as {data?: T};
  return payload?.data ?? null;
};

export const getAdminWriteTools = (): ModelContextToolDefinition[] => {
  return [
    {
      name: 'create_job_title',
      description: 'Create a new job title in the admin configuration.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          description: {type: 'string'},
          note: {type: 'string'},
        },
        required: ['name'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as CreateJobTitleInput;
        const confirmation = await requestConfirmation(
          agent,
          `Create job title '${input.name}'?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPost('/api/v2/admin/job-titles', {
          name: input.name,
          description: input.description ?? '',
          note: input.note ?? '',
        });

        return ok('Job title created', {
          jobTitle: normalizeRecord(response),
        });
      },
    },
    {
      name: 'create_job_category',
      description: 'Create a new job category in the admin configuration.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {type: 'string'},
        },
        required: ['name'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as CreateJobCategoryInput;
        const confirmation = await requestConfirmation(
          agent,
          `Create job category '${input.name}'?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPost('/api/v2/admin/job-categories', {
          name: input.name,
        });

        return ok('Job category created', {
          jobCategory: normalizeRecord(response),
        });
      },
    },
    {
      name: 'create_employment_status',
      description: 'Create a new employment status in the admin configuration.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {type: 'string'},
        },
        required: ['name'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as CreateEmploymentStatusInput;
        const confirmation = await requestConfirmation(
          agent,
          `Create employment status '${input.name}'?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPost('/api/v2/admin/employment-statuses', {
          name: input.name,
        });

        return ok('Employment status created', {
          employmentStatus: normalizeRecord(response),
        });
      },
    },
    {
      name: 'create_location',
      description: 'Create a new work location in the admin configuration.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {type: 'string'},
          countryCode: {type: 'string'},
          province: {type: 'string'},
          city: {type: 'string'},
          address: {type: 'string'},
          zipCode: {type: 'string'},
          phone: {type: 'string'},
          fax: {type: 'string'},
          note: {type: 'string'},
        },
        required: ['name', 'countryCode'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as CreateLocationInput;
        const confirmation = await requestConfirmation(
          agent,
          `Create location '${input.name}' (${input.countryCode})?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPost('/api/v2/admin/locations', {
          name: input.name,
          countryCode: input.countryCode,
          province: input.province ?? '',
          city: input.city ?? '',
          address: input.address ?? '',
          zipCode: input.zipCode ?? '',
          phone: input.phone ?? '',
          fax: input.fax ?? '',
          note: input.note ?? '',
        });

        return ok('Location created', {
          location: normalizeRecord(response),
        });
      },
    },
    {
      name: 'create_pay_grade',
      description: 'Create a new pay grade in the admin configuration.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {type: 'string'},
        },
        required: ['name'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as CreatePayGradeInput;
        const confirmation = await requestConfirmation(
          agent,
          `Create pay grade '${input.name}'?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPost('/api/v2/admin/pay-grades', {
          name: input.name,
        });

        return ok('Pay grade created', {
          payGrade: normalizeRecord(response),
        });
      },
    },
    {
      name: 'create_system_user',
      description: 'Create a new system user account.',
      inputSchema: {
        type: 'object',
        properties: {
          username: {type: 'string'},
          password: {type: 'string'},
          userRoleId: {type: 'number'},
          empNumber: {type: 'number'},
          status: {type: 'boolean'},
        },
        required: ['username', 'password', 'userRoleId', 'empNumber', 'status'],
      },
      execute: async (args, agent) => {
        const input = args as unknown as CreateSystemUserInput;
        const confirmation = await requestConfirmation(
          agent,
          `Create system user '${input.username}'?`,
        );
        if (!confirmation.success) {
          return confirmation;
        }

        const response = await apiPost('/api/v2/admin/users', {
          username: input.username,
          password: input.password,
          userRoleId: input.userRoleId,
          empNumber: input.empNumber,
          status: input.status,
        });

        return ok('System user created', {
          user: normalizeRecord(response),
        });
      },
    },
  ];
};
