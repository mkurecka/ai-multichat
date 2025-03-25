<?php

require __DIR__ . '/vendor/autoload.php';

use App\Entity\User;
use App\Service\JWTService;
use Symfony\Component\HttpKernel\Kernel;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Dotenv\Dotenv;

// Load environment variables
(new Dotenv())->bootEnv(__DIR__ . '/.env');

// Create a minimal kernel to get the container
$kernel = new class('dev', true) extends Kernel {
    public function registerBundles(): iterable
    {
        $contents = require $this->getProjectDir() . '/config/bundles.php';
        foreach ($contents as $class => $envs) {
            if ($envs[$this->environment] ?? $envs['all'] ?? false) {
                yield new $class();
            }
        }
    }

    public function getProjectDir(): string
    {
        return __DIR__;
    }
    
    public function registerContainerConfiguration(\Symfony\Component\Config\Loader\LoaderInterface $loader): void
    {
        $loader->load($this->getProjectDir().'/config/packages/*.yaml', 'glob');
        $loader->load($this->getProjectDir().'/config/{packages}/'.$this->environment.'/*.yaml', 'glob');
        $loader->load($this->getProjectDir().'/config/{services}.yaml', 'glob');
        $loader->load($this->getProjectDir().'/config/{services}_'.$this->environment.'.yaml', 'glob');
    }
};

$kernel->boot();
$container = $kernel->getContainer();

// Get the user repository and JWT service
$userRepository = $container->get('doctrine')->getRepository(User::class);
$jwtService = $container->get(JWTService::class);

// Find the first user
$user = $userRepository->findOneBy([]);

if (!$user) {
    echo "No user found in the database.\n";
    exit(1);
}

// Generate a JWT token
$token = $jwtService->createToken($user);

echo "JWT Token for user {$user->getEmail()}:\n";
echo $token . "\n\n";

// Test the API endpoint
echo "Testing API endpoint with the token...\n";
$ch = curl_init('http://localhost:8000/api/models');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: $httpCode\n";
echo "Response:\n";
echo $response . "\n";
