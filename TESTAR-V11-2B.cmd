@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo Kaetram V11.2B - Validacao
echo ================================================
node "V11_2B_TEST.cjs"
echo.
pause
