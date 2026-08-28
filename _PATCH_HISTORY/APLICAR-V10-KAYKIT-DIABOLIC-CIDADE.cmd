@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo  Kaetram V10 - KayKit / HUD / Skills / Cidade
echo ==============================================
echo.
echo Removendo build antigo do client...
if exist "packages\client\dist" rmdir /S /Q "packages\client\dist"
echo.
echo Arquivos ja estao posicionados na estrutura packages\.
echo Agora rode, na raiz do projeto:
echo   yarn build
echo   yarn start
echo.
pause
