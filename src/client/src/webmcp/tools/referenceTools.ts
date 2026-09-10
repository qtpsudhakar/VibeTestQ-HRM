import {apiGet} from '../core/apiClient';
import {ModelContextToolDefinition} from '../core/modelContext.types';
import {ok} from '../core/toolResponse';

const normalizeCollection = <T = unknown>(response: unknown): T[] => {
  const payload = response as {data?: T[]};
  return Array.isArray(payload?.data) ? payload.data : [];
};

const normalizeRecord = <T = unknown>(response: unknown): T | null => {
  const payload = response as {data?: T};
  return payload?.data ?? null;
};

/**
 * Reference-data reads, available on every screen. An agent uses these to learn
 * the valid values (job titles, subunits, statuses, …) before filling a form.
 * All are read-only, so they run without a confirmation prompt.
 */
export const getReferenceTools = (): ModelContextToolDefinition[] => {
  const tools: ModelContextToolDefinition[] = [
    {
      name: 'list_job_titles',
      description: 'List all configured job titles.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/job-titles');
        const jobTitles = normalizeCollection(response);
        return ok('Job titles fetched', {
          count: jobTitles.length,
          jobTitles,
        });
      },
    },
    {
      name: 'list_job_categories',
      description: 'List all configured job categories.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/job-categories');
        const jobCategories = normalizeCollection(response);
        return ok('Job categories fetched', {
          count: jobCategories.length,
          jobCategories,
        });
      },
    },
    {
      name: 'list_employment_statuses',
      description: 'List all configured employment statuses.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/employment-statuses');
        const employmentStatuses = normalizeCollection(response);
        return ok('Employment statuses fetched', {
          count: employmentStatuses.length,
          employmentStatuses,
        });
      },
    },
    {
      name: 'list_locations',
      description: 'List all office and work locations.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/locations');
        const locations = normalizeCollection(response);
        return ok('Locations fetched', {
          count: locations.length,
          locations,
        });
      },
    },
    {
      name: 'list_nationalities',
      description: 'List all configured nationalities.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/nationalities');
        const nationalities = normalizeCollection(response);
        return ok('Nationalities fetched', {
          count: nationalities.length,
          nationalities,
        });
      },
    },
    {
      name: 'list_subunits',
      description: 'List all organizational structure subunits.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/subunits');
        const subunits = normalizeCollection(response);
        return ok('Subunits fetched', {
          count: subunits.length,
          subunits,
        });
      },
    },
    {
      name: 'list_pay_grades',
      description: 'List all configured pay grades.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/pay-grades');
        const payGrades = normalizeCollection(response);
        return ok('Pay grades fetched', {
          count: payGrades.length,
          payGrades,
        });
      },
    },
    {
      name: 'list_work_shifts',
      description: 'List all configured work shifts.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/work-shifts');
        const workShifts = normalizeCollection(response);
        return ok('Work shifts fetched', {
          count: workShifts.length,
          workShifts,
        });
      },
    },
    {
      name: 'get_organization_info',
      description: 'Get organization general information.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/organization');
        return ok('Organization info fetched', {
          organization: normalizeRecord(response),
        });
      },
    },
    {
      name: 'list_education_qualifications',
      description: 'List all education qualification types.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/educations');
        const educations = normalizeCollection(response);
        return ok('Education qualifications fetched', {
          count: educations.length,
          educations,
        });
      },
    },
    {
      name: 'list_skill_qualifications',
      description: 'List all skill qualification types.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/skills');
        const skills = normalizeCollection(response);
        return ok('Skill qualifications fetched', {
          count: skills.length,
          skills,
        });
      },
    },
    {
      name: 'list_license_qualifications',
      description: 'List all license qualification types.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/licenses');
        const licenses = normalizeCollection(response);
        return ok('License qualifications fetched', {
          count: licenses.length,
          licenses,
        });
      },
    },
    {
      name: 'list_language_qualifications',
      description: 'List all language qualification types.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/languages');
        const languages = normalizeCollection(response);
        return ok('Language qualifications fetched', {
          count: languages.length,
          languages,
        });
      },
    },
    {
      name: 'list_membership_qualifications',
      description: 'List all membership qualification types.',
      execute: async () => {
        const response = await apiGet('/api/v2/admin/memberships');
        const memberships = normalizeCollection(response);
        return ok('Membership qualifications fetched', {
          count: memberships.length,
          memberships,
        });
      },
    },
  ];

  return tools.map((tool) => ({
    ...tool,
    annotations: {readOnlyHint: true},
  }));
};
