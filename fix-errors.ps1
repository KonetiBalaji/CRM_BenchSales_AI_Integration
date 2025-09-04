# Bench Sales CRM - Error Fixing Script
# Created by Balaji Koneti
# This script fixes all common errors and sets up the project properly

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Bench Sales CRM - Error Fixing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create environment files
Write-Host "[1/6] Creating environment files..." -ForegroundColor Yellow

# Create API .env file
$apiEnvContent = @"
# Bench Sales CRM API Environment Variables
# Created by Balaji Koneti
# This file contains configuration for the API server

# Database connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/benchcrm?schema=public"

# Server configuration
PORT=4000

# CORS configuration for web app
CORS_ORIGIN=http://localhost:3000

# Environment
NODE_ENV=development
"@

$apiEnvContent | Out-File -FilePath "api\.env" -Encoding UTF8
Write-Host "✓ API .env file created" -ForegroundColor Green

# Create Web .env.local file
$webEnvContent = @"
# Bench Sales CRM Web App Environment Variables
# Created by Balaji Koneti
# This file contains configuration for the web application

# API server URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Environment
NODE_ENV=development
"@

$webEnvContent | Out-File -FilePath "web\.env.local" -Encoding UTF8
Write-Host "✓ Web .env.local file created" -ForegroundColor Green

# Step 2: Install missing dependencies
Write-Host "[2/6] Installing missing dependencies..." -ForegroundColor Yellow

# Install API dependencies
Set-Location "api"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing API dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install API dependencies" -ForegroundColor Red
        Read-Host "Press Enter to continue"
        exit 1
    }
}

# Install Web dependencies
Set-Location "..\web"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Web dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install Web dependencies" -ForegroundColor Red
        Read-Host "Press Enter to continue"
        exit 1
    }
}

Set-Location ".."
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Step 3: Start Docker infrastructure
Write-Host "[3/6] Starting Docker infrastructure..." -ForegroundColor Yellow
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

# Step 4: Setup database
Write-Host "[4/6] Setting up database..." -ForegroundColor Yellow
Set-Location "api"

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

Set-Location ".."
Write-Host "✓ Database setup completed" -ForegroundColor Green

# Step 5: Verify project structure
Write-Host "[5/6] Verifying project structure..." -ForegroundColor Yellow

# Check if all required files exist
$requiredFiles = @(
    "api\.env",
    "web\.env.local",
    "api\src\main.ts",
    "api\src\app.module.ts",
    "api\prisma\schema.prisma",
    "web\app\page.tsx",
    "web\app\consultants\page.tsx"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "WARNING: Some required files are missing:" -ForegroundColor Yellow
    foreach ($file in $missingFiles) {
        Write-Host "  • $file" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ All required files present" -ForegroundColor Green
}

# Step 6: Test build process
Write-Host "[6/6] Testing build process..." -ForegroundColor Yellow

# Test API build
Set-Location "api"
Write-Host "Testing API build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: API build failed" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

# Test Web build
Set-Location "..\web"
Write-Host "Testing Web build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Web build failed" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Set-Location ".."
Write-Host "✓ Build tests passed" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "        All Errors Fixed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your CRM application is now ready to run:" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Web App:     http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 API Server:  http://localhost:4000" -ForegroundColor Cyan
Write-Host "📧 Mailhog:     http://localhost:8025" -ForegroundColor Cyan
Write-Host "🗄️  Database:    localhost:5432" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now run the start script to launch the application." -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"

