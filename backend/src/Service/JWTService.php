<?php

namespace App\Service;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Doctrine\ORM\EntityManagerInterface;

class JWTService
{
    private JWTTokenManagerInterface $jwtManager;
    private int $tokenLifetime;
    private EntityManagerInterface $entityManager;

    public function __construct(
        JWTTokenManagerInterface $jwtManager,
        EntityManagerInterface $entityManager,
        int $tokenLifetime = 3600 * 24 * 7 // 7 days by default
    ) {
        $this->jwtManager = $jwtManager;
        $this->entityManager = $entityManager;
        $this->tokenLifetime = $tokenLifetime;
    }

    public function createToken(User $user): string
    {
        try {
            // Set custom payload claims
            $payload = [
                'sub' => $user->getEmail(),
                'email' => $user->getEmail(),
                'id' => $user->getId(),
                'googleId' => $user->getGoogleId(),
                'name' => $user->getName(),
                'roles' => $user->getRoles(),
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
            
            if (!$user->getName()) {
                throw new \InvalidArgumentException('User name is missing');
            }
            
            return $this->jwtManager->createFromPayload($user, $payload);
        } catch (\Exception $e) {
            // Log the error for debugging
            error_log('JWT Token creation failed: ' . $e->getMessage());
            throw new \RuntimeException('Failed to create JWT token: ' . $e->getMessage());
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
            
            // Ensure required claims are present
            if (!isset($payload['sub']) || !isset($payload['email'])) {
                return null;
            }
            
            return $payload;
        } catch (\Exception $e) {
            // Log the error or handle specific JWT exceptions
            error_log('JWT Token validation failed: ' . $e->getMessage());
            return null;
        }
    }

    public function getUserFromToken(string $token): ?User
    {
        $payload = $this->validateToken($token);
        if (!$payload) {
            throw new \Exception('Token has expired');
        }

        // Get user from database by email
        $user = $this->entityManager->getRepository(User::class)->findOneBy(['email' => $payload['email']]);
        if (!$user) {
            throw new \Exception('User not found');
        }

        return $user;
    }

    public function refreshToken(string $token): string
    {
        $user = $this->getUserFromToken($token);
        if (!$user) {
            throw new \Exception('Invalid token');
        }

        return $this->createToken($user);
    }
}
