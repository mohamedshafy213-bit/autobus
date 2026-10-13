@echo off
chcp 65001 > nul
cd /d "%~dp0"
title منظومة الأتوبيسات — جهاز العميل (Client)

echo ======================================================================
echo                 منظومة الأتوبيسات لحفل التخرج
echo                  جهاز العميل (Client PC)
echo ======================================================================
echo.

:: 1. قراءة الـ IP الرئيسي المحفوظ مسبقاً إن وجد
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
echo  [1] أدخل عنوان IP السيرفر الرئيسي (Primary Server):
echo      الافتراضي: [%DEFAULT_IP%]  (اضغط Enter للتأكيد)
echo ----------------------------------------------------------------------
set "SERVER_IP=%DEFAULT_IP%"
set /p USER_INPUT="Primary Server IP [%DEFAULT_IP%]: "
if not "%USER_INPUT%"=="" set "SERVER_IP=%USER_INPUT%"
echo %SERVER_IP%>"%~dp0server-ip.txt"

:: 2. قراءة عنوان السيرفر الاحتياطي إن وجد
set "SAVED_BACKUP="
if exist "%~dp0backup-ip.txt" (
    set /p SAVED_BACKUP=<"%~dp0backup-ip.txt"
)

echo.
echo ----------------------------------------------------------------------
echo  [2] أدخل عنوان IP السيرفر الاحتياطي (Backup Server - اختياري):
if not "%SAVED_BACKUP%"=="" (
    echo      المحفوظ مسبقاً: [%SAVED_BACKUP%]  (اضغط Enter للاستخدام أو اكتب عنواناً جديداً)
) else (
    echo      (اضغط Enter مباشرة للتخطي إذا لم يكن متوفراً)
)
echo ----------------------------------------------------------------------
set "BACKUP_IP=%SAVED_BACKUP%"
set /p USER_BACKUP="Backup Server IP: "
if not "%USER_BACKUP%"=="" set "BACKUP_IP=%USER_BACKUP%"
if not "%BACKUP_IP%"=="" echo %BACKUP_IP%>"%~dp0backup-ip.txt"

echo.
echo [1/3] جاري فحص الاتصال بالسيرفر الرئيسي (%SERVER_IP%)...
ping -n 1 -w 1000 %SERVER_IP% >nul
if %errorlevel% equ 0 (
    echo [✓] السيرفر الرئيسي متاح ومتصل (Ping OK).
) else (
    echo [!] تنبيه: لم يتم الرد على Ping من السيرفر الرئيسي (%SERVER_IP%).
    if not "%BACKUP_IP%"=="" (
        echo     جاري فحص السيرفر الاحتياطي (%BACKUP_IP%)...
        ping -n 1 -w 1000 %BACKUP_IP% >nul
        if %errorlevel% equ 0 (
            echo     [✓] السيرفر الاحتياطي متاح وجاهز للعمل!
        )
    )
)

:: تجهيز الرابط مع بارامتر الاحتياطي التلقائي
set "TARGET_URL=http://%SERVER_IP%:3000"
if not "%BACKUP_IP%"=="" (
    set "TARGET_URL=http://%SERVER_IP%:3000?backup=http://%BACKUP_IP%:3000"
)

echo.
echo [2/3] جاري فتح المنظومة في المتصفح...
echo الرابط: %TARGET_URL%

:: البحث عن المتصفح (Edge أو Chrome) لتشغيل المنظومة كنافذة تطبيق مستقلة
set "BROWSER="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if "%BROWSER%"=="" if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if "%BROWSER%"=="" if exist "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"
if "%BROWSER%"=="" if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if "%BROWSER%"=="" if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if "%BROWSER%"=="" if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if not "%BROWSER%"=="" (
    start "" "%BROWSER%" --app="%TARGET_URL%"
) else (
    start "" "%TARGET_URL%"
)

echo.
echo ======================================================================
echo [3/3] تم إطلاق نافذة المنظومة بنجاح!
echo.
echo إذا لم تظهر النافذة تلقائياً، يمكنك فتح المتصفح يدوياً وكتابة:
echo %TARGET_URL%
echo ======================================================================
echo.
pause
