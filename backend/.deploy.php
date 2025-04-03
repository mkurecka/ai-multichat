<?php declare(strict_types=1);

use function Deployer\{after, get, host, import, run, set, task, upload, writeln};

require 'recipe/common.php';
require 'contrib/cachetool.php';

$projectPath = 'backend';

set('shared_dirs', [
    "$projectPath/var/log",
    "$projectPath/config/jwt",
    "$projectPath/data",
]);

set('shared_files', [
    "$projectPath/.env.local",
]);

set('writable_dirs', [
    "$projectPath/var",
    "$projectPath/var/cache",
    "$projectPath/var/log",
    "$projectPath/var/sessions",
]);

set('log_files', "$projectPath/var/log/*.log");

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
task(TASK_COPY_APPLICATION, function () use ($projectPath): void {
    $config = ['options' => ["--exclude-from=excludeFromDeploy"]];
    // Go up one directory to get the root of the repository
    upload('..', '{{release_path}}', $config);
});

const TASK_COPY_FRONTEND = 'copy-frontend';
task(TASK_COPY_FRONTEND, function () use ($projectPath): void {
    run("cp -r {{release_path}}/frontend/dist/* {{release_path}}/$projectPath/public/");
});

const TASK_CLEAR_CACHE = 'clear-cache';
task(TASK_CLEAR_CACHE, function () use ($projectPath): void {
    // Explicitly set environment to prod when clearing cache
    run("cd {{release_path}}/$projectPath && {{bin/php}} bin/console cache:clear --env=prod");
});

const TASK_RUN_MIGRATIONS = 'run-migrations';
task(TASK_RUN_MIGRATIONS, function () use ($env, $projectPath): void {
    $options = '--allow-no-migration';
    run("{{bin/php}} {{release_path}}/$projectPath/bin/console doctrine:migrations:migrate $options {{console_options}}");
});

const TASK_SCHEMA_UPDATE = 'schema-update';
task(TASK_SCHEMA_UPDATE, function () use ($env, $projectPath): void {
    $options = '--force';
    run("{{bin/php}} {{release_path}}/$projectPath/bin/console doctrine:schema:update $options {{console_options}}");
});

const TASK_VALIDATE_MAPPING = 'validate-mapping';
task(TASK_VALIDATE_MAPPING, function () use ($env, $projectPath): void {
    run("{{bin/php}} {{release_path}}/$projectPath/bin/console doctrine:schema:validate {{console_options}}");
});

const TASK_WARM_UP_CACHE = 'warm-up-cache';
task(TASK_WARM_UP_CACHE, function () use ($projectPath): void {
    run("{{bin/php}} {{release_path}}/$projectPath/bin/console cache:warmup");
});

const TASK_ASSET_MAP_COMPILE = 'asset-map-compile';
task(TASK_ASSET_MAP_COMPILE, function () use ($projectPath): void {
    run("{{bin/php}} {{release_path}}/$projectPath/bin/console importmap:install");
    run("{{bin/php}} {{release_path}}/$projectPath/bin/console asset-map:compile");
});

const TASK_INSTALL_DEPENDENCIES = 'install-dependencies';
task(TASK_INSTALL_DEPENDENCIES, function () use ($projectPath): void {
    // Make sure APP_ENV is set to prod during deployment
    run("cd {{release_path}}/$projectPath && APP_ENV=prod php composer.phar install --no-dev --optimize-autoloader");
    
    // Ensure .env.local has APP_ENV=prod
    run("if [ -f {{release_path}}/$projectPath/.env.local ]; then grep -q 'APP_ENV=' {{release_path}}/$projectPath/.env.local && sed -i 's/APP_ENV=.*/APP_ENV=prod/' {{release_path}}/$projectPath/.env.local || echo 'APP_ENV=prod' >> {{release_path}}/$projectPath/.env.local; fi");
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
    //TASK_VALIDATE_MAPPING,
    TASK_SCHEMA_UPDATE,
    TASK_WARM_UP_CACHE,

    // switch to deployed version
    'deploy:symlink',

    // cleanup
    'deploy:unlock',
    'deploy:cleanup',
    'deploy:success',
]);

//after('deploy:symlink', 'cachetool:clear:opcache');
//after('deploy:symlink', 'cachetool:clear:stat');
after('deploy:symlink', TASK_CLEAR_CACHE);

after('deploy:failed', 'deploy:unlock');
