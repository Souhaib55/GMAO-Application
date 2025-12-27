#!/bin/bash

# GMAO Docker Startup Script
# This script helps you start the GMAO application with Docker

echo "🐳 GMAO Docker Deployment"
echo "=========================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ ERROR: Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ ERROR: docker-compose is not installed!"
    exit 1
fi

echo "✅ docker-compose is available"
echo ""

# Check if ports are available
echo "🔍 Checking required ports..."
PORTS=(1433 4200 5000 5002)
for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  WARNING: Port $port is already in use"
    else
        echo "✅ Port $port is available"
    fi
done
echo ""

# Ask user to proceed
read -p "Do you want to start the GMAO application? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "🚀 Starting GMAO services..."
echo ""

# Start services
docker-compose up -d

# Wait a bit for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ GMAO Application Started!"
echo ""
echo "🌐 Access Points:"
echo "   Frontend:  http://localhost:4200"
echo "   Backend:   http://localhost:5000/api"
echo "   Chatbot:   http://localhost:5002"
echo "   Database:  localhost:1433 (sa/YourStrong!Password123)"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop all:     docker-compose down"
echo "   Restart:      docker-compose restart"
echo ""
echo "Happy coding! 🎉"
