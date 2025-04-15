<?php

namespace App\Controller\Admin;

use App\Entity\PromptTemplate;
use App\Entity\User;
use App\Form\Admin\AdminPromptTemplateType;
use App\Repository\PromptTemplateRepository;
use App\Repository\ModelRepository;
use App\Repository\UserRepository;
use App\Repository\OrganizationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Psr\Log\LoggerInterface;

#[Route('/admin/prompt-templates')]
#[IsGranted('ROLE_ADMIN')]
class PromptTemplateController extends AbstractController
{
    private $logger;

    public function __construct(
        LoggerInterface $logger,
        private readonly PromptTemplateRepository $promptTemplateRepository,
        private readonly ModelRepository $modelRepository,
        private readonly UserRepository $userRepository,
        private readonly OrganizationRepository $organizationRepository,
        private readonly EntityManagerInterface $entityManager
    ) {
        $this->logger = $logger;
    }

    #[Route('/', name: 'admin_prompt_template_index', methods: ['GET'])]
    public function index(): Response
    {
        $templates = $this->promptTemplateRepository->findAll();

        return $this->render('admin/prompt_template/index.html.twig', [
            'templates' => $templates,
        ]);
    }

    #[Route('/{id}/view', name: 'admin_prompt_template_view', methods: ['GET'])]
    public function view(PromptTemplate $promptTemplate): Response
    {
        return $this->render('admin/prompt_template/view.html.twig', [
            'template' => $promptTemplate,
        ]);
    }

    #[Route('/{id}/toggle-status', name: 'admin_prompt_template_toggle_status', methods: ['POST'])]
    public function toggleStatus(Request $request, PromptTemplate $promptTemplate): Response
    {
        // Validate CSRF token
        $token = $request->request->get('token');
        if (!$this->isCsrfTokenValid('toggle-template-' . $promptTemplate->getId(), $token)) {
            $this->addFlash('error', 'Invalid CSRF token');
            return $this->redirectToRoute('admin_prompt_template_index');
        }

        // Toggle the scope between private and organization
        $newScope = $promptTemplate->getScope() === PromptTemplate::SCOPE_PRIVATE
            ? PromptTemplate::SCOPE_ORGANIZATION
            : PromptTemplate::SCOPE_PRIVATE;

        try {
            $promptTemplate->setScope($newScope);
            $this->entityManager->flush();

            $this->addFlash('success', 'Template scope updated successfully');
        } catch (\Exception $e) {
            $this->logger->error('Error updating template scope', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->addFlash('error', 'An error occurred while updating the template scope');
        }

        return $this->redirectToRoute('admin_prompt_template_index');
    }

    #[Route('/{id}/delete', name: 'admin_prompt_template_delete', methods: ['POST'])]
    public function delete(Request $request, PromptTemplate $promptTemplate): Response
    {
        // Validate CSRF token
        $token = $request->request->get('token');
        if (!$this->isCsrfTokenValid('delete-template-' . $promptTemplate->getId(), $token)) {
            $this->addFlash('error', 'Invalid CSRF token');
            return $this->redirectToRoute('admin_prompt_template_index');
        }

        try {
            $this->entityManager->remove($promptTemplate);
            $this->entityManager->flush();

            $this->addFlash('success', 'Template deleted successfully');
        } catch (\Exception $e) {
            $this->logger->error('Error deleting template', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->addFlash('error', 'An error occurred while deleting the template');
        }

        return $this->redirectToRoute('admin_prompt_template_index');
    }

    #[Route('/{id}/edit', name: 'admin_prompt_template_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, PromptTemplate $promptTemplate): Response
    {
        $form = $this->createForm(AdminPromptTemplateType::class, $promptTemplate);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            try {
                // Manually update timestamps
                $now = new \DateTime();
                $promptTemplate->setUpdatedAt($now);

                // Update timestamps for messages
                foreach ($promptTemplate->getMessages() as $message) {
                    // Ensure relationship is set
                    if ($message->getTemplate() === null) {
                        $message->setTemplate($promptTemplate);
                    }

                    // If it's new (no ID), set both timestamps and persist
                    if ($message->getId() === null) {
                        $message->setCreatedAt($now);
                        $message->setUpdatedAt($now);
                        $this->entityManager->persist($message);
                    } else {
                        // If it's existing, just update the updatedAt timestamp
                        $message->setUpdatedAt($now);
                    }
                }

                $this->entityManager->flush();
                $this->addFlash('success', 'Prompt template updated successfully');

                return $this->redirectToRoute('admin_prompt_template_index');
            } catch (\Exception $e) {
                $this->logger->error('Error updating template', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);

                $this->addFlash('error', 'An error occurred while updating the template');
            }
        }

        return $this->render('admin/prompt_template/edit.html.twig', [
            'form' => $form,
            'template' => $promptTemplate
        ]);
    }

    #[Route('/stats', name: 'admin_prompt_template_stats', methods: ['GET'])]
    public function stats(): Response
    {
        // Get statistics about templates
        $totalTemplates = count($this->promptTemplateRepository->findAll());
        $privateTemplates = count($this->promptTemplateRepository->findBy(['scope' => PromptTemplate::SCOPE_PRIVATE]));
        $organizationTemplates = count($this->promptTemplateRepository->findBy(['scope' => PromptTemplate::SCOPE_ORGANIZATION]));

        // Get templates per organization
        $organizations = $this->organizationRepository->findAll();
        $templatesPerOrganization = [];

        foreach ($organizations as $organization) {
            $count = count($this->promptTemplateRepository->findBy(['organization' => $organization]));
            $templatesPerOrganization[] = [
                'organization' => $organization,
                'count' => $count
            ];
        }

        // Get templates per model
        $models = $this->modelRepository->findAll();
        $templatesPerModel = [];

        foreach ($models as $model) {
            $count = count($this->promptTemplateRepository->findBy(['associatedModel' => $model]));
            $templatesPerModel[] = [
                'model' => $model,
                'count' => $count
            ];
        }

        return $this->render('admin/prompt_template/stats.html.twig', [
            'totalTemplates' => $totalTemplates,
            'privateTemplates' => $privateTemplates,
            'organizationTemplates' => $organizationTemplates,
            'templatesPerOrganization' => $templatesPerOrganization,
            'templatesPerModel' => $templatesPerModel
        ]);
    }
}
