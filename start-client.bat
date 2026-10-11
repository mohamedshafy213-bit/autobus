@echo off
cd /d "%~dp0"
title [CLIENT] Buses System - 130.117.53.42:3000

echo ======================================================================
echo                     BUSES SYSTEM - GRADUATION EVENT
echo                   CONNECTING TO: http://130.117.53.42:3000
echo ======================================================================
echo.

start "" powershell -WindowStyle Hidden -Command "$url='http://130.117.53.42:3000'; if (Get-Command msedge.exe -ErrorAction SilentlyContinue) { Start-Process msedge.exe -ArgumentList \"--app=$url\" } elseif (Get-Command chrome.exe -ErrorAction SilentlyContinue) { Start-Process chrome.exe -ArgumentList \"--app=$url\" } else { Start-Process $url }"

echo Application window launched.
timeout /t 3 >nul
