@echo off
REM Bench Sales CRM - Startup Script
REM Created by Balaji Koneti
REM This script automates the startup process for the CRM application

echo.
echo ========================================
echo    Bench Sales CRM - Startup Script
echo ========================================
echo.

echo [1/4] Starting Docker infrastructure...
docker compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker containers
    echo Please ensure Docker Desktop is running
    pause
    exit /b 1
)
echo ✓ Docker containers started successfully
echo.

echo [2/4] Setting up API backend...
cd api
if not exist node_modules (
    echo Installing API dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install API dependencies
        pause
        exit /b 1
    )
)

echo Generating Prisma client...
npm run prisma:generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)

echo Running database migrations...
npm run prisma:migrate
if %errorlevel% neq 0 (
    echo ERROR: Failed to run database migrations
    pause
    exit /b 1
)

echo Seeding database...
npm run seed
if %errorlevel% neq 0 (
    echo ERROR: Failed to seed database
    pause
    exit /b 1
)

echo ✓ API backend setup completed
echo.

echo [3/4] Setting up web frontend...
cd ..\web
if not exist node_modules (
    echo Installing web dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install web dependencies
        pause
        exit /b 1
    )
)
echo ✓ Web frontend setup completed
echo.

echo [4/4] Starting development servers...
echo.
echo Starting API server in new window...
start "Bench Sales CRM API" cmd /k "cd /d %cd%\..\api && npm run dev"
echo.

echo Starting web server in new window...
start "Bench Sales CRM Web" cmd /k "cd /d %cd%\..\web && npm run dev"
echo.

echo ========================================
echo           Setup Complete!
echo ========================================
echo.
echo Your CRM application is starting up:
echo.
echo 🌐 Web App:     http://localhost:3000
echo 🔌 API Server:  http://localhost:4000
echo 📧 Mailhog:     http://localhost:8025
echo 🗄️  Database:    localhost:5432
echo.
echo The application will open in new command windows.
echo You can close this window once everything is running.
echo.
pause
