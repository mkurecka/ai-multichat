<?php

namespace App\Controller;

use App\Entity\PromptTemplate;
use App\Entity\User;
use App\Form\PromptTemplateType;
use App\Repository\PromptTemplateRepository;
use App\Security\Voter\PromptTemplateVoter; // Import the voter
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/prompt-templates')] // Removed '/settings' prefix
#[IsGranted('IS_AUTHENTICATED_FULLY')] // Ensure user is logged in
class PromptTemplateController extends AbstractController
{
    #[Route('/', name: 'app_prompt_template_index', methods: ['GET'])]
    public function index(PromptTemplateRepository $promptTemplateRepository): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->redirectToRoute('app_login');
        }

        // Fetch templates owned by the current user
        $userTemplates = $promptTemplateRepository->findBy(['owner' => $user]);

        // For organization admins, also fetch organization templates
        $organizationTemplates = [];
        if ($this->isGranted('ROLE_ORGANIZATION_ADMIN') && $user->getOrganization()) {
            $organizationTemplates = $promptTemplateRepository->findBy(['organization' => $user->getOrganization()]);
        }

        return $this->render('prompt_template/index.html.twig', [
            'user_templates' => $userTemplates,
            'organization_templates' => $organizationTemplates,
            'is_org_admin' => $this->isGranted('ROLE_ORGANIZATION_ADMIN'),
        ]);
    }

    #[Route('/new', name: 'app_prompt_template_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager): Response
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->redirectToRoute('app_login');
        }

        $template = new PromptTemplate();
        $template->setOwner($user); // Default to user association
        $template->setScope(PromptTemplate::SCOPE_PRIVATE); // Default to private scope

        // Determine if the user is an organization admin
        $isOrgAdmin = $this->isGranted('ROLE_ORGANIZATION_ADMIN');
        $organization = $user->getOrganization();
        $ownerType = 'user'; // Default owner type

        // Create form with appropriate options
        $form = $this->createForm(PromptTemplateType::class, $template, [
            'is_org_admin' => $isOrgAdmin,
        ]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Check if organization admin selected organization as owner
            if ($isOrgAdmin && $organization && $form->has('ownerType')) {
                $ownerType = $form->get('ownerType')->getData();

                if ($ownerType === 'organization') {
                    $template->setOwner(null);
                    $template->setOrganization($organization);
                    $template->setScope(PromptTemplate::SCOPE_ORGANIZATION);
                } else {
                    $template->setOwner($user);
                    $template->setOrganization(null);
                    $template->setScope(PromptTemplate::SCOPE_PRIVATE);
                }
            } else {
                // Regular user - always set to user
                $template->setOwner($user);
                $template->setOrganization(null);
                $template->setScope(PromptTemplate::SCOPE_PRIVATE);
            }

            // Set sort order for messages if using CollectionType JS
            $sortOrder = 0;
            foreach ($template->getMessages() as $message) {
                $message->setTemplate($template); // Ensure association
                $message->setSortOrder($sortOrder++);
            }

            $entityManager->persist($template);
            $entityManager->flush();

            $this->addFlash('success', 'Prompt template created successfully.');

            return $this->redirectToRoute('app_prompt_template_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->render('prompt_template/new.html.twig', [
            'prompt_template' => $template,
            'form' => $form,
            'is_org_admin' => $isOrgAdmin,
        ]);
    }

    #[Route('/{id}/edit', name: 'app_prompt_template_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, PromptTemplate $template, EntityManagerInterface $entityManager): Response
    {
        // Use the voter to check EDIT permission
        $this->denyAccessUnlessGranted(PromptTemplateVoter::EDIT, $template);

        /** @var User $user */
        $user = $this->getUser(); // Get user again for safety, though voter should handle it

        // Determine if the user is an organization admin
        $isOrgAdmin = $this->isGranted('ROLE_ORGANIZATION_ADMIN');
        $organization = $user->getOrganization();

        // Determine current owner type
        $ownerType = $template->getOwner() ? 'user' : 'organization';
        $isOrgTemplate = $template->getOrganization() !== null;

        // Create form with appropriate options
        $form = $this->createForm(PromptTemplateType::class, $template, [
            'is_org_admin' => $isOrgAdmin,
        ]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Check if organization admin selected organization as owner
            if ($isOrgAdmin && $organization && $form->has('ownerType')) {
                $ownerType = $form->get('ownerType')->getData();

                if ($ownerType === 'organization') {
                    $template->setOwner(null);
                    $template->setOrganization($organization);
                    $template->setScope(PromptTemplate::SCOPE_ORGANIZATION);
                } else {
                    $template->setOwner($user);
                    $template->setOrganization(null);
                    $template->setScope(PromptTemplate::SCOPE_PRIVATE);
                }
            } else if ($template->getOwner() === $user) {
                // Regular user editing their own template - keep it that way
                $template->setOwner($user);
                $template->setOrganization(null);
                $template->setScope(PromptTemplate::SCOPE_PRIVATE);
            }
            // If it's an org admin editing an org template, we don't change the ownership

            // Update sort order for messages
            $sortOrder = 0;
            foreach ($template->getMessages() as $message) {
                 $message->setTemplate($template); // Ensure association
                 $message->setSortOrder($sortOrder++);
            }

            $entityManager->flush();

            $this->addFlash('success', 'Prompt template updated successfully.');

            return $this->redirectToRoute('app_prompt_template_index', [], Response::HTTP_SEE_OTHER);
        }

        return $this->render('prompt_template/edit.html.twig', [
            'prompt_template' => $template,
            'form' => $form,
            'is_org_admin' => $isOrgAdmin,
            'is_org_template' => $isOrgTemplate,
        ]);
    }

    #[Route('/{id}', name: 'app_prompt_template_delete', methods: ['POST'])]
    public function delete(Request $request, PromptTemplate $template, EntityManagerInterface $entityManager): Response
    {
        // Use the voter to check DELETE permission
        $this->denyAccessUnlessGranted(PromptTemplateVoter::DELETE, $template);

        if ($this->isCsrfTokenValid('delete'.$template->getId(), $request->request->get('_token'))) {
            $entityManager->remove($template);
            $entityManager->flush();
            $this->addFlash('success', 'Prompt template deleted successfully.');
        } else {
            $this->addFlash('error', 'Invalid CSRF token.');
        }

        return $this->redirectToRoute('app_prompt_template_index', [], Response::HTTP_SEE_OTHER);
    }
}
