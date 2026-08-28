@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Kaetram V11.4B - ROLLBACK

echo ==========================================================
echo Kaetram V11.4B - ROLLBACK
echo ==========================================================
echo Pasta do patch: %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado no PATH.
  echo.
  pause
  exit /b 1
)

node "%~dp0V11_4_ROLLBACK.cjs"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" (
  echo [ERRO] O rollback terminou com codigo %ERR%.
) else (
  echo [OK] Rollback V11.4 concluido.
)
echo.
pause
exit /b %ERR%
