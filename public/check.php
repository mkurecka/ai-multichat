<?php
// Jednoduchý diagnostický skript mimo Symfony framework

// Nastavení hlaviček pro zabránění cachování
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

// Výpis základních informací
$info = [
    'time' => date('Y-m-d H:i:s'),
    'https' => isset($_SERVER['HTTPS']) ? $_SERVER['HTTPS'] : 'off',
    'request_scheme' => $_SERVER['REQUEST_SCHEME'] ?? 'unknown',
    'server_port' => $_SERVER['SERVER_PORT'] ?? 'unknown',
    'http_host' => $_SERVER['HTTP_HOST'] ?? 'unknown',
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
];

// Výpis všech hlaviček
$headers = [];
foreach ($_SERVER as $key => $value) {
    if (strpos($key, 'HTTP_') === 0) {
        $headers[str_replace('HTTP_', '', $key)] = $value;
    }
}

// Výpis Cloudflare specifických hlaviček
$cloudflare = [
    'CF_CONNECTING_IP' => $_SERVER['HTTP_CF_CONNECTING_IP'] ?? 'none',
    'CF_VISITOR' => $_SERVER['HTTP_CF_VISITOR'] ?? 'none',
    'CF_RAY' => $_SERVER['HTTP_CF_RAY'] ?? 'none',
    'CF_IPCOUNTRY' => $_SERVER['HTTP_CF_IPCOUNTRY'] ?? 'none',
    'X_FORWARDED_PROTO' => $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? 'none',
    'X_FORWARDED_FOR' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? 'none',
];

// Výpis informací
echo '<html><body>';
echo '<h1>Diagnostika serveru</h1>';

echo '<h2>Základní informace</h2>';
echo '<pre>' . print_r($info, true) . '</pre>';

echo '<h2>Cloudflare hlavičky</h2>';
echo '<pre>' . print_r($cloudflare, true) . '</pre>';

echo '<h2>Všechny HTTP hlavičky</h2>';
echo '<pre>' . print_r($headers, true) . '</pre>';

echo '</body></html>';
