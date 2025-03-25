#!/bin/bash
set -e

echo "Initializing AI MultiChat application..."

# Check if .env file exists, if not create it from example
if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp .env.prod.example .env
    # Replace example values with localhost values for development
    sed -i '' 's/your-domain\.com/localhost/g' .env
    sed -i '' 's/api\.your-domain\.com/localhost:8000/g' .env
    sed -i '' 's/^FRONTEND_PORT=.*/FRONTEND_PORT=3000/' .env
    sed -i '' 's/^BACKEND_PORT=.*/BACKEND_PORT=8000/' .env
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
if [ ! -f backend/config/jwt/private.pem ]; then
    echo "Generating JWT keys..."
    docker-compose exec -T php bin/console lexik:jwt:generate-keypair --no-interaction
fi

# Cache models
echo "Caching models..."
docker-compose exec -T php bin/console app:cache:models

echo ""
echo "Initialization complete! You can access the application at:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000/api"
echo ""
echo "To view logs, run: docker-compose logs -f"
