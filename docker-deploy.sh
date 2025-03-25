#!/bin/bash
set -e

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "Error: .env.prod file not found."
    echo "Please create it by copying .env.prod.example and updating the values:"
    echo "cp .env.prod.example .env.prod"
    exit 1
fi

# Validate required environment variables
echo "Validating environment variables..."
source .env.prod
if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ]; then
    echo "Error: BACKEND_URL and FRONTEND_URL must be set in .env.prod"
    exit 1
fi

echo "Deploying AI MultiChat application to production..."

# Build and start the containers
echo "Building and starting containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 15

# Run database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod exec -T php bin/console doctrine:migrations:migrate --no-interaction

# Check for JWT keys
echo "Checking for JWT keys..."
if ! docker-compose -f docker-compose.prod.yml --env-file .env.prod exec -T php test -f config/jwt/private.pem; then
    echo "Generating JWT keys..."
    docker-compose -f docker-compose.prod.yml --env-file .env.prod exec -T php bin/console lexik:jwt:generate-keypair --no-interaction
fi

# Cache models
echo "Caching models..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod exec -T php bin/console app:cache:models

# Clear cache
echo "Clearing cache..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod exec -T php bin/console cache:clear --env=prod

echo ""
echo "Deployment complete!"
echo "Your application should now be running at the configured domains."
echo ""
echo "To view logs, run: docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f"
