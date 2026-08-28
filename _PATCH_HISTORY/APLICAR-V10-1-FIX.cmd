@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo  Kaetram V10.1 FIX - KayKit / Diabolic / Skills
echo ==============================================
echo.
echo Limpando build antigo do client...
if exist "packages\client\dist" rmdir /S /Q "packages\client\dist"
echo.
echo Arquivos V10.1 posicionados.
echo Agora execute:
echo   yarn build
echo   yarn start
echo Depois use Ctrl+F5 no navegador.
echo.
pause
