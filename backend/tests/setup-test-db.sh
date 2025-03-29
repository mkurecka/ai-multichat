#!/bin/bash

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
while ! mysqladmin ping -h"db-test" -P"3306" -u root -proot --silent; do
    sleep 1
done

# Grant permissions to test user
echo "🔑 Granting permissions to test user..."
mysql -h db-test -u root -proot -e "GRANT ALL PRIVILEGES ON test.* TO 'test'@'%';"
mysql -h db-test -u root -proot -e "FLUSH PRIVILEGES;"

# Run migrations
echo "🔄 Running migrations..."
php bin/console doctrine:schema:drop --force --env=test
php bin/console doctrine:schema:create --env=test

# Load fixtures
echo "📥 Loading test fixtures..."
php bin/console doctrine:fixtures:load --no-interaction --env=test

echo "✅ Test database setup complete!" 