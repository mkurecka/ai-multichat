<?php

namespace App\Controller;

use App\Service\JWTService;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Psr\Log\LoggerInterface;

class GoogleController extends AbstractController
{
    private LoggerInterface $logger;
    
    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }
    
    #[Route('/connect/google', name: 'connect_google')]
    public function connectAction(ClientRegistry $clientRegistry): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        return $clientRegistry
            ->getClient('google') // key used in config/packages/knpu_oauth2_client.yaml
            ->redirect([
                'email' // the scopes you want to access
            ]);
    }

    #[Route('/connect/google/check', name: 'connect_google_check')]
    public function checkAction(Request $request, JWTService $jwtService): Response
    {
        // This method is called after Google redirects back to your app
        
        // Get the authenticated user
        $user = $this->getUser();
        
        if (!$user) {
            // Redirect to frontend with error
            return $this->redirect(
                $this->getParameter('frontend_url') . '/callback?error=authentication_failed'
            );
        }
        
        try {
            // Create JWT token
            $token = $jwtService->createToken($user);
            
            // Redirect to frontend with token
            return $this->redirect(
                $this->getParameter('frontend_url') . '/callback?token=' . $token
            );
        } catch (\Exception $e) {
            // Log the error
            $this->logger->error('JWT token creation failed: ' . $e->getMessage());
            
            // Redirect to login with error
            return $this->redirect(
                $this->getParameter('frontend_url') . '/callback?error=token_creation_failed'
            );
        }
    }
}