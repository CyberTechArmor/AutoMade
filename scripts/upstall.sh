#!/bin/bash
#
# AutoMade Upstall Script
# Installs AutoMade on first run, or updates if already installed.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/CyberTechArmor/AutoMade/main/scripts/upstall.sh | sudo bash
#
# Or download and run:
#   ./upstall.sh [install|update|status|uninstall|help]
#
# Dependencies (auto-installed if missing):
# - Docker and Docker Compose
# - curl
# - git
# - jq
# - openssl
#
# Supported Operating Systems:
# - Ubuntu / Debian
# - CentOS / RHEL / Rocky Linux / AlmaLinux
# - Fedora
# - Alpine Linux
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="${AUTOMADE_INSTALL_DIR:-/opt/automade}"
DATA_DIR="${AUTOMADE_DATA_DIR:-/data/automade}"
REPO_URL="${AUTOMADE_REPO_URL:-https://github.com/CyberTechArmor/AutoMade}"
BRANCH="${AUTOMADE_BRANCH:-main}"

# Track if we've already re-executed from the repo
UPSTALL_FROM_REPO="${UPSTALL_FROM_REPO:-false}"

# Save original arguments for re-execution
ORIGINAL_ARGS=("$@")

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Detect the operating system
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS_ID="${ID:-unknown}"
        OS_VERSION="${VERSION_ID:-}"
        OS_LIKE="${ID_LIKE:-$OS_ID}"
    elif [[ -f /etc/redhat-release ]]; then
        OS_ID="rhel"
        OS_LIKE="rhel"
    else
        OS_ID="unknown"
        OS_LIKE="unknown"
    fi
}

# Install Docker on Debian/Ubuntu
install_docker_debian() {
    log_info "Installing Docker on Debian/Ubuntu..."

    # Remove old versions (silently ignore if not installed)
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

    # Install prerequisites
    if ! apt-get update; then
        log_error "Failed to update package lists"
        return 1
    fi

    if ! apt-get install -y ca-certificates curl gnupg lsb-release; then
        log_error "Failed to install prerequisites"
        return 1
    fi

    # Add Docker's official GPG key (with retry and better error handling)
    if ! install -m 0755 -d /etc/apt/keyrings; then
        log_error "Failed to create /etc/apt/keyrings directory"
        return 1
    fi

    # Remove existing key to avoid GPG prompts
    rm -f /etc/apt/keyrings/docker.gpg

    # Download GPG key with retries
    log_info "Downloading Docker GPG key..."
    local retry_count=0
    local max_retries=3
    local gpg_success=false

    while [[ $retry_count -lt $max_retries ]]; do
        if curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" 2>/dev/null | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null; then
            gpg_success=true
            break
        fi
        retry_count=$((retry_count + 1))
        if [[ $retry_count -lt $max_retries ]]; then
            log_warn "Failed to download Docker GPG key, retrying ($retry_count/$max_retries)..."
            sleep 2
        fi
    done

    if [[ "$gpg_success" != "true" ]] || [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
        log_error "Failed to download Docker GPG key after $max_retries attempts"
        log_info "Please check your network connection and try again"
        return 1
    fi

    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up the repository
    log_info "Adding Docker repository..."
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS_ID} \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    log_info "Installing Docker packages..."
    if ! apt-get update; then
        log_error "Failed to update package lists after adding Docker repository"
        return 1
    fi

    if ! apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin; then
        log_error "Failed to install Docker packages"
        log_info "Try running: sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin"
        return 1
    fi

    # Start and enable Docker
    log_info "Starting Docker service..."
    systemctl start docker || true
    systemctl enable docker || true

    log_success "Docker installed successfully"
    return 0
}

# Install Docker on RHEL/CentOS/Fedora
install_docker_rhel() {
    log_info "Installing Docker on RHEL/CentOS/Fedora..."

    # Remove old versions
    yum remove -y docker docker-client docker-client-latest docker-common \
        docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true

    # Install prerequisites
    yum install -y yum-utils

    # Add Docker repository
    if [[ "$OS_ID" == "fedora" ]]; then
        yum-config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
    else
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    fi

    # Install Docker Engine
    yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    log_success "Docker installed successfully"
}

# Install Docker on Alpine
install_docker_alpine() {
    log_info "Installing Docker on Alpine..."

    # Install Docker from Alpine repositories
    apk add --no-cache docker docker-cli-compose

    # Start and enable Docker
    rc-update add docker boot
    service docker start

    log_success "Docker installed successfully"
}

# Install Docker based on detected OS
install_docker() {
    detect_os

    log_info "Detected OS: $OS_ID (like: $OS_LIKE)"

    # Call the appropriate install function and capture result
    # Using explicit if/then to properly capture return values
    case "$OS_ID" in
        ubuntu|debian)
            if install_docker_debian; then
                return 0
            else
                return 1
            fi
            ;;
        centos|rhel|rocky|almalinux|ol)
            if install_docker_rhel; then
                return 0
            else
                return 1
            fi
            ;;
        fedora)
            if install_docker_rhel; then
                return 0
            else
                return 1
            fi
            ;;
        alpine)
            if install_docker_alpine; then
                return 0
            else
                return 1
            fi
            ;;
        *)
            # Try to detect based on OS_LIKE
            if [[ "$OS_LIKE" == *"debian"* ]] || [[ "$OS_LIKE" == *"ubuntu"* ]]; then
                if install_docker_debian; then
                    return 0
                else
                    return 1
                fi
            elif [[ "$OS_LIKE" == *"rhel"* ]] || [[ "$OS_LIKE" == *"fedora"* ]] || [[ "$OS_LIKE" == *"centos"* ]]; then
                if install_docker_rhel; then
                    return 0
                else
                    return 1
                fi
            else
                log_error "Unsupported operating system: $OS_ID"
                log_info "Please install Docker manually: https://docs.docker.com/engine/install/"
                return 1
            fi
            ;;
    esac
}

# Install common dependencies based on OS
install_package() {
    local package="$1"

    detect_os

    log_info "Installing $package..."

    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y "$package"
    elif command -v yum &> /dev/null; then
        yum install -y "$package"
    elif command -v dnf &> /dev/null; then
        dnf install -y "$package"
    elif command -v apk &> /dev/null; then
        apk add --no-cache "$package"
    else
        log_error "Could not install $package. Please install it manually."
        return 1
    fi

    log_success "$package installed successfully"
}

# Check for required dependencies
check_dependencies() {
    log_info "Checking dependencies..."

    # Check for curl (needed for Docker installation)
    if ! command -v curl &> /dev/null; then
        log_warn "curl is not installed. Installing..."
        install_package curl
    fi

    # Check for git
    if ! command -v git &> /dev/null; then
        log_warn "git is not installed. Installing..."
        install_package git
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_warn "Docker is not installed. Installing..."
        if ! install_docker; then
            log_error "Docker installation failed. Please install Docker manually:"
            log_info "  https://docs.docker.com/engine/install/"
            log_info ""
            log_info "After installing Docker, run this script again."
            exit 1
        fi

        # Verify Docker was installed successfully
        if ! command -v docker &> /dev/null; then
            log_error "Docker installation completed but 'docker' command not found."
            log_info "You may need to log out and back in, or run: newgrp docker"
            log_info "Then run this script again."
            exit 1
        fi
        log_success "Docker installed successfully"
    else
        log_info "Docker is already installed"
    fi

    # Ensure Docker daemon is running
    if ! docker info &> /dev/null; then
        log_info "Starting Docker daemon..."
        if command -v systemctl &> /dev/null; then
            systemctl start docker
            systemctl enable docker
        elif command -v service &> /dev/null; then
            service docker start
        else
            log_error "Could not start Docker daemon. Please start it manually."
            exit 1
        fi
    fi

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_warn "Docker Compose plugin not found. Attempting to install..."

        detect_os

        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y docker-compose-plugin
        elif command -v yum &> /dev/null; then
            yum install -y docker-compose-plugin
        elif command -v apk &> /dev/null; then
            apk add --no-cache docker-cli-compose
        else
            log_error "Could not install Docker Compose plugin."
            log_info "Please install it manually: https://docs.docker.com/compose/install/"
            exit 1
        fi

        # Verify installation
        if ! docker compose version &> /dev/null; then
            log_error "Docker Compose installation failed."
            exit 1
        fi

        log_success "Docker Compose plugin installed"
    else
        log_info "Docker Compose is already installed"
    fi

    # Check for jq and install if missing
    if ! command -v jq &> /dev/null; then
        log_warn "jq is not installed. Installing..."
        install_package jq
    fi

    # Check for openssl (needed for generating secrets)
    if ! command -v openssl &> /dev/null; then
        log_warn "openssl is not installed. Installing..."
        install_package openssl
    fi

    log_success "All dependencies are available"
}

# Check if AutoMade is already installed
is_installed() {
    [[ -f "$INSTALL_DIR/.installed" ]]
}

# Get current version
get_current_version() {
    if [[ -f "$INSTALL_DIR/package.json" ]]; then
        jq -r '.version' "$INSTALL_DIR/package.json" 2>/dev/null || echo "unknown"
    else
        echo "none"
    fi
}

# Check if configuration already exists
config_exists() {
    [[ -f "$INSTALL_DIR/.env" ]] && [[ -f "$INSTALL_DIR/docker-compose.prod.yml" ]]
}

# Load existing configuration
load_existing_config() {
    if [[ -f "$INSTALL_DIR/.env" ]]; then
        # shellcheck disable=SC1091
        DOMAIN=$(grep '^DOMAIN=' "$INSTALL_DIR/.env" | cut -d'=' -f2)
        ADMIN_EMAIL=$(grep '^ACME_EMAIL=' "$INSTALL_DIR/.env" | cut -d'=' -f2)
        return 0
    fi
    return 1
}

# Prompt for setup information
prompt_setup_info() {
    # Check if configuration already exists
    if config_exists; then
        log_info "Existing configuration found"
        if load_existing_config; then
            log_info "  Domain: $DOMAIN"
            log_info "  Admin Email: $ADMIN_EMAIL"
            echo ""
            read -rp "Use existing configuration? (Y/n): " USE_EXISTING < /dev/tty
            if [[ ! "$USE_EXISTING" =~ ^[Nn]$ ]]; then
                log_info "Using existing configuration"
                return
            fi
            log_info "Reconfiguring..."
            # Clear existing values to prompt for new ones
            DOMAIN=""
            ADMIN_EMAIL=""
        fi
    fi

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}       AutoMade Installation Setup      ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    # Domain - read from /dev/tty for curl pipe compatibility
    while [[ -z "${DOMAIN:-}" ]]; do
        read -rp "Enter your domain (e.g., automade.example.com): " DOMAIN < /dev/tty
        if [[ -z "$DOMAIN" ]]; then
            log_warn "Domain is required"
        fi
    done

    # Admin email - read from /dev/tty for curl pipe compatibility
    while [[ -z "${ADMIN_EMAIL:-}" ]]; do
        read -rp "Enter admin email (super admin, used for Let's Encrypt): " ADMIN_EMAIL < /dev/tty
        if [[ -z "$ADMIN_EMAIL" ]]; then
            log_warn "Admin email is required"
        elif ! [[ "$ADMIN_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
            log_warn "Invalid email format"
            ADMIN_EMAIL=""
        fi
    done

    echo ""
    log_info "Configuration:"
    log_info "  Domain: $DOMAIN"
    log_info "  Admin Email: $ADMIN_EMAIL"
    echo ""

    read -rp "Is this correct? (y/N): " CONFIRM < /dev/tty
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        log_info "Setup cancelled"
        exit 0
    fi
}

# Generate secure secrets (or load existing ones)
generate_secrets() {
    # If .env exists and we're using existing config, load secrets from it
    if [[ -f "$INSTALL_DIR/.env" ]] && config_exists; then
        log_info "Loading existing secrets from configuration..."
        JWT_SECRET=$(grep '^JWT_SECRET=' "$INSTALL_DIR/.env" | cut -d'=' -f2-)
        ENCRYPTION_KEY=$(grep '^ENCRYPTION_KEY=' "$INSTALL_DIR/.env" | cut -d'=' -f2-)
        POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$INSTALL_DIR/.env" | cut -d'=' -f2-)
        REDIS_PASSWORD=$(grep '^REDIS_PASSWORD=' "$INSTALL_DIR/.env" | cut -d'=' -f2-)

        # Only regenerate if any secrets are missing
        if [[ -n "$JWT_SECRET" && -n "$ENCRYPTION_KEY" && -n "$POSTGRES_PASSWORD" && -n "$REDIS_PASSWORD" ]]; then
            log_success "Existing secrets loaded"
            return
        fi
        log_warn "Some secrets missing, regenerating..."
    fi

    log_info "Generating secure secrets..."

    JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
    ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n')
    POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n' | tr -d '/')
    REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '\n' | tr -d '/')
}

# Create .env file
create_env_file() {
    log_info "Creating environment configuration..."

    cat > "$INSTALL_DIR/.env" <<EOF
# AutoMade Environment Configuration
# Generated by upstall.sh on $(date -Iseconds)

# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# URLs
API_URL=https://${DOMAIN}
FRONTEND_URL=https://${DOMAIN}

# Database
DATABASE_URL=postgresql://automade:${POSTGRES_PASSWORD}@postgres:5432/automade
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Redis
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Security
JWT_SECRET=${JWT_SECRET}
JWT_ISSUER=automade
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Domain Configuration
DOMAIN=${DOMAIN}
ACME_EMAIL=${ADMIN_EMAIL}

# LLM Providers (configure as needed)
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# GOOGLE_AI_API_KEY=

# LiveKit (for voice/video sessions)
# LIVEKIT_URL=
# LIVEKIT_API_KEY=
# LIVEKIT_API_SECRET=

# Storage (S3-compatible)
# S3_ENDPOINT=
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
# S3_BUCKET=automade
# S3_REGION=garage

# Logging
LOG_LEVEL=info
EOF

    chmod 600 "$INSTALL_DIR/.env"
    log_success "Environment file created"
}

# Create Traefik configuration with Let's Encrypt
create_traefik_config() {
    log_info "Creating Traefik configuration..."

    mkdir -p "$INSTALL_DIR/traefik"
    mkdir -p "$DATA_DIR/traefik/acme"

    cat > "$INSTALL_DIR/traefik/traefik.yml" <<EOF
# Traefik Static Configuration
api:
  dashboard: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: automade_network

certificatesResolvers:
  letsencrypt:
    acme:
      email: ${ADMIN_EMAIL}
      storage: /acme/acme.json
      httpChallenge:
        entryPoint: web

log:
  level: INFO
EOF

    # Create empty acme.json with correct permissions
    touch "$DATA_DIR/traefik/acme/acme.json"
    chmod 600 "$DATA_DIR/traefik/acme/acme.json"

    log_success "Traefik configuration created"
}

# Create production docker-compose.yml
create_docker_compose() {
    log_info "Creating Docker Compose configuration..."

    cat > "$INSTALL_DIR/docker-compose.prod.yml" <<EOF
# AutoMade Production Docker Compose
# Generated by upstall.sh

services:
  traefik:
    image: traefik:v3.2
    container_name: automade_traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ${DATA_DIR}/traefik/acme:/acme
    networks:
      - automade_network

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: automade_api
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(\`${DOMAIN}\`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - automade_network

  postgres:
    image: postgres:16-alpine
    container_name: automade_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: automade
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: automade
    volumes:
      - ${DATA_DIR}/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U automade"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - automade_network

  redis:
    image: redis:7-alpine
    container_name: automade_redis
    restart: unless-stopped
    command: redis-server --requirepass \${REDIS_PASSWORD}
    volumes:
      - ${DATA_DIR}/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - automade_network

networks:
  automade_network:
    driver: bridge
EOF

    log_success "Docker Compose configuration created"
}

# Install AutoMade
do_install() {
    log_info "Starting fresh installation..."

    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$DATA_DIR"/{postgres,redis,traefik/acme}

    # Clone repository
    if [[ -d "$INSTALL_DIR/.git" ]]; then
        log_info "Repository already exists, updating..."
        cd "$INSTALL_DIR"
        git fetch origin "$BRANCH"
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    else
        log_info "Cloning repository..."
        git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    fi

    cd "$INSTALL_DIR"

    # Re-execute from the repo version if we haven't already
    # This ensures we run the latest version of the script after updating
    if [[ "$UPSTALL_FROM_REPO" != "true" ]] && [[ -f "$INSTALL_DIR/scripts/upstall.sh" ]]; then
        log_info "Running updated script from repository..."
        export UPSTALL_FROM_REPO=true
        exec bash "$INSTALL_DIR/scripts/upstall.sh" "${ORIGINAL_ARGS[@]:-install}"
    fi

    # Prompt for setup info
    prompt_setup_info

    # Generate secrets
    generate_secrets

    # Create configuration files
    create_env_file
    create_traefik_config
    create_docker_compose

    # Verify Docker is available before starting services
    # Note: check_dependencies() should have already installed Docker,
    # but we verify here in case the install() function is called directly
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please run check_dependencies first or install Docker manually:"
        log_info "  https://docs.docker.com/engine/install/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_warn "Docker daemon is not running. Attempting to start..."
        if command -v systemctl &> /dev/null; then
            systemctl start docker || true
            systemctl enable docker || true
            sleep 2
        elif command -v service &> /dev/null; then
            service docker start || true
            sleep 2
        fi

        # Verify Docker daemon started
        if ! docker info &> /dev/null; then
            log_error "Could not start Docker daemon. Please start it manually and run this script again."
            exit 1
        fi
    fi

    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install it manually:"
        log_info "  https://docs.docker.com/compose/install/"
        exit 1
    fi

    # Build and start services
    log_info "Building and starting services..."
    docker compose -f docker-compose.prod.yml build --pull
    docker compose -f docker-compose.prod.yml up -d

    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10

    # Run database migrations
    log_info "Running database migrations..."
    docker compose -f docker-compose.prod.yml exec -T api npm run db:migrate

    # Initialize system with super admin
    log_info "Initializing system..."
    SETUP_RESULT=$(docker compose -f docker-compose.prod.yml exec -T api \
        node -e "
            import('./dist/lib/setup.js').then(async (setup) => {
                try {
                    const result = await setup.initializeSystem({
                        domain: '${DOMAIN}',
                        adminEmail: '${ADMIN_EMAIL}'
                    });
                    console.log(JSON.stringify(result));
                } catch (error) {
                    console.error(JSON.stringify({ error: error.message }));
                    process.exit(1);
                }
            });
        " 2>/dev/null) || true

    # Mark as installed
    date -Iseconds > "$INSTALL_DIR/.installed"

    # Display setup information
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}     AutoMade Installation Complete     ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "URL: ${BLUE}https://${DOMAIN}${NC}"
    echo ""

    if [[ -n "$SETUP_RESULT" ]] && echo "$SETUP_RESULT" | jq -e '.credentials' &>/dev/null; then
        PASSWORD=$(echo "$SETUP_RESULT" | jq -r '.credentials.password')
        TOTP_SECRET=$(echo "$SETUP_RESULT" | jq -r '.credentials.totpSecret')

        echo -e "${YELLOW}IMPORTANT: Save these credentials securely!${NC}"
        echo ""
        echo -e "Admin Email: ${GREEN}${ADMIN_EMAIL}${NC}"
        echo -e "Password: ${GREEN}${PASSWORD}${NC}"
        echo ""
        echo -e "TOTP Secret: ${GREEN}${TOTP_SECRET}${NC}"
        echo "(Add this to your authenticator app)"
        echo ""
        echo -e "${YELLOW}Backup Codes (save these securely):${NC}"
        echo "$SETUP_RESULT" | jq -r '.credentials.backupCodes[]'
        echo ""
        echo -e "${RED}These credentials will NOT be shown again!${NC}"
    else
        log_warn "Could not retrieve credentials. Check the logs."
    fi

    echo ""
    log_success "AutoMade is now running!"
}

# Update AutoMade
update() {
    log_info "Updating AutoMade..."

    cd "$INSTALL_DIR"

    CURRENT_VERSION=$(get_current_version)
    log_info "Current version: $CURRENT_VERSION"

    # Pull latest changes
    log_info "Pulling latest changes..."
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git pull origin "$BRANCH"

    NEW_VERSION=$(get_current_version)
    log_info "New version: $NEW_VERSION"

    if [[ "$CURRENT_VERSION" == "$NEW_VERSION" ]]; then
        log_info "Already at the latest version"
    fi

    # Verify Docker is available before updating services
    if ! command -v docker &> /dev/null; then
        log_warn "Docker is not installed. Attempting to install..."
        install_docker
        if ! command -v docker &> /dev/null; then
            log_error "Docker installation failed. Please install Docker and Docker Compose manually:"
            log_info "  https://docs.docker.com/engine/install/"
            log_info "  https://docs.docker.com/compose/install/"
            exit 1
        fi
    fi

    if ! docker info &> /dev/null; then
        log_warn "Docker daemon is not running. Attempting to start..."
        if command -v systemctl &> /dev/null; then
            systemctl start docker
            systemctl enable docker
        elif command -v service &> /dev/null; then
            service docker start
        else
            log_error "Could not start Docker daemon. Please start it manually."
            exit 1
        fi
    fi

    if ! docker compose version &> /dev/null; then
        log_warn "Docker Compose is not installed. Attempting to install..."
        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y docker-compose-plugin
        elif command -v yum &> /dev/null; then
            yum install -y docker-compose-plugin
        elif command -v apk &> /dev/null; then
            apk add --no-cache docker-cli-compose
        else
            log_error "Could not install Docker Compose. Please install it manually:"
            log_info "  https://docs.docker.com/compose/install/"
            exit 1
        fi
        if ! docker compose version &> /dev/null; then
            log_error "Docker Compose installation failed. Please install it manually:"
            log_info "  https://docs.docker.com/compose/install/"
            exit 1
        fi
    fi

    # Stop services
    log_info "Stopping services..."
    docker compose -f docker-compose.prod.yml down

    # Rebuild and restart services
    log_info "Rebuilding and restarting services..."
    docker compose -f docker-compose.prod.yml build --pull
    docker compose -f docker-compose.prod.yml up -d

    # Wait for services
    sleep 10

    # Run migrations
    log_info "Running database migrations..."
    docker compose -f docker-compose.prod.yml exec -T api npm run db:migrate

    # Update installed timestamp
    date -Iseconds > "$INSTALL_DIR/.installed"

    echo ""
    log_success "AutoMade updated successfully!"
    log_info "Version: $NEW_VERSION"
}

# Show status
status() {
    if ! is_installed; then
        log_info "AutoMade is not installed"
        return
    fi

    cd "$INSTALL_DIR"

    echo ""
    echo -e "${BLUE}AutoMade Status${NC}"
    echo "==============="
    echo ""
    echo "Version: $(get_current_version)"
    echo "Install Directory: $INSTALL_DIR"
    echo "Data Directory: $DATA_DIR"
    echo ""
    echo "Services:"
    docker compose -f docker-compose.prod.yml ps
}

# Uninstall
uninstall() {
    log_warn "This will remove AutoMade and all data!"
    read -rp "Are you sure? Type 'yes' to confirm: " CONFIRM < /dev/tty

    if [[ "$CONFIRM" != "yes" ]]; then
        log_info "Uninstall cancelled"
        return
    fi

    log_info "Stopping services..."
    if [[ -f "$INSTALL_DIR/docker-compose.prod.yml" ]]; then
        cd "$INSTALL_DIR"
        docker compose -f docker-compose.prod.yml down -v
    fi

    log_info "Removing installation..."
    rm -rf "$INSTALL_DIR"

    read -rp "Remove data directory ($DATA_DIR)? (y/N): " REMOVE_DATA < /dev/tty
    if [[ "$REMOVE_DATA" =~ ^[Yy]$ ]]; then
        rm -rf "$DATA_DIR"
        log_success "Data removed"
    fi

    log_success "AutoMade uninstalled"
}

# Show usage
usage() {
    echo "AutoMade Upstall Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  install   Install AutoMade (or run without arguments)"
    echo "  update    Update to the latest version"
    echo "  status    Show current status"
    echo "  uninstall Remove AutoMade"
    echo "  help      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  AUTOMADE_INSTALL_DIR  Installation directory (default: /opt/automade)"
    echo "  AUTOMADE_DATA_DIR     Data directory (default: /data/automade)"
    echo "  AUTOMADE_REPO_URL     Repository URL"
    echo "  AUTOMADE_BRANCH       Git branch (default: main)"
}

# Main entry point
main() {
    check_root

    case "${1:-}" in
        update)
            check_dependencies
            if is_installed; then
                update
            else
                log_error "AutoMade is not installed. Run install first."
                exit 1
            fi
            ;;
        status)
            status
            ;;
        uninstall)
            uninstall
            ;;
        help|--help|-h)
            usage
            ;;
        install|"")
            check_dependencies
            if is_installed; then
                log_info "AutoMade is already installed"
                read -rp "Would you like to update? (y/N): " DO_UPDATE < /dev/tty
                if [[ "$DO_UPDATE" =~ ^[Yy]$ ]]; then
                    update
                fi
            else
                do_install
            fi
            ;;
        *)
            log_error "Unknown command: $1"
            usage
            exit 1
            ;;
    esac
}

main "$@"
