@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo  Kaetram V10.2 - KayKit 1.4x + Colisoes Cidade
echo ==============================================
echo.
echo Aplicando integracao de colisoes sem substituir o projeto inteiro...
node APLICAR-V10-2-KAYKIT-COLISOES.cjs
if errorlevel 1 (
  echo.
  echo O patch NAO foi concluido. Leia o erro acima.
  pause
  exit /b 1
)
echo.
echo Limpando build antigo do client para evitar cache...
if exist "packages\client\dist" rmdir /S /Q "packages\client\dist"
echo.
echo Pronto. Agora execute:
echo   yarn build
echo   yarn start
echo Depois use Ctrl+F5 no navegador.
echo.
pause
