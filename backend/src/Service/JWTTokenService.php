<?php

namespace App\Service;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;

class JWTTokenService
{

    public function __construct(private JWTTokenManagerInterface $jwtManager)
    {
    }

    public function createToken(User $user): string
    {
        return $this->jwtManager->create($user);
    }
}