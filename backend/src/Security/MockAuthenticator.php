<?php

namespace App\Security;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

class MockAuthenticator extends AbstractAuthenticator implements AuthenticationEntryPointInterface
{
    private const TEST_HEADER = 'X-TEST-USER-EMAIL';

    public function __construct(private readonly UserRepository $userRepository)
    {
    }

    public function supports(Request $request): ?bool
    {
        // Only activate this authenticator if the test header is present
        return $request->headers->has(self::TEST_HEADER);
    }

    public function authenticate(Request $request): Passport
    {
        $email = $request->headers->get(self::TEST_HEADER);
        if (null === $email) {
            // This should not happen due to supports() check, but belts and braces
            throw new AuthenticationException('Test header missing.');
        }

        // Use a UserBadge with a callback to load the user via the repository
        // This ensures we get the actual persisted user from the test setup
        return new SelfValidatingPassport(
            new UserBadge($email, function (string $userIdentifier) {
                $user = $this->userRepository->findOneBy(['email' => $userIdentifier]);
                if (!$user) {
                    throw new UserNotFoundException();
                }
                return $user;
            })
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return null;
    }

    public function start(Request $request, ?AuthenticationException $authException = null): Response
    {
        return new Response('Authentication required', Response::HTTP_UNAUTHORIZED);
    }
}
