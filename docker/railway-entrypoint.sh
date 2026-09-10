#!/bin/sh
# Regenerate lib/confs/Conf.php on every boot so the app is "installed" on a
# fresh container.
#
# Why: the orangehrm/orangehrm image declares VOLUME /var/www/html and ships no
# database auto-config. On Railway this service's persistent volume is mounted
# elsewhere, so the web installer's Conf.php lives only in the container's
# writable layer and is lost on every redeploy, sending the app back to the
# installer. This file makes Config::isInstalled() true on a fresh container by
# reading the ORANGEHRM_DATABASE_* env vars (which Railway always injects) at
# PHP runtime. The database already holds the 5.9 schema and data, so no
# installer/upgrader step is needed.
set -eu

CONF_DIR=/var/www/html/lib/confs
CONF_FILE="$CONF_DIR/Conf.php"

if [ -n "${ORANGEHRM_DATABASE_HOST:-}" ] && [ -n "${ORANGEHRM_DATABASE_NAME:-}" ]; then
    mkdir -p "$CONF_DIR/cryptokeys"

    # Conf.php reads the environment itself (via getenv) so no secrets are
    # written into the image layer. Shape matches installer/config/Conf.tpl.php.
    cat > "$CONF_FILE" <<'PHP'
<?php

class Conf
{
    private string $dbHost;
    private string $dbPort;
    private string $dbName;
    private string $dbUser;
    private string $dbPass;

    public function __construct()
    {
        $this->dbHost = getenv('ORANGEHRM_DATABASE_HOST') ?: 'localhost';
        $this->dbPort = getenv('ORANGEHRM_DATABASE_PORT') ?: '3306';
        $name = getenv('ORANGEHRM_DATABASE_NAME') ?: 'orangehrm';
        if (defined('ENVIRONMENT') && ENVIRONMENT == 'test') {
            $prefix = defined('TEST_DB_PREFIX') ? TEST_DB_PREFIX : '';
            $this->dbName = $prefix . 'test_' . $name;
        } else {
            $this->dbName = $name;
        }
        $this->dbUser = getenv('ORANGEHRM_DATABASE_USER') ?: 'root';
        $this->dbPass = getenv('ORANGEHRM_DATABASE_PASSWORD') ?: '';
    }

    public function getDbHost(): string
    {
        return $this->dbHost;
    }

    public function getDbPort(): string
    {
        return $this->dbPort;
    }

    public function getDbName(): string
    {
        return $this->dbName;
    }

    public function getDbUser(): string
    {
        return $this->dbUser;
    }

    public function getDbPass(): string
    {
        return $this->dbPass;
    }
}
PHP
    chown -R www-data:www-data "$CONF_DIR"
    echo "[railway-entrypoint] wrote $CONF_FILE (db ${ORANGEHRM_DATABASE_NAME}@${ORANGEHRM_DATABASE_HOST})"
else
    echo "[railway-entrypoint] ORANGEHRM_DATABASE_* not set; leaving existing config untouched"
fi

exec docker-php-entrypoint "$@"
