@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo Kaetram V11.2 - Gameplay + DEV
echo ================================================
node "V11_2_INSTALLER.cjs"
echo.
pause
