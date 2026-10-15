@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Buses System - Client

echo ======================================================================
echo                     BUSES SYSTEM - CLIENT PC
echo ======================================================================
echo.

REM 1. Read saved Primary IP
set "SAVED_IP="
if exist "%~dp0server-ip.txt" (
    set /p SAVED_IP=<"%~dp0server-ip.txt"
)

if "%SAVED_IP%"=="" (
    set "DEFAULT_IP=192.168.20.100"
) else (
    set "DEFAULT_IP=%SAVED_IP%"
)

echo ----------------------------------------------------------------------
echo  [1] Enter Primary Server IP:
echo      Default: [%DEFAULT_IP%]  (Press Enter to confirm)
echo ----------------------------------------------------------------------
set "SERVER_IP=%DEFAULT_IP%"
set /p USER_INPUT="Primary Server IP [%DEFAULT_IP%]: "
if not "%USER_INPUT%"=="" set "SERVER_IP=%USER_INPUT%"
echo %SERVER_IP%>"%~dp0server-ip.txt"

REM 2. Read saved Backup IP
set "SAVED_BACKUP="
if exist "%~dp0backup-ip.txt" (
    set /p SAVED_BACKUP=<"%~dp0backup-ip.txt"
)

echo.
echo ----------------------------------------------------------------------
echo  [2] Enter Backup Server IP (Optional - Press Enter to skip):
if not "%SAVED_BACKUP%"=="" (
    echo      Saved: [%SAVED_BACKUP%]
)
echo ----------------------------------------------------------------------
set "BACKUP_IP=%SAVED_BACKUP%"
set /p USER_BACKUP="Backup Server IP: "
if not "%USER_BACKUP%"=="" set "BACKUP_IP=%USER_BACKUP%"
if not "%BACKUP_IP%"=="" echo %BACKUP_IP%>"%~dp0backup-ip.txt"

echo.
echo [1/3] Testing connection to Server (%SERVER_IP%)...
ping -n 1 -w 1000 %SERVER_IP% >nul
if %errorlevel% equ 0 (
    echo [OK] Server is reachable!
) else (
    echo [WARNING] Could not ping Server (%SERVER_IP%).
    echo           Please check LAN cable and server.bat on the Server PC.
)

set "TARGET_URL=http://%SERVER_IP%:3000"
if not "%BACKUP_IP%"=="" (
    set "TARGET_URL=http://%SERVER_IP%:3000?backup=http://%BACKUP_IP%:3000"
)

echo.
echo [2/3] Launching application window...
echo URL: %TARGET_URL%

start "" powershell -WindowStyle Hidden -Command "$url='%TARGET_URL%'; if (Get-Command msedge.exe -ErrorAction SilentlyContinue) { Start-Process msedge.exe -ArgumentList \"--app=$url\" } elseif (Get-Command chrome.exe -ErrorAction SilentlyContinue) { Start-Process chrome.exe -ArgumentList \"--app=$url\" } else { Start-Process $url }"

echo.
echo ======================================================================
echo [3/3] Application launched!
echo ======================================================================
echo.
pause
