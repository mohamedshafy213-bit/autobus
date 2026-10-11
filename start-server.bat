@echo off
cd /d "%~dp0"
title [SERVER] Buses System - 130.117.53.42:3000

echo ======================================================================
echo                     BUSES SYSTEM - GRADUATION EVENT
echo                   MAIN SERVER: http://130.117.53.42:3000
echo ======================================================================
echo.

:: 1. Clean up any existing process listening on port 3000
echo Closing any previous server running on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)

:: 2. Open desktop app window after 2 seconds
start "" powershell -WindowStyle Hidden -Command "$url='http://localhost:3000'; Start-Sleep -Seconds 2; if (Get-Command msedge.exe -ErrorAction SilentlyContinue) { Start-Process msedge.exe -ArgumentList \"--app=$url\" } elseif (Get-Command chrome.exe -ErrorAction SilentlyContinue) { Start-Process chrome.exe -ArgumentList \"--app=$url\" } else { Start-Process $url }"

:: 3. Start the updated server
echo Starting updated server...
echo.
node server/index.js

pause
