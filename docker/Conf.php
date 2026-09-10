<?php

/**
 * Deployment database config for the Railway image.
 *
 * The orangehrm/orangehrm image ships no database auto-config and its
 * VOLUME /var/www/html is not the path this Railway service persists, so the
 * web installer's Conf.php never survives a redeploy and the app falls back to
 * the installer. This file is baked into the image at build time (see
 * Dockerfile) and reads the ORANGEHRM_DATABASE_* environment variables Railway
 * injects, so Config::isInstalled() is true on every fresh container and
 * redeploys land on the login page. The database already holds the schema and
 * data, so no installer/upgrader run is needed.
 *
 * Shape matches installer/config/Conf.tpl.php for the pinned OrangeHRM version.
 */
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
