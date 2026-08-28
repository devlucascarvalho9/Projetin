$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Find-KaetramRoot {
    $candidates = @(
        (Get-Location).Path,
        $scriptDir,
        (Split-Path -Parent $scriptDir)
    ) | Select-Object -Unique
    foreach ($c in $candidates) {
        if ((Test-Path (Join-Path $c 'package.json')) -and
            (Test-Path (Join-Path $c 'packages\client')) -and
            (Test-Path (Join-Path $c 'packages\server'))) { return (Resolve-Path $c).Path }
    }
    throw 'Nao encontrei a raiz do Kaetram. Coloque esta pasta dentro de Kaetram-Open-develop e execute novamente.'
}

$root = Find-KaetramRoot
$payload = Join-Path $scriptDir 'payload'
if (!(Test-Path (Join-Path $payload 'packages\client\dist\index.html'))) {
    throw 'Payload do recovery ausente/incompleto.'
}

Write-Host "Kaetram root: $root" -ForegroundColor Cyan
Write-Host '[1/6] Encerrando servidores antigos...' -ForegroundColor Yellow
foreach ($port in 9000,9001,9010,9020) {
    try {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
          Select-Object -ExpandProperty OwningProcess -Unique |
          ForEach-Object { if ($_ -and $_ -ne $PID) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }
    } catch {}
}
Start-Sleep -Milliseconds 500

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $root "backups\AUDIT_RECOVERY\$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Write-Host "[2/6] Backup em $backup" -ForegroundColor Yellow
$targets = @(
  'packages\client\dist',
  'packages\client\data\maps\map.json',
  'packages\client\package.json',
  'packages\client\src\ui\city-ambience.ts',
  'packages\server\data\map\world.json',
  'packages\server\src\controllers\commands.ts',
  'packages\server\package.json'
)
foreach ($rel in $targets) {
    $src = Join-Path $root $rel
    if (Test-Path $src) {
        $dst = Join-Path $backup $rel
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
        if ((Get-Item $src).PSIsContainer) { Copy-Item $src $dst -Recurse -Force }
        else { Copy-Item $src $dst -Force }
    }
}

Write-Host '[3/6] Removendo o client dist antigo INTEIRO...' -ForegroundColor Yellow
$clientDist = Join-Path $root 'packages\client\dist'
if (Test-Path $clientDist) { Remove-Item $clientDist -Recurse -Force }
New-Item -ItemType Directory -Force -Path $clientDist | Out-Null
Copy-Item (Join-Path $payload 'packages\client\dist\*') $clientDist -Recurse -Force

Write-Host '[4/6] Instalando mapas/client/server auditados...' -ForegroundColor Yellow
$files = @(
  'packages\client\data\maps\map.json',
  'packages\client\package.json',
  'packages\client\src\ui\city-ambience.ts',
  'packages\client\public\img\tilesets\mapa-amor-nativo.png',
  'packages\server\data\map\world.json',
  'packages\server\src\controllers\commands.ts',
  'packages\server\package.json'
)
foreach ($rel in $files) {
    $src = Join-Path $payload $rel
    $dst = Join-Path $root $rel
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
    Copy-Item $src $dst -Force
}

Write-Host '[5/6] Validando instalacao...' -ForegroundColor Yellow
& node (Join-Path $scriptDir 'VALIDAR-RECOVERY.cjs') $root
if ($LASTEXITCODE -ne 0) { throw 'A validacao falhou. Nao vou iniciar o jogo.' }

Write-Host '[6/6] Iniciando servidor e cliente...' -ForegroundColor Yellow
$serverCmd = 'yarn.cmd workspace @kaetram/server start'
$clientCmd = 'yarn.cmd workspace @kaetram/client start'
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $serverCmd -WorkingDirectory $root -WindowStyle Normal
Start-Sleep -Seconds 2
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $clientCmd -WorkingDirectory $root -WindowStyle Normal

Write-Host 'Aguardando http://127.0.0.1:9020/ ...' -ForegroundColor Cyan
$ready = $false
for ($i=0; $i -lt 30; $i++) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:9020/' -TimeoutSec 1
        if ($r.StatusCode -ge 200) { $ready=$true; break }
    } catch {}
    Start-Sleep -Seconds 1
}
if ($ready) {
    Write-Host 'Cliente pronto. Abrindo navegador...' -ForegroundColor Green
    Start-Process 'explorer.exe' 'http://127.0.0.1:9020/'
} else {
    Write-Host 'O cliente nao respondeu em 30s. Veja as duas janelas de terminal.' -ForegroundColor Red
    Write-Host 'Endereco manual: http://127.0.0.1:9020/'
}
Write-Host ''
Write-Host 'Recovery concluido. Nao aplique V11.4-V11.11 por cima deste estado.' -ForegroundColor Green
Read-Host 'Pressione ENTER para fechar este instalador'
