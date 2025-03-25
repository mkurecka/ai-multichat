FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    libicu-dev \
    libonig-dev \
    libxml2-dev \
    && docker-php-ext-install \
    pdo_mysql \
    zip \
    intl \
    opcache \
    mbstring \
    exif \
    pcntl \
    bcmath \
    xml

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files and install dependencies
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader

# Copy application files
COPY . .

# Generate optimized autoloader
RUN composer dump-autoload --optimize

# Create var directory and set permissions
RUN mkdir -p /var/www/html/var && \
    chown -R www-data:www-data /var/www/html/var

# Expose port 9000 for PHP-FPM
EXPOSE 9000

CMD ["php-fpm"]
