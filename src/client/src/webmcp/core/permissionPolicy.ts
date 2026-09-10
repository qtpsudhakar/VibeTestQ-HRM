/**
 * Coarse, client-side tool gating driven by the logged-in user's
 * permission-filtered navigation menu.
 *
 * OrangeHRM's backend already enforces screen / data-group permissions on every
 * API v2 endpoint, so this is not the security boundary — it is a usability
 * filter so an agent is only offered tools whose module the current user can
 * actually reach. The API 403 (surfaced as WEBMCP_FORBIDDEN) is the hard gate.
 */

export type WebMcpModule = 'admin' | 'pim';

/**
 * Top-level module landing paths (`module/screen`). These appear in the top menu
 * only when the user has real access to the module (self-service items such as
 * `pim/viewMyDetails` are separate entries and deliberately do not count).
 * Matched as a suffix because the backend prefixes menu URLs with the base URL.
 */
const MODULE_MENU_PATH: Record<WebMcpModule, string> = {
  admin: '/admin/viewAdminModule',
  pim: '/pim/viewPimModule',
};

/**
 * Module a user must be able to reach for a GLOBAL tool (navigator + reference
 * reads) to register. Page-scoped tools are gated by the component's own `$can`
 * instead, so they are not listed here.
 */
export const TOOL_MODULE: Record<string, WebMcpModule> = {
  // navigator — PIM
  find_employee: 'pim',
  open_employee_list: 'pim',
  open_add_employee: 'pim',
  open_employee: 'pim',
  open_employee_contact_details: 'pim',
  // navigator — Admin
  find_user: 'admin',
  open_system_users: 'admin',
  open_add_user: 'admin',
  open_user: 'admin',
  // reference reads — Admin
  list_job_titles: 'admin',
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
