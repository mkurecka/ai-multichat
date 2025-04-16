<?php

namespace App\Controller;

use App\Entity\User;
use App\Entity\Variable; // Add this
use App\Repository\VariableRepository;
use Doctrine\ORM\EntityManagerInterface; // Add this
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request; // Add this
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface; // Add this

#[Route('/api/variables')]
#[IsGranted('IS_AUTHENTICATED_FULLY')] // Secure API endpoints
class ApiVariableController extends AbstractController
{
    public function __construct(
        private readonly SerializerInterface $serializer,
        private readonly VariableRepository $variableRepository,
        private readonly EntityManagerInterface $entityManager, // Add this
        private readonly ValidatorInterface $validator // Add this
    ) {}

    #[Route('/me', name: 'api_variable_list_mine', methods: ['GET'])]
    public function listMyVariables(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            // Should not happen due to IsGranted
            return $this->json(['message' => 'Authentication required'], Response::HTTP_UNAUTHORIZED);
        }

        $variables = $this->variableRepository->findBy(['user' => $user]);

        // Use serialization groups defined in the entity
        $jsonContent = $this->serializer->serialize($variables, 'json', ['groups' => 'variable:read']);

        return new JsonResponse($jsonContent, Response::HTTP_OK, [], true); // true for pre-serialized JSON
    }

    #[Route('/me', name: 'api_variable_create_mine', methods: ['POST'])]
    public function createMyVariable(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Authentication required'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            // Deserialize request body into a new Variable object
            // Use 'variable:write' group to only allow setting name and value
            $variable = $this->serializer->deserialize(
                $request->getContent(),
                Variable::class,
                'json',
                ['groups' => 'variable:write']
            );

            // Manually set the owner and ensure organization is null
            $variable->setUser($user);
            $variable->setOrganization(null);

            // Manually set timestamps before validating/persisting
            $now = new \DateTimeImmutable();
            if ($variable->getCreatedAt() === null) {
                 $variable->setCreatedAt($now);
            }
            if ($variable->getUpdatedAt() === null) {
                 $variable->setUpdatedAt($now);
            }

            // Validate the entity
            $errors = $this->validator->validate($variable);
            if (count($errors) > 0) {
                // Return validation errors
                $errorMessages = [];
                foreach ($errors as $error) {
                    $errorMessages[$error->getPropertyPath()][] = $error->getMessage();
                }
                return $this->json(['errors' => $errorMessages], Response::HTTP_BAD_REQUEST);
            }

            // Persist and flush
            $this->entityManager->persist($variable);
            $this->entityManager->flush();

            // Return the created variable using the read group
            $jsonContent = $this->serializer->serialize($variable, 'json', ['groups' => 'variable:read']);
            return new JsonResponse($jsonContent, Response::HTTP_CREATED, [], true);

        } catch (\Symfony\Component\Serializer\Exception\NotEncodableValueException $e) {
            return $this->json(['message' => 'Invalid JSON format'], Response::HTTP_BAD_REQUEST);
        } catch (\Exception $e) {
            // Log the exception details in a real application
            return $this->json(['message' => 'An error occurred: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[Route('/me/{id}', name: 'api_variable_update_mine', methods: ['PUT', 'PATCH'])]
    public function updateMyVariable(Request $request, Variable $variable): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user || $variable->getUser() !== $user) {
            // Ensure the variable belongs to the current user
            return $this->json(['message' => 'Variable not found or access denied'], Response::HTTP_NOT_FOUND);
        }

        try {
            // Deserialize request data onto the existing Variable object
            // Use 'variable:write' group and 'object_to_populate' to update
            $this->serializer->deserialize(
                $request->getContent(),
                Variable::class,
                'json',
                [
                    'groups' => 'variable:write',
                    'object_to_populate' => $variable
                ]
            );

            // Ensure it remains associated with the user and not an organization
            $variable->setUser($user);
            $variable->setOrganization(null);

            // Validate the updated entity
            $errors = $this->validator->validate($variable);
            if (count($errors) > 0) {
                $errorMessages = [];
                foreach ($errors as $error) {
                    $errorMessages[$error->getPropertyPath()][] = $error->getMessage();
                }
                return $this->json(['errors' => $errorMessages], Response::HTTP_BAD_REQUEST);
            }

            // Flush changes
            $this->entityManager->flush();

            // Return the updated variable
            $jsonContent = $this->serializer->serialize($variable, 'json', ['groups' => 'variable:read']);
            return new JsonResponse($jsonContent, Response::HTTP_OK, [], true);

        } catch (\Symfony\Component\Serializer\Exception\NotEncodableValueException $e) {
            return $this->json(['message' => 'Invalid JSON format'], Response::HTTP_BAD_REQUEST);
        } catch (\Exception $e) {
            return $this->json(['message' => 'An error occurred: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[Route('/me/{id}', name: 'api_variable_delete_mine', methods: ['DELETE'])]
    public function deleteMyVariable(Variable $variable): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user || $variable->getUser() !== $user) {
            // Ensure the variable belongs to the current user
            return $this->json(['message' => 'Variable not found or access denied'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->entityManager->remove($variable);
            $this->entityManager->flush();

            return new JsonResponse(null, Response::HTTP_NO_CONTENT); // Standard response for successful deletion

        } catch (\Exception $e) {
            return $this->json(['message' => 'An error occurred: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    // Admin API endpoints could be added below if needed
}
