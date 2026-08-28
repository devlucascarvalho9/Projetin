@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Kaetram V11.4B - TESTAR

echo ==========================================================
echo Kaetram V11.4B - TESTE
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

node "%~dp0V11_4_TEST.cjs"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" (
  echo [ERRO] O teste terminou com codigo %ERR%.
) else (
  echo [OK] Testes V11.4 concluidos.
)
echo.
pause
exit /b %ERR%
