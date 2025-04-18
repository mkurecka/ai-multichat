<?php

/**
 * Returns the importmap for this application.
 *
 * - "path" is a path inside the asset mapper system. Use the
 *     "debug:asset-map" command to see the full list of paths.
 *
 * - "entrypoint" (JavaScript only) set to true for any module that will
 *     be used as an "entrypoint" (and passed to the importmap() Twig function).
 *
 * The "importmap:require" command can be used to add new entries to this file.
 */
return [
    'app' => [
        'path' => 'app.js',
        'entrypoint' => true,
    ],
    'sortablejs' => [
        'version' => '1.15.2',
    ],
    '@hotwired/stimulus' => [
        'version' => '3.2.2',
    ],
    '@symfony/stimulus-bundle' => [
        'path' => './vendor/symfony/stimulus-bundle/assets/dist/loader.js',
    ],
    '@hotwired/turbo' => [
        'version' => '7.3.0',
    ],
    'axios' => [
        'version' => '1.8.4',
    ],
    '@symfony/stimulus-bridge' => [
        'version' => '4.0.0',
    ],
    'marked' => [
        'version' => '15.0.8',
    ],
    'services/api_service' => [
        'path' => 'services/api_service.js',
    ],
    'services/streaming_service' => [
        'path' => 'services/streaming_service.js',
    ],
    'services/message_service' => [
        'path' => 'services/message_service.js',
    ],
];
