@echo off
setlocal
cd /d "%~dp0"
echo Aplicando Kaetram V8 - Essencias, drops e Forja visual...
if exist "%~dp0packages\client\dist" (
  echo Limpando build antigo do client...
  rmdir /S /Q "%~dp0packages\client\dist"
)
echo Pronto. Agora rode yarn build e depois yarn start.
pause
