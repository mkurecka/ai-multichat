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
            ->getClient('google')
            ->redirect(['email']);
    }

    #[Route('/connect/google/check', name: 'connect_google_check')]
    public function checkAction(Request $request): ?Response // Method signature uncommented
    {
        // This method needs to exist for the route name 'connect_google_check' to be valid
        // for URL generation by KnpUOAuth2ClientBundle.
        // However, the actual request to this PATH (/connect/google/check) is intercepted
        // and handled by the GoogleAuthenticator (App\Security\GoogleAuthenticator).
        // Therefore, the body of this method should not be executed.
        // Returning null or an empty response is appropriate.
        return null;

        // Old logic removed.
    }
}
