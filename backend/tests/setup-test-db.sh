#!/bin/bash

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
while ! mysqladmin ping -h"db-test" -P"3307" -u root -proot --silent; do
    sleep 1
done

# Grant permissions to test user
echo "🔑 Granting permissions to test user..."
mysql -h db-test -u root -proot -e "GRANT ALL PRIVILEGES ON test.* TO 'test'@'%';"
mysql -h db-test -u root -proot -e "FLUSH PRIVILEGES;"

# Clear cache before schema operations
echo "🧹 Clearing cache..."
php bin/console cache:clear --env=test

# Run migrations
echo "🔄 Running migrations..."
php bin/console doctrine:schema:drop --force --env=test
if [ $? -ne 0 ]; then echo "❌ doctrine:schema:drop failed!"; exit 1; fi

# Use migrations to set up the schema instead of schema:create
echo "🏗️ Applying migrations..."
php bin/console doctrine:migrations:migrate --no-interaction --env=test --allow-no-migrations
if [ $? -ne 0 ]; then echo "❌ doctrine:migrations:migrate failed!"; exit 1; fi

# Load fixtures
echo "📥 Loading test fixtures..."
php bin/console doctrine:fixtures:load --no-interaction --env=test
if [ $? -ne 0 ]; then echo "❌ doctrine:fixtures:load failed!"; exit 1; fi

echo "✅ Test database setup complete!"
