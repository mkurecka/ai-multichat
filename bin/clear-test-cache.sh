#!/bin/sh

# Exit on error
set -e

# Set environment to test
export APP_ENV=test

# Clear the cache
bin/console cache:clear

echo "Test cache cleared successfully!"
