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

#[Route('/admin')]
#[IsGranted('ROLE_ADMIN')]
class ModelController extends AbstractController
{
    private $logger;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }

    #[Route('/models', name: 'admin_models')]
    public function index(EntityManagerInterface $entityManager): Response
    {
        $models = $entityManager->getRepository(Model::class)->findAll();
        
        return $this->render('admin/models/index.html.twig', [
            'models' => $models,
        ]);
    }
    
    #[Route('/models/toggle-streaming', name: 'admin_models_toggle_streaming', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function toggleStreaming(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        return $this->toggleModelProperty($request, $entityManager, 'supportsStreaming');
    }
    
    #[Route('/models/toggle-enabled', name: 'admin_models_toggle_enabled', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function toggleEnabled(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        return $this->toggleModelProperty($request, $entityManager, 'enabled');
    }
    
    /**
     * Generic toggle method for model properties
     * 
     * @param Request $request
     * @param EntityManagerInterface $entityManager
     * @param string $property The property to toggle ('supportsStreaming' or 'enabled')
     * @return JsonResponse
     */
    private function toggleModelProperty(Request $request, EntityManagerInterface $entityManager, string $property): JsonResponse
    {
        // Disable CSRF protection for this endpoint
        $this->denyAccessUnlessGranted('ROLE_ADMIN');
        
        try {
            $content = $request->getContent();
            $data = json_decode($content, true);
            
            // Log the request data
            $this->logger->info("Toggle {$property} request received", [
                'content' => $content,
                'data' => $data
            ]);
            
            // Determine the required parameters based on the property
            $paramName = $property;

            $model = $entityManager->getRepository(Model::class)->find($data['modelId']);
            
            if (!$model) {
                $this->logger->error('Model not found', ['modelId' => $data['modelId']]);
                return $this->json(['error' => 'Model not found'], Response::HTTP_NOT_FOUND);
            }
            
            // Get the current value and the new value
            $getter = $property === 'supportsStreaming' ? 'isSupportsStreaming' : 'isEnabled';
            $setter = $property === 'supportsStreaming' ? 'setSupportsStreaming' : 'setEnabled';
            $oldValue = $model->$getter();
            $newValue = $data['enabled'];
            
            $this->logger->info("Updating model {$property} status", [
                'modelId' => $data['modelId'],
                'oldStatus' => $oldValue,
                'newStatus' => $newValue
            ]);
            
            // Update the model
            $model->$setter($newValue);
            $entityManager->flush();
            
            $this->logger->info("Model {$property} status updated successfully", [
                'modelId' => $data['modelId'],
                $paramName => $model->$getter()
            ]);
            
            return $this->json([
                'success' => true,
                'message' => ucfirst($property) . ' status updated successfully',
                $paramName => $model->$getter()
            ]);
        } catch (\Exception $e) {
            $this->logger->error("Error updating {$property} status", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->json([
                'error' => "An error occurred while updating {$property} status",
                'message' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
} 