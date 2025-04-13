<?php

namespace App\Service;

use App\Entity\PromptTemplate;
use App\Entity\PromptTemplateMessage;
use App\Entity\Thread;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security; // Correct import for the service
use Twig\Environment;
use Twig\Loader\ArrayLoader;
use Psr\Log\LoggerInterface; // Add Logger

class PromptTemplateService
{
    // Define SAFE available context variables
    private const AVAILABLE_CONTEXT_VARIABLES = [
        'user.name' => 'User Full Name', // Assuming User has getName() or similar
        'user.firstName' => 'User First Name', // Assuming User has getFirstName()
        'user.lastName' => 'User Last Name', // Assuming User has getLastName()
        'organization.name' => 'Organization Name', // Assuming Organization has getName()
        'organization.domain' => 'Organization Domain', // Assuming Organization has getDomain()
        'current_date' => 'Current Date (YYYY-MM-DD)',
        // Add more safe variables as needed
    ];

    // Variable expected to hold the current user input in the template
    private const USER_INPUT_VARIABLE = 'user_input';

    private Environment $twig;

    public function __construct(
        private readonly Security $security,
        private readonly ContextService $contextService, // Inject ContextService
        private readonly LoggerInterface $logger // Inject Logger
    ) {
        // Initialize Twig Environment safely
        $loader = new ArrayLoader(); // Use ArrayLoader, templates will be added dynamically
        $this->twig = new Environment($loader, ['autoescape' => false]);
    }

    /**
     * Returns a map of available context variables for UI helpers.
     */
    public function getAvailableContextVariables(): array
    {
        // TODO: Potentially filter based on actual User/Org properties available
        return self::AVAILABLE_CONTEXT_VARIABLES;
    }

    /**
     * Builds the final array of messages to be sent to the LLM API,
     * processing the template messages and integrating chat history.
     *
     * @param PromptTemplate $template The selected prompt template.
     * @param Thread $thread The current conversation thread.
     * @param string $currentUserInput The latest input from the user.
     * @return array An array of message objects, e.g., [['role' => 'system', 'content' => '...'], ...]
     */
    public function buildApiMessages(PromptTemplate $template, Thread $thread, string $currentUserInput): array
    {
        $user = $thread->getUser();
        $organization = $user?->getOrganization();
        $finalApiMessages = [];

        // 1. Prepare Base Context Data (Safe Variables)
        $baseContextData = [
            'user.name' => $user?->getName(), // Example: Adjust getter if needed
            'user.firstName' => $user?->getFirstName(), // Example: Adjust getter if needed
            'user.lastName' => $user?->getLastName(), // Example: Adjust getter if needed
            'organization.name' => $organization?->getName(), // Example: Adjust getter if needed
            'organization.domain' => $organization?->getDomain(), // Example: Adjust getter if needed
            'current_date' => date('Y-m-d'),
            // Ensure all keys from AVAILABLE_CONTEXT_VARIABLES are present, even if null
        ];
        foreach (array_keys(self::AVAILABLE_CONTEXT_VARIABLES) as $key) {
            if (!array_key_exists($key, $baseContextData)) {
                 // Attempt to resolve dot notation for Twig ArrayLoader compatibility
                 $keys = explode('.', $key);
                 $value = $baseContextData;
                 $exists = true;
                 foreach ($keys as $subKey) {
                     if (is_array($value) && array_key_exists($subKey, $value)) {
                         $value = $value[$subKey];
                     } elseif (is_object($value) && property_exists($value, $subKey)) {
                         // This part might need refinement based on actual object structure if not simple getters
                         // For now, we assume simple array structure or direct property access isn't the primary method here
                         // $value = $value->$subKey;
                         $exists = false; // Mark as not found if complex object path
                         break;
                     }
                      else {
                         $exists = false;
                         break;
                     }
                 }
                 // Add the key with null value if it wasn't resolved or doesn't exist
                 if (!$exists) {
                    $baseContextData[$key] = null;
                 }
            }
        }
        // Add the user input variable separately, it's handled per message
        $baseContextData[self::USER_INPUT_VARIABLE] = $currentUserInput;


        // 2. Get Compressed History Messages (excluding the hardcoded email message)
        // We assume ContextService::getHistoryMessages provides this correctly
        $historyMessages = $this->contextService->getHistoryMessages($thread); // Needs implementation/adjustment in ContextService

        // 3. Process Template Messages and Find Insertion Point for History
        $templateMessages = $template->getMessages()->toArray(); // Get ordered messages
        $processedTemplateMessages = [];
        $historyInsertionIndex = -1;
        $lastUserMessageIndex = -1;

        foreach ($templateMessages as $index => $msg) {
            $contentTemplate = $msg->getContentTemplate() ?? '';
            $role = $msg->getRole();

            // Prepare context specific to this message (base + potentially user_input)
            $messageContext = $baseContextData;

            // Check if this message template contains the user input variable
            $containsUserInput = str_contains($contentTemplate, '{{' . self::USER_INPUT_VARIABLE . '}}');

            // Render the content using Twig
            try {
                // Dynamically add the template content to the loader
                $templateName = 'msg_' . $msg->getId();
                $this->twig->getLoader()->setTemplate($templateName, $contentTemplate);
                $processedContent = $this->twig->render($templateName, $messageContext);
            } catch (\Exception $e) {
                $this->logger->error(sprintf('Twig processing error for template message ID %d: %s', $msg->getId(), $e->getMessage()), ['exception' => $e]);
                $processedContent = '[Template Processing Error]'; // Fallback content
            }


            $processedTemplateMessages[] = ['role' => $role, 'content' => $processedContent];

            // Track the index of the last 'user' role message
            if ($role === PromptTemplateMessage::ROLE_USER) {
                $lastUserMessageIndex = $index;
            }
        }

        // Determine where to insert history: before the last 'user' message
        if ($lastUserMessageIndex !== -1) {
            $historyInsertionIndex = $lastUserMessageIndex;
        } else {
            // If no user message in template, append history before the very last message
            $historyInsertionIndex = count($processedTemplateMessages) > 0 ? count($processedTemplateMessages) -1 : 0;
             if ($historyInsertionIndex < 0) $historyInsertionIndex = 0; // Ensure non-negative index
        }


        // 4. Combine Processed Template Messages and History
        // Insert history messages at the calculated index
        array_splice($finalApiMessages, 0, 0, array_slice($processedTemplateMessages, 0, $historyInsertionIndex)); // Add messages before history
        $finalApiMessages = array_merge($finalApiMessages, $historyMessages); // Add history
        $finalApiMessages = array_merge($finalApiMessages, array_slice($processedTemplateMessages, $historyInsertionIndex)); // Add messages after history


        $this->logger->info('Built API messages structure', ['count' => count($finalApiMessages), 'template_id' => $template->getId()]);

        return $finalApiMessages;
    }

     /**
      * Helper to safely get nested properties from User/Organization.
      * Example: getSafeValue($user, 'organization.name')
      * Note: This is a basic example, might need more robust reflection/property accessors.
      */
     private function getSafeValue(?object $entity, string $propertyPath): mixed
     {
         if (!$entity) return null;

         $parts = explode('.', $propertyPath);
         $currentValue = $entity;

         foreach ($parts as $part) {
             $getter = 'get' . ucfirst($part);
             if (method_exists($currentValue, $getter)) {
                 $currentValue = $currentValue->$getter();
                 if ($currentValue === null) return null; // Stop if any part is null
             } else {
                 return null; // Property path not accessible
             }
         }
         return $currentValue;
     }
}
