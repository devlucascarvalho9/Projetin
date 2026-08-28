@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Kaetram V11.4B - INSTALAR

echo ==========================================================
echo Kaetram V11.4B - Cidade + Forja + /amor
echo ==========================================================
echo Pasta do patch: %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado no PATH.
  echo Abra o terminal do projeto e confirme que "node --version" funciona.
  echo.
  pause
  exit /b 1
)

node "%~dp0V11_4_INSTALLER.cjs"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" (
  echo [ERRO] O instalador terminou com codigo %ERR%.
) else (
  echo [OK] Instalador V11.4 concluido.
)
echo.
pause
exit /b %ERR%
