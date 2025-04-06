<?php

namespace App\Controller;

use App\Repository\UserRepository;
use App\Service\JWTService;
use Lexik\Bundle\JWTAuthenticationBundle\Exception\ExpiredTokenException;
use Lexik\Bundle\JWTAuthenticationBundle\Exception\JWTDecodeFailureException;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class SecurityController extends AbstractController
{
    #[Route('/login', name: 'app_login')]
    public function login()
    {
        return $this->redirectToRoute('connect_google');
    }

    #[Route('/logout', name: 'app_logout')]
    public function logout()
    {
        // This method can be empty - it will be intercepted by the logout key on your firewall
    }

    #[Route('/api/token/refresh', name: 'api_token_refresh', methods: ['POST'])]
    public function refreshToken(
        Request $request,
        JWTService $jwtService,
        UserRepository $userRepository,
        JWTTokenManagerInterface $jwtManager // Inject the JWT Manager
    ): JsonResponse {
        // Extract token from Authorization header
        $authHeader = $request->headers->get('Authorization');
        
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return new JsonResponse(['error' => 'missing_auth_header', 'message' => 'Missing or invalid Authorization header'], Response::HTTP_UNAUTHORIZED);
        }
        
        $token = str_replace('Bearer ', '', $authHeader);
        $token = str_replace('Bearer ', '', $authHeader);
        $payload = null;

        try {
            // Use the JWT Manager to parse and validate the signature
            $payload = $jwtManager->parse($token);

            // If parse succeeds without ExpiredTokenException, the token is still valid.
            // While refreshing a still-valid token might be okay, often refresh is only
            // intended for expired ones. You could optionally return an error here
            // if you only want to refresh *expired* tokens.
            // For now, we'll allow refreshing valid tokens too.

        } catch (ExpiredTokenException $e) {
            // Token is expired, but signature was valid. This is the primary refresh case.
            // We can get the payload from the exception.
            $payload = $e->getPayload();
        } catch (JWTDecodeFailureException $e) {
            // Token is invalid (bad signature, malformed, etc.)
            return new JsonResponse([
                'error' => 'invalid_token',
                'message' => 'Token validation failed: ' . $e->getMessage()
            ], Response::HTTP_UNAUTHORIZED);
        } catch (\Exception $e) {
            // Catch any other unexpected errors during parsing
             return new JsonResponse([
                'error' => 'token_parse_error',
                'message' => 'Error parsing token: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        // Ensure payload was obtained (either from successful parse or ExpiredTokenException)
        if (!$payload || !isset($payload['sub'])) {
            return new JsonResponse(['error' => 'invalid_payload', 'message' => 'Invalid or missing payload data'], Response::HTTP_UNAUTHORIZED);
        }

        // Find user by ID from the *validated* payload
        $user = $userRepository->find($payload['sub']);

        if (!$user) {
            // Optional: Fallback using googleId if needed, but sub should be reliable
            // $user = $userRepository->findOneBy(['googleId' => $payload['googleId'] ?? '']);

            if (!$user) {
                return new JsonResponse([
                    'error' => 'user_not_found',
                    'message' => 'User not found for token subject: ' . $payload['sub']
                ], Response::HTTP_UNAUTHORIZED);
            }
        }

        // Create and return a new token
        try {
            $newToken = $jwtService->createToken($user);
            return new JsonResponse([
                'token' => $newToken,
                // Optionally include new expiry if needed by frontend
                // 'expires_in' => $payload['exp'] // Example: Get expiry from JWTService or config
            ]);
        } catch (\Exception $tokenError) {
            // Log the error internally
            error_log('Failed to create new token during refresh: ' . $tokenError->getMessage());
            return new JsonResponse([
                'error' => 'token_creation_failed',
                'message' => 'Failed to create new token.' // Keep error message generic for client
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
