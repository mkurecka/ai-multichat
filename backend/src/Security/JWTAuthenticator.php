<?php

namespace App\Security;

use App\Repository\UserRepository;
use App\Service\JWTService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

class JWTAuthenticator extends AbstractAuthenticator implements AuthenticationEntryPointInterface
{

    public function __construct(private JWTService $jwtService, private UserRepository $userRepository)
    {
    }

    public function supports(Request $request): ?bool
    {
        return $request->headers->has('Authorization') 
            && str_starts_with($request->headers->get('Authorization'), 'Bearer ');
    }

    public function authenticate(Request $request): Passport
    {
        $authHeader = $request->headers->get('Authorization');
        
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            throw new AuthenticationException('Missing or invalid Authorization header');
        }
        
        $token = str_replace('Bearer ', '', $authHeader);

        try {
            $payload = $this->jwtService->validateToken($token);
    
            if (!$payload) {
                // Check if token is expired by trying to decode it without verification
                try {
                    // This is a simple check to see if the token structure is valid
                    $tokenParts = explode('.', $token);
                    if (count($tokenParts) === 3) {
                        $payloadBase64 = $tokenParts[1];
                        $payloadJson = base64_decode(str_replace(['-', '_'], ['+', '/'], $payloadBase64));
                        $payloadData = json_decode($payloadJson, true);
                        
                        if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
                            throw new AuthenticationException('JWT token has expired');
                        }
                    }
                } catch (\Exception $e) {
                    // Ignore any errors in this basic check
                }
                
                // If we couldn't determine a specific reason, use a generic message
                throw new AuthenticationException('Invalid JWT token');
            }
    
            if (!isset($payload['sub'])) {
                throw new AuthenticationException('JWT token missing subject claim');
            }
            
            return new SelfValidatingPassport(
                new UserBadge($payload['sub'], function ($userIdentifier) use ($payload) {
                    // Find user by email (which is the subject claim)
                    $user = $this->userRepository->findOneBy(['email' => $userIdentifier]);
                    
                    if (!$user) {
                        throw new AuthenticationException('User not found for token');
                    }
                    
                    return $user;
                })
            );
        } catch (\Exception $e) {
            // Log the error for debugging
            error_log('JWT Authentication failed: ' . $e->getMessage());
            throw new AuthenticationException('Authentication failed: ' . $e->getMessage());
        }
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        // Continue with the request
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new JsonResponse(['message' => 'Authentication failed: ' . $exception->getMessage()], Response::HTTP_UNAUTHORIZED);
    }

    public function start(Request $request, AuthenticationException $authException = null): Response
    {
        return new JsonResponse(
            ['message' => 'Authentication required'],
            Response::HTTP_UNAUTHORIZED
        );
    }
}
