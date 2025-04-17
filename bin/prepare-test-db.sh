#!/bin/sh

# Exit on error
set -e

# Load environment variables
export APP_ENV=test

# Create test database if it doesn't exist
bin/console doctrine:database:create --if-not-exists

# Drop and recreate schema
bin/console doctrine:schema:drop --force --full-database
bin/console doctrine:schema:create

# Load test fixtures
bin/console doctrine:fixtures:load --no-interaction

echo "Test database prepared successfully!"
