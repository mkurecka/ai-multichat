<?php

namespace App\Security;

use App\Repository\UserRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

class TokenStorageApiAuthenticator extends AbstractAuthenticator
{
    private $tokenStorage;
    private $userRepository;

    public function __construct(TokenStorageInterface $tokenStorage, UserRepository $userRepository)
    {
        $this->tokenStorage = $tokenStorage;
        $this->userRepository = $userRepository;
    }

    public function supports(Request $request): ?bool
    {
        // Only support requests that don't have a Bearer token
        if ($request->headers->has('Authorization') && str_starts_with($request->headers->get('Authorization'), 'Bearer ')) {
            return false;
        }
        
        // Check if there's a session and if it has security token
        if (!$request->hasSession() || !$request->getSession()->has('_security_main')) {
            return false;
        }
        
        return true;
    }

    public function authenticate(Request $request): Passport
    {
        // Check if the user is already authenticated in the session
        $token = $this->tokenStorage->getToken();
        $user = $token ? $token->getUser() : null;
        
        if (!$user) {
            // Try to get user from session directly if security context doesn't have it
            if ($request->getSession()->has('_security_main')) {
                // Log the session token for debugging
                error_log('Session token exists but user not found in token storage');
            }
            
            throw new AuthenticationException('No authenticated user found in session');
        }
        
        // Return a passport with the user from the session
        return new SelfValidatingPassport(
            new UserBadge($user->getUserIdentifier(), function($userIdentifier) {
                // Look up the user by identifier (googleId)
                $user = $this->userRepository->findOneBy(['googleId' => $userIdentifier]);
                
                if (!$user) {
                    error_log('Session Authentication: User not found for googleId: ' . $userIdentifier);
                    throw new AuthenticationException('User not found in database');
                }
                
                return $user;
            })
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        // Continue with the request
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        // If this authenticator fails, let the next one try
        return null;
    }
}
