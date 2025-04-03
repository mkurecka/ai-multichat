<?php declare(strict_types=1);

use function Deployer\{after, get, host, import, run, set, task, upload, writeln};

require 'recipe/common.php';
require 'contrib/cachetool.php';

// Project path is now the root directory
$projectPath = '';

set('shared_dirs', [
    "var/log",
    "config/jwt",
    "data",
]);

set('shared_files', [
    ".env.local",
]);

set('writable_dirs', [
    "var",
    "var/cache",
    "var/log",
    "var/sessions",
]);

set('log_files', "var/log/*.log");

set('console_options', function () {
    return '--no-interaction';
});

$env = getenv();
host('host')
    ->set('hostname', $env['DEPLOYMENT_HOSTNAME'])
    ->set('remote_user', $env['DEPLOYMENT_USER'])
    ->set('deploy_path', $env['DEPLOYMENT_PATH'])
    ->set('php_version', $env['DEPLOYMENT_PHP_VERSION']);

const TASK_COPY_APPLICATION = 'copy-application';
task(TASK_COPY_APPLICATION, function (): void {
    // Upload the entire project as the root
    upload('.', '{{release_path}}');
});

const TASK_COPY_FRONTEND = 'copy-frontend';
task(TASK_COPY_FRONTEND, function (): void {
    // Create the public/build directory
    run("mkdir -p {{release_path}}/public/build");
    
    // Copy frontend assets to the public/build directory
    // Use absolute path since we're in the project root
    $frontendBuildPath = dirname(__DIR__) . '/public/build';
    if (is_dir($frontendBuildPath)) {
        upload($frontendBuildPath . '/', '{{release_path}}/public/build/');
    } else {
        writeln("<comment>Warning: Frontend build directory not found at $frontendBuildPath</comment>");
        // Try relative path from current directory
        if (is_dir('public/build')) {
            upload('public/build/', '{{release_path}}/public/build/');
        } else {
            writeln("<error>Error: Could not find public/build directory</error>");
        }
    }
});

const TASK_CLEAR_CACHE = 'clear-cache';
task(TASK_CLEAR_CACHE, function (): void {
    // Explicitly set environment to prod when clearing cache
    run("cd {{release_path}} && APP_ENV=prod {{bin/php}} bin/console cache:clear --env=prod");
});

const TASK_RUN_MIGRATIONS = 'run-migrations';
task(TASK_RUN_MIGRATIONS, function () use ($env): void {
    $options = '--allow-no-migration';
    run("{{bin/php}} {{release_path}}/bin/console doctrine:migrations:migrate $options {{console_options}}");
});

const TASK_SCHEMA_UPDATE = 'schema-update';
task(TASK_SCHEMA_UPDATE, function () use ($env): void {
    $options = '--force';
    run("{{bin/php}} {{release_path}}/bin/console doctrine:schema:update $options {{console_options}}");
});

const TASK_VALIDATE_MAPPING = 'validate-mapping';
task(TASK_VALIDATE_MAPPING, function () use ($env): void {
    run("{{bin/php}} {{release_path}}/bin/console doctrine:schema:validate {{console_options}}");
});

const TASK_WARM_UP_CACHE = 'warm-up-cache';
task(TASK_WARM_UP_CACHE, function (): void {
    run("{{bin/php}} {{release_path}}/bin/console cache:warmup");
});

const TASK_INSTALL_DEPENDENCIES = 'install-dependencies';
task(TASK_INSTALL_DEPENDENCIES, function (): void {
    // Make sure APP_ENV is set to prod during deployment
    run("cd {{release_path}} && APP_ENV=prod php composer.phar install --no-dev --optimize-autoloader");

    // Ensure .env.local has APP_ENV=prod
    run("if [ -f {{release_path}}/.env.local ]; then grep -q 'APP_ENV=' {{release_path}}/.env.local && sed -i 's/APP_ENV=.*/APP_ENV=prod/' {{release_path}}/.env.local || echo 'APP_ENV=prod' >> {{release_path}}/.env.local; fi");
});

set('cachetool_url', 'https://github.com/gordalina/cachetool/releases/download/9.2.1/cachetool.phar');

task('deploy', [
    // prepare
    'deploy:info',
    'deploy:setup',
    'deploy:lock',
    'deploy:release',

    // copy
    'deploy:copy_dirs',
    TASK_COPY_APPLICATION,
    TASK_COPY_FRONTEND,

    // set up files and directories
    'deploy:shared',
    'deploy:writable',
    TASK_INSTALL_DEPENDENCIES,
    TASK_SCHEMA_UPDATE,
    TASK_WARM_UP_CACHE,

    // switch to deployed version
    'deploy:symlink',

    // cleanup
    'deploy:unlock',
    'deploy:cleanup',
    'deploy:success',
]);

after('deploy:symlink', TASK_CLEAR_CACHE);

after('deploy:failed', 'deploy:unlock');
