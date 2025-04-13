<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250411084755 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE prompt_templates (id INT AUTO_INCREMENT NOT NULL, owner_id INT NOT NULL, organization_id INT NOT NULL, associated_model_id INT NOT NULL, name VARCHAR(255) NOT NULL, description LONGTEXT DEFAULT NULL, template_text LONGTEXT NOT NULL, scope VARCHAR(50) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, INDEX IDX_A51E06EE7E3C61F9 (owner_id), INDEX IDX_A51E06EE32C8A3DE (organization_id), INDEX IDX_A51E06EE8DF7B91 (associated_model_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE prompt_templates ADD CONSTRAINT FK_A51E06EE7E3C61F9 FOREIGN KEY (owner_id) REFERENCES user (id)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE prompt_templates ADD CONSTRAINT FK_A51E06EE32C8A3DE FOREIGN KEY (organization_id) REFERENCES organization (id)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE prompt_templates ADD CONSTRAINT FK_A51E06EE8DF7B91 FOREIGN KEY (associated_model_id) REFERENCES model (id)
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE prompt_templates DROP FOREIGN KEY FK_A51E06EE7E3C61F9
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE prompt_templates DROP FOREIGN KEY FK_A51E06EE32C8A3DE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE prompt_templates DROP FOREIGN KEY FK_A51E06EE8DF7B91
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE prompt_templates
        SQL);
    }
}
