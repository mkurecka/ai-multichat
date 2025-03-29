<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250327224031 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop old chat_cost table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP TABLE chat_cost');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE TABLE chat_cost (
            id INT AUTO_INCREMENT NOT NULL,
            chat_history_id INT NOT NULL,
            total_cost DOUBLE PRECISION NOT NULL,
            created_at DATETIME NOT NULL,
            open_router_id VARCHAR(255) NOT NULL,
            model VARCHAR(255) NOT NULL,
            origin VARCHAR(255) DEFAULT NULL,
            total_usage DOUBLE PRECISION DEFAULT NULL,
            is_byok TINYINT(1) NOT NULL,
            upstream_id VARCHAR(255) DEFAULT NULL,
            cache_discount DOUBLE PRECISION DEFAULT NULL,
            app_id INT DEFAULT NULL,
            streamed TINYINT(1) NOT NULL,
            cancelled TINYINT(1) NOT NULL,
            provider_name VARCHAR(255) DEFAULT NULL,
            latency INT DEFAULT NULL,
            moderation_latency INT DEFAULT NULL,
            generation_time INT DEFAULT NULL,
            finish_reason VARCHAR(255) DEFAULT NULL,
            native_finish_reason VARCHAR(255) DEFAULT NULL,
            tokens_prompt INT DEFAULT NULL,
            tokens_completion INT DEFAULT NULL,
            native_tokens_prompt INT DEFAULT NULL,
            native_tokens_completion INT DEFAULT NULL,
            native_tokens_reasoning INT DEFAULT NULL,
            num_media_prompt INT DEFAULT NULL,
            num_media_completion INT DEFAULT NULL,
            num_search_results INT DEFAULT NULL,
            INDEX IDX_BEBA09BDD9F4C1F4 (chat_history_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE chat_cost ADD CONSTRAINT FK_BEBA09BDD9F4C1F4 FOREIGN KEY (chat_history_id) REFERENCES chat_history (id)');
    }
} 