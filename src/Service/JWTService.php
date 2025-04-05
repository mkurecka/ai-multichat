<?php

namespace App\Service;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;

class JWTService
{
    private JWTTokenManagerInterface $jwtManager;
    private int $tokenLifetime;

    public function __construct(
        JWTTokenManagerInterface $jwtManager,
        int $tokenLifetime = 3600 * 24 * 7 // 7 days by default
    ) {
        $this->jwtManager = $jwtManager;
        $this->tokenLifetime = $tokenLifetime;
    }

    public function createToken(User $user): string
    {
        try {
            // Set custom payload claims
            $payload = [
                'sub' => $user->getId(),
                'email' => $user->getEmail(),
                'googleId' => $user->getGoogleId(),
                'roles' => $user->getRoles(), // Include user roles in the token
                'exp' => time() + $this->tokenLifetime // Add expiration time
            ];
            
            // Ensure all required fields are present
            if (!$user->getId()) {
                throw new \InvalidArgumentException('User ID is missing');
            }
            
            if (!$user->getEmail()) {
                throw new \InvalidArgumentException('User email is missing');
            }
            
            if (!$user->getGoogleId()) {
                throw new \InvalidArgumentException('User googleId is missing');
            }
            
            return $this->jwtManager->createFromPayload($user, $payload);
        } catch (\Exception $e) {
            // Log the error for debugging
            error_log('JWT Token creation failed: ' . $e->getMessage());
            throw $e; // Re-throw to be handled by the caller
        }
    }

    public function validateToken(string $token): ?array
    {
        try {
            $payload = $this->jwtManager->parse($token);
            
            // Check if token has expired
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                // Token has expired
                return null;
            }
            
            return $payload;
        } catch (\Exception $e) {
            // Log the error or handle specific JWT exceptions
            // You could add a logger here to track token validation failures
            return null;
        }
    }
}
