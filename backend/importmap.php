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
        'path' => './assets/app.js',
        'entrypoint' => true,
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
    'turbo' => [
        'path' => './assets/turbo.js',
        'entrypoint' => true,
    ],
    'axios' => [
        'version' => '1.8.4',
    ],
    'lucide' => [
        'version' => '0.344.0',
    ],
    'controllers/chat_controller' => [
        'path' => './assets/controllers/chat_controller.js',
    ],
    'controllers/model_selector_controller' => [
        'path' => './assets/controllers/model_selector_controller.js',
    ],
    'controllers/message_input_controller' => [
        'path' => './assets/controllers/message_input_controller.js',
    ],
    'controllers/chat_history_controller' => [
        'path' => './assets/controllers/chat_history_controller.js',
    ],
];
