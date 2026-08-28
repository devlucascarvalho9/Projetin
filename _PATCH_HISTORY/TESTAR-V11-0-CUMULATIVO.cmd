@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
node "TESTAR-V11-0-CUMULATIVO.cjs"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" echo O processo terminou com erro. Leia as mensagens acima.
pause
exit /b %ERR%
