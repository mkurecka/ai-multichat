<?php

namespace App\Controller;

use App\Entity\PromptTemplate;
use App\Entity\User;
use App\Form\PromptTemplateType; // Import the form type
use App\Repository\PromptTemplateRepository;
use Doctrine\ORM\EntityManagerInterface; // Import EntityManagerInterface
use Gedmo\Timestampable\TimestampableListener; // Import Gedmo Listener
use Psr\Log\LoggerInterface; // Import LoggerInterface
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request; // Import Request
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Security\Core\User\UserInterface;
use DateTimeImmutable;

#[Route('/app/prompt-templates')] // Updated route prefix
#[IsGranted('ROLE_USER')] // Ensure user is logged in
final class PromptTemplateController extends AbstractController
{
    // Inject the listener via constructor
    public function __construct(private readonly TimestampableListener $timestampableListener) {}

    #[Route('/', name: 'app_prompt_template_index', methods: ['GET'])]
    public function index(PromptTemplateRepository $promptTemplateRepository, UserInterface $user): Response
    {
        /** @var User $currentUser */
        $currentUser = $user; // Cast UserInterface to your User entity
        $organization = $currentUser->getOrganization();

        if (!$organization) {
            // Handle case where user might not have an organization?
            // For now, assume user always has an organization after login.
            // If not, we might only show private templates or throw an error.
             $this->addFlash('warning', 'You are not associated with any organization.');
             $organizationTemplates = []; // Or handle differently
        } else {
             $organizationTemplates = $promptTemplateRepository->findBy([
                'organization' => $organization,
                'scope' => PromptTemplate::SCOPE_ORGANIZATION,
             ]);
        }


        $privateTemplates = $promptTemplateRepository->findBy([
            'owner' => $currentUser,
            'scope' => PromptTemplate::SCOPE_PRIVATE,
        ]);

        // Combine and potentially sort or group templates if needed
        $templates = array_merge($privateTemplates, $organizationTemplates);

        return $this->render('prompt_template/index.html.twig', [
            'templates' => $templates,
        ]);
    }

    #[Route('/new', name: 'app_prompt_template_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $entityManager, UserInterface $user): Response
    {
        /** @var User $currentUser */
        $currentUser = $user;
        $organization = $currentUser->getOrganization();

        // Redirect or show error if user has no organization (should not happen ideally)
        if (!$organization) {
             $this->addFlash('error', 'Cannot create template without an organization.');
             return $this->redirectToRoute('app_prompt_template_index');
        }

        $promptTemplate = new PromptTemplate();
        $promptTemplate->setOwner($currentUser);
        $promptTemplate->setOrganization($organization);
        // Default scope is set in the entity, but we might need to enforce private if user is not admin
        // and the scope field was omitted in the form.

        $form = $this->createForm(PromptTemplateType::class, $promptTemplate);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            // Ensure scope is private if user is not ORG_ADMIN and scope wasn't submitted
            if (!$this->isGranted('ROLE_ORGANIZATION_ADMIN') || !$form->has('scope')) {
                 $promptTemplate->setScope(PromptTemplate::SCOPE_PRIVATE);
            }

            // Simply persist the parent and rely on cascade persist and
            // Gedmo listener OR lifecycle callbacks in the child entity.
            $entityManager->persist($promptTemplate);
            $entityManager->flush(); // Line 91 where the error occurred

            $this->addFlash('success', 'Prompt template created successfully.');

            return $this->redirectToRoute('app_prompt_template_index');
        } // End of if ($form->isSubmitted() && $form->isValid())

        // Render the form if not submitted or not valid
        return $this->render('prompt_template/new.html.twig', [
            'prompt_template' => $promptTemplate,
            'form' => $form,
        ]);
    } // End of new() method

    #[Route('/{id}/edit', name: 'app_prompt_template_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, PromptTemplate $promptTemplate, EntityManagerInterface $entityManager): Response
    {
        // Authorization Check using the updated Voter logic
        $this->denyAccessUnlessGranted('EDIT', $promptTemplate);

        // The voter now handles the logic based on scope and user role/ownership.

        $form = $this->createForm(PromptTemplateType::class, $promptTemplate);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
             // Ensure scope is private if user is not ORG_ADMIN and scope wasn't submitted (might happen if form is manipulated)
             // Or if an admin tries to change an org template to private (might need specific logic if allowed)
             if (!$this->isGranted('ROLE_ORGANIZATION_ADMIN') || !$form->has('scope')) {
                 $promptTemplate->setScope(PromptTemplate::SCOPE_PRIVATE);
             }

             // Manually update timestamps before flushing in edit action
             $now = new \DateTimeImmutable();
             // Always update the parent's updatedAt
             $promptTemplate->setUpdatedAt($now);

             foreach ($promptTemplate->getMessages() as $message) {
                 // Ensure relationship is set
                 if ($message->getTemplate() === null) {
                     $message->setTemplate($promptTemplate);
                 }
                 // If it's new (no ID), set both timestamps and persist
                 if ($message->getId() === null) {
                     $message->setCreatedAt($now);
                     $message->setUpdatedAt($now);
                     $entityManager->persist($message); // Persist new messages
                 } else {
                     // If it's existing, just update the updatedAt timestamp
                     $message->setUpdatedAt($now);
                 }
             }

            $entityManager->flush(); // Flush parent and all child changes

            $this->addFlash('success', 'Prompt template updated successfully.');

            return $this->redirectToRoute('app_prompt_template_index');
        }

        return $this->render('prompt_template/edit.html.twig', [
            'prompt_template' => $promptTemplate,
            'form' => $form,
        ]);
    }

    #[Route('/{id}', name: 'app_prompt_template_delete', methods: ['POST'])]
    public function delete(Request $request, PromptTemplate $promptTemplate, EntityManagerInterface $entityManager): Response
    {
         // Authorization Check using the updated Voter logic
         $this->denyAccessUnlessGranted('DELETE', $promptTemplate);

         // The voter handles the detailed logic now.

        // Check CSRF token
        if ($this->isCsrfTokenValid('delete'.$promptTemplate->getId(), $request->request->get('_token'))) {
            $entityManager->remove($promptTemplate);
            $entityManager->flush();
            $this->addFlash('success', 'Prompt template deleted successfully.');
        } else {
             $this->addFlash('error', 'Invalid CSRF token.');
        }


        return $this->redirectToRoute('app_prompt_template_index');
    }

    // Removed the conflicting private denyAccessUnlessGranted helper method.
    // The calls within edit() already use the correct protected method from AbstractController.
}
