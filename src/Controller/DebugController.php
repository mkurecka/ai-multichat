<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;

class DebugController extends AbstractController
{
    #[Route('/debug/config', name: 'app_debug_config')]
    public function config(ParameterBagInterface $params): JsonResponse
    {
        // Pouze pokud je APP_DEBUG=1
        if (!$this->getParameter('kernel.debug')) {
            return new JsonResponse(['error' => 'Debug mode is disabled'], 403);
        }
        
        // Základní konfigurace
        return new JsonResponse([
            'environment' => $this->getParameter('kernel.environment'),
            'frontend_url' => $params->get('frontend_url'),
            'app_url' => $_SERVER['APP_URL'] ?? null,
            'vite_base_url' => $_ENV['VITE_BASE_URL'] ?? null,
            'cors_allow_origin' => $_ENV['CORS_ALLOW_ORIGIN'] ?? null,
            'log_dir' => $this->getParameter('kernel.logs_dir'),
            'project_dir' => $this->getParameter('kernel.project_dir'),
        ]);
    }
    
    #[Route('/debug/headers', name: 'app_debug_headers')]
    public function headers(): JsonResponse
    {
        // Pouze pokud je APP_DEBUG=1
        if (!$this->getParameter('kernel.debug')) {
            return new JsonResponse(['error' => 'Debug mode is disabled'], 403);
        }
        
        // Vrátí všechny HTTP hlavičky
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $headers[str_replace('HTTP_', '', $key)] = $value;
            }
        }
        
        return new JsonResponse($headers);
    }
}
