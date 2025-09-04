@echo off
REM Bench Sales CRM - Error Fixing Script (Batch)
REM Created by Balaji Koneti
REM This script fixes all common errors and sets up the project properly

echo.
echo ========================================
echo     Bench Sales CRM - Error Fixing
echo ========================================
echo.

REM Step 1: Create environment files
echo [1/6] Creating environment files...

REM Create API .env file
(
echo # Bench Sales CRM API Environment Variables
echo # Created by Balaji Koneti
echo # This file contains configuration for the API server
echo.
echo # Database connection string
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/benchcrm?schema=public"
echo.
echo # Server configuration
echo PORT=4000
echo.
echo # CORS configuration for web app
echo CORS_ORIGIN=http://localhost:3000
echo.
echo # Environment
echo NODE_ENV=development
) > api\.env
echo ✓ API .env file created

REM Create Web .env.local file
(
echo # Bench Sales CRM Web App Environment Variables
echo # Created by Balaji Koneti
echo # This file contains configuration for the web application
echo.
echo # API server URL
echo NEXT_PUBLIC_API_URL=http://localhost:4000
echo.
echo # Environment
echo NODE_ENV=development
) > web\.env.local
echo ✓ Web .env.local file created

REM Step 2: Install missing dependencies
echo [2/6] Installing missing dependencies...

REM Install API dependencies
cd api
if not exist "node_modules" (
    echo Installing API dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install API dependencies
        pause
        exit /b 1
    )
)

REM Install Web dependencies
cd ..\web
if not exist "node_modules" (
    echo Installing Web dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install Web dependencies
        pause
        exit /b 1
    )
)

cd ..
echo ✓ Dependencies installed

REM Step 3: Start Docker infrastructure
echo [3/6] Starting Docker infrastructure...
docker compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start Docker containers
    echo Please ensure Docker Desktop is running
    pause
    exit /b 1
)
echo ✓ Docker containers started successfully

REM Step 4: Setup database
echo [4/6] Setting up database...
cd api

REM Generate Prisma client
echo Generating Prisma client...
npm run prisma:generate
if errorlevel 1 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)

REM Run database migrations
echo Running database migrations...
npm run prisma:migrate
if errorlevel 1 (
    echo ERROR: Failed to run database migrations
    pause
    exit /b 1
)

REM Seed database
echo Seeding database...
npm run seed
if errorlevel 1 (
    echo ERROR: Failed to seed database
    pause
    exit /b 1
)

cd ..
echo ✓ Database setup completed

REM Step 5: Verify project structure
echo [5/6] Verifying project structure...

REM Check if all required files exist
set missingFiles=0
if not exist "api\.env" set /a missingFiles+=1
if not exist "web\.env.local" set /a missingFiles+=1
if not exist "api\src\main.ts" set /a missingFiles+=1
if not exist "api\src\app.module.ts" set /a missingFiles+=1
if not exist "api\prisma\schema.prisma" set /a missingFiles+=1
if not exist "web\app\page.tsx" set /a missingFiles+=1
if not exist "web\app\consultants\page.tsx" set /a missingFiles+=1

if %missingFiles% gtr 0 (
    echo WARNING: Some required files are missing
) else (
    echo ✓ All required files present
)

REM Step 6: Test build process
echo [6/6] Testing build process...

REM Test API build
cd api
echo Testing API build...
npm run build
if errorlevel 1 (
    echo ERROR: API build failed
    pause
    exit /b 1
)

REM Test Web build
cd ..\web
echo Testing Web build...
npm run build
if errorlevel 1 (
    echo ERROR: Web build failed
    pause
    exit /b 1
)

cd ..
echo ✓ Build tests passed

echo.
echo ========================================
echo         All Errors Fixed!
echo ========================================
echo.
echo Your CRM application is now ready to run:
echo.
echo 🌐 Web App:     http://localhost:3000
echo 🔌 API Server:  http://localhost:4000
echo 📧 Mailhog:     http://localhost:8025
echo 🗄️  Database:    localhost:5432
echo.
echo You can now run the start script to launch the application.
echo.
pause

