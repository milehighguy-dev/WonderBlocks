$studioPidFile = Join-Path $PSScriptRoot '.server.pid'
if (Test-Path -LiteralPath $studioPidFile) {
  $studioRecordedPid = [int](Get-Content -LiteralPath $studioPidFile)
  $studioServer = Get-CimInstance Win32_Process -Filter "ProcessId = $studioRecordedPid" -ErrorAction SilentlyContinue
  $studioExpected = Join-Path $PSScriptRoot 'server.cjs'
  if ($studioServer -and $studioServer.Name -eq 'node.exe' -and $studioServer.CommandLine.Contains($studioExpected)) {
    Stop-Process -Id $studioRecordedPid
  }
}
