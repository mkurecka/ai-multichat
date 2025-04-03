<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250327224029 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create api_request_cost table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE api_request_cost (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            request_id VARCHAR(255) NOT NULL,
            api_provider_id VARCHAR(255) NOT NULL,
            model VARCHAR(255) NOT NULL,
            total_cost DOUBLE PRECISION NOT NULL,
            created_at DATETIME NOT NULL,
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
            request_type VARCHAR(255) DEFAULT NULL,
            request_reference VARCHAR(255) DEFAULT NULL,
            INDEX IDX_API_REQUEST_COST_USER (user_id),
            INDEX IDX_API_REQUEST_COST_REQUEST_ID (request_id),
            INDEX IDX_API_REQUEST_COST_API_PROVIDER (api_provider_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE api_request_cost ADD CONSTRAINT FK_API_REQUEST_COST_USER FOREIGN KEY (user_id) REFERENCES user (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE api_request_cost DROP FOREIGN KEY FK_API_REQUEST_COST_USER');
        $this->addSql('DROP TABLE api_request_cost');
    }
} 