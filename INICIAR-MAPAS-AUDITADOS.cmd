@echo off
setlocal EnableExtensions
pushd "%~dp0"
title Kaetram - Mapas Auditados

echo [1/5] Encerrando processos antigos nas portas 9000, 9001 e 9010...
for %%P in (9000 9001 9010) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    taskkill /PID %%A /F >nul 2>&1
  )
)

echo [2/5] Validando arquivos...
node VALIDAR-MAPAS-AUDITADOS.cjs
if errorlevel 1 (
  echo.
  echo ERRO: a validacao falhou. O jogo nao sera iniciado.
  pause
  popd
  exit /b 1
)

echo [3/5] Iniciando servidor na porta 9001...
start "Kaetram Server - Auditado" /D "%~dp0" cmd.exe /k call yarn.cmd workspace @kaetram/server start

echo [4/5] Iniciando cliente na porta 9010...
start "Kaetram Client - Auditado" /D "%~dp0" cmd.exe /k call yarn.cmd workspace @kaetram/client start

echo [5/5] Aguardando o cliente responder...
set "READY="
for /L %%I in (1,1,30) do (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:9010/' -TimeoutSec 1; if ($r.StatusCode -ge 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    set "READY=1"
    goto :OPENCLIENT
  )
  timeout /t 1 /nobreak >nul
)

:OPENCLIENT
if defined READY (
  echo Cliente respondeu. Abrindo navegador...
  start "" "http://127.0.0.1:9010/"
) else (
  echo.
  echo AVISO: o cliente nao respondeu em 30 segundos.
  echo Veja os terminais "Kaetram Server - Auditado" e "Kaetram Client - Auditado".
  echo Se ambos estiverem rodando, abra manualmente: http://127.0.0.1:9010/
  pause
)

popd
endlocal
