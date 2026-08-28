@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo  ROLLBACK Kaetram V10.5 ROADMAP
echo ==============================================
echo.
node ROLLBACK-V10-5-ROADMAP.cjs
if errorlevel 1 exit /b 1
echo.
pause
