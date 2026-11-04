[CmdletBinding()]
param([Parameter(Mandatory)][string]$PackagePath)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$package=(Resolve-Path -LiteralPath $PackagePath).Path
$report=Get-Content -LiteralPath (Join-Path $package 'export-report.json') -Raw | ConvertFrom-Json
$fixture=Join-Path $package ('_preflight-fixture_'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixture | Out-Null
foreach ($relative in $report.files) {
    $source=[IO.Path]::GetFullPath((Join-Path $package $relative));$target=[IO.Path]::GetFullPath((Join-Path $fixture $relative))
    if (!$source.StartsWith($package+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or !$target.StartsWith($fixture+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) {throw 'Fixture paths must stay inside their package.'}
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
    Copy-Item -LiteralPath $source -Destination $target
}
Copy-Item -LiteralPath (Join-Path $package 'validate-swbf2.ps1') -Destination (Join-Path $fixture 'validate-swbf2.ps1')
foreach ($relative in @('msh/stale.msh','msh/stale.tga','odf/stale.odf','world1/stale.req','world1/stale.pln','world1/stale.bar','world1/stale.wld','world1/stale.lyr','world1/stale.ldx')) {
    $extra=Join-Path $fixture $relative;[IO.File]::WriteAllText($extra,'stale fixture')
    $message='';try {& (Join-Path $fixture 'validate-swbf2.ps1') -ToolsPath (Join-Path $fixture 'no-compilers')} catch {$message=$_.Exception.Message}
    if ($message -notlike ('Unexpected source file: '+$relative+'*new empty folder*')) {throw ('Wrong stale-file diagnostic: '+$message)}
    if (Test-Path -LiteralPath (Join-Path $fixture '_validation')) {throw 'Stale-file rejection ran a compiler or created output.'}
    Remove-Item -LiteralPath $extra
}
# Optional compiler settings for an existing asset remain valid.
$mesh=@($report.files | Where-Object {$_ -like 'msh/*.msh'})[0]
[IO.File]::WriteAllText((Join-Path $fixture ($mesh+'.option')),'-donotmergecollision')
$message='';try {& (Join-Path $fixture 'validate-swbf2.ps1') -ToolsPath (Join-Path $fixture 'no-compilers')} catch {$message=$_.Exception.Message}
if ($message -notlike 'Missing Mod Tools compiler:*') {throw ('Valid source did not pass preflight: '+$message)}
Write-Host ('Passed package preflight checks without running a compiler. Fixtures: '+$fixture)
