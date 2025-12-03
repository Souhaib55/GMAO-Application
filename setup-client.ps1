# GMAO Application - Setup Script
# This script helps install all dependencies for the client application

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GMAO Application - Client Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "✓ npm found: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "✗ npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing Angular CLI globally..." -ForegroundColor Yellow
npm install -g @angular/cli@17

Write-Host ""
Write-Host "Installing project dependencies..." -ForegroundColor Yellow
Set-Location -Path $PSScriptRoot\client

# Remove old node_modules if exists
if (Test-Path "node_modules") {
    Write-Host "Removing old node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules
}

# Remove old package-lock if exists
if (Test-Path "package-lock.json") {
    Write-Host "Removing old package-lock.json..." -ForegroundColor Yellow
    Remove-Item package-lock.json
}

# Install dependencies
npm install

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure SQL Server is running" -ForegroundColor White
Write-Host "2. Start the API: cd API; dotnet run" -ForegroundColor White
Write-Host "3. (Optional) Start chat service: cd gmaochat; .\start_service.bat" -ForegroundColor White
Write-Host "4. Start the frontend: cd client; npm start" -ForegroundColor White
Write-Host ""
Write-Host "The application will be available at http://localhost:4200" -ForegroundColor Cyan
Write-Host ""
