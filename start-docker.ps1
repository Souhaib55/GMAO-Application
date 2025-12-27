# GMAO Docker Startup Script (Windows)
# This script helps you start the GMAO application with Docker

Write-Host "🐳 GMAO Docker Deployment" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if docker-compose is available
try {
    docker-compose version | Out-Null
    Write-Host "✅ docker-compose is available" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: docker-compose is not installed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if ports are available
Write-Host "🔍 Checking required ports..." -ForegroundColor Yellow
$ports = @(1433, 4200, 5000, 5002)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "⚠️  WARNING: Port $port is already in use" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Port $port is available" -ForegroundColor Green
    }
}

Write-Host ""

# Ask user to proceed
$response = Read-Host "Do you want to start the GMAO application? (y/n)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Starting GMAO services..." -ForegroundColor Cyan
Write-Host ""

# Start services
docker-compose up -d

# Wait a bit for services to start
Write-Host ""
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check status
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "✅ GMAO Application Started!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access Points:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost:4200" -ForegroundColor White
Write-Host "   Backend:   http://localhost:5000/api" -ForegroundColor White
Write-Host "   Chatbot:   http://localhost:5002" -ForegroundColor White
Write-Host "   Database:  localhost:1433 (sa/YourStrong!Password123)" -ForegroundColor White
Write-Host ""
Write-Host "📝 Useful Commands:" -ForegroundColor Cyan
Write-Host "   View logs:    docker-compose logs -f" -ForegroundColor White
Write-Host "   Stop all:     docker-compose down" -ForegroundColor White
Write-Host "   Restart:      docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding! 🎉" -ForegroundColor Green
