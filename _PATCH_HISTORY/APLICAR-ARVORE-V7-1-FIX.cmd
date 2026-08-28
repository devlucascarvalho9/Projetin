@echo off
setlocal
cd /d "%~dp0"
echo Aplicando Arvore do Guerreiro V7.1 FIX...
if exist "%~dp0packages\client\dist" rmdir /S /Q "%~dp0packages\client\dist"
echo.
echo Arquivos aplicados. Agora rode: yarn build
echo Depois: yarn start
pause
