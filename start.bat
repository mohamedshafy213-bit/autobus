@echo off
cd /d "%~dp0"
title Buses System - Launcher

echo ======================================================================
echo                     BUSES SYSTEM - GRADUATION EVENT
echo                   Server IP: http://130.117.53.42:3000
echo ======================================================================
echo.
echo Select role for this computer:
echo   [1] Server PC (130.117.53.42) [Default - Press Enter]
echo   [2] Client PC (Connects to Server)
echo.
set "choice=1"
set /p choice="Enter choice [1]: "

if "%choice%"=="2" (
    call "%~dp0start-client.bat"
    exit /b 0
)

call "%~dp0start-server.bat"
exit /b 0
