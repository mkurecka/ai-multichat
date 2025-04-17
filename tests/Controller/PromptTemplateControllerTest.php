<?php

namespace App\Tests\Controller;

use App\Entity\Model;
use App\Entity\PromptTemplate;
use App\Entity\User;
use App\Repository\ModelRepository;
use App\Repository\PromptTemplateRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

final class PromptTemplateControllerTest extends WebTestCase
{
    private $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        // Mock authentication if needed
        // This is a simplified example - you'll need to adapt this to your auth system
        $this->mockUserAuthentication();
    }

    private function mockUserAuthentication(): void
    {
        // Get the user repository
        $userRepository = static::getContainer()->get(UserRepository::class);

        // Retrieve a test user (you might need to create one in your test database)
        // This assumes you have a user with this email in your test database
        $testUser = $userRepository->findOneBy(['email' => 'user@test.local']);

        // If no test user exists, you might want to create one
        if (!$testUser) {
            // You could create a user here or skip the test
            $this->markTestSkipped('No test user available');
        }

        // Log in the user
        $this->client->loginUser($testUser);
    }

    public function testIndex(): void
    {
        // Make a request to the endpoint
        $this->client->request('GET', '/prompt/template');

        // Assert that the response is successful
        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
    }

    public function testCreateTemplate(): void
    {
        // Get a model to associate with the template
        $modelRepository = static::getContainer()->get(ModelRepository::class);
        $model = $modelRepository->findOneBy([]);

        if (!$model) {
            $this->markTestSkipped('No models available for testing');
        }

        // Prepare the template data
        $templateData = [
            'name' => 'Test Template ' . uniqid(),
            'description' => 'This is a test template',
            'scope' => 'private',
            'associatedModel' => $model->getId(),
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You are a helpful assistant.'
                ],
                [
                    'role' => 'user',
                    'content' => 'Hello, how can you help me?'
                ]
            ]
        ];

        // Make a POST request to create a template
        $this->client->request(
            'POST',
            '/prompt/template/create',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($templateData)
        );

        // Assert that the response is successful
        $this->assertEquals(
            Response::HTTP_CREATED,
            $this->client->getResponse()->getStatusCode(),
            'Response content: ' . $this->client->getResponse()->getContent()
        );

        // Decode the JSON response
        $responseData = json_decode($this->client->getResponse()->getContent(), true);

        // Assert that the response contains the expected data
        $this->assertArrayHasKey('id', $responseData);
        $this->assertArrayHasKey('name', $responseData);
        $this->assertEquals($templateData['name'], $responseData['name']);

        // Verify that the template was actually created in the database
        $templateRepository = static::getContainer()->get(PromptTemplateRepository::class);
        $template = $templateRepository->find($responseData['id']);

        $this->assertNotNull($template);
        $this->assertEquals($templateData['name'], $template->getName());
        $this->assertEquals($templateData['description'], $template->getDescription());

        // Check that the messages were created correctly
        $messages = $template->getMessages();
        $this->assertCount(count($templateData['messages']), $messages);
    }

    public function testGetTemplate(): void
    {
        // First, create a template to retrieve
        $templateRepository = static::getContainer()->get(PromptTemplateRepository::class);
        $userRepository = static::getContainer()->get(UserRepository::class);
        $modelRepository = static::getContainer()->get(ModelRepository::class);

        $user = $userRepository->findOneBy(['email' => 'user@test.local']);
        $model = $modelRepository->findOneBy([]);

        if (!$user || !$model) {
            $this->markTestSkipped('Required test data not available');
        }

        // Create a template directly in the database
        $template = new PromptTemplate();
        $template->setName('Test Template for Retrieval');
        $template->setDescription('This is a test template for retrieval');
        $template->setScope('private');
        $template->setOwner($user);
        $template->setAssociatedModel($model);

        $entityManager = static::getContainer()->get('doctrine.orm.entity_manager');
        $entityManager->persist($template);
        $entityManager->flush();

        // Make a GET request to retrieve the template
        $this->client->request('GET', '/prompt/template/' . $template->getId());

        // Assert that the response is successful
        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());

        // Decode the JSON response
        $responseData = json_decode($this->client->getResponse()->getContent(), true);

        // Assert that the response contains the expected data
        $this->assertEquals($template->getId(), $responseData['id']);
        $this->assertEquals($template->getName(), $responseData['name']);
        $this->assertEquals($template->getDescription(), $responseData['description']);
    }

    // Add more test methods for other endpoints
}
