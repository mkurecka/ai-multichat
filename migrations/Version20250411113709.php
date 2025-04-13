<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250411113709 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE prompt_template_messages (id INT AUTO_INCREMENT NOT NULL, template_id INT NOT NULL, role VARCHAR(50) NOT NULL, content_template LONGTEXT NOT NULL, sort_order INT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, INDEX IDX_CB561E455DA0FB8 (template_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE prompt_template_messages ADD CONSTRAINT FK_CB561E455DA0FB8 FOREIGN KEY (template_id) REFERENCES prompt_templates (id) ON DELETE CASCADE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE prompt_templates DROP template_text
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE prompt_template_messages DROP FOREIGN KEY FK_CB561E455DA0FB8
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE prompt_template_messages
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE prompt_templates ADD template_text LONGTEXT NOT NULL
        SQL);
    }
}
