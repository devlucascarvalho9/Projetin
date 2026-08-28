@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo  Kaetram V10.5 - ROADMAP COMPLETO 1-7
echo ==============================================
echo.
node APLICAR-V10-5-ROADMAP.cjs
if errorlevel 1 (
  echo.
  echo O patch NAO foi concluido. Leia o erro acima.
  pause
  exit /b 1
)
echo.
pause
