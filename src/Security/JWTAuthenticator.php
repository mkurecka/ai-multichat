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

class JWTAuthenticator extends AbstractAuthenticator
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

            // The 'sub' claim contains the googleId based on User::getUserIdentifier()
            $googleId = $payload['sub'];

            return new SelfValidatingPassport(
                new UserBadge($googleId, function ($userIdentifier) {
                    // Look up the user directly by googleId, which is passed as $userIdentifier here
                    $user = $this->userRepository->findOneBy(['googleId' => $userIdentifier]);

                    if (!$user) {
                        // Log the googleId that was not found
                        error_log('JWT Authentication: User not found for googleId: ' . $userIdentifier);
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
        // Check if the request is an AJAX request
        if ($request->isXmlHttpRequest()) {
            return new JsonResponse([
                'message' => 'Authentication failed: ' . $exception->getMessage(),
                'code' => 'auth_failed',
                'needsRefresh' => $exception->getMessage() === 'JWT token has expired'
            ], Response::HTTP_UNAUTHORIZED);
        }

        // For non-AJAX requests, redirect to login page
        return null; // Let the security system handle it with the access denied handler
    }
}
