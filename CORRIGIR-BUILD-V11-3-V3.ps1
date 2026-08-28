$ErrorActionPreference = 'Stop'

function Find-KaetramRoot([string]$start) {
    $dir = [System.IO.DirectoryInfo]::new($start)
    for ($i = 0; $i -lt 8 -and $null -ne $dir; $i++) {
        $kay = Join-Path $dir.FullName 'packages\client\src\ui\kaykit-character.ts'
        $bar = Join-Path $dir.FullName 'packages\client\src\ui\warrior-skillbar.ts'
        if ((Test-Path $kay) -and (Test-Path $bar)) { return $dir.FullName }
        $dir = $dir.Parent
    }
    throw 'Nao encontrei a raiz do Kaetram. Coloque esta pasta dentro de Kaetram-Open-develop e execute novamente.'
}

$root = Find-KaetramRoot $PSScriptRoot
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host 'Kaetram V11.3 - Hotfix Build V3' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host "[OK] Raiz: $root" -ForegroundColor Green

$files = @(
    (Join-Path $root 'packages\client\src\ui\warrior-skillbar.ts'),
    (Join-Path $root 'packages\client\src\ui\kaykit-character.ts')
)

$changed = 0
foreach ($file in $files) {
    if (!(Test-Path $file)) { throw "Arquivo nao encontrado: $file" }
    $text = [System.IO.File]::ReadAllText($file)
    $original = $text

    # warrior-skillbar.ts: setInterval nao precisa ser guardado se nao existe unmount/cancelamento.
    $text = $text.Replace("    private ticker = 0;`r`n", '')
    $text = $text.Replace("    private ticker = 0;`n", '')
    $text = $text.Replace('        this.ticker = window.setInterval(() => this.refreshCooldowns(), 100);', '        window.setInterval(() => this.refreshCooldowns(), 100);')

    # kaykit-character.ts: requestAnimationFrame continua o loop sem guardar um ID que nunca e lido.
    $text = $text.Replace("    private raf = 0;`r`n", '')
    $text = $text.Replace("    private raf = 0;`n", '')
    $text = $text.Replace('        this.raf = requestAnimationFrame(this.loop);', '        requestAnimationFrame(this.loop);')

    if ($text -ne $original) {
        $backup = "$file.antes-hotfix-build-v11-3-v3"
        if (!(Test-Path $backup)) { [System.IO.File]::WriteAllText($backup, $original) }
        [System.IO.File]::WriteAllText($file, $text, [System.Text.UTF8Encoding]::new($false))
        Write-Host "[OK] Corrigido: $file" -ForegroundColor Green
        $changed++
    } else {
        Write-Host "[OK] Ja estava corrigido: $file" -ForegroundColor DarkGreen
    }
}

$kayText = [System.IO.File]::ReadAllText((Join-Path $root 'packages\client\src\ui\kaykit-character.ts'))
$barText = [System.IO.File]::ReadAllText((Join-Path $root 'packages\client\src\ui\warrior-skillbar.ts'))
if ($kayText.Contains('private raf = 0') -or $kayText.Contains('this.raf = requestAnimationFrame')) { throw 'A correcao RAF nao foi aplicada.' }
if ($barText.Contains('private ticker = 0') -or $barText.Contains('this.ticker = window.setInterval')) { throw 'A correcao ticker nao foi aplicada.' }

Write-Host ''
Write-Host "[OK] Hotfix concluido. Arquivos alterados nesta execucao: $changed" -ForegroundColor Green
Write-Host 'Agora rode na raiz do jogo: yarn build' -ForegroundColor Yellow
