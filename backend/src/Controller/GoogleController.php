<?php

namespace App\Controller;

use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use App\Service\JWTTokenService;
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
    public function connectCheckAction(Request $request, ClientRegistry $clientRegistry, JWTTokenService $jwtService)
    {
        // The GoogleAuthenticator will handle authentication
        // This method will only be called if authentication was successful

        // Get the authenticated user
        $user = $this->getUser();
        
        if (!$user) {
            return $this->redirectToRoute('app_login');
        }
        
        try {
            // Create JWT token
            $token = $jwtService->createToken($user);
            
            // Redirect to frontend with token
            return $this->redirect('http://localhost:5173/callback?token=' . $token);
        } catch (\Exception $e) {
            // Log the error
            $this->logger->error('JWT token creation failed: ' . $e->getMessage());
            
            // Redirect to login with error
            return $this->redirectToRoute('app_login', ['error' => 'authentication_failed']);
        }
    }
}