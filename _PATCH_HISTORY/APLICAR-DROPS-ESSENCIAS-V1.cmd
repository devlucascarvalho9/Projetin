@echo off
setlocal
cd /d "%~dp0"
echo Aplicando drops de itens e essencias de teste...
node "%~dp0tools\kaetram\apply-essence-test-drops.cjs" "%~dp0"
if errorlevel 1 (
  echo.
  echo Falha ao aplicar drops/essencias.
  pause
  exit /b 1
)
echo.
echo Pronto. Rode yarn build e depois yarn start.
pause
