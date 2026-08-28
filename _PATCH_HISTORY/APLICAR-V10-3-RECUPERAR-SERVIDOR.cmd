@echo off
setlocal
cd /d "%~dp0"
echo =======================================================
echo  Kaetram V10.3 - RECUPERAR SERVIDOR + COLISOES SEGURAS
echo =======================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado no PATH.
  pause
  exit /b 1
)
node APLICAR-V10-3-RECUPERAR-SERVIDOR.cjs
if errorlevel 1 (
  echo.
  echo O patch NAO terminou. Tire um print desta janela e envie no chat.
  pause
  exit /b 1
)
echo.
echo Concluido. Agora, nesta mesma pasta, execute:
echo   yarn build
echo   yarn start
echo.
pause
