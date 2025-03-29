<?php

namespace App\DataFixtures;

use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class TestFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $user = new User();
        $user->setEmail('test@example.com');
        $user->setGoogleId('test_google_id');
        $user->setRoles(['ROLE_USER']);
        $user->setName('Test User');

        $manager->persist($user);
        $manager->flush();
    }
} 