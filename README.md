# AI MultiChat Application

A multi-model chat application built with Symfony 7 and using AssetMapper with Tailwind CSS for the frontend.

## Docker Setup

This project uses Docker for local development. The setup includes:

- PHP 8.3+ (FPM) for the Symfony backend
- Nginx as a web server
- MySQL 8.0 database

### Prerequisites

- Docker and Docker Compose installed on your system
- Gitte

### Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd ai-multichat
    ```

2.  **Copy Environment File:**
    Create a local environment file from the example:
    ```bash
    cp .env .env.local
    ```
    *(Optional)* Adjust variables in `.env.local` if needed (e.g., database credentials, API keys).

3.  **Build and Start Containers:**
    ```bash
    docker compose up -d --build
    ```

4.  **Install Dependencies:**
    ```bash
    docker compose exec php composer install
    ```

5.  **Run Database Migrations:**
    ```bash
    docker compose exec php bin/console doctrine:migrations:migrate --no-interaction
    ```

6.  **Generate JWT Keys (if needed):**
    Run this if you haven't generated keys before or if the `config/jwt/` directory is empty.
    ```bash
    docker compose exec php bin/console lexik:jwt:generate-keypair
    ```

7.  **Build Frontend Assets:**
    Compile Tailwind CSS:
    ```bash
    docker compose exec php bin/console tailwind:build
    ```

8.  **Access the Application:**
    - Main Application: http://localhost:8000 (or the port configured in `docker-compose.yml`)

*(Note: The old `docker-init.sh` script might be outdated. Following the manual steps above is recommended.)*

## Development Workflow with Makefile

A `Makefile` is included to simplify common development tasks. Run `make help` to see all available commands.

**Common Commands:**

-   `make up`: Start Docker containers in detached mode.
-   `make down`: Stop and remove Docker containers.
-   `make php`: Enter the PHP container's shell (`sh`).
-   `make composer-install`: Install PHP dependencies.
-   `make migrate`: Run database migrations.
-   `make make-migration`: Generate a new database migration file.
-   `make tailwind-build`: Build Tailwind CSS assets once.
-   `make tailwind-watch`: Watch Tailwind CSS files for changes and rebuild automatically.
-   `make cache-clear`: Clear the Symfony application cache.
-   `make test`: Run PHPUnit tests.
-   `make load-fixtures`: **(Destructive!)** Drops the database schema, reapplies migrations, and loads test data (users: `user@test.local`, `orgadmin@test.local`, `admin@test.local`). Useful for resetting the local environment.
-   `make promote-user EMAIL=<email> [ROLE=<role>]`: Promotes a user to a specific role (default `ROLE_ADMIN`, allowed: `ROLE_ADMIN`, `ROLE_ORGANIZATION_ADMIN`).
    *   **Example:** `make promote-user EMAIL=test@example.com ROLE=ROLE_ORGANIZATION_ADMIN`
    *   **Example (default role):** `make promote-user EMAIL=test@example.com` (assigns `ROLE_ADMIN`)

## Testing Different User Roles Locally

To test the application from the perspective of different user roles without needing multiple Google accounts, you can use Symfony's impersonation feature (`switch_user`) combined with the test data loaded by `make load-fixtures`.

1.  **Load Test Data:**
    Run `make load-fixtures`. **Warning:** This deletes all existing data in your local database. This creates users like `user@test.local` (regular user), `orgadmin@test.local` (organization admin), and `admin@test.local` (super admin).

2.  **Log In as Admin:**
    Log in to the application normally using your primary Google account, which should have the `ROLE_ADMIN` assigned (you might need to use `make promote-user EMAIL=your-email@example.com ROLE=ROLE_ADMIN` the first time, after the user exists in the database).

3.  **Switch User:**
    Once logged in as an admin, navigate to any page within the application (e.g., `http://localhost:8000/app`) and append the `_switch_user` query parameter with the email of the user you want to impersonate:
    -   To become `user@test.local`: `http://localhost:8000/app?_switch_user=user@test.local`
    -   To become `orgadmin@test.local`: `http://localhost:8000/app?_switch_user=orgadmin@test.local`

    You should see a confirmation banner indicating you are now acting as the specified user.

4.  **Test:**
    Browse the application and test features based on the impersonated user's role (e.g., access to prompt template management).

5.  **Exit Impersonation:**
    To return to your original admin account, navigate to any page and append `_switch_user=_exit`:
    `http://localhost:8000/app?_switch_user=_exit`

## Environment Variables

-   `.env`: Default environment variables (should generally not be modified directly).
-   `.env.local`: Local overrides for development. Create this file by copying `.env`. **This file is ignored by Git.**
-   `.env.test`: Environment variables for automated tests.
-   *(Production)* `.env.prod.local`: Production-specific overrides (if needed, also ignored by Git).

## Production Deployment

*(Note: This section might need review and adaptation based on your specific production environment and deployment strategy. The project structure has changed since this section was likely last updated.)*

The project includes a `Dockerfile.prod` for building an optimized production image. A typical deployment might involve:

1.  Building the production Docker image.
2.  Pushing the image to a container registry.
3.  Deploying the image to your hosting environment (e.g., Kubernetes, Docker Swarm, managed container service).
4.  Ensuring production environment variables (database credentials, `APP_ENV=prod`, `APP_DEBUG=0`, secrets, API keys) are securely configured in the production environment.
5.  Running database migrations in the production environment after deployment.
6.  Clearing/warming up the Symfony cache (`bin/console cache:clear --env=prod`).

Consider using deployment tools like Deployer (a `deploy.php` file exists) or platform-specific deployment methods.
