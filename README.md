# AI MultiChat Application

A multi-model chat application with Symfony 7 backend and React frontend.

## Docker Setup

This project uses Docker for local development. The setup includes:

- PHP 8.2 (FPM) for the Symfony backend
- Nginx as a web server for the backend
- MySQL 8.0 database
- Node.js for the React frontend

### Prerequisites

- Docker and Docker Compose installed on your system
- Git

### Getting Started

#### Option 1: Using the initialization script

1. Clone the repository:
   ```
   git clone <repository-url>
   cd ai-multichat
   ```

2. Run the initialization script:
   ```
   ./docker-init.sh
   ```
   
   This script will:
   - Start all Docker containers
   - Install backend dependencies
   - Run database migrations
   - Generate JWT keys if needed
   - Cache models

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api

#### Option 2: Manual setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd ai-multichat
   ```

2. Start the Docker containers:
   ```
   docker-compose up -d
   ```

3. Install backend dependencies:
   ```
   docker-compose exec php composer install
   ```

4. Create the database schema:
   ```
   docker-compose exec php bin/console doctrine:migrations:migrate --no-interaction
   ```

5. Generate JWT keys (if not already present):
   ```
   docker-compose exec php bin/console lexik:jwt:generate-keypair
   ```

6. Cache models:
   ```
   docker-compose exec php bin/console app:cache:models
   ```

7. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api

### Useful Commands

- View logs:
  ```
  docker-compose logs -f
  ```

- Access the PHP container:
  ```
  docker-compose exec php bash
  ```

- Access the database:
  ```
  docker-compose exec database mysql -u app -p
  ```

- Stop the containers:
  ```
  docker-compose down
  ```

- Rebuild containers after Dockerfile changes:
  ```
  docker-compose up -d --build
  ```

## Environment Variables

The main environment variables are stored in the `.env` file at the root of the project. You can modify these values to suit your needs.

For backend-specific environment variables, check the `backend/.env` file.

## Development

- Backend code is in the `backend/` directory
- Frontend code is in the `frontend/` directory

Changes to the code will be automatically reflected in the running application due to the volume mounts in the Docker Compose configuration.

## Production Deployment

For production deployment, this project includes optimized Docker configurations:

### Setup

#### Option 1: Using the deployment script

1. Copy the example production environment file:
   ```
   cp .env.prod.example .env.prod
   ```

2. Edit `.env.prod` with your production settings:
   - Set secure passwords for the database
   - Configure domain names
   - Set API keys
   - Adjust other settings as needed

3. Run the deployment script:
   ```
   ./docker-deploy.sh
   ```
   
   This script will:
   - Build and start all production containers
   - Run database migrations
   - Generate JWT keys if needed
   - Cache models
   - Clear the Symfony cache

#### Option 2: Manual deployment

1. Copy the example production environment file:
   ```
   cp .env.prod.example .env.prod
   ```

2. Edit `.env.prod` with your production settings:
   - Set secure passwords for the database
   - Configure domain names
   - Set API keys
   - Adjust other settings as needed

3. Build and start the production containers:
   ```
   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

4. Run database migrations:
   ```
   docker-compose -f docker-compose.prod.yml --env-file .env.prod exec php bin/console doctrine:migrations:migrate --no-interaction
   ```

5. Generate JWT keys if needed:
   ```
   docker-compose -f docker-compose.prod.yml --env-file .env.prod exec php bin/console lexik:jwt:generate-keypair --no-interaction
   ```

6. Cache models:
   ```
   docker-compose -f docker-compose.prod.yml --env-file .env.prod exec php bin/console app:cache:models
   ```

7. Clear the Symfony cache:
   ```
   docker-compose -f docker-compose.prod.yml --env-file .env.prod exec php bin/console cache:clear --env=prod
   ```

### Production Architecture

The production setup includes:

- Multi-stage builds for optimized container images
- Nginx for serving both frontend and backend
- PHP-FPM with optimized settings for Symfony
- Persistent MySQL database volume
- Environment variable configuration
- Security headers and optimizations

### Maintenance

- View logs:
  ```
  docker-compose -f docker-compose.prod.yml --env-file .env.prod logs -f
  ```

- Restart services:
  ```
  docker-compose -f docker-compose.prod.yml --env-file .env.prod restart
  ```

- Update application:
  ```
  git pull
  docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
  docker-compose -f docker-compose.prod.yml --env-file .env.prod exec php bin/console doctrine:migrations:migrate --no-interaction
  ```
