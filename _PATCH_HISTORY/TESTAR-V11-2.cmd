@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo Kaetram V11.2 - Validacao
echo ================================================
node "V11_2_TEST.cjs"
echo.
pause
