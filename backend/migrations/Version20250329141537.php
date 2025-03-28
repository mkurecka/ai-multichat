<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250329141537 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create Model table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE model (
            id INT AUTO_INCREMENT NOT NULL,
            name VARCHAR(255) NOT NULL,
            model_id VARCHAR(255) NOT NULL,
            api_service VARCHAR(255) NOT NULL DEFAULT "openrouter",
            description LONGTEXT DEFAULT NULL,
            provider VARCHAR(255) NOT NULL,
            pricing JSON DEFAULT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            updated_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE model');
    }
}
