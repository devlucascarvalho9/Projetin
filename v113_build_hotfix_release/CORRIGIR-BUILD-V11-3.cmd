@echo off
setlocal
cd /d "%~dp0"
node "%~dp0CORRIGIR-BUILD-V11-3.cjs" "%~dp0"
echo.
pause
