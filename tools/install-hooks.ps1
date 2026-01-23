Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Fail($m,$c=80){ Write-Error $m; exit $c }

$root = (& git rev-parse --show-toplevel 2>$null).Trim()
if (-not $root) { Fail "Not in a git repo" 81 }

Set-Location $root

$hooks = '.githooks'
if (-not (Test-Path $hooks)) { Fail "Missing .githooks" 82 }

foreach ($f in 'wfsl-hook.ps1','pre-commit.cmd','pre-push.cmd') {
  if (-not (Test-Path (Join-Path $hooks $f))) {
    Fail "Missing hook file: $f" 83
  }
}

git config core.hooksPath '.githooks'

if ((git config --get core.hooksPath) -ne '.githooks') {
  Fail "Failed to set core.hooksPath" 84
}

Write-Host "WFSL hooks installed successfully"
exit 0
