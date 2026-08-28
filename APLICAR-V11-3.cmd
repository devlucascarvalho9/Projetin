@echo off
chcp 65001 >nul
set "KAETRAM_ROOT=%~dp0."
echo ================================================
echo Kaetram V11.3C - Hotfix raiz direta
echo ================================================
echo Raiz usada: %KAETRAM_ROOT%
node "%~dp0V11_3_INSTALLER.cjs" "%KAETRAM_ROOT%"
echo.
pause
