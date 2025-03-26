<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250326165958 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE chat_history ADD response LONGTEXT NOT NULL, DROP responses');
        $this->addSql('ALTER TABLE chat_history RENAME INDEX idx_6bb4bc22e9b8b8b8 TO IDX_6BB4BC22E2904019');
        $this->addSql('ALTER TABLE thread RENAME INDEX uniq_31204c83e9b8b8b8 TO UNIQ_31204C83E2904019');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE thread RENAME INDEX uniq_31204c83e2904019 TO UNIQ_31204C83E9B8B8B8');
        $this->addSql('ALTER TABLE chat_history ADD responses JSON NOT NULL, DROP response');
        $this->addSql('ALTER TABLE chat_history RENAME INDEX idx_6bb4bc22e2904019 TO IDX_6BB4BC22E9B8B8B8');
    }
}
