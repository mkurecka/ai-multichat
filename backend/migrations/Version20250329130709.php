<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250329130709 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE thread_summary (id INT AUTO_INCREMENT NOT NULL, thread_id INT NOT NULL, summary LONGTEXT NOT NULL, message_count INT NOT NULL, created_at DATETIME NOT NULL, INDEX IDX_7F928E2AE2904019 (thread_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE thread_summary ADD CONSTRAINT FK_7F928E2AE2904019 FOREIGN KEY (thread_id) REFERENCES thread (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE thread_summary DROP FOREIGN KEY FK_7F928E2AE2904019');
        $this->addSql('DROP TABLE thread_summary');
    }
}
