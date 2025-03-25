<?php

namespace App\Security;

use App\Entity\Organization;
use App\Entity\User;
use App\Repository\OrganizationRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Security\Authenticator\OAuth2Authenticator;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

class GoogleAuthenticator extends OAuth2Authenticator
{

    public function __construct(
        private ClientRegistry $clientRegistry,
        private RouterInterface $router,
        private UserRepository $userRepository,
        private OrganizationRepository $organizationRepository,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function supports(Request $request): ?bool
    {
        return $request->attributes->get('_route') === 'connect_google_check';
    }

    public function authenticate(Request $request): Passport
    {
        $client = $this->clientRegistry->getClient('google');
        $accessToken = $this->fetchAccessToken($client);

        return new SelfValidatingPassport(
            new UserBadge($accessToken->getToken(), function() use ($accessToken, $client) {
                /** @var \League\OAuth2\Client\Provider\GoogleUser $googleUser */
                $googleUser = $client->fetchUserFromToken($accessToken);

                $email = $googleUser->getEmail();
                $googleId = $googleUser->getId();

                // 1) have they logged in with Google before?
                $existingUser = $this->userRepository->findOneBy(['googleId' => $googleId]);

                if ($existingUser) {
                    return $existingUser;
                }

                // 2) do we have a matching user by email?
                $user = $this->userRepository->findOneBy(['email' => $email]);

                // 3) create new user if doesn't exist
                if (!$user) {
                    $user = new User();
                    $user->setEmail($email);
                    $user->setGoogleId($googleId);
                    $user->setRoles(['ROLE_USER']);

                    // Check if email is from a Google Workspace domain
                    $domain = substr(strrchr($email, "@"), 1);
                    if ($domain && $domain !== 'gmail.com') {
                        // Check if organization exists for this domain
                        $organization = $this->organizationRepository->findOneBy(['domain' => $domain]);

                        if (!$organization) {
                            // Create new organization
                            $organization = new Organization();
                            $organization->setGoogleId($domain);
                            $organization->setDomain($domain);
                            $organization->setUsageCount(0);
                            $this->entityManager->persist($organization);
                        }

                        $user->setOrganization($organization);
                    }

                    $this->entityManager->persist($user);
                    $this->entityManager->flush();
                }

                return $user;
            })
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        // Let the controller handle the redirect with token
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        // Let the controller handle the failure
        return null;
    }
}
