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
        return $this->jwtManager->create($user);
    }

    public function validateToken(string $token): ?array
    {
        try {
            return $this->jwtManager->parse($token);
        } catch (\Exception $e) {
            return null;
        }
    }
}