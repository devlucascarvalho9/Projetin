$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = $here
for ($i=0; $i -lt 6; $i++) {
  $candidate = Join-Path $root 'packages\client\middleware\index.ts'
  if (Test-Path $candidate) { break }
  $parent = Split-Path -Parent $root
  if ($parent -eq $root) { break }
  $root = $parent
}
$file = Join-Path $root 'packages\client\middleware\index.ts'
if (!(Test-Path $file)) { throw "Nao encontrei packages\client\middleware\index.ts a partir de $here" }
Write-Host "[OK] Raiz detectada: $root" -ForegroundColor Green
$content = Get-Content $file -Raw
$backup = "$file.antes-hotfix-middleware-v11-3"
if (!(Test-Path $backup)) { Copy-Item $file $backup }
$old = 'export let onRequest = sequence(i18nMiddleware, language);'
$new = 'export let onRequest = sequence(i18nMiddleware as typeof language, language);'
if ($content.Contains($new)) {
  Write-Host '[OK] Middleware ja corrigido.' -ForegroundColor Green
} elseif ($content.Contains($old)) {
  $content = $content.Replace($old, $new)
  Set-Content -Path $file -Value $content -Encoding UTF8
  Write-Host '[OK] Tipagem do middleware corrigida.' -ForegroundColor Green
} else {
  throw 'Linha esperada de onRequest nao encontrada. Nao alterei o arquivo.'
}
Write-Host ''
Write-Host 'Agora rode na raiz: yarn build' -ForegroundColor Cyan
