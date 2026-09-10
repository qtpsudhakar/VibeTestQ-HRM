/**
 * OrangeHRM is a comprehensive Human Resource Management (HRM) System that captures
 * all the essential functionalities required for any enterprise.
 * Copyright (C) 2006 OrangeHRM Inc., http://www.orangehrm.com
 *
 * OrangeHRM is free software: you can redistribute it and/or modify it under the terms of
 * the GNU General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *
 * OrangeHRM is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with OrangeHRM.
 * If not, see <https://www.gnu.org/licenses/>.
 */

import {createApp} from 'vue';
import components from './components';
import pages from './pages';
import acl, {AclAPI} from './core/plugins/acl/acl';
import toaster, {ToasterAPI} from './core/plugins/toaster/toaster';
import createI18n, {TranslateAPI} from './core/plugins/i18n/translate';
import '@ohrm/oxd/fonts.css';
import '@ohrm/oxd/icons.css';
import '@ohrm/oxd/style.css';
import './core/styles/global.scss';
import './core/plugins/toaster/toaster.scss';
import './core/plugins/loader/loader.scss';
import {registerWebMcpTools} from './webmcp/registerWebMcp';

type WebMcpToolResultDetail = {
  toolName: string;
  success: boolean;
  message: string;
  errorCode?: string;
  navigatedTo?: string;
};

const app = createApp({
  name: 'App',
  components: pages,
});

// Global Register Components
app.use(components);

app.use(toaster, {
  duration: 2500,
  persist: false,
  animation: 'oxd-toast-list',
  position: 'bottom',
});

window.addEventListener('webmcp:tool-result', (event: Event) => {
  const customEvent = event as CustomEvent<WebMcpToolResultDetail>;
  const detail = customEvent.detail;
  if (!detail) {
    return;
  }

  const toast = app.config.globalProperties.$toast as ToasterAPI | undefined;
  if (!toast) {
    return;
  }

  const message = detail.navigatedTo
    ? `${detail.message} (navigating...)`
    : detail.message;

  if (detail.success) {
    void toast.success({
      title: `WebMCP: ${detail.toolName}`,
      message,
    });
    return;
  }

  const errorMessage = detail.errorCode
    ? `${message} [${detail.errorCode}]`
    : message;

  void toast.error({
    title: `WebMCP: ${detail.toolName}`,
    message: errorMessage,
  });
});

const baseUrl = window.appGlobal.baseUrl;

const {i18n, init} = createI18n({
  baseUrl: baseUrl,
  resourceUrl: '/core/i18n/messages',
});

app.use(acl);
app.use(i18n);

// https://github.com/vuejs/vue-next/pull/982
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $toast: ToasterAPI;
    $can: AclAPI;
    $t: TranslateAPI;
  }
}

app.config.globalProperties.global = {
  baseUrl,
};

// Read the JSON props the backend renders onto the root layout element so
// WebMCP can gate tools by the current user's permission-filtered menu.
const readWebMcpContext = () => {
  const rootEl = document.querySelector('#app')?.firstElementChild ?? null;
  const readJson = <T>(attr: string): T | undefined => {
    try {
      const raw = rootEl?.getAttribute(attr);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  };
  return {
    user: readJson<{firstName?: string}>(':user') ?? null,
    topMenu: readJson<unknown>(':topbar-menu-items'),
    sideMenu: readJson<unknown>(':sidepanel-menu-items'),
  };
};

init().then(() => {
  registerWebMcpTools(readWebMcpContext());
  app.mount('#app');
});
