@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo Kaetram V11.1 - Rollback
echo ================================================
node "V11_1_ROLLBACK.cjs"
echo.
pause
