<?php

namespace App\Controller\Admin;

use App\Entity\Model;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Psr\Log\LoggerInterface;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;

#[Route('/admin')]
#[IsGranted('ROLE_ADMIN')]
class ModelController extends AbstractController
{
    private $logger;
    private $csrfTokenManager;

    public function __construct(LoggerInterface $logger, CsrfTokenManagerInterface $csrfTokenManager)
    {
        $this->logger = $logger;
        $this->csrfTokenManager = $csrfTokenManager;
    }

    #[Route('/models', name: 'admin_models')]
    public function index(EntityManagerInterface $entityManager): Response
    {
        $models = $entityManager->getRepository(Model::class)->findAll();

        return $this->render('admin/models/index.html.twig', [
            'models' => $models,
        ]);
    }

    #[Route('/models/{id}/update', name: 'admin_models_update', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function updateModel(Request $request, EntityManagerInterface $entityManager, int $id): Response
    {
        // Get model from database
        $model = $entityManager->getRepository(Model::class)->find($id);

        if (!$model) {
            $this->addFlash('error', 'Model not found');
            return $this->redirectToRoute('admin_models');
        }

        // Validate CSRF token
        $token = $request->request->get('token');
        if (!$this->isCsrfTokenValid('update-model-' . $id, $token)) {
            $this->addFlash('error', 'Invalid CSRF token');
            return $this->redirectToRoute('admin_models');
        }

        // Get property and value from request
        $property = $request->request->get('property');
        $value = (bool) $request->request->get('value');

        // Validate property
        if (!in_array($property, ['enabled', 'supportsStreaming'])) {
            $this->addFlash('error', 'Invalid property');
            return $this->redirectToRoute('admin_models');
        }

        try {
            // Update model property
            $setter = $property === 'supportsStreaming' ? 'setSupportsStreaming' : 'setEnabled';
            $oldValue = $property === 'supportsStreaming' ? $model->isSupportsStreaming() : $model->isEnabled();

            $this->logger->info("Updating model {$property} status", [
                'modelId' => $id,
                'oldStatus' => $oldValue,
                'newStatus' => $value
            ]);

            // Update the model
            $model->$setter($value);
            $entityManager->flush();

            $this->addFlash('success', ucfirst($property) . ' status updated successfully');
        } catch (\Exception $e) {
            $this->logger->error("Error updating {$property} status", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->addFlash('error', 'An error occurred while updating the model');
        }

        return $this->redirectToRoute('admin_models');
    }

    // Zachováme staré metody pro zpětnou kompatibilitu, ale přesměrujeme je na novou metodu

    #[Route('/models/toggle-streaming', name: 'admin_models_toggle_streaming', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function toggleStreaming(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $this->logger->info('Legacy API endpoint called: toggle-streaming');

        try {
            $content = $request->getContent();
            $data = json_decode($content, true);

            if (!isset($data['modelId']) || !isset($data['enabled'])) {
                return $this->json(['error' => 'Missing required parameters'], Response::HTTP_BAD_REQUEST);
            }

            $model = $entityManager->getRepository(Model::class)->find($data['modelId']);

            if (!$model) {
                return $this->json(['error' => 'Model not found'], Response::HTTP_NOT_FOUND);
            }

            $model->setSupportsStreaming((bool) $data['enabled']);
            $entityManager->flush();

            return $this->json([
                'success' => true,
                'message' => 'Streaming status updated successfully',
                'supportsStreaming' => $model->isSupportsStreaming()
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'An error occurred while updating streaming status',
                'message' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[Route('/models/toggle-enabled', name: 'admin_models_toggle_enabled', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function toggleEnabled(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $this->logger->info('Legacy API endpoint called: toggle-enabled');

        try {
            $content = $request->getContent();
            $data = json_decode($content, true);

            if (!isset($data['modelId']) || !isset($data['enabled'])) {
                return $this->json(['error' => 'Missing required parameters'], Response::HTTP_BAD_REQUEST);
            }

            $model = $entityManager->getRepository(Model::class)->find($data['modelId']);

            if (!$model) {
                return $this->json(['error' => 'Model not found'], Response::HTTP_NOT_FOUND);
            }

            $model->setEnabled((bool) $data['enabled']);
            $entityManager->flush();

            return $this->json([
                'success' => true,
                'message' => 'Enabled status updated successfully',
                'enabled' => $model->isEnabled()
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'An error occurred while updating enabled status',
                'message' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}