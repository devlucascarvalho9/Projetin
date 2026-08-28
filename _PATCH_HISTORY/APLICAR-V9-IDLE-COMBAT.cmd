@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo   KAETRAM V9 - IDLE / RADAR / COMBATE
echo ==============================================
echo.
if not exist "packages\client\src\game.ts" (
  echo ERRO: extraia este pacote na raiz do Kaetram-Open-develop.
  pause
  exit /b 1
)
echo Limpando build antigo do client...
if exist "packages\client\dist" rmdir /S /Q "packages\client\dist"
echo.
echo Arquivos aplicados. Agora execute:
echo   yarn build
echo   yarn start
echo.
echo No navegador use Ctrl+F5.
pause
