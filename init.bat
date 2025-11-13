@echo off
REM Video Archival Diplomatics - One-Click Initialization Script (Windows)
REM This script sets up the entire project with one command

echo.
echo ========================================
echo Video Archival Diplomatics Setup
echo ========================================
echo.

REM Check if Docker is installed
echo [INFO] Checking prerequisites...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    echo Visit: https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not available. Please ensure Docker Desktop is running.
    pause
    exit /b 1
)

echo [SUCCESS] Docker and Docker Compose are installed
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Node.js is not installed. Some features may not work.
    echo Visit: https://nodejs.org/ to install Node.js 18+
    echo.
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [SUCCESS] Node.js !NODE_VERSION! is installed
    echo.
)

REM Step 1: Install Node dependencies (if Node is available)
node --version >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Installing Node.js dependencies...
    call npm ci --quiet
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed
    echo.
)

REM Step 2: Set up environment configuration
echo [INFO] Setting up environment configuration...
if not exist .env (
    copy .env.example .env >nul
    echo [SUCCESS] Created .env file from .env.example
) else (
    echo [WARNING] .env file already exists, skipping...
)
echo.

REM Step 3: Create uploads directory
echo [INFO] Creating uploads directory...
if not exist uploads mkdir uploads
echo [SUCCESS] Uploads directory created
echo.

REM Step 4: Stop any existing containers
echo [INFO] Stopping any existing containers...
docker compose down >nul 2>&1

REM Step 5: Pull latest images
echo [INFO] Pulling Docker images (this may take a few minutes)...
docker compose pull
if errorlevel 1 (
    echo [ERROR] Failed to pull Docker images
    pause
    exit /b 1
)
echo.

REM Step 6: Build and start services
echo [INFO] Building and starting services...
docker compose up -d --build
if errorlevel 1 (
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)
echo [SUCCESS] Services started
echo.

REM Step 7: Wait for services to be ready
echo [INFO] Waiting for services to be ready...
echo   Waiting for Neo4j...
timeout /t 10 /nobreak >nul

echo   Waiting for IPFS...
timeout /t 5 /nobreak >nul

echo   Waiting for API server...
timeout /t 5 /nobreak >nul

echo [SUCCESS] Services should be ready
echo.

REM Step 8: Initialize Neo4j database
echo [INFO] Initializing Neo4j database...
docker compose exec -T app npm run neo4j:init
if errorlevel 1 (
    echo [WARNING] Neo4j initialization may have failed. Check logs with: docker compose logs app
) else (
    echo [SUCCESS] Neo4j database initialized
)
echo.

REM Step 9: Verify installation
echo [INFO] Verifying installation...
timeout /t 2 /nobreak >nul
curl -s http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Health check failed. Services may still be starting up.
    echo Run: docker compose logs -f
) else (
    echo [SUCCESS] Health check passed!
)
echo.

echo ==========================================
echo      Installation Complete!
echo ==========================================
echo.
echo Services Running:
echo   - API Server:     http://localhost:3000
echo   - Neo4j Browser:  http://localhost:7475
echo                     (user: neo4j, password: password123)
echo   - IPFS Gateway:   http://localhost:8081
echo   - IPFS API:       http://localhost:5002
echo.
echo Quick Start:
echo   - Upload interface: http://localhost:3000
echo   - View logs:        docker compose logs -f
echo   - Stop services:    docker compose down
echo.
echo Documentation:
echo   - README.md - General overview
echo   - UPLOAD_TROUBLESHOOTING.md - Debugging guide
echo   - UPLOAD_FIX_SUMMARY.md - Technical details
echo.
echo Ready to use! Visit http://localhost:3000 to get started.
echo.
pause
