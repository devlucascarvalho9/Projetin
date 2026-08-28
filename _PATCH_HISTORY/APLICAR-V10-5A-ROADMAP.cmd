@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo  Kaetram V10.5a - ROADMAP 1-7 AUTOCONTIDO
echo ==============================================
echo.
node APLICAR-V10-5A-ROADMAP.cjs
if errorlevel 1 (
  echo.
  echo O patch NAO foi concluido. Leia o erro acima.
  pause
  exit /b 1
)
echo.
pause
