<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class SimpleCheckController extends AbstractController
{
    #[Route('/simple-check', name: 'app_simple_check')]
    public function index(): Response
    {
        $info = [
            'https' => isset($_SERVER['HTTPS']) ? $_SERVER['HTTPS'] : 'off',
            'request_scheme' => $_SERVER['REQUEST_SCHEME'] ?? 'unknown',
            'x_forwarded_proto' => $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? 'none',
            'cf_visitor' => $_SERVER['HTTP_CF_VISITOR'] ?? 'none',
            'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        ];
        
        return new Response(
            '<html><body><h1>Simple HTTPS Check</h1><pre>' . print_r($info, true) . '</pre></body></html>'
        );
    }
}
