$ErrorActionPreference = 'Stop'
try {
  $studioNode = Get-Command node -ErrorAction SilentlyContinue
  $studioNodePath = if ($studioNode) { $studioNode.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
  if (-not (Test-Path -LiteralPath $studioNodePath)) { throw 'Node.js is required. Install Node.js 22 or later, then launch again.' }
  $studioRunning = $false
  try { $studioRunning = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4178/health' -TimeoutSec 2).Content -eq 'open-building-studio-v1' } catch {}
  if (-not $studioRunning) {
    $studioProcess = Start-Process -FilePath $studioNodePath -ArgumentList ('"' + (Join-Path $PSScriptRoot 'server.cjs') + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
    $studioProcess.Id | Set-Content -LiteralPath (Join-Path $PSScriptRoot '.server.pid')
    for ($studioAttempt = 0; $studioAttempt -lt 20; $studioAttempt++) {
      Start-Sleep -Milliseconds 250
      try { $studioRunning = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4178/health' -TimeoutSec 1).Content -eq 'open-building-studio-v1' } catch {}
      if ($studioRunning) { break }
    }
    if (-not $studioRunning) { throw 'Could not start the local server. Port 4178 may be in use.' }
  }
  Start-Process 'http://127.0.0.1:4178'
} catch { Write-Host $_ -ForegroundColor Red; Read-Host 'Press Enter to close' }
