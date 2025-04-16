<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250416132943 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE `variable` (id INT AUTO_INCREMENT NOT NULL, user_id INT DEFAULT NULL, organization_id INT DEFAULT NULL, name VARCHAR(255) NOT NULL, value LONGTEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, INDEX IDX_CC4D878DA76ED395 (user_id), INDEX IDX_CC4D878D32C8A3DE (organization_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE `variable` ADD CONSTRAINT FK_CC4D878DA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE SET NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE `variable` ADD CONSTRAINT FK_CC4D878D32C8A3DE FOREIGN KEY (organization_id) REFERENCES organization (id) ON DELETE SET NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE `variable` DROP FOREIGN KEY FK_CC4D878DA76ED395
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE `variable` DROP FOREIGN KEY FK_CC4D878D32C8A3DE
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE `variable`
        SQL);
    }
}
