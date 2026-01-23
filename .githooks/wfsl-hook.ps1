# WFSL Repo Guard – Canonical Git Hook
# Deterministic. Non-interactive. Non-admin safe.
# Delegates all governance decisions to ProofGate.

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Fail([string]$Message, [int]$Code = 90) {
    Write-Error $Message
    exit $Code
}

function Resolve-GitRoot {
    try {
        $root = (& git rev-parse --show-toplevel 2>$null).Trim()
        if ($root) { return $root }
    } catch {}
    return $null
}

function Resolve-Manifest([string]$GitRoot) {
    $m = Join-Path $GitRoot 'proofgate.manifest.json'
    if (Test-Path $m) { return $m }
    Fail "WFSL: proofgate.manifest.json missing at repo root" 91
}

function Resolve-ProofGate([string]$GitRoot) {
    if ($env:WFSL_PROOFGATE_ENTRY -and (Test-Path $env:WFSL_PROOFGATE_ENTRY)) {
        return $env:WFSL_PROOFGATE_ENTRY
    }

    $local = Join-Path $GitRoot 'node_modules\wfsl-proofgate-cli\dist\index.js'
    if (Test-Path $local) { return $local }

    $parent = Split-Path -Parent $GitRoot
    if ($parent) {
        $sibling = Join-Path $parent 'wfsl-proofgate-cli\dist\index.js'
        if (Test-Path $sibling) { return $sibling }
    }

    Fail "WFSL: ProofGate CLI not found. Set WFSL_PROOFGATE_ENTRY." 92
}

# ---------- Entry ----------

$HookMode = $args[0]
if (-not $HookMode) { $HookMode = 'pre-commit' }

$gitRoot = Resolve-GitRoot
if (-not $gitRoot) { Fail "WFSL: not inside a git repository" 93 }

$manifest = Resolve-Manifest $gitRoot
$proofGate = Resolve-ProofGate $gitRoot

# Execute ProofGate (status only, JSON output)
$cmd = @(
    'node',
    "`"$proofGate`"",
    'status',
    '--manifest',
    "`"$manifest`""
)

$out = & $cmd[0] $cmd[1] $cmd[2] $cmd[3] $cmd[4] 2>$null
if (-not $out) {
    Fail "WFSL: ProofGate produced no output" 94
}

# Parse JSON strictly
try {
    $json = $out | ConvertFrom-Json
} catch {
    Fail "WFSL: ProofGate returned non-JSON output:`n$out" 95
}

# Normalise verdict shape
$verdict = if ($json.repoGuard) { $json.repoGuard } else { $json }

if (-not $verdict.repoState) {
    Fail "WFSL: Invalid ProofGate verdict structure" 96
}

if ($verdict.repoState -ne 'VALID') {
    $detail = ($verdict | ConvertTo-Json -Depth 6)
    Fail "WFSL BLOCKED ($HookMode): Repo Guard verdict INVALID`n$detail" 97
}

# Allow operation
exit 0
