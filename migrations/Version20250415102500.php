<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Add apiMessages JSON field to chat_history table
 */
final class Version20250415102500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add apiMessages JSON field to chat_history table to store messages sent to LLM API';
    }

    public function up(Schema $schema): void
    {
        // Add apiMessages JSON column to chat_history table
        $this->addSql('ALTER TABLE chat_history ADD api_messages JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // Remove apiMessages JSON column from chat_history table
        $this->addSql('ALTER TABLE chat_history DROP COLUMN api_messages');
    }
}
