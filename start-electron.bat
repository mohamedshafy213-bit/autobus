@echo off
chcp 65001 > nul
title منظومة الأتوبيسات — تطبيق سطح المكتب (Electron Desktop App)

echo ======================================================================
echo                 منظومة الأتوبيسات لحفل التخرج
echo                  تطبيق سطح المكتب (Electron Desktop App)
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

:: 2. تنزيل مكتبات المنظومة إذا لم تكن موجودة
if not exist "node_modules\" (
    echo [1/4] جاري تنزيل مكتبات واعتماديات المشروع الأساسية (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        echo [خطأ] فشل تنزيل المكتبات. يرجى التأكد من اتصال الإنترنت ثم إعادة المحاولة.
        pause
        exit /b 1
    )
) else (
    echo [1/4] مكتبات المشروع الأساسية متوفرة.
)

:: 3. التحقق من توفر مكتبة Electron وتنزيلها تلقائياً إن لم تكن مثبتة
if not exist "node_modules\electron\" (
    echo [2/4] جاري تنزيل مكتبة Electron لأول مرة لتشغيل التطبيق كنافذة سطح مكتب...
    call npm install --save-dev electron
    if %errorlevel% neq 0 (
        echo [تحذير] تعذر تنزيل Electron (قد يكون اتصال الإنترنت بطيئاً).
        echo سيتم فتح المنظومة عبر المتصفح السريع بدلاً من ذلك.
        call start.bat
        exit /b 0
    )
) else (
    echo [2/4] محرك Electron مثبت وجاهز.
)

:: 4. بناء واجهة المستخدم إن لم تكن مبنية
if not exist "server\public\index.html" (
    echo [3/4] جاري بناء واجهة المستخدم (npm run build)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [خطأ] فشل في بناء الواجهة.
        pause
        exit /b 1
    )
) else (
    echo [3/4] ملفات الواجهة مبنية وجاهزة.
)

:: 5. إطلاق تطبيق Electron
echo [4/4] جاري فتح المنظومة في نافذة سطح مكتب مستقلة (Electron)...
echo.
call npx electron electron/main.cjs

pause
