<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250326163907 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create Thread entity and update ChatHistory structure';
    }

    public function up(Schema $schema): void
    {
        // Create thread table
        $this->addSql('CREATE TABLE thread (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            created_at DATETIME NOT NULL,
            thread_id VARCHAR(255) NOT NULL,
            INDEX IDX_31204C83A76ED395 (user_id),
            UNIQUE INDEX UNIQ_31204C83E9B8B8B8 (thread_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        // Drop old columns from chat_history
        $this->addSql('ALTER TABLE chat_history DROP FOREIGN KEY FK_6BB4BC22A76ED395');
        $this->addSql('ALTER TABLE chat_history DROP FOREIGN KEY FK_6BB4BC22727ACA70');
        $this->addSql('ALTER TABLE chat_history DROP user_id, DROP thread_id, DROP parent_id');

        // Add new columns to chat_history
        $this->addSql('ALTER TABLE chat_history 
            ADD thread_id INT NOT NULL AFTER id,
            ADD model_id VARCHAR(255) NOT NULL AFTER responses,
            ADD open_router_id VARCHAR(255) DEFAULT NULL AFTER model_id,
            ADD INDEX IDX_6BB4BC22E9B8B8B8 (thread_id)');

        // Add foreign key for thread
        $this->addSql('ALTER TABLE chat_history 
            ADD CONSTRAINT FK_6BB4BC22E9B8B8B8 
            FOREIGN KEY (thread_id) REFERENCES thread (id)');

        // Add foreign key for thread -> user
        $this->addSql('ALTER TABLE thread 
            ADD CONSTRAINT FK_31204C83A76ED395 
            FOREIGN KEY (user_id) REFERENCES user (id)');
    }

    public function down(Schema $schema): void
    {
        // Remove foreign keys
        $this->addSql('ALTER TABLE chat_history DROP FOREIGN KEY FK_6BB4BC22E9B8B8B8');
        $this->addSql('ALTER TABLE thread DROP FOREIGN KEY FK_31204C83A76ED395');

        // Drop thread table
        $this->addSql('DROP TABLE thread');

        // Restore old columns in chat_history
        $this->addSql('ALTER TABLE chat_history 
            ADD user_id INT DEFAULT NULL AFTER id,
            ADD thread_id VARCHAR(255) DEFAULT NULL AFTER user_id,
            ADD parent_id INT DEFAULT NULL AFTER thread_id,
            DROP model_id,
            DROP open_router_id,
            DROP INDEX IDX_6BB4BC22E9B8B8B8');

        // Restore foreign key for user
        $this->addSql('ALTER TABLE chat_history 
            ADD CONSTRAINT FK_6BB4BC22A76ED395 
            FOREIGN KEY (user_id) REFERENCES user (id)');
    }
}
