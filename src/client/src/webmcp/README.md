# In-browser WebMCP tools

These modules expose OrangeHRM actions as [WebMCP](https://github.com/webmachinelearning/webmcp)
tools that run inside the logged-in OrangeHRM tab. An AI agent (via a WebMCP
browser extension) calls them; the tool reuses the screen's own Vue code, so the
visible UI reflects what the agent did — the point of WebMCP over a remote MCP
server.

## Two kinds of tool

**Page tools** — the real work. A page component declares a `webMcpTools()`
option returning tool definitions whose `execute` closes over `this`. The handler
sets the component's reactive model and calls the same method a button calls
(`onSave`, `deleteItems`, `filterItems`), so the form fills in, the list
refreshes, the browser navigates — exactly the manual flow. The `webMcpMixin`
(installed in `main.ts`) registers them on `mounted` and removes them on
`beforeUnmount`, so the available tools follow the screen you are on.

Current page tools:

| Screen | Tools |
|---|---|
| Employee list | `search_employees`, `delete_employee` |
| Add Employee | `create_employee` |
| Personal Details | `update_personal_details` |
| Contact Details | `update_contact_details` |
| System Users list | `search_users`, `delete_user` |
| Add User | `create_user` |
| Edit User | `update_user`, `change_user_password` |

**Global tools** — registered once from `registerWebMcp.ts`, filtered by the
user's menu:

- Navigator: `find_employee`, `find_user`, `open_employee_list`,
  `open_add_employee`, `open_employee`, `open_employee_contact_details`,
  `open_system_users`, `open_add_user`, `open_user`. These only look records up or
  move the tab; the destination screen's own tools do the work.
- Reference reads: `list_job_titles`, `list_subunits`, `list_locations`, … so an
  agent can learn valid values before filling a form.

## Flow

An agent on the dashboard: `open_add_employee` → the Add Employee page loads and a
`toolchange` fires → `create_employee({firstName:'Ada', lastName:'Lovelace'})` →
the form fields populate, it saves, the tab lands on Ada's Personal Details page →
`update_personal_details` is now available.

## Behaviour

- Read tools (`annotations.readOnlyHint`) run without a prompt.
- Write tools call `requestConfirmation` first — the agent's own
  `requestUserInteraction`, or `window.confirm` as a fallback.
- No toast: a write navigates, and the result screen is the confirmation.
- The API enforces real permissions; a disallowed call returns `WEBMCP_FORBIDDEN`.

## Enabling

Built with `VUE_APP_WEBMCP=true` (Dockerfile). Per browser:
`localStorage.setItem('WEBMCP_ENABLED', 'true' | 'false')`.

## Debug API

`window.webmcp`: `tools()`, `modules()`, `executeTool(name, args)`,
`auditLogs()`, `clearAuditLogs()`. If the browser has no WebMCP provider a local
`navigator.modelContext` is installed so these still work.

## Tests

```
cd src/client && yarn jest src/webmcp
```

Covers the registry (add/remove via AbortSignal, validation, error mapping), the
navigator/reference tools, and the `webMcpMixin` lifecycle plus a page-tool
handler against a fake component. Excluded from the production image build.
