#!/bin/bash

# QR Code Tracker Development Script
# This script helps with common development tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Function to check if docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if docker-compose is available
check_compose() {
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
}

# Function to setup environment
setup_env() {
    print_status "Setting up environment..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env file from .env.example"
            print_warning "Please edit .env file with your configuration"
        else
            print_error ".env.example file not found"
            exit 1
        fi
    else
        print_status ".env file already exists"
    fi
}

# Function to start development environment
dev_start() {
    print_status "Starting development environment..."
    check_docker
    check_compose
    setup_env
    
    $COMPOSE_CMD up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are running
    if $COMPOSE_CMD ps | grep -q "Up"; then
        print_success "Development environment is running!"
        echo ""
        echo "🌐 Frontend: http://localhost:3000"
        echo "🔧 Backend API: http://localhost:8080"
        echo "📊 Login: admin / admin123 (or check your .env file)"
        echo ""
        echo "📋 Useful commands:"
        echo "  ./dev.sh logs     - View logs"
        echo "  ./dev.sh stop     - Stop services"
        echo "  ./dev.sh restart  - Restart services"
        echo "  ./dev.sh clean    - Clean up everything"
    else
        print_error "Failed to start services. Check logs with: $COMPOSE_CMD logs"
        exit 1
    fi
}

# Function to stop services
dev_stop() {
    print_status "Stopping services..."
    check_compose
    $COMPOSE_CMD down
    print_success "Services stopped"
}

# Function to restart services
dev_restart() {
    print_status "Restarting services..."
    dev_stop
    dev_start
}

# Function to view logs
dev_logs() {
    check_compose
    if [ -n "$2" ]; then
        $COMPOSE_CMD logs -f "$2"
    else
        $COMPOSE_CMD logs -f
    fi
}

# Function to clean up
dev_clean() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up..."
        check_compose
        $COMPOSE_CMD down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup complete"
    else
        print_status "Cleanup cancelled"
    fi
}

# Function to run tests
dev_test() {
    print_status "Running tests..."
    
    # Backend tests
    print_status "Running backend tests..."
    if [ -d "backend" ]; then
        cd backend
        if command -v go >/dev/null 2>&1; then
            go test -v ./...
        else
            print_warning "Go not installed locally, running tests in Docker..."
            docker run --rm -v "$(pwd)":/app -w /app golang:1.21 go test -v ./...
        fi
        cd ..
    fi
    
    # Frontend tests
    print_status "Running frontend tests..."
    if [ -d "frontend" ]; then
        cd frontend
        if command -v npm >/dev/null 2>&1; then
            npm test -- --coverage --watchAll=false
        else
            print_warning "Node.js not installed locally, running tests in Docker..."
            docker run --rm -v "$(pwd)":/app -w /app node:18 sh -c "npm ci && npm test -- --coverage --watchAll=false"
        fi
        cd ..
    fi
    
    print_success "Tests completed"
}

# Function to build for production
dev_build() {
    print_status "Building for production..."
    check_docker
    check_compose
    
    $COMPOSE_CMD build --no-cache
    print_success "Production build complete"
}

# Function to show status
dev_status() {
    check_compose
    print_status "Service status:"
    $COMPOSE_CMD ps
    
    print_status "Docker images:"
    docker images | grep -E "(qr-tracker|qr-code-scanner)" || print_warning "No QR Tracker images found"
    
    print_status "Volumes:"
    docker volume ls | grep -E "(qr|tracker)" || print_warning "No QR Tracker volumes found"
}

# Function to show help
show_help() {
    echo "QR Code Tracker Development Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start development environment"
    echo "  stop      Stop services"
    echo "  restart   Restart services"
    echo "  logs      View logs (optional: specify service name)"
    echo "  test      Run tests"
    echo "  build     Build for production"
    echo "  clean     Clean up containers, volumes, and images"
    echo "  status    Show service status"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs backend"
    echo "  $0 test"
    echo ""
}

# Main script logic
case "${1:-help}" in
    start)
        dev_start
        ;;
    stop)
        dev_stop
        ;;
    restart)
        dev_restart
        ;;
    logs)
        dev_logs "$@"
        ;;
    test)
        dev_test
        ;;
    build)
        dev_build
        ;;
    clean)
        dev_clean
        ;;
    status)
        dev_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
