# In-browser WebMCP tools

These modules expose OrangeHRM actions as [WebMCP](https://github.com/webmachinelearning/webmcp)
tools that run inside the logged-in OrangeHRM tab, so an AI agent can call them
instead of driving the UI.

## How it wires up

`main.ts` calls `registerWebMcpTools(context)` after login, where `context`
carries the `:user` and `:topbar-menu-items` values the backend renders onto the
root layout element. Registration:

1. no-ops unless the feature flag is on and a user is logged in;
2. installs a local `navigator.modelContext` if the browser/extension has not
   provided one (`core/modelContextPolyfill.ts`);
3. resolves which modules the user can reach from their menu
   (`core/permissionPolicy.ts`) and registers only the matching tools;
4. wraps each tool with schema validation, a confirmation gate for writes, an
   audit-log entry and a `webmcp:tool-result` event.

The OrangeHRM API enforces the real permissions — a disallowed call returns a
`WEBMCP_FORBIDDEN` result. The menu filter is only a usability layer.

## Enabling

Built with `VUE_APP_WEBMCP=true` (set in the Dockerfile). Per browser:

```js
localStorage.setItem('WEBMCP_ENABLED', 'true'); // force on
localStorage.setItem('WEBMCP_ENABLED', 'false'); // force off
localStorage.setItem('WEBMCP_NAVIGATE', 'true'); // navigate to the affected screen after a write
```

## Debug API

`window.webmcp` is attached for manual testing:

| call                             | purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `webmcp.tools()`                 | registered tool names for this user                         |
| `webmcp.modules()`               | modules the user can reach                                  |
| `webmcp.executeTool(name, args)` | run a tool, returns `{success, message, data?, errorCode?}` |
| `webmcp.auditLogs()`             | recent invocations (localStorage, capped at 500)            |
| `webmcp.clearAuditLogs()`        | wipe the audit log                                          |

An external agent uses the same tools through a WebMCP browser extension that
provides `navigator.modelContext`.

## Tools

34 tools across Admin, PIM, Leave, Time and Recruitment. Read tools list/search;
write tools (create / apply / approve / shortlist / submit) always require
confirmation. See `tools/*.ts` for names and schemas.

## Tests

```
cd src/client && yarn jest src/webmcp
```

`__tests__/webmcp.test.ts` exercises the real registry, validation, permission
gate, confirmation flow and audit log with only the HTTP client mocked. Tests are
excluded from the production image build.
