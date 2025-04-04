<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class HttpsCheckController extends AbstractController
{
    #[Route('/https-check', name: 'app_https_check')]
    public function index(Request $request): Response
    {
        $data = [
            'client_ip' => $request->getClientIp(),
            'is_secure' => $request->isSecure() ? 'true' : 'false',
            'scheme' => $request->getScheme(),
            'host' => $request->getHost(),
            'uri' => $request->getUri(),
            'headers' => [
                'x_forwarded_proto' => $request->headers->get('X-Forwarded-Proto'),
                'x_forwarded_for' => $request->headers->get('X-Forwarded-For'),
                'x_forwarded_host' => $request->headers->get('X-Forwarded-Host'),
                'x_forwarded_port' => $request->headers->get('X-Forwarded-Port'),
                'cf_visitor' => $request->headers->get('CF-Visitor'),
                'cf_connecting_ip' => $request->headers->get('CF-Connecting-IP'),
            ],
            'server' => [
                'REMOTE_ADDR' => $_SERVER['REMOTE_ADDR'] ?? null,
                'HTTP_X_FORWARDED_PROTO' => $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? null,
                'HTTPS' => $_SERVER['HTTPS'] ?? null,
                'REQUEST_SCHEME' => $_SERVER['REQUEST_SCHEME'] ?? null,
            ],
            'trusted_proxies' => implode(', ', \Symfony\Component\HttpFoundation\Request::getTrustedProxies() ?: []),
            'trusted_headers' => $this->getTrustedHeadersName(\Symfony\Component\HttpFoundation\Request::getTrustedHeaderSet()),
        ];
        
        $response = new Response(
            '<html><body><h1>HTTPS Check</h1><pre>' . print_r($data, true) . '</pre></body></html>'
        );
        
        return $response;
    }
    
    private function getTrustedHeadersName(int $headerSet): string
    {
        $names = [];
        
        if ($headerSet & Request::HEADER_FORWARDED) {
            $names[] = 'HEADER_FORWARDED';
        }
        
        if ($headerSet & Request::HEADER_X_FORWARDED_FOR) {
            $names[] = 'HEADER_X_FORWARDED_FOR';
        }
        
        if ($headerSet & Request::HEADER_X_FORWARDED_HOST) {
            $names[] = 'HEADER_X_FORWARDED_HOST';
        }
        
        if ($headerSet & Request::HEADER_X_FORWARDED_PROTO) {
            $names[] = 'HEADER_X_FORWARDED_PROTO';
        }
        
        if ($headerSet & Request::HEADER_X_FORWARDED_PORT) {
            $names[] = 'HEADER_X_FORWARDED_PORT';
        }
        
        if ($headerSet & Request::HEADER_X_FORWARDED_PREFIX) {
            $names[] = 'HEADER_X_FORWARDED_PREFIX';
        }
        
        return implode(', ', $names);
    }
}
