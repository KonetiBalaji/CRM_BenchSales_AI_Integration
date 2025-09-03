# Bench Sales CRM - Startup Script (PowerShell)
# Created by Balaji Koneti
# This script automates the startup process for the CRM application

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Bench Sales CRM - Startup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Start Docker infrastructure
Write-Host "[1/4] Starting Docker infrastructure..." -ForegroundColor Yellow
try {
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start Docker containers"
    }
    Write-Host "✓ Docker containers started successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to start Docker containers" -ForegroundColor Red
    Write-Host "Please ensure Docker Desktop is running" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}
Write-Host ""

# Step 2: Setup API backend
Write-Host "[2/4] Setting up API backend..." -ForegroundColor Yellow
Set-Location "api"

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing API dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install API dependencies" -ForegroundColor Red
        Read-Host "Press Enter to continue"
        exit 1
    }
}

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate Prisma client" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

# Run database migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
npm run prisma:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to run database migrations" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

# Seed database
Write-Host "Seeding database..." -ForegroundColor Yellow
npm run seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to seed database" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host "✓ API backend setup completed" -ForegroundColor Green
Write-Host ""

# Step 3: Setup web frontend
Write-Host "[3/4] Setting up web frontend..." -ForegroundColor Yellow
Set-Location "..\web"

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing web dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install web dependencies" -ForegroundColor Red
        Read-Host "Press Enter to continue"
        exit 1
    }
}
Write-Host "✓ Web frontend setup completed" -ForegroundColor Green
Write-Host ""

# Step 4: Start development servers
Write-Host "[4/4] Starting development servers..." -ForegroundColor Yellow
Write-Host ""

# Start API server in new window
Write-Host "Starting API server in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\..\api'; npm run dev" -WindowStyle Normal
Write-Host ""

# Start web server in new window
Write-Host "Starting web server in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\..\web'; npm run dev" -WindowStyle Normal
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your CRM application is starting up:" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Web App:     http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 API Server:  http://localhost:4000" -ForegroundColor Cyan
Write-Host "📧 Mailhog:     http://localhost:8025" -ForegroundColor Cyan
Write-Host "🗄️  Database:    localhost:5432" -ForegroundColor Cyan
Write-Host ""
Write-Host "The application will open in new PowerShell windows." -ForegroundColor White
Write-Host "You can close this window once everything is running." -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"
