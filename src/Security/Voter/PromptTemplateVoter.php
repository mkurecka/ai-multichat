<?php

namespace App\Security\Voter;

use App\Entity\PromptTemplate;
use App\Entity\User; // Import User entity
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\User\UserInterface;

use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface; // Import AuthorizationCheckerInterface

final class PromptTemplateVoter extends Voter
{
    // Define actions supported by this voter
    public const VIEW = 'VIEW';
    public const EDIT = 'EDIT';
    public const DELETE = 'DELETE';

    public function __construct(private readonly AuthorizationCheckerInterface $security) {} // Inject security checker for roles

    protected function supports(string $attribute, mixed $subject): bool
    {
        // This voter handles VIEW, EDIT, DELETE actions on PromptTemplate objects
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE])
            && $subject instanceof PromptTemplate;
    }

    /**
     * @param PromptTemplate $subject The PromptTemplate instance
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
             // Or handle differently if your UserInterface implementation is sufficient
             return false;
        }

        // Check permissions based on the attribute and template scope
        $isOwner = $subject->getOwner() === $user;
        $isPrivate = $subject->getScope() === PromptTemplate::SCOPE_PRIVATE;
        $isOrganization = $subject->getScope() === PromptTemplate::SCOPE_ORGANIZATION;
        $userOrganization = $user->getOrganization();
        $templateOrganization = $subject->getOrganization();

        switch ($attribute) {
            case self::VIEW:
                // Allow viewing if:
                // 1. It's private and the user is the owner
                // 2. It's organization-scoped and the user belongs to the same organization
                if ($isPrivate && $isOwner) {
                    return true;
                }
                if ($isOrganization && $userOrganization === $templateOrganization) {
                    return true;
                }
                break;

            case self::EDIT:
            case self::DELETE: // Same logic for edit and delete
                // Allow editing/deleting if:
                // 1. It's private and the user is the owner
                // 2. It's organization-scoped, the user belongs to the same organization, AND the user has ROLE_ORGANIZATION_ADMIN
                if ($isPrivate && $isOwner) {
                    return true;
                }
                if ($isOrganization && $userOrganization === $templateOrganization && $this->security->isGranted('ROLE_ORGANIZATION_ADMIN')) {
                    // Check if the user has the role *within the context of the application*,
                    // the voter doesn't need to check the org again here if roles are global or correctly assigned.
                    return true;
                }
                break;
        }

        // Deny access if none of the conditions are met
        return false;
    }
}
