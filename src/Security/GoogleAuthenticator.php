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
    // Removed private string $frontendUrl;

    public function __construct(
        private ClientRegistry $clientRegistry,
        private RouterInterface $router,
        private UserRepository $userRepository,
        private OrganizationRepository $organizationRepository,
        private EntityManagerInterface $entityManager,
    ) {
        // Removed $this->frontendUrl assignment
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
        // Redirect to the main app page after successful login
        $targetUrl = $this->router->generate('app_main'); // Fixed typo: Use ->
        return new RedirectResponse($targetUrl);
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        // Redirect back to a login page (or handle differently) on failure
        // For simplicity, redirecting to the Google connect start page again
        // You might want a dedicated login page with error display
        $message = strtr($exception->getMessageKey(), $exception->getMessageData());
        $request->getSession()->getFlashBag()->add('error', $message); // Optional: Flash message

        // Redirect to the route that initiates the Google login
        return new RedirectResponse($this->router->generate('connect_google')); // Fixed typo: Use ->
        // Or redirect to a dedicated login page:
        // return new RedirectResponse($this->router->generate('app_login')); // Assuming 'app_login' route exists
    }
}
