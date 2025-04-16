<?php

namespace App\Controller\Admin;

use App\Entity\Organization;
use App\Entity\PromptTemplate; // Added
use App\Entity\Variable;
use App\Form\Admin\AdminPromptTemplateType; // Added
use App\Form\VariableType;
use App\Repository\OrganizationRepository;
use App\Repository\PromptTemplateRepository; // Added
use App\Repository\VariableRepository;
use App\Security\Voter\PromptTemplateVoter; // Added
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/organization')]
#[IsGranted('ROLE_ADMIN')] // Secure the whole controller for admins
class OrganizationController extends AbstractController
{
    #[Route('/', name: 'admin_organization_index', methods: ['GET'])]
    public function index(OrganizationRepository $organizationRepository): Response
    {
        return $this->render('admin/organization/index.html.twig', [
            'organizations' => $organizationRepository->findAll(), // Consider pagination for large numbers
        ]);
    }

    #[Route('/{id}', name: 'admin_organization_show', methods: ['GET'])]
    public function show(
        Organization $organization,
        VariableRepository $variableRepository,
        PromptTemplateRepository $promptTemplateRepository // Added
    ): Response {
        // Fetch variables specifically for this organization
        $organizationVariables = $variableRepository->findBy(['organization' => $organization]);
        // Fetch prompt templates specifically for this organization
        $organizationTemplates = $promptTemplateRepository->findBy(['organization' => $organization]);

        return $this->render('admin/organization/show.html.twig', [
            'organization' => $organization,
            'variables' => $organizationVariables,
            'prompt_templates' => $organizationTemplates, // Added
        ]);
    }

    #[Route('/{orgId}/variable/new', name: 'admin_organization_variable_new', methods: ['GET', 'POST'])]
    public function newVariable(
        Request $request,
        EntityManagerInterface $entityManager,
        OrganizationRepository $organizationRepository,
        int $orgId // Use route parameter name
    ): Response {
        $organization = $organizationRepository->find($orgId);
        if (!$organization) {
            throw $this->createNotFoundException('Organization not found');
        }

        $variable = new Variable();
        $variable->setOrganization($organization); // Pre-associate with the organization

        $form = $this->createForm(VariableType::class, $variable);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Manually set timestamps before persisting, as Gedmo might not be firing
            $now = new \DateTimeImmutable();
            if ($variable->getCreatedAt() === null) {
                 $variable->setCreatedAt($now);
            }
            if ($variable->getUpdatedAt() === null) { // Also set updatedAt on creation
                 $variable->setUpdatedAt($now);
            }
            $entityManager->persist($variable);
            $entityManager->flush();

            $this->addFlash('success', 'Variable created successfully.');

            return $this->redirectToRoute('admin_organization_show', ['id' => $organization->getId()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/organization/variable_new.html.twig', [
            'organization' => $organization,
            'variable' => $variable,
            'form' => $form,
        ]);
    }

    #[Route('/{orgId}/variable/{id}/edit', name: 'admin_organization_variable_edit', methods: ['GET', 'POST'])]
    public function editVariable(
        Request $request,
        Variable $variable, // ParamConverter fetches the Variable by {id}
        EntityManagerInterface $entityManager,
        OrganizationRepository $organizationRepository,
        int $orgId // Still need orgId for context and redirection
    ): Response {
        $organization = $organizationRepository->find($orgId);
        if (!$organization || $variable->getOrganization() !== $organization) {
            // Ensure the variable belongs to the specified organization
            throw $this->createNotFoundException('Variable or Organization not found for this context.');
        }

        $form = $this->createForm(VariableType::class, $variable);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->flush();

            $this->addFlash('success', 'Variable updated successfully.');

            return $this->redirectToRoute('admin_organization_show', ['id' => $organization->getId()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/organization/variable_edit.html.twig', [
            'organization' => $organization,
            'variable' => $variable,
            'form' => $form,
        ]);
    }

    #[Route('/{orgId}/variable/{id}', name: 'admin_organization_variable_delete', methods: ['POST'])]
    public function deleteVariable(
        Request $request,
        Variable $variable,
        EntityManagerInterface $entityManager,
        OrganizationRepository $organizationRepository,
        int $orgId
    ): Response {
        $organization = $organizationRepository->find($orgId);
        if (!$organization || $variable->getOrganization() !== $organization) {
            throw $this->createNotFoundException('Variable or Organization not found for this context.');
        }

        if ($this->isCsrfTokenValid('delete'.$variable->getId(), $request->request->get('_token'))) {
            $entityManager->remove($variable);
            $entityManager->flush();
            $this->addFlash('success', 'Variable deleted successfully.');
        } else {
             $this->addFlash('error', 'Invalid CSRF token.');
        }


        return $this->redirectToRoute('admin_organization_show', ['id' => $organization->getId()], Response::HTTP_SEE_OTHER);
    }

    // --- Prompt Template Management ---

    #[Route('/{orgId}/prompt-template/new', name: 'admin_organization_prompt_template_new', methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_ORGANIZATION_ADMIN')] // Ensure user is an admin for this org (or global admin)
    public function newPromptTemplate(
        Request $request,
        EntityManagerInterface $entityManager,
        OrganizationRepository $organizationRepository,
        int $orgId
    ): Response {
        $organization = $organizationRepository->find($orgId);
        if (!$organization) {
            throw $this->createNotFoundException('Organization not found');
        }

        // Optional: Add a specific check if the current user is admin *of this specific org*
        // if (!$this->isGranted('ADMIN_ORG', $organization)) { // Assuming an 'ADMIN_ORG' voter attribute
        //    throw $this->createAccessDeniedException('You are not an admin of this organization.');
        // }

        $template = new PromptTemplate();
        $template->setOrganization($organization); // Pre-associate with the organization
        $template->setOwner(null); // Ensure no user owner

        $form = $this->createForm(AdminPromptTemplateType::class, $template);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Ensure correct ownership again
            $template->setOrganization($organization);
            $template->setOwner(null);

            // Set sort order for messages
            $sortOrder = 0;
            foreach ($template->getMessages() as $message) {
                $message->setTemplate($template);
                $message->setSortOrder($sortOrder++);
            }

            $entityManager->persist($template);
            $entityManager->flush();

            $this->addFlash('success', 'Prompt template created successfully for organization.');

            return $this->redirectToRoute('admin_organization_show', ['id' => $organization->getId()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/organization/prompt_template_new.html.twig', [
            'organization' => $organization,
            'prompt_template' => $template,
            'form' => $form,
        ]);
    }

    #[Route('/{orgId}/prompt-template/{id}/edit', name: 'admin_organization_prompt_template_edit', methods: ['GET', 'POST'])]
    public function editPromptTemplate(
        Request $request,
        PromptTemplate $template, // ParamConverter fetches the template by {id}
        EntityManagerInterface $entityManager,
        OrganizationRepository $organizationRepository,
        int $orgId
    ): Response {
        $organization = $organizationRepository->find($orgId);
        if (!$organization || $template->getOrganization() !== $organization) {
            throw $this->createNotFoundException('Template or Organization not found for this context.');
        }

        // Use the voter to check EDIT permission (handles ROLE_ORGANIZATION_ADMIN check)
        $this->denyAccessUnlessGranted(PromptTemplateVoter::EDIT, $template);

        $form = $this->createForm(AdminPromptTemplateType::class, $template);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
             // Ensure correct ownership again
            $template->setOrganization($organization);
            $template->setOwner(null);

            // Update sort order for messages
            $sortOrder = 0;
            foreach ($template->getMessages() as $message) {
                 $message->setTemplate($template);
                 $message->setSortOrder($sortOrder++);
            }

            $entityManager->flush();
            $this->addFlash('success', 'Prompt template updated successfully.');

            return $this->redirectToRoute('admin_organization_show', ['id' => $organization->getId()], Response::HTTP_SEE_OTHER);
        }

        return $this->render('admin/organization/prompt_template_edit.html.twig', [
            'organization' => $organization,
            'prompt_template' => $template,
            'form' => $form,
        ]);
    }

    #[Route('/{orgId}/prompt-template/{id}', name: 'admin_organization_prompt_template_delete', methods: ['POST'])]
    public function deletePromptTemplate(
        Request $request,
        PromptTemplate $template,
        EntityManagerInterface $entityManager,
        OrganizationRepository $organizationRepository,
        int $orgId
    ): Response {
        $organization = $organizationRepository->find($orgId);
        if (!$organization || $template->getOrganization() !== $organization) {
            throw $this->createNotFoundException('Template or Organization not found for this context.');
        }

        // Use the voter to check DELETE permission
        $this->denyAccessUnlessGranted(PromptTemplateVoter::DELETE, $template);

        if ($this->isCsrfTokenValid('delete'.$template->getId(), $request->request->get('_token'))) {
            $entityManager->remove($template);
            $entityManager->flush();
            $this->addFlash('success', 'Prompt template deleted successfully.');
        } else {
             $this->addFlash('error', 'Invalid CSRF token.');
        }

        return $this->redirectToRoute('admin_organization_show', ['id' => $organization->getId()], Response::HTTP_SEE_OTHER);
    }
}
