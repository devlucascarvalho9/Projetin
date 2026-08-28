@echo off
setlocal
cd /d "%~dp0"
echo Aplicando Arvore do Guerreiro V7 (horizontal sem 3 nos iniciais)...
if exist "%~dp0packages\client\dist" rmdir /S /Q "%~dp0packages\client\dist"
echo Pronto. Rode yarn build e depois yarn start.
pause
