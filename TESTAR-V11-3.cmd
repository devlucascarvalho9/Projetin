@echo off
chcp 65001 >nul
set "KAETRAM_ROOT=%~dp0."
echo ================================================
echo Teste Kaetram V11.3C
echo ================================================
echo Raiz usada: %KAETRAM_ROOT%
node "%~dp0V11_3_TEST.cjs" "%KAETRAM_ROOT%"
echo.
pause
