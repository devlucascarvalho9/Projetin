@echo off
setlocal
cd /d "%~dp0"
echo =======================================================
echo  Kaetram V10.4 - DIRECAO KAYKIT + STEELSTORM
echo =======================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado no PATH.
  pause
  exit /b 1
)
node APLICAR-V10-4-DIRECAO-GIRO.cjs
if errorlevel 1 (
  echo.
  echo O patch NAO terminou. Tire um print desta janela e envie no chat.
  pause
  exit /b 1
)
echo.
echo Concluido. Agora rode:
echo   yarn build
echo   yarn start
echo.
pause
