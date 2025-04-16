<?php

namespace App\Security\Voter;

use App\Entity\Variable;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

final class VariableVoter extends Voter
{
    // Define actions supported by this voter
    public const VIEW = 'VIEW';
    public const EDIT = 'EDIT';
    public const DELETE = 'DELETE';

    public function __construct(private readonly AuthorizationCheckerInterface $security) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        // This voter handles VIEW, EDIT, DELETE actions on Variable objects
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE])
            && $subject instanceof Variable;
    }

    /**
     * @param Variable $subject The Variable instance
     */
    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        // If the user is anonymous, do not grant access
        if (!$user instanceof UserInterface) {
            return false;
        }

        // Ensure we have our User entity, not just UserInterface if needed
        if (!$user instanceof User) {
            return false;
        }

        // Check permissions based on the attribute and variable ownership
        $isOwner = $subject->getUser() === $user;
        $userOrganization = $user->getOrganization();
        $variableOrganization = $subject->getOrganization();

        switch ($attribute) {
            case self::VIEW:
                // Allow viewing if:
                // 1. The user is the owner
                // 2. The variable belongs to the user's organization
                if ($isOwner) {
                    return true;
                }
                if ($variableOrganization && $userOrganization === $variableOrganization) {
                    return true;
                }
                break;

            case self::EDIT:
            case self::DELETE: // Same logic for edit and delete
                // Allow editing/deleting if:
                // 1. The user is the owner
                // 2. The variable belongs to the user's organization AND the user has ROLE_ORGANIZATION_ADMIN
                if ($isOwner) {
                    return true;
                }
                if ($variableOrganization && $userOrganization === $variableOrganization && $this->security->isGranted('ROLE_ORGANIZATION_ADMIN')) {
                    return true;
                }
                break;
        }

        // Deny access if none of the conditions are met
        return false;
    }
}
