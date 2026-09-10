/**
 * Page-scoped WebMCP tool registration for OrangeHRM's Options-API components.
 *
 * A page component declares a `webMcpTools()` option returning tool definitions
 * whose `execute` closes over `this` — so a tool can set the component's reactive
 * model and call the same method a button calls, and the visible UI updates.
 * The global `webMcpMixin` (installed in main.ts) registers them on `mounted`
 * and removes them on `beforeUnmount`, so the available tool set follows the
 * screen the user is on.
 *
 *   export default {
 *     webMcpTools() {
 *       return [{
 *         name: 'update_personal_details',
 *         description: '...',
 *         inputSchema: { type: 'object', properties: { firstName: {type:'string'} } },
 *         execute: async ({firstName}) => {
 *           if (firstName) this.employee.firstName = firstName;
 *           await this.onSave();
 *           return ok('Personal details updated');
 *         },
 *       }];
 *     },
 *   }
 */
import {ComponentOptions} from 'vue';
import {isWebMcpEnabled} from './core/toolGuards';
import {resolveModelContext} from './core/modelContextPolyfill';
import {registerTools} from './core/toolRegistry';
import {ModelContextToolDefinition} from './core/modelContext.types';

export type WebMcpTool = ModelContextToolDefinition;

type WithWebMcp = {
  $options: {webMcpTools?: () => WebMcpTool[]};
  __webMcpController?: AbortController;
};

export const webMcpMixin: ComponentOptions = {
  mounted(this: unknown) {
    const vm = this as WithWebMcp;
    const factory = vm.$options.webMcpTools;
    if (typeof factory !== 'function' || !isWebMcpEnabled()) {
      return;
    }

    let tools: WebMcpTool[] = [];
    try {
      tools = factory.call(this) ?? [];
    } catch {
      // a page's tool factory threw — never break the page over it
      return;
    }
    if (tools.length === 0) {
      return;
    }

    resolveModelContext();
    const controller = new AbortController();
    vm.__webMcpController = controller;
    registerTools(tools, {signal: controller.signal});
  },

  beforeUnmount(this: unknown) {
    (this as WithWebMcp).__webMcpController?.abort();
  },
};
