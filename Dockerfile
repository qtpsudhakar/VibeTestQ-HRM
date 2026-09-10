# Deployment image (used by Railway and .github/workflows/docker_build.yml): the stock OrangeHRM image (keeps its entrypoint, ORANGEHRM_*
# DB auto-config and /orangehrm volume handling) with this repo's asset
# customisations layered on top.
#
# Pinned to 5.9, which is what "latest" resolves to and what this Railway
# service is currently running - so this is not a version change, only an
# asset overlay. If you bump this tag, re-check that the paths below still
# exist in the new image.
FROM orangehrm/orangehrm:5.9

COPY --chown=www-data:www-data web/images/ /var/www/html/web/images/
COPY --chown=www-data:www-data logo.png   /var/www/html/logo.png
