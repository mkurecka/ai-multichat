<?php

namespace App\Security;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

class AuthenticationEntryPoint implements AuthenticationEntryPointInterface
{
    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator
    ) {
    }

    public function start(Request $request, AuthenticationException $authException = null): Response
    {
        // Store the requested URL in the session to redirect back after login
        if ($request->hasSession()) {
            $request->getSession()->set('_security.main.target_path', $request->getUri());
        }

        // If it's an AJAX request, return a JSON response
        if ($request->isXmlHttpRequest()) {
            return new JsonResponse([
                'message' => 'Authentication required',
                'code' => 'auth_required'
            ], Response::HTTP_UNAUTHORIZED);
        }

        // For regular requests, redirect to the login page
        return new RedirectResponse($this->urlGenerator->generate('app_login'));
    }
}
