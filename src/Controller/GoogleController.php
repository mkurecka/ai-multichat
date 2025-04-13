<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Client\Provider\GoogleClient;
use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Annotation\Route;
use Psr\Log\LoggerInterface;

class GoogleController extends AbstractController
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly ClientRegistry $clientRegistry,
        private readonly EntityManagerInterface $entityManager,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly UserRepository $userRepository // Inject UserRepository
    ) {}

    #[Route('/connect/google', name: 'connect_google')]
    public function connectAction(ClientRegistry $clientRegistry): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        return $clientRegistry
            ->getClient('google') // key used in config/packages/knpu_oauth2_client.yaml
            ->redirect([
                'profile', 'email' // the scopes you want to access
            ], [
                // Optional parameters, e.g., prompt=consent
            ]);
    }

    #[Route('/connect/google/check', name: 'connect_google_check')]
    public function checkAction(Request $request): ?Response // Method signature uncommented
    {
        // This method needs to exist for the route name 'connect_google_check' to be valid
        // for URL generation by KnpUOAuth2ClientBundle.
        // However, the actual request to this PATH (/connect/google/check) is intercepted
        // and handled by the GoogleAuthenticator (App\Security\GoogleAuthenticator).
        // Therefore, the body of this method should not be executed.
        // Returning null or an empty response is appropriate as the authenticator handles it.
        return null;
    }

    #[Route('/api/auth/google/callback', name: 'api_auth_google_callback', methods: ['POST'])]
    public function handleGoogleApiCallback(Request $request): JsonResponse
    {
        $content = json_decode($request->getContent(), true);
        $code = $content['code'] ?? null;
        $redirectUri = $content['redirectUri'] ?? null; // Expect redirectUri from frontend

        if (!$code) {
            $this->logger->error('Google API callback: Missing authorization code in request body.');
            throw new BadRequestHttpException('Missing authorization code.');
        }
        if (!$redirectUri) {
            $this->logger->error('Google API callback: Missing redirectUri in request body.');
            throw new BadRequestHttpException('Missing redirectUri. The frontend must send the same redirect_uri used to initiate the Google login.');
        }

        /** @var GoogleClient $client */
        $client = $this->clientRegistry->getClient('google');
        // Get the underlying League OAuth 2.0 provider
        $provider = $client->getOAuth2Provider();

        try {
            // Exchange code for access token using the League provider directly.
            // This bypasses the KnpU bundle's state check, which relies on the session.
            // The 'redirect_uri' is still required by Google for the token exchange itself.
            $accessToken = $provider->getAccessToken('authorization_code', [
                'code' => $code,
                'redirect_uri' => $redirectUri
            ]);

            // Get user details from Google using the League provider and the obtained token
            $googleUser = $provider->getResourceOwner($accessToken);
            $googleId = $googleUser->getId();
            $email = $googleUser->getEmail(); // Assuming email is needed/available
            // $name = $googleUser->getName(); // Optional: Get name if needed

            // Find user in your database by Google ID
            $user = $this->userRepository->findOneBy(['googleId' => $googleId]);

            // --- User Handling ---
            // Find or Create User
            if (!$user) {
                $this->logger->info('Google API callback: User not found, creating new user.', ['googleId' => $googleId, 'email' => $email]);
                $user = new User();
                $user->setGoogleId($googleId);
                $user->setEmail($email); // Set email from Google profile
                $user->setRoles(['ROLE_USER']); // Assign default role
                // Organization is nullable on User entity, so no need to set it here.
                // Password is not needed as authentication is via Google ID.

                $this->entityManager->persist($user);
                // No need to flush yet, will be flushed if JWT generation succeeds
                // $this->entityManager->flush(); // Flush potentially moved after JWT creation or handled by cascade
                $this->logger->info('Google API callback: New user object created, will persist.', ['googleId' => $googleId]);
            } else {
                 $this->logger->info('Google API callback: Existing user found.', ['userId' => $user->getId(), 'googleId' => $googleId]);
            }
            // --- End User Handling ---


            // User exists or was just created, generate JWT
            $jwt = $this->jwtManager->create($user);

            // If it was a new user, flush now after successful JWT creation attempt
            if (!$user->getId()) {
                 $this->entityManager->flush();
                 $this->logger->info('Google API callback: New user persisted.', ['userId' => $user->getId(), 'googleId' => $googleId]);
            }

            $this->logger->info('Google API callback: JWT generated successfully.', ['userId' => $user->getId(), 'googleId' => $googleId]);

            return $this->json(['token' => $jwt]);

        } catch (IdentityProviderException $e) {
            $this->logger->error('Google API callback: IdentityProviderException.', ['message' => $e->getMessage(), 'response' => $e->getResponseBody()]);
            return $this->json(['error' => 'Failed to authenticate with Google.', 'details' => $e->getMessage()], Response::HTTP_UNAUTHORIZED);
        } catch (\Exception $e) {
            $this->logger->error('Google API callback: Generic exception.', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return $this->json(['error' => 'An internal error occurred during Google authentication.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
