<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250411090311 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE chat_history ADD used_template_id INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE chat_history ADD CONSTRAINT FK_6BB4BC22B823BF2A FOREIGN KEY (used_template_id) REFERENCES prompt_templates (id) ON DELETE SET NULL
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_6BB4BC22B823BF2A ON chat_history (used_template_id)
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE chat_history DROP FOREIGN KEY FK_6BB4BC22B823BF2A
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX IDX_6BB4BC22B823BF2A ON chat_history
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE chat_history DROP used_template_id
        SQL);
    }
}
