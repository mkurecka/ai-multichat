<?php

namespace App\EventListener;

use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Http\Event\LogoutEvent;

class LogoutListener
{
    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator
    ) {
    }

    public function onLogout(LogoutEvent $event): void
    {
        // Get the request and session
        $request = $event->getRequest();
        $session = $request->getSession();
        
        // Clear all session data
        $session->clear();
        
        // Invalidate the session
        $session->invalidate();
        
        // Set a response to redirect to the login page
        $response = new RedirectResponse($this->urlGenerator->generate('app_login'));
        $event->setResponse($response);
    }
}
