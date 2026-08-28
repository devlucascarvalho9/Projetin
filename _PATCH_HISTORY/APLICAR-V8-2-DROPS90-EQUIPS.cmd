@echo off
setlocal
cd /d "%~dp0"
echo Aplicando V8.2 - drops 90%% e equipamentos de teste fortes...
if exist "%~dp0packages\client\dist" rmdir /S /Q "%~dp0packages\client\dist"
echo Pronto. Rode yarn build e depois yarn start.
pause
