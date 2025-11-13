#!/bin/bash

# Video Archival Diplomatics - One-Click Initialization Script
# This script sets up the entire project with one command

set -e  # Exit on error

echo "🚀 Initializing Video Archival Diplomatics Project..."
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
print_status "Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

print_success "Docker and Docker Compose are installed"

# Check if Node.js is installed (optional but recommended)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION is installed"
else
    print_warning "Node.js is not installed. Some features may not work."
    print_warning "Visit: https://nodejs.org/ to install Node.js 18+"
fi

# Step 1: Install Node dependencies (if Node is available)
if command -v npm &> /dev/null; then
    print_status "Installing Node.js dependencies..."
    npm ci --quiet
    print_success "Dependencies installed"
else
    print_warning "Skipping npm install (Node.js not found)"
fi

# Step 2: Set up environment configuration
print_status "Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    print_success "Created .env file from .env.example"
else
    print_warning ".env file already exists, skipping..."
fi

# Step 3: Create uploads directory
print_status "Creating uploads directory..."
mkdir -p uploads
chmod 755 uploads
print_success "Uploads directory created"

# Step 4: Stop any existing containers
print_status "Stopping any existing containers..."
docker compose down 2>/dev/null || true

# Step 5: Pull latest images
print_status "Pulling Docker images (this may take a few minutes)..."
docker compose pull

# Step 6: Build and start services
print_status "Building and starting services..."
docker compose up -d --build

# Step 7: Wait for services to be ready
print_status "Waiting for services to be ready..."
echo -n "  Waiting for Neo4j"
for i in {1..30}; do
    if docker compose exec -T neo4j wget -qO- http://localhost:7474 &> /dev/null; then
        echo ""
        print_success "Neo4j is ready"
        break
    fi
    echo -n "."
    sleep 2
done

echo -n "  Waiting for IPFS"
for i in {1..30}; do
    if docker compose exec -T ipfs wget -qO- http://localhost:5001/api/v0/version &> /dev/null; then
        echo ""
        print_success "IPFS is ready"
        break
    fi
    echo -n "."
    sleep 2
done

echo -n "  Waiting for API server"
for i in {1..30}; do
    if curl -s http://localhost:3000/health &> /dev/null; then
        echo ""
        print_success "API server is ready"
        break
    fi
    echo -n "."
    sleep 2
done

# Step 8: Initialize Neo4j database
print_status "Initializing Neo4j database..."
docker compose exec -T app npm run neo4j:init
print_success "Neo4j database initialized"

# Step 9: Verify installation
print_status "Verifying installation..."
HEALTH_CHECK=$(curl -s http://localhost:3000/health)
if echo "$HEALTH_CHECK" | grep -q '"ok":true'; then
    print_success "Health check passed!"
else
    print_error "Health check failed. Please check the logs."
    docker compose logs app
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo "=========================================="
echo ""
echo "📊 Services Running:"
echo "  • API Server:     http://localhost:3000"
echo "  • Neo4j Browser:  http://localhost:7475 (user: neo4j, password: password123)"
echo "  • IPFS Gateway:   http://localhost:8081"
echo "  • IPFS API:       http://localhost:5002"
echo ""
echo "📖 Quick Start:"
echo "  • Upload interface: http://localhost:3000"
echo "  • Health check:     curl http://localhost:3000/health"
echo "  • View logs:        docker compose logs -f"
echo "  • Stop services:    docker compose down"
echo ""
echo "📚 Documentation:"
echo "  • README.md - General overview"
echo "  • UPLOAD_TROUBLESHOOTING.md - Debugging guide"
echo "  • UPLOAD_FIX_SUMMARY.md - Technical details"
echo ""
echo "🧪 Test Upload:"
echo "  curl -X POST http://localhost:3000/uploadVideo \\"
echo "    -F \"video=@your-video.mp4\" \\"
echo "    -F \"uploaderId=testuser\""
echo ""
print_success "Ready to use! Visit http://localhost:3000 to get started."
