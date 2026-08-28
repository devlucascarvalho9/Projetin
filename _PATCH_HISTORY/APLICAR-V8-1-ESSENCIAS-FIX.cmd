@echo off
setlocal
cd /d "%~dp0"
echo Aplicando Kaetram V8.1 - Forja, itens, essencias e drops...

REM Corrige o problema de aspas no caminho passando %%CD%% em vez de %%~dp0.
node "%CD%\tools\kaetram\apply-essence-test-drops.cjs" "%CD%"
if errorlevel 1 (
  echo.
  echo Falha ao aplicar itens/essencias/drops.
  pause
  exit /b 1
)

if exist "%CD%\packages\client\dist" (
  echo Limpando build antigo do client...
  rmdir /S /Q "%CD%\packages\client\dist"
)

echo.
echo Pronto. Rode yarn build e depois yarn start.
pause
