<#
.SYNOPSIS
    Programming Adventure push: stage -> commit -> push to origin (GitHub Pages serves code.jacobsiler.com).

.DESCRIPTION
    Run by push.cmd (double-click).
      1. Refuses to continue if a secret-looking file is about to be committed.
      2. Fetches origin; if origin is ahead, rebases (never force-pushes).
      3. git add -A (respects .gitignore), commits with .pending-commit.txt if present
         (otherwise an automatic message), then pushes the current branch.
    Exit codes: 0 = pushed or nothing to push, 1 = failed, 2 = blocked by the secret guard, 3 = content tests failed.
    ASCII-only on purpose so Windows PowerShell 5.1 reads it correctly.
#>
param([switch]$Quiet)

$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repo
$logDir = Join-Path $repo 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$logFile = Join-Path $logDir 'push.log'

function Log([string]$m, [string]$c = 'Gray') {
    $line = ('{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m)
    try { Add-Content -Path $logFile -Value $line } catch {}
    if (-not $Quiet) { Write-Host $line -ForegroundColor $c }
}
function Done([int]$code) {
    if (-not $Quiet -and -not $env:PG_NO_PAUSE) { Write-Host ''; Read-Host 'Press Enter to close' | Out-Null }
    exit $code
}
function Run-Git([string[]]$gitArgs) {
    $o = & git @gitArgs 2>&1
    $script:gc = $LASTEXITCODE
    foreach ($l in $o) { $t = "$l".Trim(); if ($t) { Log ('  git: ' + $t) 'DarkGray' } }
    return $o
}

Log '=== Programming Adventure push ===' 'Cyan'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Log 'git is not on PATH.' 'Red'; Done 1 }
$ghOwner = 'JacobDSiler'; $ghRepo = 'programming-adventure'
$null = & git rev-parse --is-inside-work-tree 2>&1
if ($LASTEXITCODE -ne 0) {
    Log 'First run: setting up the git repository (git init + origin).' 'Yellow'
    $null = Run-Git @('init', '-b', 'main')
    if ($script:gc -ne 0) { Log 'git init failed.' 'Red'; Done 1 }
}
$null = & git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) { $null = Run-Git @('remote', 'add', 'origin', "https://github.com/$ghOwner/$ghRepo.git") }
# Commits need an identity; only set a local fallback if none is configured.
if (-not ((& git config user.name 2>$null | Out-String).Trim())) { $null = Run-Git @('config', 'user.name', 'Jacob Siler') }
if (-not ((& git config user.email 2>$null | Out-String).Trim())) { $null = Run-Git @('config', 'user.email', 'silertechireland@gmail.com') }

# Helper: GitHub API call using the token Git Credential Manager already holds (nothing is stored or logged).
function Get-GhToken {
    try {
        $o = ("protocol=https`nhost=github.com`n`n" | & git credential fill 2>$null)
        foreach ($l in $o) { if ($l -match '^password=(.+)$') { return $Matches[1] } }
    } catch {}
    return $null
}
function Gh-Api([string]$method, [string]$path, $body) {
    $tok = Get-GhToken
    if (-not $tok) { return $null }
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $h = @{ Authorization = "Bearer $tok"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'pg-push' }
        if ($body) { return Invoke-RestMethod -Method $method -Uri ("https://api.github.com" + $path) -Headers $h -Body ($body | ConvertTo-Json -Compress) -ContentType 'application/json' }
        return Invoke-RestMethod -Method $method -Uri ("https://api.github.com" + $path) -Headers $h
    } catch { Log ('  github api: ' + $_.Exception.Message) 'DarkGray'; return $null }
}
$branch = ((& git symbolic-ref --short HEAD 2>$null) | Out-String).Trim()
if (-not $branch) { $branch = 'main' }
Log "Repo: $repo   Branch: $branch"

# 0. Content tests (only if node is installed and tests exist). A failing test blocks the push so a broken level never ships.
if ((Test-Path (Join-Path $repo 'test\run-all.mjs')) -and (Get-Command node -ErrorAction SilentlyContinue)) {
    $to = & node (Join-Path $repo 'test\run-all.mjs') 2>&1
    if ($LASTEXITCODE -ne 0) {
        Log 'BLOCKED: tests failed. Nothing was pushed.' 'Red'
        foreach ($l in ($to | Select-Object -Last 15)) { Log ('  test: ' + $l) 'Red' }
        Done 3
    }
    Log 'Tests passed.' 'DarkGray'
}

# 1. Secret guard: look at everything git would add.
$secretPattern = '(^|/)(\.secrets/|\.env($|\.)|tokens\.json|credentials|serviceAccount|[^/]*service-account[^/]*\.json|[^/]*\.(pem|key|keystore|jks|p12)$|firebase-adminsdk|\.netlify/)'
$changed = @(& git status --porcelain --untracked-files=all 2>$null | ForEach-Object { ($_.Substring(3)).Trim('"') })
$bad = @($changed | Where-Object { $_ -imatch $secretPattern })
if ($bad.Count -gt 0) {
    Log 'BLOCKED: these files look like secrets and will NOT be committed:' 'Red'
    foreach ($b in $bad) { Log "  $b" 'Red' }
    Log 'Add them to .gitignore (or delete them), then push again.' 'Yellow'
    Done 2
}

# 2. Sync with origin (no force pushes, ever).
$null = Run-Git @('fetch', 'origin')
if ($script:gc -ne 0) {
    Log 'git fetch failed - checking whether the GitHub repo exists yet...' 'Yellow'
    $exists = Gh-Api 'GET' "/repos/$ghOwner/$ghRepo" $null
    if (-not $exists) {
        $made = Gh-Api 'POST' '/user/repos' @{ name = $ghRepo; description = 'Programming Adventure - homeschool coding for K-12'; private = $false; auto_init = $false }
        if ($made) { Log "Created GitHub repo $ghOwner/$ghRepo." 'Green'; Start-Sleep -Seconds 3 }
        else { Log 'Could not create the GitHub repo automatically. Create an EMPTY public repo named programming-adventure at github.com/new, then push again.' 'Red'; Done 1 }
    }
    $null = Run-Git @('fetch', 'origin')
}
# First run on a brand-new local repo: if GitHub already has history, adopt it (keeps your files).
$null = & git rev-parse --verify HEAD 2>$null
$hasLocal = ($LASTEXITCODE -eq 0)
$null = & git rev-parse --verify "origin/$branch" 2>$null
$hasRemote = ($LASTEXITCODE -eq 0)
if (-not $hasLocal -and $hasRemote) {
    Log 'First run: adopting existing GitHub history (your files are kept).' 'Yellow'
    $null = Run-Git @('reset', '--mixed', "origin/$branch")
}
$behind = 0
$cnt = (& git rev-list --count "HEAD..origin/$branch" 2>$null | Out-String).Trim()
if ($cnt -match '^\d+$') { $behind = [int]$cnt }
if ($behind -gt 0) {
    Log "origin/$branch is $behind commit(s) ahead - rebasing first." 'Yellow'
    $null = Run-Git @('pull', '--rebase', '--autostash', 'origin', $branch)
    if ($script:gc -ne 0) {
        $null = Run-Git @('rebase', '--abort')
        Log 'Rebase failed (conflict). Nothing was pushed. Resolve it by hand, then push again.' 'Red'
        Done 1
    }
}

# 3. Stage + commit.
$null = Run-Git @('add', '-A')
$null = & git diff --cached --quiet
$hasStaged = ($LASTEXITCODE -ne 0)
if ($hasStaged) {
    $pending = Join-Path $repo '.pending-commit.txt'
    if (Test-Path $pending) {
        $null = Run-Git @('commit', '-F', $pending)
        Remove-Item $pending -Force -ErrorAction SilentlyContinue
    } else {
        $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
        $null = Run-Git @('commit', '-m', "Update Programming Adventure ($stamp)")
    }
    if ($script:gc -ne 0) { Log 'Commit failed.' 'Red'; Done 1 }
} else {
    Log 'No new file changes to commit.'
}

# 4. Push if there is anything origin does not have.
$ahead = 0
$null = & git rev-parse --verify "origin/$branch" 2>$null
if ($LASTEXITCODE -eq 0) { $range = "origin/$branch..HEAD" } else { $range = 'HEAD' }   # no remote branch yet = first push
$cnt = (& git rev-list --count $range 2>$null | Out-String).Trim()
if ($cnt -match '^\d+$') { $ahead = [int]$cnt }
if ($ahead -eq 0) { Log 'Nothing to push - GitHub is already up to date.' 'Green'; Done 0 }
Log "Pushing $ahead commit(s) to origin/$branch ..." 'Cyan'
$null = Run-Git @('push', '-u', 'origin', $branch)
if ($script:gc -ne 0) { Log 'Push failed. The commit is safe locally; fix the error above and push again.' 'Red'; Done 1 }
Log 'Pushed. GitHub Pages redeploys code.jacobsiler.com in about a minute.' 'Green'
# Make sure Pages is switched on (harmless if it already is).
$pg = Gh-Api 'GET' "/repos/$ghOwner/$ghRepo/pages" $null
if (-not $pg) { $null = Gh-Api 'POST' "/repos/$ghOwner/$ghRepo/pages" @{ source = @{ branch = 'main'; path = '/' } }; Log 'Requested GitHub Pages (branch main, root).' 'DarkGray' }
Done 0
