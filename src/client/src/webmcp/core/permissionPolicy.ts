/**
 * Coarse, client-side tool gating driven by the logged-in user's
 * permission-filtered navigation menu.
 *
 * OrangeHRM's backend already enforces screen / data-group permissions on every
 * API v2 endpoint, so this is not the security boundary — it is a usability
 * filter so an agent is only offered tools whose module the current user can
 * actually reach. The API 403 (surfaced as WEBMCP_FORBIDDEN) is the hard gate.
 */

export type WebMcpModule = 'admin' | 'pim' | 'leave' | 'time' | 'recruitment';

/**
 * Top-level module landing paths (`module/screen`). These appear in the top menu
 * only when the user has real access to the module (self-service items such as
 * `pim/viewMyDetails` are separate entries and deliberately do not count).
 * Matched as a suffix because the backend prefixes menu URLs with the base URL.
 */
const MODULE_MENU_PATH: Record<WebMcpModule, string> = {
  admin: '/admin/viewAdminModule',
  pim: '/pim/viewPimModule',
  leave: '/leave/viewLeaveModule',
  time: '/time/viewTimeModule',
  recruitment: '/recruitment/viewRecruitmentModule',
};

/** Tool name -> module the user must be able to reach for the tool to register. */
export const TOOL_MODULE: Record<string, WebMcpModule> = {
  // core read
  search_employees: 'pim',
  get_employee_profile: 'pim',
  list_leave_types: 'leave',
  get_leave_balance: 'leave',
  list_projects: 'time',
  list_project_activities: 'time',
  list_vacancies: 'recruitment',
  list_candidates: 'recruitment',
  list_system_users: 'admin',
  list_job_titles: 'admin',
  // core write
  create_employee: 'pim',
  apply_leave: 'leave',
  submit_timesheet: 'time',
  approve_leave_request: 'leave',
  shortlist_candidate: 'recruitment',
  // admin read
  list_job_categories: 'admin',
  list_employment_statuses: 'admin',
  list_locations: 'admin',
  list_nationalities: 'admin',
  list_subunits: 'admin',
  list_pay_grades: 'admin',
  list_work_shifts: 'admin',
  get_organization_info: 'admin',
  list_education_qualifications: 'admin',
  list_skill_qualifications: 'admin',
  list_license_qualifications: 'admin',
  list_language_qualifications: 'admin',
  list_membership_qualifications: 'admin',
  // admin write
  create_job_title: 'admin',
  create_job_category: 'admin',
  create_employment_status: 'admin',
  create_location: 'admin',
  create_pay_grade: 'admin',
  create_system_user: 'admin',
};

interface MenuItemLike {
  url?: unknown;
  children?: unknown;
}

const collectUrls = (items: unknown, out: Set<string>): void => {
  if (!Array.isArray(items)) {
    return;
  }
  items.forEach((raw) => {
    const item = raw as MenuItemLike;
    if (typeof item?.url === 'string') {
      out.add(item.url);
    }
    collectUrls(item?.children, out);
  });
};

/**
 * Resolve which modules the current user can reach from their menu payload.
 * Pass the `:topbar-menu-items` (and optionally `:sidepanel-menu-items`) values
 * rendered into the page by the backend.
 */
export const resolveAllowedModules = (
  ...menus: unknown[]
): Set<WebMcpModule> => {
  const urls = new Set<string>();
  menus.forEach((menu) => collectUrls(menu, urls));

  const urlList = Array.from(urls);
  const allowed = new Set<WebMcpModule>();
  (Object.keys(MODULE_MENU_PATH) as WebMcpModule[]).forEach((mod) => {
    const suffix = MODULE_MENU_PATH[mod];
    if (urlList.some((url) => url === suffix || url.endsWith(suffix))) {
      allowed.add(mod);
    }
  });
  return allowed;
};

export const isToolAllowed = (
  toolName: string,
  allowedModules: Set<WebMcpModule>,
): boolean => {
  const required = TOOL_MODULE[toolName];
  // Unmapped tools are treated as always-available (none currently).
  return required ? allowedModules.has(required) : true;
};
