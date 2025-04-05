<?php

namespace App\Security;

use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Http\Authorization\AccessDeniedHandlerInterface;

class AccessDeniedHandler implements AccessDeniedHandlerInterface
{
    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator
    ) {
    }

    public function handle(Request $request, AccessDeniedException $accessDeniedException): Response
    {
        // Store the requested URL in the session to redirect back after login
        $request->getSession()->set('_security.main.target_path', $request->getUri());

        return new RedirectResponse($this->urlGenerator->generate('app_login'));
    }
} 