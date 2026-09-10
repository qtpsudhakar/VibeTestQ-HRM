# Deployment image (used by Railway and .github/workflows/docker_build.yml).
#
# Stage 1 compiles the OrangeHRM 5.9 frontend with this repo's login-page
# customisation and the in-browser WebMCP tools applied. Stage 2 is the stock
# orangehrm/orangehrm:5.9 image with the freshly built frontend and this repo's
# branding images layered on top, plus a lib/confs/Conf.php that reads the
# ORANGEHRM_DATABASE_* env vars at runtime so redeploys land on the login page
# instead of the installer (see docker/Conf.php).
#
# Pinned to 5.9 = what this Railway service already runs, so this is not a
# version change. If you bump the tag, bump OHRM_TAG to match.

# ---- Stage 1: build the customised frontend --------------------------------
FROM node:20-bookworm AS client
ARG OHRM_TAG=5.9
RUN git clone --depth 1 --branch "${OHRM_TAG}" https://github.com/orangehrm/orangehrm.git /ohrm
WORKDIR /ohrm/src/client

# Our customisation: login footer links (VibeTestQ / LinkedIn / npm package).
# Login.vue and login.scss are byte-identical between upstream 5.8.1 and 5.9,
# so applying this repo's copies onto the 5.9 tree is safe.
COPY src/client/src/orangehrmAuthenticationPlugin/pages/Login.vue  src/orangehrmAuthenticationPlugin/pages/Login.vue
COPY src/client/src/orangehrmAuthenticationPlugin/pages/login.scss src/orangehrmAuthenticationPlugin/pages/login.scss

# In-browser WebMCP tools. main.ts and shims-vue.d.ts are byte-identical between
# upstream 5.8.1 and 5.9, so this repo's copies apply cleanly. This repo's
# shims-vue.d.ts properly declares window.appGlobal, which makes upstream's
# defensive `@ts-expect-error` in url.ts an unused directive (TS2578) — drop it.
# Tests are not shipped in the image.
COPY src/client/src/webmcp/        src/webmcp/
COPY src/client/src/main.ts        src/main.ts
COPY src/client/src/shims-vue.d.ts src/shims-vue.d.ts
RUN rm -rf src/webmcp/__tests__ \
 && sed -i '/@ts-expect-error: appGlobal is not in window object by default/d' \
      src/core/util/helper/url.ts

# Page components that register their own screen-scoped WebMCP tools via a
# `webMcpTools()` option. All seven are byte-identical between upstream 5.8.1 and
# 5.9, so this repo's edited copies apply onto the 5.9 tree.
COPY src/client/src/orangehrmPimPlugin/pages/employee/Employee.vue                  src/orangehrmPimPlugin/pages/employee/Employee.vue
COPY src/client/src/orangehrmPimPlugin/pages/employee/SaveEmployee.vue              src/orangehrmPimPlugin/pages/employee/SaveEmployee.vue
COPY src/client/src/orangehrmPimPlugin/pages/employee/EmployeePersonalDetails.vue   src/orangehrmPimPlugin/pages/employee/EmployeePersonalDetails.vue
COPY src/client/src/orangehrmPimPlugin/pages/employee/EmployeeContactDetails.vue    src/orangehrmPimPlugin/pages/employee/EmployeeContactDetails.vue
COPY src/client/src/orangehrmAdminPlugin/pages/systemUser/SystemUser.vue            src/orangehrmAdminPlugin/pages/systemUser/SystemUser.vue
COPY src/client/src/orangehrmAdminPlugin/pages/systemUser/SaveSystemUser.vue        src/orangehrmAdminPlugin/pages/systemUser/SaveSystemUser.vue
COPY src/client/src/orangehrmAdminPlugin/pages/systemUser/EditSystemUser.vue        src/orangehrmAdminPlugin/pages/systemUser/EditSystemUser.vue

# Enable WebMCP for this build. Can still be toggled per browser with
# localStorage.WEBMCP_ENABLED.
ENV VUE_APP_WEBMCP=true

ENV NODE_OPTIONS=--max-old-space-size=4096
RUN node .yarn/releases/yarn-4.1.0.cjs install --immutable \
 && node .yarn/releases/yarn-4.1.0.cjs build
# build output -> /ohrm/web/dist

# ---- Stage 2: runtime -----------------------------------------------------
FROM orangehrm/orangehrm:5.9

COPY --from=client --chown=www-data:www-data /ohrm/web/dist/ /var/www/html/web/dist/
COPY --chown=www-data:www-data web/images/ /var/www/html/web/images/
COPY --chown=www-data:www-data logo.png    /var/www/html/logo.png

# Make the app "installed" on any fresh container (see docker/Conf.php).
COPY --chown=www-data:www-data docker/Conf.php /var/www/html/lib/confs/Conf.php
RUN mkdir -p /var/www/html/lib/confs/cryptokeys \
 && chown -R www-data:www-data /var/www/html/lib/confs
