@echo off
chcp 65001 > nul
title منظومة الأتوبيسات - خادم الشبكة المحلية LAN

echo ======================================================================
echo                 منظومة الأتوبيسات لحفل التخرج
echo                  خادم الشبكة المحلية (LAN Server)
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. التحقق من وجود Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطأ] Node.js غير مثبت على هذا الجهاز!
    echo يرجى تحميل وتثبيت Node.js من الموقع الرسمي: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. التحقق من تنزيل المكتبات والاعتماديات تلقائياً
if not exist "node_modules\" (
    echo [1/3] جاري تنزيل وتثبيت مكتبات المنظومة لأول مرة (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        echo [خطأ] فشل في تنزيل المكتبات، يرجى التأكد من اتصال الإنترنت ثم إعادة المحاولة.
        pause
        exit /b 1
    )
) else (
    echo [1/3] تم التحقق من المكتبات (node_modules موجود).
)

:: 3. التحقق من بناء واجهة المستخدم
if not exist "server\public\index.html" (
    echo [2/3] جاري بناء واجهة المستخدم (npm run build)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [خطأ] فشل في بناء الواجهة.
        pause
        exit /b 1
    )
) else (
    echo [2/3] ملفات واجهة المستخدم جاهزة.
)

echo [3/3] تشغيل الخادم وفتح المنظومة تلقائياً...
echo.

:: فتح نافذة التطبيق تلقائياً بعد ثانيتين (يفضل نافذة تطبيق بدون شريط المتصفح)
start "" /b powershell -WindowStyle Hidden -Command "$url='http://localhost:3000'; Start-Sleep -Seconds 2; if (Get-Command msedge.exe -ErrorAction SilentlyContinue) { Start-Process msedge.exe -ArgumentList \"--app=$url\" } elseif (Get-Command chrome.exe -ErrorAction SilentlyContinue) { Start-Process chrome.exe -ArgumentList \"--app=$url\" } else { Start-Process $url }"

node server/index.js

pause
