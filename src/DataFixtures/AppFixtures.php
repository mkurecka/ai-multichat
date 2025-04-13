<?php

namespace App\DataFixtures;

use App\Entity\Organization;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class AppFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        // 1. Create Test Organization
        $testOrg = new Organization();
        // Use a predictable Google ID for testing, or generate one
        $testOrg->setGoogleId('org_test_123');
        $testOrg->setDomain('test.local');
        $testOrg->setUsageCount(0);
        // Set other required fields if any
        $manager->persist($testOrg);

        // 2. Create Regular User
        $regularUser = new User();
        $regularUser->setEmail('user@test.local');
        // Use a predictable Google ID for testing
        $regularUser->setGoogleId('user_google_id_123');
        $regularUser->setRoles(['ROLE_USER']); // Default role
        $regularUser->setOrganization($testOrg);
        // Set other required fields if any
        $manager->persist($regularUser);

        // 3. Create Organization Admin User
        $orgAdminUser = new User();
        $orgAdminUser->setEmail('orgadmin@test.local');
        // Use a different predictable Google ID
        $orgAdminUser->setGoogleId('orgadmin_google_id_456');
        $orgAdminUser->setRoles(['ROLE_USER', 'ROLE_ORGANIZATION_ADMIN']); // Assign org admin role
        $orgAdminUser->setOrganization($testOrg);
        // Set other required fields if any
        $manager->persist($orgAdminUser);

        // 4. Create Super Admin User (Optional, if needed for testing ROLE_ADMIN)
        $superAdminUser = new User();
        $superAdminUser->setEmail('admin@test.local');
        $superAdminUser->setGoogleId('admin_google_id_789');
        $superAdminUser->setRoles(['ROLE_USER', 'ROLE_ORGANIZATION_ADMIN', 'ROLE_ADMIN']); // Assign all roles
        $superAdminUser->setOrganization($testOrg); // Or maybe a different org or null? Depends on logic.
        $manager->persist($superAdminUser);


        $manager->flush();
    }
}
