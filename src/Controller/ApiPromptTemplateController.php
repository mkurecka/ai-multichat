<?php

namespace App\Controller;

use App\Entity\PromptTemplate;
use App\Entity\User;
use App\Repository\PromptTemplateRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer; // For serialization context
use Symfony\Component\Validator\Validator\ValidatorInterface; // For validation

#[Route('/api/prompt-templates')]
#[IsGranted('ROLE_USER')] // Base security for all template API endpoints
class ApiPromptTemplateController extends AbstractController
{
    public function __construct(
        private readonly PromptTemplateRepository $promptTemplateRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator
    ) {}

    #[Route('', name: 'api_prompt_template_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $this->getUser();
        $organization = $currentUser->getOrganization();

        // Get user templates
        $userTemplates = $this->promptTemplateRepository->findBy(['owner' => $currentUser]);

        // Get organization templates if user belongs to an organization
        $organizationTemplates = [];
        if ($organization) {
            $organizationTemplates = $this->promptTemplateRepository->findBy([
                'organization' => $organization,
                'scope' => PromptTemplate::SCOPE_ORGANIZATION
            ]);
        }

        // Combine both sets of templates
        $templates = array_merge($userTemplates, $organizationTemplates);

        // Sort templates by name
        usort($templates, function($a, $b) {
            return strcmp($a->getName(), $b->getName());
        });

        // Use serialization groups to control the output
        return $this->json($templates, Response::HTTP_OK, [], [
            AbstractNormalizer::GROUPS => ['template:read']
        ]);
    }

    // --- Placeholder for other actions ---

    #[Route('/{id}', name: 'api_prompt_template_show', methods: ['GET'])]
    public function show(PromptTemplate $promptTemplate): JsonResponse
    {
        // Authorization check needed here (can user view this specific template?)
        $this->denyAccessUnlessGranted('VIEW', $promptTemplate);

        // Use serialization groups, including nested messages
        return $this->json($promptTemplate, Response::HTTP_OK, [], [
            AbstractNormalizer::GROUPS => ['template:read'] // 'template:read' should implicitly include messages group if set correctly
        ]);
    }

    #[Route('', name: 'api_prompt_template_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $this->getUser();
        $organization = $currentUser->getOrganization();

        try {
            // Deserialize JSON into a new PromptTemplate object
            // Need to configure serializer to handle nested PromptTemplateMessage objects
            $promptTemplate = $this->serializer->deserialize(
                $request->getContent(),
                PromptTemplate::class,
                'json',
                [AbstractNormalizer::GROUPS => ['template:write']] // Use write group for deserialization
            );

            // Check if request contains organization flag and user is an org admin
            $data = json_decode($request->getContent(), true);
            $forOrganization = $data['forOrganization'] ?? false;

            if ($forOrganization && $this->isGranted('ROLE_ORGANIZATION_ADMIN') && $organization) {
                // Set for organization
                $promptTemplate->setOwner(null);
                $promptTemplate->setOrganization($organization);
                $promptTemplate->setScope(PromptTemplate::SCOPE_ORGANIZATION);
            } else {
                // Set for user
                $promptTemplate->setOwner($currentUser);
                $promptTemplate->setOrganization(null);
                $promptTemplate->setScope(PromptTemplate::SCOPE_PRIVATE);
            }
             // Ensure messages link back to the template (might be handled by serializer/cascade)
             foreach ($promptTemplate->getMessages() as $message) {
                 $message->setTemplate($promptTemplate);
             }


            // Validate the deserialized object
            $errors = $this->validator->validate($promptTemplate);
            if (count($errors) > 0) {
                return $this->json(['errors' => (string) $errors], Response::HTTP_BAD_REQUEST);
            }

            $this->entityManager->persist($promptTemplate);
            $this->entityManager->flush();

            // Return the created object using read groups
            return $this->json($promptTemplate, Response::HTTP_CREATED, [], [
                 AbstractNormalizer::GROUPS => ['template:read']
            ]);

        } catch (\Symfony\Component\Serializer\Exception\ExceptionInterface $e) {
            return $this->json(['error' => 'Invalid JSON data: ' . $e->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (\Exception $e) {
             // Log the error
             // $this->logger->error('Error creating prompt template: ' . $e->getMessage());
             return $this->json(['error' => 'An internal error occurred.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }


    #[Route('/{id}', name: 'api_prompt_template_update', methods: ['PATCH'])]
    public function update(Request $request, PromptTemplate $promptTemplate): JsonResponse
    {
        // Authorization check needed here (can user edit this specific template?)
        $this->denyAccessUnlessGranted('EDIT', $promptTemplate); // Assuming 'EDIT' attribute

        try {
            // Deserialize updates onto the existing object
            // Use AbstractNormalizer::OBJECT_TO_POPULATE to update the existing entity
            $this->serializer->deserialize(
                $request->getContent(),
                PromptTemplate::class,
                'json',
                [
                    AbstractNormalizer::OBJECT_TO_POPULATE => $promptTemplate,
                    AbstractNormalizer::GROUPS => ['template:write'], // Use write group
                    // Consider deep object merging options if needed for messages, e.g., 'deep_object_to_populate' => true if using specific normalizers
                ]
            );

             // Re-validate after applying changes
             $errors = $this->validator->validate($promptTemplate);
             if (count($errors) > 0) {
                 return $this->json(['errors' => (string) $errors], Response::HTTP_BAD_REQUEST);
             }

             // Check if request contains organization flag and user is an org admin
             $data = json_decode($request->getContent(), true);
             $forOrganization = $data['forOrganization'] ?? null;
             $currentUser = $this->getUser();
             $organization = $currentUser->getOrganization();

             if ($forOrganization !== null && $this->isGranted('ROLE_ORGANIZATION_ADMIN') && $organization) {
                 if ($forOrganization) {
                     // Change to organization template
                     $promptTemplate->setOwner(null);
                     $promptTemplate->setOrganization($organization);
                     $promptTemplate->setScope(PromptTemplate::SCOPE_ORGANIZATION);
                 } else {
                     // Change to user template
                     $promptTemplate->setOwner($currentUser);
                     $promptTemplate->setOrganization(null);
                     $promptTemplate->setScope(PromptTemplate::SCOPE_PRIVATE);
                 }
             } else if (!$this->isGranted('ROLE_ORGANIZATION_ADMIN') && $promptTemplate->getScope() !== PromptTemplate::SCOPE_PRIVATE) {
                 // Non-admin cannot change scope
                 $promptTemplate->setScope(PromptTemplate::SCOPE_PRIVATE);
             }

             // Ensure messages link back (important if new messages were added in PATCH)
             foreach ($promptTemplate->getMessages() as $message) {
                 if ($message->getTemplate() === null) {
                     $message->setTemplate($promptTemplate);
                 }
                 // Handle persistence of potentially new messages added via PATCH
                 if ($message->getId() === null) {
                     $this->entityManager->persist($message);
                 }
             }
             // Note: Handling deletion of messages via PATCH requires more complex logic
             // (e.g., comparing incoming message IDs with existing ones).

            $this->entityManager->flush();

            // Return the updated object using read groups
            return $this->json($promptTemplate, Response::HTTP_OK, [], [
                 AbstractNormalizer::GROUPS => ['template:read']
            ]);

        } catch (\Symfony\Component\Serializer\Exception\ExceptionInterface $e) {
            return $this->json(['error' => 'Invalid JSON data: ' . $e->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (\Exception $e) {
             // Log the error
             return $this->json(['error' => 'An internal error occurred.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }


    #[Route('/{id}', name: 'api_prompt_template_delete', methods: ['DELETE'])]
    public function delete(PromptTemplate $promptTemplate): Response
    {
        // Authorization check needed here
        $this->denyAccessUnlessGranted('DELETE', $promptTemplate); // Assuming 'DELETE' attribute

        try {
            $this->entityManager->remove($promptTemplate);
            $this->entityManager->flush();

            return new Response(null, Response::HTTP_NO_CONTENT);

        } catch (\Exception $e) {
             // Log the error
             return $this->json(['error' => 'An internal error occurred.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
