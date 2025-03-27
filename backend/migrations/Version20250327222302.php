<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250327222302 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create ChatCost entity';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE chat_cost (
            id INT AUTO_INCREMENT NOT NULL,
            chat_history_id INT NOT NULL,
            cost DOUBLE PRECISION NOT NULL,
            created_at DATETIME NOT NULL,
            open_router_id VARCHAR(255) NOT NULL,
            INDEX IDX_1234567890ABCDEF (chat_history_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE chat_cost 
            ADD CONSTRAINT FK_1234567890ABCDEF 
            FOREIGN KEY (chat_history_id) 
            REFERENCES chat_history (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE chat_cost DROP FOREIGN KEY FK_1234567890ABCDEF');
        $this->addSql('DROP TABLE chat_cost');
    }
}
