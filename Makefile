# Makefile for ai-multichat project

# Default command: Show help
help:
	@echo "Available commands:"
	@echo "  make up              - Start docker containers in detached mode"
	@echo "  make down            - Stop and remove docker containers"
	@echo "  make php             - Enter the php container shell"
	@echo "  make composer-install - Install PHP dependencies"
	@echo "  make migrate         - Run database migrations"
	@echo "  make make-migration  - Generate a new database migration file"
	@echo "  make tailwind-build  - Build Tailwind CSS assets"
	@echo "  make tailwind-watch  - Watch Tailwind CSS assets for changes"
	@echo "  make cache-clear     - Clear the application cache"
	@echo "  make test            - Run PHPUnit tests"
	@echo "  make load-fixtures   - Load test data (WARNING: deletes existing data)"
	@echo "  make promote-user    - Promote user to a role (Usage: make promote-user EMAIL=user@example.com ROLE=ROLE_ORGANIZATION_ADMIN)"

# Docker commands
up:
	docker compose up -d

down:
	docker compose down --remove-orphans

php:
	docker compose exec php sh

# Dependency Management
composer-install:
	docker compose exec php composer install

# Database Migrations
migrate:
	docker compose exec php bin/console doctrine:migrations:migrate --no-interaction

make-migration:
	docker compose exec php bin/console make:migration

# Frontend Assets (Tailwind via AssetMapper)
tailwind-build:
	docker compose exec php bin/console tailwind:build

tailwind-watch:
	docker compose exec php bin/console tailwind:build --watch

# Cache
cache-clear:
	docker compose exec php bin/console cache:clear

# Testing
test:
	docker compose exec php bin/phpunit

# Data Fixtures
load-fixtures:
	@echo "Dropping database schema..."
	docker compose exec php bin/console doctrine:schema:drop --force
	@echo "Creating database schema..."
	docker compose exec php bin/console doctrine:schema:create
	@echo "Applying migrations..."
	docker compose exec php bin/console doctrine:migrations:migrate --no-interaction
	@echo "Loading fixtures..."
	docker compose exec php bin/console doctrine:fixtures:load --no-interaction --append
	@echo "Fixtures loaded successfully."

# User Management
promote-user: ## Promote user to a role (Usage: make promote-user EMAIL=user@example.com ROLE=ROLE_ORGANIZATION_ADMIN)
ifndef EMAIL
	$(error EMAIL is not set. Usage: make promote-user EMAIL=user@example.com [ROLE=ROLE_TO_ASSIGN])
endif
	docker compose exec php bin/console app:promote-user $(EMAIL) --role=$(ROLE)

# Phony targets to avoid conflicts with filenames
.PHONY: help up down php composer-install migrate make-migration tailwind-build tailwind-watch cache-clear test load-fixtures promote-user
