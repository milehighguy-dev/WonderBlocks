// Optional integration helper for an existing map. The exporter itself only
// writes its download; this script runs when the map author chooses to merge it.
import {SWBF2_AI_MERGE_CHECKS} from './swbf2-navigation-merge-checks.js';
export const SWBF2_AI_MERGE_SCRIPT=String.raw`[CmdletBinding(SupportsShouldProcess)]
param([Parameter(Mandatory)][string]$WorldFile,[string]$LevelReq)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$world = (Resolve-Path -LiteralPath $WorldFile).Path
if ([IO.Path]::GetExtension($world) -ine '.wld') { throw 'WorldFile must be an existing .wld file.' }
$nav = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'source/ai-navigation.json') -Raw | ConvertFrom-Json
$report = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'export-report.json') -Raw | ConvertFrom-Json
$base = Join-Path ([IO.Path]::GetDirectoryName($world)) ([IO.Path]::GetFileNameWithoutExtension($world))
$updates = [Collections.Generic.List[object]]::new()
${SWBF2_AI_MERGE_CHECKS}
function Get-AILevelRequests([string]$Text) {
    $masked=Get-AIMaskedSource $Text -LevelRequest
    $header=[regex]::Match($masked,'^\s*ucft\s*\{')
    if (!$header.Success) {throw 'Level request must begin with a ucft scope.'}
    $depth=0;$quoted=$false;$escaped=$false;$rootEnd=-1;$cursor=$header.Length
    for ($at=0;$at -lt $masked.Length;$at++) {
        $c=$masked[$at]
        if ($quoted) {if ($escaped) {$escaped=$false} elseif ($c -eq '\') {$escaped=$true} elseif ($c -eq '"') {$quoted=$false};continue}
        if ($c -eq '"') {$quoted=$true} elseif ($c -eq '{') {$depth++} elseif ($c -eq '}') {$depth--;if ($depth -eq 0) {$rootEnd=$at+1;break}}
    }
    if ($rootEnd -lt 0 -or $depth -or $quoted) {throw 'Level request has an unclosed scope or quoted string.'}
    if ($masked.Substring($rootEnd) -match '\S') {throw 'Level request has active text outside its ucft scope.'}
    $masked=$masked.Substring(0,$rootEnd)
    foreach ($match in [regex]::Matches($masked,'\bREQN\s*\{')) {
        if ($match.Index -lt $cursor -or $masked.Substring($cursor,$match.Index-$cursor) -match '\S') {throw 'Level request contains nested requests or unexpected source outside REQN blocks.'}
        $end=$match.Index+$match.Length;$depth=1;$quoted=$false;$escaped=$false
        while ($end -lt $masked.Length -and $depth) {
            $c=$masked[$end];$end++
            if ($quoted) {if ($escaped) {$escaped=$false} elseif ($c -eq '\') {$escaped=$true} elseif ($c -eq '"') {$quoted=$false};continue}
            if ($c -eq '"') {$quoted=$true} elseif ($c -eq '{') {$depth++} elseif ($c -eq '}') {$depth--}
        }
        if ($depth) {throw 'Unclosed level request block.'}
        $cursor=$end
        $body=$masked.Substring($match.Index+$match.Length,$end-$match.Index-$match.Length-1)
        $values=@([regex]::Matches($body,'"((?:\\.|[^"\\])*)"') | ForEach-Object {$_.Groups[1].Value})
        if (!$values.Count) {throw 'Level request block has no resource type.'}
        $resources=@($values | Select-Object -Skip 1);$platforms=@($resources | Where-Object {$_ -match '^platform='})
        [pscustomobject]@{Kind=$values[0];Resources=$resources;PC=(!$platforms.Count -or $platforms -icontains 'platform=PC');Start=$match.Index;Length=$end-$match.Index;Text=$Text.Substring($match.Index,$end-$match.Index)}
    }
    if ($masked.Substring($cursor,$rootEnd-1-$cursor) -match '\S') {throw 'Level request contains unexpected source outside REQN blocks.'}
}
foreach ($extension in @('.pln','.bar')) {
    $path = $base + $extension
    $exists = Test-Path -LiteralPath $path
    $oldBytes = [byte[]]@()
    if ($exists) { $oldBytes = [IO.File]::ReadAllBytes($path) }
    $old = if ($exists) { [IO.File]::ReadAllText($path) } else { '' }
    $owned = @(Get-AIBlocks $old | Where-Object {$_.Name.StartsWith($nav.prefix+'_',[StringComparison]::Ordinal)} | ForEach-Object {$_.Name})
    $kept = Remove-AIRecords $old $owned
    $source = if ($extension -eq '.pln') { $report.navigation.planningFile } else { $report.navigation.barrierFile }
    $generated = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $source))
    $text = $kept.Trim() + [Environment]::NewLine + $generated.Trim() + [Environment]::NewLine
    if ($extension -eq '.bar') { $text = Set-AIBarrierCount $text }
    $updates.Add([pscustomobject]@{Path=$path;Existed=$exists;OldBytes=$oldBytes;Text=$text})
}
$diagnostics = Test-AIMergedNavigation $updates[0].Text $updates[1].Text $nav.prefix
if ($diagnostics.SuppressedGeneratedBarriers.Count) { $updates[1].Text = Set-AIBarrierCount (Remove-AIRecords $updates[1].Text $diagnostics.SuppressedGeneratedBarriers) }
foreach ($warning in $diagnostics.Warnings) { Write-Warning $warning }
$mergeReport = $base+'_wonderblocks-ai-'+$nav.prefix+'.json'
$reportExists = Test-Path -LiteralPath $mergeReport
$reportBytes = [byte[]]@();if ($reportExists) {$reportBytes=[IO.File]::ReadAllBytes($mergeReport)}
$updates.Add([pscustomobject]@{Path=$mergeReport;Existed=$reportExists;OldBytes=$reportBytes;Text=($diagnostics | ConvertTo-Json -Depth 6)})
$worldName = [IO.Path]::GetFileNameWithoutExtension($world)
$reqPaths = @()
if ($LevelReq) { $reqPaths = @((Resolve-Path -LiteralPath $LevelReq).Path) }
else { $reqPaths = @(Get-ChildItem -LiteralPath ([IO.Path]::GetDirectoryName($world)) -Filter '*.req' | Where-Object {@(Get-AILevelRequests ([IO.File]::ReadAllText($_.FullName)) | Where-Object {$_.Kind -ieq 'world' -and $_.PC -and $_.Resources -icontains $worldName}).Count} | ForEach-Object {$_.FullName}) }
foreach ($path in $reqPaths) {
    $text = [IO.File]::ReadAllText($path)
    $requests=@(Get-AILevelRequests $text)
    $worldRequest=@($requests | Where-Object {$_.Kind -ieq 'world' -and $_.PC -and $_.Resources -icontains $worldName} | Select-Object -First 1)
    if (!$worldRequest.Count) { throw ('Level request does not refer to this PC world: ' + $path) }
    $worldStart=$worldRequest[0].Start
    $planning=@($requests | Where-Object {$_.Kind -ieq 'congraph' -and $_.PC -and $_.Resources -icontains $worldName} | Select-Object -First 1)
    if ($planning.Count -and $planning[0].Start -lt $worldStart) {continue}
    $newline=[regex]::Match($text,"\r\n|\n|\r").Value;if (!$newline) {$newline=[Environment]::NewLine}
    $lineStart=$text.LastIndexOf([char]10,[Math]::Max(0,$worldStart-1))+1
    $indent=$text.Substring($lineStart,$worldStart-$lineStart);if ($indent -match '\S') {$indent=''}
    if ($planning.Count) {$request=$planning[0].Text;$text=$text.Remove($planning[0].Start,$planning[0].Length)}
    else {$request='REQN'+$newline+$indent+'{'+$newline+$indent+'    "congraph"'+$newline+$indent+'    "'+$worldName+'"'+$newline+$indent+'}'}
    $updates.Add([pscustomobject]@{Path=$path;Existed=$true;OldBytes=[IO.File]::ReadAllBytes($path);Text=$text.Insert($worldStart,$request+$newline+$indent)})
}
if (!$PSCmdlet.ShouldProcess($base,'Merge generated planning and AI barriers (existing entries retained, previous export for this scene replaced)')) { return }
$backup = Join-Path ([IO.Path]::GetDirectoryName($world)) ('wonderblocks-ai-backup_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $backup | Out-Null
foreach ($update in $updates) { if ($update.Existed) { [IO.File]::WriteAllBytes((Join-Path $backup ([IO.Path]::GetFileName($update.Path))),$update.OldBytes) } }
$encoding = [Text.UTF8Encoding]::new($false)
try { foreach ($update in $updates) { [IO.File]::WriteAllText($update.Path,$update.Text,$encoding) } }
catch {
    foreach ($update in $updates) {
        if ($update.Existed) { [IO.File]::WriteAllBytes($update.Path,$update.OldBytes) }
        elseif (Test-Path -LiteralPath $update.Path) { Remove-Item -LiteralPath $update.Path }
    }
    throw
}
Write-Host ('Merged generated infantry planning and barriers. Backup: ' + $backup)
Write-Host ('Navigation merge report: '+$mergeReport)
if (!$reqPaths.Count) { Write-Warning ('No matching level .req was found. Its REQN must include "congraph" "' + $worldName + '". Pass -LevelReq to merge that request automatically.') }
Write-Host 'Re-munge the world and planning. No game was launched or installed.'
`;
