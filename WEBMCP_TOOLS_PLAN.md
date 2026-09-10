# OrangeHRM WebMCP Tools Plan

## Goal
Build WebMCP tools for OrangeHRM modules so an AI agent can perform high-value HR workflows through explicit tool calls instead of fragile UI-only automation.

## Current Inputs
- OrangeHRM source is cloned into this workspace.
- WebMCP proposal/docs are available in [webmcp/README.md](webmcp/README.md) and [webmcp/docs/proposal.md](webmcp/docs/proposal.md).
- Reference implementation style is available in VegCart flow JSON files such as docs/flows/flow-01-product-search.json and tool registration in vegcart.js.

## Architecture Decision
Use a hybrid implementation:
1. WebMCP registration in OrangeHRM frontend Vue app.
2. Tool handlers call existing OrangeHRM APIs and composables.
3. Flow JSON files orchestrate repeatable business scenarios across multiple tools.
4. Every mutating tool requires confirmation via requestUserInteraction-style guard before final submit.

Reason:
- Reuses current OrangeHRM business logic.
- Keeps user in the loop for sensitive HR actions.
- Mirrors your VegCart pattern of tool calls plus reusable flow files.

## Suggested Repository Layout
Create these folders in OrangeHRM client:

- src/client/src/webmcp/
- src/client/src/webmcp/core/
- src/client/src/webmcp/tools/
- src/client/src/webmcp/tools/admin/
- src/client/src/webmcp/tools/pim/
- src/client/src/webmcp/tools/leave/
- src/client/src/webmcp/tools/time/
- src/client/src/webmcp/tools/recruitment/
- src/client/src/webmcp/flows/
- src/client/src/webmcp/security/

Core files to add:

- src/client/src/webmcp/registerWebMcp.ts
- src/client/src/webmcp/core/toolRegistry.ts
- src/client/src/webmcp/core/toolSchemas.ts
- src/client/src/webmcp/core/toolGuards.ts
- src/client/src/webmcp/core/toolResponse.ts
- src/client/src/webmcp/security/confirmationPolicy.ts
- src/client/src/webmcp/security/permissionPolicy.ts

## OrangeHRM Module Coverage Map
The plugin route inventory confirms strong API support for these modules:

Tier 1 (build first):
1. Admin
2. PIM
3. Leave
4. Time
5. Recruitment

Tier 2:
1. Attendance
2. Dashboard
3. Buzz
4. Claim
5. Corporate Directory

Tier 3 (infra/specialized):
1. Authentication
2. OAuth/OpenID/LDAP
3. Corporate Branding
4. Maintenance
5. Mobile
6. System Check
7. I18N
8. Help

Relevant route sources per plugin:
- [src/plugins/orangehrmAdminPlugin/config/routes.yaml](src/plugins/orangehrmAdminPlugin/config/routes.yaml)
- [src/plugins/orangehrmPimPlugin/config/routes.yaml](src/plugins/orangehrmPimPlugin/config/routes.yaml)
- [src/plugins/orangehrmLeavePlugin/config/routes.yaml](src/plugins/orangehrmLeavePlugin/config/routes.yaml)
- [src/plugins/orangehrmTimePlugin/config/routes.yaml](src/plugins/orangehrmTimePlugin/config/routes.yaml)
- [src/plugins/orangehrmRecruitmentPlugin/config/routes.yaml](src/plugins/orangehrmRecruitmentPlugin/config/routes.yaml)

## Tool Design Standards
Apply these standards to every tool:
1. Stable name: verb_noun pattern, lowercase, underscore.
2. Explicit JSON schema: types, required fields, enums, limits.
3. Deterministic output shape:
   - success: boolean
   - message: string
   - data: object or array
   - errorCode: optional string
4. Permission check before API call.
5. Confirmation gate for write/delete/approval actions.
6. UI sync after execution so users see what changed.
7. Audit log event written for each tool invocation.

## Initial Tool Set (Tier 1)

### Admin
- list_system_users
- create_system_user
- update_system_user
- list_job_titles
- create_job_title
- list_subunits

### PIM
- search_employees
- get_employee_profile
- create_employee
- update_employee_contact
- add_employee_dependent
- get_employee_documents

### Leave
- list_leave_types
- get_leave_balance
- apply_leave
- list_my_leave_requests
- approve_leave_request
- reject_leave_request

### Time
- list_projects
- list_project_activities
- create_timesheet_entry
- submit_timesheet
- approve_timesheet
- get_employee_time_report

### Recruitment
- list_vacancies
- create_vacancy
- list_candidates
- shortlist_candidate
- schedule_interview
- record_interview_result

## Flow JSON Pattern (VegCart-style)
Use flow files that sequence tool calls exactly like your VegCart reference.

File naming:
- src/client/src/webmcp/flows/flow-01-pim-employee-onboarding.json
- src/client/src/webmcp/flows/flow-02-leave-apply-and-approve.json
- src/client/src/webmcp/flows/flow-03-recruitment-hire-path.json
- src/client/src/webmcp/flows/flow-04-timesheet-submit-approve.json

Step shape:
- id
- toolName
- params
- label
- optional onError policy: stop, retry_once, continue

## Security and Governance
1. RBAC-aware tools:
   - Expose only tools allowed for logged-in user role.
2. Sensitive actions:
   - Require user confirmation dialog for approve/reject/delete/update salary/profile.
3. Data minimization:
   - Redact high-risk fields in tool responses by default.
4. Rate limits:
   - Throttle repeated write operations.
5. Traceability:
   - Persist tool audit entries with user, timestamp, input hash, result.

Reference:
- [webmcp/docs/security-privacy-considerations.md](webmcp/docs/security-privacy-considerations.md)

## Implementation Phases

Phase 0: Foundations (2-3 days)
1. Add webmcp core folders and registry bootstrap.
2. Add feature flag: WEBMCP_ENABLED.
3. Add base schema validation and tool response utility.
4. Add permission and confirmation guard hooks.

Phase 1: Tier 1 Read tools (4-6 days)
1. Implement list/search/get tools for Admin, PIM, Leave, Time, Recruitment.
2. Add smoke flows for read-only journeys.
3. Validate UI update and structured output.

Phase 2: Tier 1 Write tools (5-8 days)
1. Implement create/update/approve/reject tools.
2. Add mandatory confirmation gates.
3. Add end-to-end happy path and rollback tests.

Phase 3: Tier 2 modules (1-2 weeks)
1. Attendance, Dashboard, Buzz, Claim, Corporate Directory.
2. Add cross-module composite flows.

Phase 4: Hardening (1 week)
1. Audit logging and monitoring.
2. Performance tuning for sequential tool execution.
3. Security review and threat scenarios.

## Test Strategy
1. Unit tests:
   - Schema validation, permission guard, response formatting.
2. Integration tests:
   - Tool execution against mocked API services.
3. End-to-end tests:
   - Flow JSON execution and visible UI sync checks.
4. Negative tests:
   - Unauthorized role, invalid schema, missing required fields, concurrency conflicts.

## Recommended First Sprint Backlog
1. Build webmcp core bootstrap and tool registry.
2. Implement 10 read tools:
   - search_employees
   - get_employee_profile
   - list_leave_types
   - get_leave_balance
   - list_projects
   - list_project_activities
   - list_vacancies
   - list_candidates
   - list_system_users
   - list_job_titles
3. Add 2 flow files:
   - employee profile lookup flow
   - leave balance and leave type discovery flow
4. Add test harness for running flow JSON locally.

## Success Criteria
1. Agent can discover and execute at least 10 Tier 1 tools.
2. Every write operation requires explicit user confirmation.
3. 2 end-to-end flows execute without manual UI actuation.
4. Audit log exists for each tool call.
5. No P1 security issue found in review.

## Next Step After This Plan
Implement Phase 0 scaffolding now, then deliver the first 10 read tools from Tier 1 in a single incremental branch.

## Implementation Status (May 16, 2026)
Completed:
1. WebMCP bootstrap and registration in frontend app startup.
2. Core WebMCP layer:
   - model context types
   - tool registry
   - schema required-field validation
   - standardized tool response model
   - API GET/POST/PUT client wrappers
   - role and confirmation guard helpers
3. Read tools implemented (10):
   - search_employees
   - get_employee_profile
   - list_leave_types
   - get_leave_balance
   - list_projects
   - list_project_activities
   - list_vacancies
   - list_candidates
   - list_system_users
   - list_job_titles
4. Write tools implemented (5):
   - create_employee
   - apply_leave
   - submit_timesheet
   - approve_leave_request
   - shortlist_candidate
5. Flow JSON files added:
   - flow-01-employee-profile-lookup.json
   - flow-02-leave-balance-discovery.json
   - flow-03-apply-and-approve-leave.json
   - flow-04-recruitment-shortlist.json

Remaining:
1. Add server-provided role mapping for strict RBAC (instead of fallback role strategy).
2. Add flow runner UI/service to execute flow files automatically.
3. Add audit logging persistence for each tool invocation.
4. Expand write tools to remaining Tier 1 module actions.

## Hardening + deploy pass

Scope: in-browser surface only; harden the existing 34 tools; ship to the
Railway 5.9 instance; permissions must match the logged-in user.

Done:
1. `navigator.modelContext` no longer required from an extension — a local
   provider is installed when absent (`core/modelContextPolyfill.ts`), and the
   registry always populates its executor map so `window.webmcp.executeTool`
   works for manual testing.
2. Fake role guard removed. Tools are filtered at registration by the user's
   permission-filtered menu (`core/permissionPolicy.ts`, fed from
   `:topbar-menu-items` in `main.ts`); the API 403 is the hard gate, surfaced as
   `WEBMCP_FORBIDDEN` by `core/apiClient.ts`.
3. Feature flag: build-time `VUE_APP_WEBMCP`, per-browser `WEBMCP_ENABLED`;
   registration also requires a logged-in user, so tools never load on the
   login page.
4. Schema validation extended to types / enums / minimums
   (`core/toolSchemas.ts`). All 34 endpoints re-checked against 5.9;
   `shortlist_candidate` lost its bogus `vacancyId`, action enums added for
   `submit_timesheet` / `approve_leave_request`.
5. Post-run full-page navigation is now opt-in (`WEBMCP_NAVIGATE`).
6. `__tests__/webmcp.test.ts` rewritten to exercise the real modules (only the
   HTTP client mocked); ad-hoc scripts removed.
7. Shipped: `Dockerfile` stage 1 copies `src/webmcp/`, `main.ts` and
   `shims-vue.d.ts` onto the 5.9 build with `VUE_APP_WEBMCP=true`.

Still open:
- Confirmation fallback still uses `window.confirm`; an agent's
  `requestUserInteraction` is preferred. Upgrade the fallback to an oxd dialog.
- Server-provided role for per-tool (not per-module) precision.
- Server-persisted audit log.