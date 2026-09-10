# Deployment image (used by Railway and .github/workflows/docker_build.yml).
#
# Stage 1 compiles the OrangeHRM 5.9 frontend with this repo's login-page
# customisation applied. Stage 2 is the stock orangehrm/orangehrm:5.9 image
# with the freshly built frontend and this repo's branding images layered on
# top, plus an entrypoint that regenerates lib/confs/Conf.php from the
# ORANGEHRM_DATABASE_* env vars so redeploys land on the login page instead of
# the installer (see docker/railway-entrypoint.sh).
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

ENV NODE_OPTIONS=--max-old-space-size=4096
RUN node .yarn/releases/yarn-4.1.0.cjs install --immutable \
 && node .yarn/releases/yarn-4.1.0.cjs build
# build output -> /ohrm/web/dist

# ---- Stage 2: runtime -----------------------------------------------------
FROM orangehrm/orangehrm:5.9

COPY --from=client --chown=www-data:www-data /ohrm/web/dist/ /var/www/html/web/dist/
COPY --chown=www-data:www-data web/images/ /var/www/html/web/images/
COPY --chown=www-data:www-data logo.png    /var/www/html/logo.png

COPY docker/railway-entrypoint.sh /usr/local/bin/railway-entrypoint.sh
RUN chmod +x /usr/local/bin/railway-entrypoint.sh
ENTRYPOINT ["railway-entrypoint.sh"]
CMD ["apache2-foreground"]
