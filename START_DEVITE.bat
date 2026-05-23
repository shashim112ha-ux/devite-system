@echo off
echo ============================================
echo    DEVITE ERP - Starting Servers
echo ============================================

echo [1/3] Clearing Next.js cache...
rmdir /s /q "d:\devite\apps\web\.next" 2>nul
echo     Cache cleared!

echo [2/3] Starting Backend Server (Port 4000)...
start "DEVITE Backend" cmd /k "cd /d d:\devite && npm run dev:server"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend (Port 3000)...
start "DEVITE Frontend" cmd /k "cd /d d:\devite\apps\web && npm run dev"

echo.
echo ============================================
echo  Servers starting... please wait 30 seconds
echo  then open: http://localhost:3000/login
echo ============================================

timeout /t 5 /nobreak >nul
start "" "http://localhost:3000/login"
