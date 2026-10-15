@echo off
chcp 65001 > nul
cd /d "%~dp0"
title منظومة الأتوبيسات — مشغل التطبيق (Launcher)

echo ======================================================================
echo                 منظومة الأتوبيسات لحفل التخرج
echo                  مشغل المنظومة (System Launcher)
echo ======================================================================
echo.
echo اختر نوع التشغيل لهذا الجهاز:
echo   [1] تشغيل كـ سيرفر رئيسي (Server PC) [الافتراضي - اضغط Enter]
echo   [2] تشغيل كـ جهاز عميل متصل بالسيرفر (Client PC)
echo   [3] فتح تطبيق سطح المكتب المستقل (Electron Desktop)
echo.
set "choice=1"
set /p choice="أدخل اختيارك [1]: "

if "%choice%"=="2" (
    call "%~dp0start-client.bat"
    exit /b 0
)

if "%choice%"=="3" (
    call "%~dp0start-electron.bat"
    exit /b 0
)

call "%~dp0start-server.bat"
exit /b 0
