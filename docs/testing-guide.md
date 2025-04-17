# Testing Guide for AI MultiChat

This guide provides instructions and best practices for writing tests for the AI MultiChat application. It covers testing controllers, forms, and database functionality during development.

## Table of Contents

1. [Setup](#setup)
2. [Running Tests](#running-tests)
3. [Controller Tests](#controller-tests)
4. [Form Tests](#form-tests)
5. [Repository Tests](#repository-tests)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Setup

The project uses PHPUnit for testing. The configuration is in `phpunit.xml.dist` in the project root.

### Test Environment

Tests run in a separate environment (APP_ENV=test) but use the same database as your development environment. This approach allows for easier setup but requires careful test design to avoid affecting your development data.

### Test Data

For proper testing, you should create test fixtures that:
1. Are clearly identifiable as test data (e.g., with "TEST_" prefixes)
2. Can be safely created and deleted during tests
3. Don't interfere with your development data

## Running Tests

To run all tests:

```bash
make test
```

To run a specific test class:

```bash
docker compose exec php bin/phpunit tests/Controller/PromptTemplateControllerTest.php
```

To run a specific test method:

```bash
docker compose exec php bin/phpunit --filter testCreateTemplate tests/Controller/PromptTemplateControllerTest.php
```

## Controller Tests

Controller tests verify that your API endpoints and web pages work correctly. They test the full HTTP request/response cycle.

### Example: Testing a REST API Endpoint

```php
public function testCreateThread(): void
{
    // Prepare the request data
    $data = [
        'title' => 'Test Thread ' . uniqid(),
    ];

    // Make a POST request to create a thread
    $this->client->request(
        'POST',
        '/chat/thread',
        [],
        [],
        ['CONTENT_TYPE' => 'application/json'],
        json_encode($data)
    );

    // Assert that the response is successful
    $this->assertEquals(Response::HTTP_CREATED, $this->client->getResponse()->getStatusCode());

    // Decode the JSON response
    $responseData = json_decode($this->client->getResponse()->getContent(), true);

    // Assert that the response contains the expected data
    $this->assertArrayHasKey('id', $responseData);
    $this->assertEquals($data['title'], $responseData['title']);
}
```

### Authentication in Controller Tests

For endpoints that require authentication, you need to simulate a logged-in user:

```php
private function mockUserAuthentication(): void
{
    // Get the user repository
    $userRepository = static::getContainer()->get(UserRepository::class);

    // Retrieve a test user
    $testUser = $userRepository->findOneBy(['email' => 'user@test.local']);

    // Log in the user
    $this->client->loginUser($testUser);
}
```

## Form Tests

Form tests verify that your forms correctly validate input and map data to entities.

### Example: Testing Form Submission

```php
public function testSubmitValidData(): void
{
    // Create a new entity
    $promptTemplate = new PromptTemplate();

    // Create the form
    $form = $this->formFactory->create(PromptTemplateType::class, $promptTemplate);

    // Set form data
    $formData = [
        'name' => 'Test Template',
        'description' => 'This is a test template',
        // ... other fields
    ];

    // Submit the form
    $form->submit($formData);

    // Check if the form is valid
    $this->assertTrue($form->isValid());

    // Check that the form data was mapped to the entity correctly
    $this->assertEquals('Test Template', $promptTemplate->getName());
}
```

## Repository Tests

Repository tests verify that your database queries work correctly.

### Example: Testing a Repository Method

```php
public function testFindByThreadId(): void
{
    // Create test data
    $thread = $this->createThread($user);
    $chatHistory = $this->createChatHistory($thread, 'Test message');

    // Call the repository method
    $result = $this->chatHistoryRepository->findByThreadId($thread->getThreadId());

    // Assert the result
    $this->assertCount(1, $result);
    $this->assertEquals('Test message', $result[0]->getPrompt());

    // Clean up
    $this->entityManager->remove($chatHistory);
    $this->entityManager->remove($thread);
    $this->entityManager->flush();
}
```

## Best Practices

### 1. Isolate Tests

Each test should be independent and not rely on the state created by other tests. Use `setUp()` and `tearDown()` methods to create and clean up test data.

### 2. Use Meaningful Names

Name your test methods clearly to describe what they're testing. For example, `testCreateThreadWithValidData()` is better than `testCreate()`.

### 3. Test Edge Cases

Don't just test the happy path. Test what happens with invalid input, missing data, or unauthorized access.

### 4. Mock External Services

When testing code that calls external APIs, use mocks to avoid making real API calls during tests.

### 5. Keep Tests Fast

Tests should run quickly. Avoid unnecessary database operations or complex setup.

### 6. Test One Thing at a Time

Each test method should test one specific behavior or feature.

### 7. Use Data Providers

For tests that need to run with multiple sets of input data, use PHPUnit's data providers:

```php
/**
 * @dataProvider provideInvalidData
 */
public function testInvalidData(array $formData, array $expectedErrors): void
{
    // Test implementation
}

public function provideInvalidData(): array
{
    return [
        'missing_name' => [
            ['description' => 'Test'],
            ['name' => 'This value should not be blank.']
        ],
        // ... other test cases
    ];
}
```

## Continuous Integration

Consider setting up a CI pipeline to run tests automatically on each commit or pull request. This helps catch issues early.

## Test Coverage

Aim for high test coverage, especially for critical parts of your application. You can generate a coverage report with:

```bash
docker compose exec php bin/phpunit --coverage-html var/coverage
```

Then open `var/coverage/index.html` in your browser to view the report.
