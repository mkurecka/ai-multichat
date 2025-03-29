#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Starting test environment..."

# Build and start containers
docker-compose up -d --build

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
sleep 10

# Set up test database
echo "🔄 Setting up test database..."
docker-compose exec backend-test bash /app/tests/setup-test-db.sh

# Run backend tests
echo "🧪 Running backend tests..."
docker-compose exec backend-test php bin/phpunit

# Store backend test result
BACKEND_RESULT=$?

# Run frontend tests
echo "🧪 Running frontend tests..."
docker-compose exec frontend-test npm test

# Store frontend test result
FRONTEND_RESULT=$?

# Stop containers
docker-compose down

# Print results
echo -e "\n📊 Test Results:"
if [ $BACKEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Backend tests passed${NC}"
else
    echo -e "${RED}❌ Backend tests failed${NC}"
fi

if [ $FRONTEND_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend tests passed${NC}"
else
    echo -e "${RED}❌ Frontend tests failed${NC}"
fi

# Exit with error if any tests failed
if [ $BACKEND_RESULT -ne 0 ] || [ $FRONTEND_RESULT -ne 0 ]; then
    exit 1
fi 