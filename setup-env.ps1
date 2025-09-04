# Bench Sales CRM - Environment Setup Script
# Created by Balaji Koneti
# This script creates the necessary environment files for the application

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Bench Sales CRM - Environment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create API .env file
Write-Host "Creating API environment file..." -ForegroundColor Yellow
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
Write-Host "Creating Web environment file..." -ForegroundColor Yellow
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

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "        Environment Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The following files have been created:" -ForegroundColor White
Write-Host "• api\.env - API environment configuration" -ForegroundColor Cyan
Write-Host "• web\.env.local - Web app environment configuration" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now run the start script to launch the application." -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"

