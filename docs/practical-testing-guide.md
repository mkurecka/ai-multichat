# Practical Testing Guide for AI MultiChat

This guide provides practical approaches for testing your AI MultiChat application during development. It focuses on techniques that work with your current project setup.

## Table of Contents

1. [Testing Approach](#testing-approach)
2. [Controller Testing](#controller-testing)
3. [Form Testing](#form-testing)
4. [Repository Testing](#repository-testing)
5. [Best Practices](#best-practices)

## Testing Approach

When developing new features, it's important to test them thoroughly. Here are some practical approaches:

### Manual Testing

For quick development cycles, manual testing can be effective:

1. **API Endpoints**: Use tools like Postman or the Symfony debug toolbar to test API endpoints
2. **Forms**: Test form submissions directly in the browser
3. **Database**: Use the Symfony debug toolbar to inspect database queries

### Automated Testing

For more reliable testing, automated tests are essential. Here's how to approach them:

1. **Unit Tests**: Test individual components in isolation
2. **Functional Tests**: Test how components work together
3. **Integration Tests**: Test the entire application flow

## Controller Testing

### Manual Testing Controllers

1. **Using the Browser**:
   - Navigate to the route you want to test
   - Use the Symfony debug toolbar to inspect the request/response
   - Check that the response contains the expected data

2. **Using Postman**:
   - Create a collection for your API endpoints
   - Set up authentication if needed
   - Send requests and verify responses

### Example Controller Test

```php
// tests/Controller/ManualPromptTemplateTest.php
<?php

namespace App\Tests\Controller;

use App\Entity\PromptTemplate;
use App\Entity\User;
use App\Repository\PromptTemplateRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ManualPromptTemplateTest extends WebTestCase
{
    public function testCreateTemplate()
    {
        // This is a manual test example - run this code in a controller or command
        // to test your logic during development
        
        // 1. Get dependencies
        $entityManager = $this->getContainer()->get('doctrine.orm.entity_manager');
        $userRepository = $entityManager->getRepository(User::class);
        $modelRepository = $entityManager->getRepository(Model::class);
        
        // 2. Get test data
        $user = $userRepository->findOneBy(['email' => 'user@test.local']);
        $model = $modelRepository->findOneBy([]);
        
        if (!$user || !$model) {
            echo "Test data not available\n";
            return;
        }
        
        // 3. Create the entity
        $template = new PromptTemplate();
        $template->setName('TEST_Template_' . uniqid());
        $template->setDescription('This is a test template');
        $template->setScope('private');
        $template->setOwner($user);
        $template->setAssociatedModel($model);
        
        // 4. Persist the entity
        $entityManager->beginTransaction();
        try {
            $entityManager->persist($template);
            $entityManager->flush();
            
            // 5. Verify the entity was created
            $templateRepository = $entityManager->getRepository(PromptTemplate::class);
            $foundTemplate = $templateRepository->find($template->getId());
            
            if ($foundTemplate) {
                echo "Template created successfully with ID: " . $foundTemplate->getId() . "\n";
            } else {
                echo "Failed to create template\n";
            }
            
            // 6. Roll back the transaction to clean up
            $entityManager->rollback();
        } catch (\Exception $e) {
            $entityManager->rollback();
            echo "Error: " . $e->getMessage() . "\n";
        }
    }
}
```

## Form Testing

### Manual Form Testing

1. **Browser Testing**:
   - Fill out the form in the browser
   - Submit the form
   - Verify the result (database entry, response, etc.)

2. **Debugging Forms**:
   - Use the Symfony debug toolbar to inspect form data
   - Check for validation errors
   - Verify that the form data is mapped correctly to the entity

### Example Form Test Code

```php
// This code can be used in a controller or command to test form validation
// during development

// 1. Create a form
$promptTemplate = new PromptTemplate();
$form = $this->createForm(PromptTemplateType::class, $promptTemplate);

// 2. Submit test data
$formData = [
    'name' => 'TEST_Template',
    'description' => 'This is a test template',
    'scope' => 'private',
    'associatedModel' => $model->getId(),
    'messages' => [
        [
            'role' => 'system',
            'content' => 'You are a helpful assistant.',
            'sortOrder' => 0,
        ],
    ],
];
$form->submit($formData);

// 3. Check form validity
if ($form->isValid()) {
    echo "Form is valid\n";
    
    // 4. Check entity mapping
    echo "Template name: " . $promptTemplate->getName() . "\n";
    echo "Template description: " . $promptTemplate->getDescription() . "\n";
    
    // 5. Persist if needed (in a transaction for testing)
    $entityManager->beginTransaction();
    try {
        $entityManager->persist($promptTemplate);
        $entityManager->flush();
        
        // Verify persistence
        $id = $promptTemplate->getId();
        echo "Template created with ID: " . $id . "\n";
        
        // Roll back to clean up
        $entityManager->rollback();
    } catch (\Exception $e) {
        $entityManager->rollback();
        echo "Error: " . $e->getMessage() . "\n";
    }
} else {
    // 6. Display validation errors
    echo "Form is invalid\n";
    foreach ($form->getErrors(true) as $error) {
        echo $error->getMessage() . "\n";
    }
}
```

## Repository Testing

### Manual Repository Testing

1. **Using a Custom Command**:
   - Create a Symfony command to test repository methods
   - Run the command with different parameters
   - Verify the results

2. **Using the Debug Toolbar**:
   - Execute repository methods in a controller
   - Use the debug toolbar to inspect the queries
   - Check the results

### Example Repository Test Command

```php
// src/Command/TestRepositoryCommand.php
<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\ChatHistoryRepository;
use App\Repository\PromptTemplateRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:test-repository',
    description: 'Test repository methods',
)]
class TestRepositoryCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private ChatHistoryRepository $chatHistoryRepository,
        private PromptTemplateRepository $promptTemplateRepository,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Testing repositories...');
        
        // Start a transaction to isolate test operations
        $this->entityManager->beginTransaction();
        
        try {
            // Get a test user
            $userRepository = $this->entityManager->getRepository(User::class);
            $user = $userRepository->findOneBy(['email' => 'user@test.local']);
            
            if (!$user) {
                $output->writeln('No test user found');
                $this->entityManager->rollback();
                return Command::FAILURE;
            }
            
            // Test ChatHistoryRepository
            $output->writeln('Testing ChatHistoryRepository...');
            $count = $this->chatHistoryRepository->countByUser($user);
            $output->writeln("Chat history count for user: $count");
            
            // Test PromptTemplateRepository
            $output->writeln('Testing PromptTemplateRepository...');
            $count = $this->promptTemplateRepository->countByOwner($user);
            $output->writeln("Prompt template count for user: $count");
            
            // Roll back to clean up
            $this->entityManager->rollback();
            
            $output->writeln('Tests completed successfully');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->entityManager->rollback();
            $output->writeln('Error: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
```

## Best Practices

### 1. Use Transactions for Database Tests

Always use transactions to isolate your test operations:

```php
$entityManager->beginTransaction();
try {
    // Test code here
    
    // Verify results
    
    // Roll back to clean up
    $entityManager->rollback();
} catch (\Exception $e) {
    $entityManager->rollback();
    // Handle error
}
```

### 2. Clearly Mark Test Data

Use prefixes like "TEST_" to identify test data:

```php
$template->setName('TEST_Template_' . uniqid());
```

### 3. Clean Up After Tests

Always clean up test data, either by:
- Using transactions and rolling back
- Explicitly removing test entities
- Using a separate test database

### 4. Test One Thing at a Time

Each test should focus on a single feature or behavior:

```php
// Good: Testing a specific repository method
public function testCountByUser(): void
{
    // Test code focused on countByUser method
}

// Bad: Testing multiple unrelated things
public function testRepositoryMethods(): void
{
    // Testing countByUser
    // Testing findByThreadId
    // Testing other unrelated methods
}
```

### 5. Use Descriptive Test Names

Name your tests clearly to describe what they're testing:

```php
// Good
public function testCreateTemplateWithValidData(): void
// Bad
public function testTemplate(): void
```

## Conclusion

Testing during development is essential for building reliable software. By following these practical approaches, you can effectively test your controllers, forms, and database functionality even without a fully configured test environment.

Remember that the goal of testing during development is to catch issues early, so focus on testing the critical parts of your application first.
