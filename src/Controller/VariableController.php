<?php

namespace App\Controller;

use App\Entity\User;
use App\Entity\Variable;
use App\Form\VariableType;
use App\Repository\VariableRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/variables')]
#[IsGranted('IS_AUTHENTICATED_FULLY')] // Ensure user is logged in
class VariableController extends AbstractController
{
    #[Route('/', name: 'app_variable_index', methods: ['GET'])]
    public function index(VariableRepository $variableRepository): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            // Should not happen due to IsGranted, but good practice
            return $this->redirectToRoute('app_home'); // Redirect to homepage
        }

        // Fetch variables belonging to the current user
        $userVariables = $variableRepository->findBy(['user' => $user]);

        // For organization admins, also fetch organization variables
        $organizationVariables = [];
        if ($this->isGranted('ROLE_ORGANIZATION_ADMIN') && $user->getOrganization()) {
            $organizationVariables = $variableRepository->findBy(['organization' => $user->getOrganization()]);
        }

        return $this->render('variable/index.html.twig', [
            'user_variables' => $userVariables,
            'organization_variables' => $organizationVariables,
            'is_org_admin' => $this->isGranted('ROLE_ORGANIZATION_ADMIN'),
        ]);
    }

    #[Route('/new', name: 'app_variable_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->redirectToRoute('app_login');
        }

        $variable = new Variable();
        $variable->setUser($user); // Default to user association

        // Determine if the user is an organization admin
        $isOrgAdmin = $this->isGranted('ROLE_ORGANIZATION_ADMIN');
        $organization = $user->getOrganization();
        $ownerType = 'user'; // Default owner type

        // Create form with appropriate options
        $form = $this->createForm(VariableType::class, $variable, [
            'owner_type' => $ownerType,
        ]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Check if organization admin selected organization as owner
            if ($isOrgAdmin && $organization && $form->has('ownerType')) {
                $ownerType = $form->get('ownerType')->getData();

                if ($ownerType === 'organization') {
                    $variable->setUser(null);
                    $variable->setOrganization($organization);
                } else {
                    $variable->setUser($user);
                    $variable->setOrganization(null);
                }
            } else {
                // Regular user - always set to user
                $variable->setUser($user);
                $variable->setOrganization(null);
            }

            // Manually set timestamps before persisting
            $now = new \DateTimeImmutable();
            if ($variable->getCreatedAt() === null) {
                 $variable->setCreatedAt($now);
            }
            if ($variable->getUpdatedAt() === null) {
                 $variable->setUpdatedAt($now);
            }
            $entityManager->persist($variable);
            $entityManager->flush();

            $this->addFlash('success', 'Variable created successfully.');

            return $this->redirectToRoute('app_variable_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->render('variable/new.html.twig', [
            'variable' => $variable,
            'form' => $form,
            'is_org_admin' => $isOrgAdmin,
        ]);
    }

    #[Route('/{id}/edit', name: 'app_variable_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, Variable $variable, EntityManagerInterface $entityManager): Response
    {
        /** @var User $user */
        $user = $this->getUser();

        // Use the voter to check EDIT permission
        $this->denyAccessUnlessGranted('EDIT', $variable);

        // Determine if the user is an organization admin
        $isOrgAdmin = $this->isGranted('ROLE_ORGANIZATION_ADMIN');
        $organization = $user->getOrganization();

        // Determine current owner type
        $ownerType = $variable->getUser() ? 'user' : 'organization';

        // Create form with appropriate options
        $form = $this->createForm(VariableType::class, $variable, [
            'owner_type' => $ownerType,
        ]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Check if organization admin selected organization as owner
            if ($isOrgAdmin && $organization && $form->has('ownerType')) {
                $ownerType = $form->get('ownerType')->getData();

                if ($ownerType === 'organization') {
                    $variable->setUser(null);
                    $variable->setOrganization($organization);
                } else {
                    $variable->setUser($user);
                    $variable->setOrganization(null);
                }
            } else if ($variable->getUser() === $user) {
                // Regular user editing their own variable - keep it that way
                $variable->setUser($user);
                $variable->setOrganization(null);
            }
            // If it's an org admin editing an org variable, we don't change the ownership

            $entityManager->flush();

            $this->addFlash('success', 'Variable updated successfully.');

            return $this->redirectToRoute('app_variable_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->render('variable/edit.html.twig', [
            'variable' => $variable,
            'form' => $form,
            'is_org_admin' => $isOrgAdmin,
        ]);
    }

    #[Route('/{id}', name: 'app_variable_delete', methods: ['POST'])]
    public function delete(Request $request, Variable $variable, EntityManagerInterface $entityManager): Response
    {
        // Use the voter to check DELETE permission
        $this->denyAccessUnlessGranted('DELETE', $variable);

        if ($this->isCsrfTokenValid('delete'.$variable->getId(), $request->request->get('_token'))) {
            $entityManager->remove($variable);
            $entityManager->flush();
            $this->addFlash('success', 'Variable deleted successfully.');
        } else {
            $this->addFlash('error', 'Invalid CSRF token.');
        }

        return $this->redirectToRoute('app_variable_index', [], Response::HTTP_SEE_OTHER);
    }
}
