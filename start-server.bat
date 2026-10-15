@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Buses System - Main Server

echo ======================================================================
echo                     BUSES SYSTEM - MAIN SERVER
echo                          PORT: 3000
echo ======================================================================
echo.

REM 1. Close any previous process listening on port 3000
echo [1/3] Checking port 3000 and closing any running server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM 2. Launch browser window in app mode after 2 seconds
echo [2/3] Opening application window...
start "" powershell -WindowStyle Hidden -Command "$url='http://localhost:3000'; Start-Sleep -Seconds 2; if (Get-Command msedge.exe -ErrorAction SilentlyContinue) { Start-Process msedge.exe -ArgumentList \"--app=$url\" } elseif (Get-Command chrome.exe -ErrorAction SilentlyContinue) { Start-Process chrome.exe -ArgumentList \"--app=$url\" } else { Start-Process $url }"

REM 3. Start Node.js server
echo [3/3] Starting server on port 3000...
echo.
node server/index.js

pause
