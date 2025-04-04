#!/bin/bash
set -e

echo "Initializing AI MultiChat application..."

# Check if .env file exists, if not create it from example
if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp .env.local .env
    # Replace example values with localhost values for development
    sed -i '' 's/^APP_URL=.*/APP_URL=http:\/\/localhost:8000/' .env
    sed -i '' 's/^VITE_BASE_URL=.*/VITE_BASE_URL=http:\/\/localhost:5173/' .env
    sed -i '' 's/^DATABASE_URL=.*/DATABASE_URL=mysql:\/\/app:!ChangeMe!@database:3306\/app?serverVersion=8.0/' .env
fi

# Start Docker containers
echo "Starting Docker containers..."
docker-compose up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Install backend dependencies
echo "Installing backend dependencies..."
docker-compose exec -T php composer install

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T php bin/console doctrine:migrations:migrate --no-interaction

# Generate JWT keys if they don't exist
echo "Checking for JWT keys..."
if [ ! -f config/jwt/private.pem ]; then
    echo "Generating JWT keys..."
    docker-compose exec -T php bin/console lexik:jwt:generate-keypair --no-interaction
fi

# Cache models
echo "Caching models..."
docker-compose exec -T php bin/console app:cache:models

echo "Installing frontend dependencies..."
docker-compose exec -T node npm ci

echo "Building frontend..."
docker-compose exec -T node npm run build

echo ""
echo "Initialization complete! You can access the application at:"
echo "- Frontend: http://localhost:5173"
echo "- Backend: http://localhost:8000"
echo ""
echo "To view logs, run: docker-compose logs -f"
