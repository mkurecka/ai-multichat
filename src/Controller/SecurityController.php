<?php

namespace App\Controller;

use App\Repository\UserRepository;
use App\Service\JWTService;
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
    public function refreshToken(Request $request, JWTService $jwtService, UserRepository $userRepository): JsonResponse
    {
        // Extract token from Authorization header
        $authHeader = $request->headers->get('Authorization');
        
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return new JsonResponse(['error' => 'missing_auth_header', 'message' => 'Missing or invalid Authorization header'], Response::HTTP_UNAUTHORIZED);
        }
        
        $token = str_replace('Bearer ', '', $authHeader);
        
        try {
            // Try to decode the token without validation to extract user info
            $tokenParts = explode('.', $token);
            if (count($tokenParts) !== 3) {
                return new JsonResponse(['error' => 'invalid_token_format', 'message' => 'Invalid token format'], Response::HTTP_UNAUTHORIZED);
            }
            
            $payloadBase64 = $tokenParts[1];
            $payloadJson = base64_decode(str_replace(['-', '_'], ['+', '/'], $payloadBase64));
            $payload = json_decode($payloadJson, true);
            
            if (!isset($payload['sub'])) {
                return new JsonResponse(['error' => 'invalid_payload', 'message' => 'Invalid token payload: missing sub claim'], Response::HTTP_UNAUTHORIZED);
            }
            
            // Find user by ID
            $user = $userRepository->find($payload['sub']);
            
            if (!$user) {
                // Try to find by googleId as fallback
                $user = $userRepository->findOneBy(['googleId' => $payload['googleId'] ?? '']);
                
                if (!$user) {
                    return new JsonResponse([
                        'error' => 'user_not_found', 
                        'message' => 'User not found with ID: ' . $payload['sub']
                    ], Response::HTTP_UNAUTHORIZED);
                }
            }
            
            try {
                // Create a new token
                $newToken = $jwtService->createToken($user);
                
                return new JsonResponse([
                    'token' => $newToken,
                    'expires_in' => 3600 * 24 * 7 // 7 days in seconds
                ]);
            } catch (\Exception $tokenError) {
                return new JsonResponse([
                    'error' => 'token_creation_failed',
                    'message' => 'Failed to create token: ' . $tokenError->getMessage()
                ], Response::HTTP_INTERNAL_SERVER_ERROR);
            }
            
        } catch (\Exception $e) {
            return new JsonResponse([
                'error' => 'token_refresh_failed',
                'message' => 'Token refresh failed: ' . $e->getMessage()
            ], Response::HTTP_UNAUTHORIZED);
        }
    }
}
