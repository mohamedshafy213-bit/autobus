@echo off
chcp 65001 > nul
cd /d "%~dp0"
title منظومة الأتوبيسات — السيرفر الرئيسي (Server)

echo ======================================================================
echo                 منظومة الأتوبيسات لحفل التخرج
echo                  السيرفر الرئيسي (Main Server)
echo ======================================================================
echo.

:: 1. إغلاق أي عملية سابقة على المنفذ 3000
echo [1/3] فحص المنفذ 3000 وإغلاق أي خادم سابق...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)

:: 2. إطلاق المتصفح بعد ثانيتين للمستخدم المحلي على السيرفر
echo [2/3] تجهيز نافذة المنظومة...
set "LOCAL_URL=http://localhost:3000"

set "BROWSER="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if "%BROWSER%"=="" if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if "%BROWSER%"=="" if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"
if "%BROWSER%"=="" if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if "%BROWSER%"=="" if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if "%BROWSER%"=="" if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; $url='%LOCAL_URL%'; if (Test-Path '%BROWSER%') { Start-Process '%BROWSER%' -ArgumentList \"--app=$url\" } else { Start-Process $url }"

:: 3. تشغيل السيرفر
echo [3/3] جاري تشغيل السيرفر على المنفذ 3000...
echo.
node server/index.js

pause
