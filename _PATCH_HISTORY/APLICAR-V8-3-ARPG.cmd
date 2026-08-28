@echo off
setlocal
cd /d "%~dp0"
echo ===============================================
echo   Kaetram V8.3 - ARPG Integrado
echo ===============================================
echo.
echo Os arquivos ja devem ter sido extraidos sobre a raiz do projeto.
echo Limpando build antigo do client...
if exist "packages\client\dist" rmdir /S /Q "packages\client\dist"
echo.
echo Pronto.
echo Agora execute no PowerShell:
echo   yarn build
echo   yarn start
echo.
echo MongoDB deve estar ativo para save persistente.
pause
