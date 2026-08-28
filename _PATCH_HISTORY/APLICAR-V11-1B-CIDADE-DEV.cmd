@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo Kaetram V11.1B - Cidade Estruturada + DEV FIX
echo ================================================
node "V11_1_INSTALLER.cjs"
echo.
pause
