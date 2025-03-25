<?php

namespace App\Security;

class GoogleUserProvider implements OAuthAwareUserProviderInterface
{
    public function loadUserByOAuthUserResponse(UserResponseInterface $response)
    {
        $googleId = $response->getResourceOwner()->getId();
        $user = $this->userRepository->findOneBy(['googleId' => $googleId]);
        
        if (!$user) {
            $user = new User();
            $user->setGoogleId($googleId);
            // Add to default organization or create new
            $this->entityManager->persist($user);
            $this->entityManager->flush();
        }
        
        return $user;
    }
}