<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class DiagnosticsController extends AbstractController
{
    #[Route('/diagnostics/headers', name: 'app_diagnostics_headers')]
    public function headers(Request $request): JsonResponse
    {
        // Základní informace o požadavku
        $data = [
            'client_ip' => $request->getClientIp(),
            'is_secure' => $request->isSecure(),
            'scheme' => $request->getScheme(),
            'host' => $request->getHost(),
            'port' => $request->getPort(),
            'base_url' => $request->getBaseUrl(),
            'path_info' => $request->getPathInfo(),
            'uri' => $request->getUri(),
            'method' => $request->getMethod(),
            'headers' => [],
            'server' => [],
        ];
        
        // Všechny HTTP hlavičky
        foreach ($request->headers->all() as $key => $value) {
            $data['headers'][$key] = $value;
        }
        
        // Vybrané $_SERVER proměnné
        $serverKeys = [
            'REMOTE_ADDR',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED_PROTO',
            'HTTP_X_FORWARDED_PORT',
            'HTTP_X_FORWARDED_HOST',
            'HTTP_CF_CONNECTING_IP',
            'HTTP_CF_VISITOR',
            'HTTP_CF_RAY',
            'HTTP_CF_IPCOUNTRY',
            'HTTPS',
            'SERVER_PORT',
            'SERVER_NAME',
            'SERVER_ADDR',
            'REQUEST_SCHEME',
        ];
        
        foreach ($serverKeys as $key) {
            $data['server'][$key] = $_SERVER[$key] ?? null;
        }
        
        return new JsonResponse($data);
    }
    
    #[Route('/diagnostics/config', name: 'app_diagnostics_config')]
    public function config(): JsonResponse
    {
        // Základní konfigurace
        $data = [
            'environment' => $this->getParameter('kernel.environment'),
            'debug' => $this->getParameter('kernel.debug'),
            'trusted_proxies' => Request::getTrustedProxies(),
            'trusted_headers' => Request::getTrustedHeaderSet(),
            'trusted_hosts' => Request::getTrustedHosts(),
        ];
        
        // Přidání vybraných proměnných prostředí
        $envVars = [
            'APP_ENV',
            'APP_DEBUG',
            'APP_URL',
            'FRONTEND_URL',
            'VITE_BASE_URL',
            'CORS_ALLOW_ORIGIN',
            'TRUSTED_PROXIES',
        ];
        
        foreach ($envVars as $var) {
            $data['env'][$var] = $_ENV[$var] ?? null;
        }
        
        return new JsonResponse($data);
    }
}
