<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250327224030 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Migrate data from chat_cost to api_request_cost';
    }

    public function up(Schema $schema): void
    {
        // Migrate data from chat_cost to api_request_cost
        $this->addSql('INSERT INTO api_request_cost (
            user_id,
            request_id,
            api_provider_id,
            model,
            total_cost,
            created_at,
            origin,
            total_usage,
            is_byok,
            upstream_id,
            cache_discount,
            app_id,
            streamed,
            cancelled,
            provider_name,
            latency,
            moderation_latency,
            generation_time,
            finish_reason,
            native_finish_reason,
            tokens_prompt,
            tokens_completion,
            native_tokens_prompt,
            native_tokens_completion,
            native_tokens_reasoning,
            num_media_prompt,
            num_media_completion,
            num_search_results,
            request_type,
            request_reference
        )
        SELECT 
            t.user_id,
            cc.open_router_id,
            "openrouter",
            cc.model,
            cc.total_cost,
            cc.created_at,
            cc.origin,
            cc.total_usage,
            cc.is_byok,
            cc.upstream_id,
            cc.cache_discount,
            cc.app_id,
            cc.streamed,
            cc.cancelled,
            cc.provider_name,
            cc.latency,
            cc.moderation_latency,
            cc.generation_time,
            cc.finish_reason,
            cc.native_finish_reason,
            cc.tokens_prompt,
            cc.tokens_completion,
            cc.native_tokens_prompt,
            cc.native_tokens_completion,
            cc.native_tokens_reasoning,
            cc.num_media_prompt,
            cc.num_media_completion,
            cc.num_search_results,
            "chat",
            cc.chat_history_id
        FROM chat_cost cc
        JOIN chat_history ch ON cc.chat_history_id = ch.id 
        JOIN thread t ON ch.thread_id = t.id');

        // Drop the old table
        $this->addSql('DROP TABLE chat_cost');
    }

    public function down(Schema $schema): void
    {
        // Recreate the old table
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

        // Migrate data back
        $this->addSql('INSERT INTO chat_cost (
            chat_history_id,
            total_cost,
            created_at,
            open_router_id,
            model,
            origin,
            total_usage,
            is_byok,
            upstream_id,
            cache_discount,
            app_id,
            streamed,
            cancelled,
            provider_name,
            latency,
            moderation_latency,
            generation_time,
            finish_reason,
            native_finish_reason,
            tokens_prompt,
            tokens_completion,
            native_tokens_prompt,
            native_tokens_completion,
            native_tokens_reasoning,
            num_media_prompt,
            num_media_completion,
            num_search_results
        )
        SELECT 
            arc.request_reference,
            arc.total_cost,
            arc.created_at,
            arc.request_id,
            arc.model,
            arc.origin,
            arc.total_usage,
            arc.is_byok,
            arc.upstream_id,
            arc.cache_discount,
            arc.app_id,
            arc.streamed,
            arc.cancelled,
            arc.provider_name,
            arc.latency,
            arc.moderation_latency,
            arc.generation_time,
            arc.finish_reason,
            arc.native_finish_reason,
            arc.tokens_prompt,
            arc.tokens_completion,
            arc.native_tokens_prompt,
            arc.native_tokens_completion,
            arc.native_tokens_reasoning,
            arc.num_media_prompt,
            arc.num_media_completion,
            arc.num_search_results
        FROM api_request_cost arc
        WHERE arc.request_type = "chat"');

        // Add foreign key constraint
        $this->addSql('ALTER TABLE chat_cost ADD CONSTRAINT FK_BEBA09BDD9F4C1F4 FOREIGN KEY (chat_history_id) REFERENCES chat_history (id)');
    }
} 