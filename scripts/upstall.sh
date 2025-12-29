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

# Install Node.js based on detected OS
install_nodejs() {
    detect_os

    log_info "Installing Node.js..."

    case "$OS_ID" in
        ubuntu|debian)
            # Use NodeSource repository for latest LTS
            curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
            apt-get install -y nodejs
            ;;
        centos|rhel|rocky|almalinux|ol|fedora)
            # Use NodeSource repository
            curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
            yum install -y nodejs
            ;;
        alpine)
            apk add --no-cache nodejs npm
            ;;
        *)
            # Try to detect based on OS_LIKE
            if [[ "$OS_LIKE" == *"debian"* ]] || [[ "$OS_LIKE" == *"ubuntu"* ]]; then
                curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
                apt-get install -y nodejs
            elif [[ "$OS_LIKE" == *"rhel"* ]] || [[ "$OS_LIKE" == *"fedora"* ]]; then
                curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
                yum install -y nodejs
            else
                log_error "Unsupported operating system for Node.js installation: $OS_ID"
                log_info "Please install Node.js 22+ manually: https://nodejs.org/"
                return 1
            fi
            ;;
    esac

    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        log_success "Node.js $(node --version) installed successfully"
        return 0
    else
        log_error "Node.js installation failed"
        return 1
    fi
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

    # Check for Node.js/npm (needed for database schema push)
    if ! command -v npm &> /dev/null; then
        log_warn "Node.js/npm is not installed. Installing..."
        if ! install_nodejs; then
            log_error "Node.js installation failed. Please install Node.js 22+ manually:"
            log_info "  https://nodejs.org/"
            exit 1
        fi
    else
        log_info "Node.js is already installed ($(node --version))"
    fi

    # Check for qrencode (optional, for TOTP QR codes)
    if ! command -v qrencode &> /dev/null; then
        log_info "Installing qrencode for TOTP QR codes..."
        install_package qrencode 2>/dev/null || log_warn "qrencode not available, TOTP QR codes will not be shown"
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

# Create Nginx configuration
create_nginx_config() {
    log_info "Creating Nginx configuration..."

    mkdir -p "$INSTALL_DIR/nginx/conf.d"

    # Copy nginx.conf from repo if it exists, otherwise create it
    if [[ ! -f "$INSTALL_DIR/nginx/nginx.conf" ]]; then
        cat > "$INSTALL_DIR/nginx/nginx.conf" <<'EOF'
user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log notice;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    keepalive_timeout  65;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    include /etc/nginx/conf.d/*.conf;
}
EOF
    fi

    # Create initial HTTP-only config (for getting SSL certificate)
    cat > "$INSTALL_DIR/nginx/conf.d/default.conf" <<EOF
# Initial HTTP-only server for obtaining SSL certificate
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    log_success "Nginx configuration created"
}

# Create HTTPS Nginx configuration (after SSL certificate is obtained)
create_nginx_ssl_config() {
    log_info "Creating Nginx SSL configuration..."

    cat > "$INSTALL_DIR/nginx/conf.d/default.conf" <<EOF
# HTTP server - redirects to HTTPS and handles ACME challenges
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

    log_success "Nginx SSL configuration created"
}

# Obtain SSL certificate using certbot
obtain_ssl_certificate() {
    log_info "Obtaining SSL certificate from Let's Encrypt..."

    # Run certbot to obtain certificate
    docker compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "${ADMIN_EMAIL}" \
        --agree-tos \
        --no-eff-email \
        -d "${DOMAIN}" 2>&1

    if [[ $? -eq 0 ]]; then
        log_success "SSL certificate obtained successfully"
        return 0
    else
        log_warn "Failed to obtain SSL certificate. Site will run on HTTP only."
        log_info "You can try again later with: docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email ${ADMIN_EMAIL} --agree-tos --no-eff-email -d ${DOMAIN}"
        return 1
    fi
}

# Create production docker-compose.yml
create_docker_compose() {
    log_info "Creating Docker Compose configuration..."

    cat > "$INSTALL_DIR/docker-compose.prod.yml" <<EOF
# AutoMade Production Docker Compose with Nginx + Let's Encrypt
# Generated by upstall.sh

services:
  nginx:
    image: nginx:alpine
    container_name: automade_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - nginx_certs:/etc/letsencrypt:ro
      - nginx_webroot:/var/www/certbot:ro
    depends_on:
      - api
    networks:
      - automade_network

  certbot:
    image: certbot/certbot
    container_name: automade_certbot
    volumes:
      - nginx_certs:/etc/letsencrypt
      - nginx_webroot:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait \\\$\${!}; done;'"
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
    volumes:
      - ${DATA_DIR}:/data/automade
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
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
    command: redis-server --appendonly yes --requirepass \${REDIS_PASSWORD}
    volumes:
      - ${DATA_DIR}/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - automade_network

volumes:
  postgres_data:
  redis_data:
  nginx_certs:
  nginx_webroot:
  automade_data:

networks:
  automade_network:
    name: automade_network
    driver: bridge
EOF

    log_success "Docker Compose configuration created"
}

# Install AutoMade
do_install() {
    log_info "Starting fresh installation..."

    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$DATA_DIR"/{postgres,redis}

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
    create_nginx_config
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

    # Fix volume permissions for API container (appuser needs write access)
    log_info "Fixing volume permissions..."
    sleep 3  # Wait for container to start
    docker exec -u root automade_api chown -R appuser:nodejs /data/automade 2>/dev/null || log_warn "Could not fix volume permissions, may need manual fix"

    # Wait for services to be healthy
    log_info "Waiting for services to be ready..."
    local max_wait=60
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        if docker compose -f docker-compose.prod.yml ps --format json 2>/dev/null | grep -q '"Health":"healthy"' || \
           docker compose -f docker-compose.prod.yml ps 2>/dev/null | grep -q "(healthy)"; then
            # Check if postgres is specifically healthy
            if docker exec automade_postgres pg_isready -U automade &>/dev/null; then
                log_success "Database is ready"
                break
            fi
        fi
        sleep 2
        waited=$((waited + 2))
        if [[ $((waited % 10)) -eq 0 ]]; then
            log_info "Still waiting for services... ($waited seconds)"
        fi
    done

    if [[ $waited -ge $max_wait ]]; then
        log_warn "Services took longer than expected to start. Continuing anyway..."
    fi

    # Run database schema push (using host npm with dev dependencies)
    log_info "Setting up database schema..."

    # Install dependencies on host for db:push (includes drizzle-kit)
    if command -v npm &> /dev/null; then
        npm install --silent 2>/dev/null || npm install

        # Use localhost to connect to postgres from host
        # Get the postgres port (use docker inspect to find the mapped port, or default to internal connection)
        local DB_HOST="localhost"
        local DB_PORT="5432"

        # Check if postgres port is exposed to host
        local MAPPED_PORT=$(docker port automade_postgres 5432 2>/dev/null | cut -d: -f2 | head -1)
        if [[ -n "$MAPPED_PORT" ]]; then
            DB_PORT="$MAPPED_PORT"
            log_info "Using exposed postgres port: $DB_PORT"
        else
            # Postgres is not exposed, we need to use docker network
            # Get the postgres container IP
            DB_HOST=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' automade_postgres 2>/dev/null || echo "")
            if [[ -z "$DB_HOST" ]]; then
                log_warn "Could not determine postgres IP, trying direct container access..."
                DB_HOST="postgres"
            fi
        fi

        # Run db:push with the correct database URL
        log_info "Pushing database schema (host: $DB_HOST:$DB_PORT)..."
        DATABASE_URL="postgresql://automade:${POSTGRES_PASSWORD}@${DB_HOST}:${DB_PORT}/automade" npm run db:push 2>&1 || {
            log_warn "db:push with host connection failed, trying via docker network..."
            # Fallback: try to run drizzle-kit inside a temporary container
            # Docker Compose prefixes network name with project name (directory name)
            local NETWORK_NAME=$(docker network ls --format '{{.Name}}' | grep -E 'automade.*network' | head -1)
            if [[ -z "$NETWORK_NAME" ]]; then
                NETWORK_NAME="automade_automade_network"
            fi
            docker run --rm --network "$NETWORK_NAME" \
                -v "$INSTALL_DIR:/app" \
                -w /app \
                -e "DATABASE_URL=postgresql://automade:${POSTGRES_PASSWORD}@postgres:5432/automade" \
                node:22-alpine sh -c "npm install --silent && npx drizzle-kit push --force" 2>&1 || {
                    log_error "Database schema push failed. You may need to run it manually."
                    log_info "Try: cd $INSTALL_DIR && DATABASE_URL=... npm run db:push"
                }
        }
    else
        log_warn "npm not found on host, running db:push via Docker..."
        # Docker Compose prefixes network name with project name (directory name)
        local NETWORK_NAME=$(docker network ls --format '{{.Name}}' | grep -E 'automade.*network' | head -1)
        if [[ -z "$NETWORK_NAME" ]]; then
            NETWORK_NAME="automade_automade_network"
        fi
        docker run --rm --network "$NETWORK_NAME" \
            -v "$INSTALL_DIR:/app" \
            -w /app \
            -e "DATABASE_URL=postgresql://automade:${POSTGRES_PASSWORD}@postgres:5432/automade" \
            node:22-alpine sh -c "npm install && npx drizzle-kit push --force" 2>&1 || {
                log_error "Database schema push failed."
            }
    fi

    # Wait a moment for schema to be fully applied
    sleep 3

    # Obtain SSL certificate
    log_info "Obtaining SSL certificate..."
    if obtain_ssl_certificate; then
        # Certificate obtained, update nginx config for HTTPS
        create_nginx_ssl_config
        # Reload nginx with new SSL config
        docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload 2>/dev/null || \
            docker compose -f docker-compose.prod.yml restart nginx
        log_success "HTTPS enabled with Let's Encrypt certificate"
    else
        log_warn "Running in HTTP-only mode. You can obtain a certificate later."
    fi

    # Initialize system with super admin
    log_info "Initializing system..."

    # Wait for API to be healthy before initializing
    log_info "Waiting for API to be healthy..."
    local api_ready=false
    for i in {1..30}; do
        if docker exec automade_api wget -q --spider http://localhost:3000/api/health 2>/dev/null; then
            api_ready=true
            log_success "API is ready"
            break
        fi
        if [[ $((i % 5)) -eq 0 ]]; then
            log_info "Still waiting for API... ($((i * 2)) seconds)"
        fi
        sleep 2
    done

    if [[ "$api_ready" != "true" ]]; then
        log_warn "API health check failed, attempting initialization anyway..."
    fi

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
        " 2>&1) || true

    # Clean up the result - remove any non-JSON output
    if [[ -n "$SETUP_RESULT" ]]; then
        # Extract only the JSON part (last line that starts with {)
        SETUP_RESULT=$(echo "$SETUP_RESULT" | grep -E '^\{.*\}$' | tail -1)
    fi

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
        echo ""

        # Generate TOTP QR code if qrencode is available
        if command -v qrencode &> /dev/null; then
            local TOTP_URI="otpauth://totp/AutoMade:${ADMIN_EMAIL}?secret=${TOTP_SECRET}&issuer=AutoMade"
            echo -e "${BLUE}Scan this QR code with your authenticator app:${NC}"
            echo ""
            qrencode -t UTF8 "$TOTP_URI" 2>/dev/null || echo "(QR code generation failed - use the secret above)"
            echo ""
        else
            echo "(Install qrencode to see QR code: apt install qrencode)"
            echo "Add the secret above to your authenticator app manually"
            echo ""
        fi

        echo -e "${YELLOW}Backup Codes (save these securely):${NC}"
        echo "$SETUP_RESULT" | jq -r '.credentials.backupCodes[]'
        echo ""
        echo -e "${RED}These credentials will NOT be shown again!${NC}"
    else
        log_warn "Could not retrieve credentials automatically."
        echo ""
        echo -e "${YELLOW}To generate credentials manually, run:${NC}"
        echo ""
        echo "  cd $INSTALL_DIR"
        echo "  docker compose -f docker-compose.prod.yml exec api node -e \"\\"
        echo "    import('./dist/lib/setup.js').then(async (s) => {"
        echo "      const r = await s.initializeSystem({domain:'${DOMAIN}',adminEmail:'${ADMIN_EMAIL}'});"
        echo "      console.log('Password:', r.credentials.password);"
        echo "      console.log('TOTP Secret:', r.credentials.totpSecret);"
        echo "      console.log('Backup Codes:', r.credentials.backupCodes.join(', '));"
        echo "    });\""
        echo ""
        # Check if there was an error message
        if [[ -n "$SETUP_RESULT" ]] && echo "$SETUP_RESULT" | jq -e '.error' &>/dev/null; then
            local ERROR_MSG=$(echo "$SETUP_RESULT" | jq -r '.error')
            log_error "Setup error: $ERROR_MSG"
        fi
        echo ""
        log_info "Check API logs: docker compose -f docker-compose.prod.yml logs api"
    fi

    echo ""
    log_success "AutoMade is now running!"
    echo ""
    log_info "If you see SSL certificate warnings, wait a few minutes for Let's Encrypt to issue the certificate."
    log_info "Check Nginx logs: docker compose -f docker-compose.prod.yml logs nginx"
}

# Update AutoMade
update() {
    log_info "Updating AutoMade..."

    cd "$INSTALL_DIR"

    CURRENT_VERSION=$(get_current_version)
    log_info "Current version: $CURRENT_VERSION"

    # Back up .env (contains secrets and domain config)
    log_info "Backing up local configuration..."
    local BACKUP_DIR="/tmp/automade_backup_$$"
    mkdir -p "$BACKUP_DIR"

    # Save .env file (has secrets and domain-specific config)
    if [[ -f ".env" ]]; then
        cp .env "$BACKUP_DIR/"
    fi

    # Save nginx config (has domain-specific settings)
    if [[ -d "nginx" ]]; then
        cp -r nginx "$BACKUP_DIR/"
    fi

    # Reset local changes to allow clean pull
    log_info "Resetting local changes for clean update..."
    git reset --hard HEAD 2>/dev/null || true
    git clean -fd 2>/dev/null || true

    # Pull latest changes
    log_info "Pulling latest changes..."
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git pull origin "$BRANCH"

    # Restore backed up configuration files
    log_info "Restoring local configuration..."
    if [[ -f "$BACKUP_DIR/.env" ]]; then
        cp "$BACKUP_DIR/.env" .env
    fi
    if [[ -d "$BACKUP_DIR/nginx" ]]; then
        cp -r "$BACKUP_DIR/nginx" .
    fi

    # Clean up backup
    rm -rf "$BACKUP_DIR"

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

    # Fix volume permissions for API container
    log_info "Fixing volume permissions..."
    sleep 3
    docker exec -u root automade_api chown -R appuser:nodejs /data/automade 2>/dev/null || log_warn "Could not fix volume permissions"

    # Wait for services to be healthy
    log_info "Waiting for services to be ready..."
    local max_wait=60
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        if docker exec automade_postgres pg_isready -U automade &>/dev/null; then
            log_success "Database is ready"
            break
        fi
        sleep 2
        waited=$((waited + 2))
        if [[ $((waited % 10)) -eq 0 ]]; then
            log_info "Still waiting for services... ($waited seconds)"
        fi
    done

    # Load POSTGRES_PASSWORD from existing .env
    local POSTGRES_PASSWORD=""
    if [[ -f "$INSTALL_DIR/.env" ]]; then
        POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$INSTALL_DIR/.env" | cut -d'=' -f2-)
    fi

    # Run database schema push (using host npm with dev dependencies)
    log_info "Updating database schema..."
    if command -v npm &> /dev/null && [[ -n "$POSTGRES_PASSWORD" ]]; then
        npm install --silent 2>/dev/null || npm install

        # Get postgres container IP for connection from host
        local DB_HOST=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' automade_postgres 2>/dev/null || echo "")
        if [[ -z "$DB_HOST" ]]; then
            DB_HOST="postgres"
        fi

        log_info "Pushing database schema (host: $DB_HOST)..."
        DATABASE_URL="postgresql://automade:${POSTGRES_PASSWORD}@${DB_HOST}:5432/automade" npm run db:push 2>&1 || {
            log_warn "db:push with host connection failed, trying via docker network..."
            # Docker Compose prefixes network name with project name
            local NETWORK_NAME=$(docker network ls --format '{{.Name}}' | grep -E 'automade.*network' | head -1)
            if [[ -z "$NETWORK_NAME" ]]; then
                NETWORK_NAME="automade_automade_network"
            fi
            docker run --rm --network "$NETWORK_NAME" \
                -v "$INSTALL_DIR:/app" \
                -w /app \
                -e "DATABASE_URL=postgresql://automade:${POSTGRES_PASSWORD}@postgres:5432/automade" \
                node:22-alpine sh -c "npm install --silent && npx drizzle-kit push --force" 2>&1 || {
                    log_warn "db:push failed, schema may already be up to date"
                }
        }
    elif [[ -n "$POSTGRES_PASSWORD" ]]; then
        log_warn "npm not found on host, running db:push via Docker..."
        # Docker Compose prefixes network name with project name
        local NETWORK_NAME=$(docker network ls --format '{{.Name}}' | grep -E 'automade.*network' | head -1)
        if [[ -z "$NETWORK_NAME" ]]; then
            NETWORK_NAME="automade_automade_network"
        fi
        docker run --rm --network "$NETWORK_NAME" \
            -v "$INSTALL_DIR:/app" \
            -w /app \
            -e "DATABASE_URL=postgresql://automade:${POSTGRES_PASSWORD}@postgres:5432/automade" \
            node:22-alpine sh -c "npm install && npx drizzle-kit push --force" 2>&1 || {
                log_warn "db:push failed, schema may already be up to date"
            }
    else
        log_warn "Could not read POSTGRES_PASSWORD from .env, skipping schema update"
    fi

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
