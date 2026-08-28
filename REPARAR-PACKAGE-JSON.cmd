@echo off
setlocal
cd /d "%~dp0"
echo =============================================
echo Kaetram - Reparar package.json da raiz
echo =============================================
echo.
if not exist "packages" (
  echo ERRO: esta pasta nao parece ser a raiz Kaetram-Open-develop.
  echo Coloque este .cmd e package.json na raiz do jogo.
  pause
  exit /b 1
)
if exist "package.json" (
  copy /Y "package.json" "package.json.antes-do-reparo.bak" >nul
  echo [OK] Backup criado: package.json.antes-do-reparo.bak
)
if not exist "package.json.original-kaetram" (
  echo ERRO: arquivo package.json.original-kaetram nao encontrado.
  pause
  exit /b 1
)
copy /Y "package.json.original-kaetram" "package.json" >nul
node -e "const p=require('./package.json'); if(p.name!=='kaetram'||!Array.isArray(p.workspaces)||!p.scripts?.build){process.exit(2)}; console.log('[OK] name:',p.name); console.log('[OK] workspaces:',p.workspaces.join(',')); console.log('[OK] build:',p.scripts.build); console.log('[OK] start:',p.scripts.start);"
if errorlevel 1 (
  echo ERRO: validacao do package.json falhou.
  pause
  exit /b 1
)
echo.
echo Reparado. Agora rode:
echo   yarn install
echo   yarn build
echo   yarn start
pause
