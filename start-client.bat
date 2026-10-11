@echo off
chcp 65001 > nul
cd /d "%~dp0"
title منظومة الأتوبيسات — جهاز العميل (Client)

echo ======================================================================
echo                 منظومة الأتوبيسات لحفل التخرج
echo                  جهاز العميل (Client PC)
echo ======================================================================
echo.

:: 1. قراءة الـ IP المحفوظ مسبقاً إن وجد
set "SAVED_IP="
if exist "%~dp0server-ip.txt" (
    set /p SAVED_IP=<"%~dp0server-ip.txt"
)

:: إذا لم يكن هناك IP محفوظ، نضع افتراضي شائع
if "%SAVED_IP%"=="" (
    set "DEFAULT_IP=192.168.20.100"
) else (
    set "DEFAULT_IP=%SAVED_IP%"
)

echo ----------------------------------------------------------------------
echo  أدخل عنوان IP الخاص بجهاز السيرفر (Server IP):
echo  الافتراضي: [%DEFAULT_IP%]  (اضغط Enter مباشرة للتأكيد)
echo ----------------------------------------------------------------------
set "SERVER_IP=%DEFAULT_IP%"
set /p USER_INPUT="Server IP [%DEFAULT_IP%]: "
if not "%USER_INPUT%"=="" set "SERVER_IP=%USER_INPUT%"

:: حفظ الـ IP للمرات القادمة
echo %SERVER_IP%>"%~dp0server-ip.txt"

echo.
echo [1/3] جاري فحص الاتصال بالسيرفر (%SERVER_IP%)...
ping -n 1 -w 1000 %SERVER_IP% >nul
if %errorlevel% equ 0 (
    echo [✓] تم الاتصال بجهاز السيرفر بنجاح عبر كابل الشبكة (Ping OK).
) else (
    echo [!] تنبيه: لم يتم الرد على Ping من السيرفر (%SERVER_IP%).
    echo     يرجى التأكد من:
    echo     1. كابل الشبكة متصل بين الجهازين.
    echo     2. تشغيل السيرفر أولاً عبر ملف (start-server.bat) على جهاز السيرفر.
    echo     3. إعداد الـ IP لكلا الجهازين في نفس النطاق (مثال: 192.168.20.100 و 192.168.20.101).
)

set "TARGET_URL=http://%SERVER_IP%:3000"

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
    start "" "%BROWSER%" --app=%TARGET_URL%
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
