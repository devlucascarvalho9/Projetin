@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo Kaetram V11.1 - Validacao
echo ================================================
node "V11_1_TEST.cjs"
echo.
pause
