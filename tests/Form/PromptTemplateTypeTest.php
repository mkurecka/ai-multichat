<?php

namespace App\Tests\Form;

use App\Entity\Model;
use App\Entity\PromptTemplate;
use App\Entity\User;
use App\Form\PromptTemplateType;
use App\Repository\ModelRepository;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Form\FormFactoryInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Bundle\SecurityBundle\Security;

class PromptTemplateTypeTest extends KernelTestCase
{
    private $formFactory;
    private $entityManager;
    
    protected function setUp(): void
    {
        self::bootKernel();
        
        $this->formFactory = self::getContainer()->get(FormFactoryInterface::class);
        $this->entityManager = self::getContainer()->get('doctrine.orm.entity_manager');
    }
    
    public function testSubmitValidData(): void
    {
        // Get a model to use in the form
        $modelRepository = self::getContainer()->get(ModelRepository::class);
        $model = $modelRepository->findOneBy([]);
        
        if (!$model) {
            $this->markTestSkipped('No models available for testing');
        }
        
        // Create a new PromptTemplate
        $promptTemplate = new PromptTemplate();
        
        // Create the form
        $form = $this->formFactory->create(PromptTemplateType::class, $promptTemplate, [
            'is_org_admin' => false,
            'owner_type' => 'user',
        ]);
        
        // Set form data
        $formData = [
            'name' => 'Test Template',
            'description' => 'This is a test template',
            'scope' => 'private',
            'associatedModel' => $model->getId(),
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are a helpful assistant.',
                    'sortOrder' => 0,
                ],
                [
                    'role' => 'user',
                    'content' => 'Hello, how can you help me?',
                    'sortOrder' => 1,
                ],
            ],
        ];
        
        // Submit the form
        $form->submit($formData);
        
        // Check if the form is valid
        $this->assertTrue($form->isValid());
        $this->assertTrue($form->isSynchronized());
        
        // Check that the form data was mapped to the entity correctly
        $this->assertEquals('Test Template', $promptTemplate->getName());
        $this->assertEquals('This is a test template', $promptTemplate->getDescription());
        $this->assertEquals('private', $promptTemplate->getScope());
        $this->assertEquals($model->getId(), $promptTemplate->getAssociatedModel()->getId());
        
        // Check that the messages were mapped correctly
        $messages = $promptTemplate->getMessages();
        $this->assertCount(2, $messages);
        
        // Get the first message
        $firstMessage = $messages->first();
        $this->assertEquals('system', $firstMessage->getRole());
        $this->assertEquals('You are a helpful assistant.', $firstMessage->getContent());
        $this->assertEquals(0, $firstMessage->getSortOrder());
    }
    
    public function testInvalidData(): void
    {
        // Create a new PromptTemplate
        $promptTemplate = new PromptTemplate();
        
        // Create the form
        $form = $this->formFactory->create(PromptTemplateType::class, $promptTemplate, [
            'is_org_admin' => false,
            'owner_type' => 'user',
        ]);
        
        // Submit invalid data (missing required fields)
        $formData = [
            // Missing 'name' field
            'description' => 'This is a test template',
            'scope' => 'private',
            // Missing 'associatedModel' field
        ];
        
        // Submit the form
        $form->submit($formData);
        
        // Check that the form is not valid
        $this->assertFalse($form->isValid());
        
        // Check for specific validation errors
        $this->assertTrue($form->get('name')->getErrors()->count() > 0);
        $this->assertTrue($form->get('associatedModel')->getErrors()->count() > 0);
    }
}
