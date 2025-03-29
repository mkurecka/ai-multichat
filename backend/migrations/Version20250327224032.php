<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250327224032 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Make user_id nullable in api_request_cost table';
    }

    public function up(Schema $schema): void
    {
        // Drop the foreign key constraint
        $this->addSql('ALTER TABLE api_request_cost DROP FOREIGN KEY FK_API_REQUEST_COST_USER');
        
        // Modify the user_id column to be nullable
        $this->addSql('ALTER TABLE api_request_cost MODIFY user_id INT DEFAULT NULL');
        
        // Re-add the foreign key constraint
        $this->addSql('ALTER TABLE api_request_cost ADD CONSTRAINT FK_API_REQUEST_COST_USER FOREIGN KEY (user_id) REFERENCES user (id)');
    }

    public function down(Schema $schema): void
    {
        // Drop the foreign key constraint
        $this->addSql('ALTER TABLE api_request_cost DROP FOREIGN KEY FK_API_REQUEST_COST_USER');
        
        // Modify the user_id column to be non-nullable
        $this->addSql('ALTER TABLE api_request_cost MODIFY user_id INT NOT NULL');
        
        // Re-add the foreign key constraint
        $this->addSql('ALTER TABLE api_request_cost ADD CONSTRAINT FK_API_REQUEST_COST_USER FOREIGN KEY (user_id) REFERENCES user (id)');
    }
} 