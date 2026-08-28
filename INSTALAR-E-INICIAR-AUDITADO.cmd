@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALAR-E-INICIAR-AUDITADO.ps1"
if errorlevel 1 (
  echo.
  echo O instalador encontrou um erro. Leia a mensagem acima.
  pause
)
endlocal
