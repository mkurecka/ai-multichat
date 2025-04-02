<?php declare(strict_types=1);

use function Deployer\{after, get, host, import, run, set, task, upload, writeln};

import('recipe/common.php');
import('contrib/cachetool.php');

set('shared_dirs', [
    'var/log',
    'config/jwt',
    'data',
]);

set('shared_files', [
    '.env.local',
]);

set('writable_dirs', [
    'var',
    'var/cache',
    'var/log',
    'var/sessions',
]);

set('log_files', 'var/log/*.log');

set('console_options', function () {
    return '--no-interaction';
});

$env = getenv();
host('host')
    ->set('hostname', $env['DEPLOYMENT_HOSTNAME'])
    ->set('remote_user', $env['DEPLOYMENT_USER'])
    ->set('deploy_path', $env['DEPLOYMENT_PATH'])
    ->set('cachetool_args', sprintf(
        '--web=SymfonyHttpClient --web-path=%s --web-url=%s',
        escapeshellarg(sprintf('%s/current/www', rtrim($env['DEPLOYMENT_PATH'], '/'))),
        escapeshellarg($env['DEPLOYMENT_URL']),
    ))
    ->set('php_version', $env['DEPLOYMENT_PHP_VERSION']);

const TASK_COPY_APPLICATION = 'copy-application';
task(TASK_COPY_APPLICATION, function (): void {
    $config = ['options' => ["--exclude-from=excludeFromDeploy"]];
    upload('.', '{{release_path}}', $config);
});

const TASK_CLEAR_CACHE = 'clear-cache';
task(TASK_CLEAR_CACHE, function (): void {
    run('{{bin/php}} {{release_path}}/bin/console cache:clear');
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
    run('{{bin/php}} {{release_path}}/bin/console cache:warmup');
});

const TASK_ASSET_MAP_COMPILE = 'asset-map-compile';
task(TASK_ASSET_MAP_COMPILE, function (): void {
    run('{{bin/php}} {{release_path}}/bin/console importmap:install');
    run('{{bin/php}} {{release_path}}/bin/console asset-map:compile');
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

    // set up files and directories
    'deploy:shared',
    'deploy:writable',
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

after('deploy:symlink', 'cachetool:clear:opcache');
after('deploy:symlink', 'cachetool:clear:stat');
after('deploy:symlink', TASK_CLEAR_CACHE);

after('deploy:failed', 'deploy:unlock');
