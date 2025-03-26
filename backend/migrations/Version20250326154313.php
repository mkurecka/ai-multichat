<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250326154313 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE chat_history ADD parent_id INT DEFAULT NULL, ADD thread_id VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE chat_history ADD CONSTRAINT FK_6BB4BC22727ACA70 FOREIGN KEY (parent_id) REFERENCES chat_history (id)');
        $this->addSql('CREATE INDEX IDX_6BB4BC22727ACA70 ON chat_history (parent_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE chat_history DROP FOREIGN KEY FK_6BB4BC22727ACA70');
        $this->addSql('DROP INDEX IDX_6BB4BC22727ACA70 ON chat_history');
        $this->addSql('ALTER TABLE chat_history DROP parent_id, DROP thread_id');
    }
}
