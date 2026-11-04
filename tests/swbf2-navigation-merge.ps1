[CmdletBinding()]
param([Parameter(Mandatory)][string]$PackagePath,[string]$NativeToolsPath)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$package=(Resolve-Path -LiteralPath $PackagePath).Path
$helper=Join-Path $package 'merge-ai-navigation.ps1'
$nav=Get-Content -LiteralPath (Join-Path $package 'source/ai-navigation.json') -Raw | ConvertFrom-Json
if ($nav.hubs.Count -ne 2 -or $nav.connections.Count -ne 1 -or $nav.barriers.Count -lt 1) {throw 'Use the two-hub small-platform validation package for this integration test.'}
$root=Join-Path $package ('_merge-fixtures_'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
$encoding=[Text.UTF8Encoding]::new($false)
function Write-Source([string]$Path,[string]$Text) {[IO.File]::WriteAllText($Path,$Text,$encoding)}
function Assert-True([bool]$Value,[string]$Message) {if (!$Value) {throw $Message}}
function New-Fixture([string]$Name) {
    $folder=Join-Path $root $Name;New-Item -ItemType Directory -Path $folder | Out-Null
    $world=Join-Path $folder 'fixture.wld';Write-Source $world "Version(3);`nSaveType(0);`nNextSequence(1);`n"
    return $world
}
function Report-Path([string]$World) {return (Join-Path ([IO.Path]::GetDirectoryName($World)) ([IO.Path]::GetFileNameWithoutExtension($World)))+'_wonderblocks-ai-'+$nav.prefix+'.json'}
function Number-Text([double]$Value) {return $Value.ToString('R',[Globalization.CultureInfo]::InvariantCulture)}
function Hub-Text([string]$Name,[double[]]$Point,[double]$Radius=.4) {return 'Hub ( "'+$Name+'" ) { Pos('+ (($Point | ForEach-Object {Number-Text $_}) -join ',')+'); Radius('+(Number-Text $Radius)+'); }'}

$world=New-Fixture 'protected-existing-navigation'
$corners=$nav.barriers[0].corners;$cx=($corners | ForEach-Object {$_[0]} | Measure-Object -Average).Average;$cz=($corners | ForEach-Object {$_[2]} | Measure-Object -Average).Average
$dx=$corners[1][0]-$corners[0][0];$dz=$corners[1][2]-$corners[0][2];$length=[Math]::Sqrt($dx*$dx+$dz*$dz);$nx=-$dz/$length;$nz=$dx/$length
$a=[double[]]@(($cx+$nx*2),10,($cz+$nz*2));$b=[double[]]@(($cx-$nx*2),10,($cz-$nz*2))
$stock=(Hub-Text 'stock_a' $a)+(Hub-Text 'stock_b' $b)+@'

Connection ( "stock_link" ) { Start("stock_a"); End("stock_b"); Flag(3); }
'@
Write-Source ([IO.Path]::ChangeExtension($world,'.pln')) $stock
$p=$nav.hubs[0].position;$stockBar='BarrierCount(1); Barrier("stock_bar") { Corner('+(Number-Text ($p[0]-.1))+',0,'+(Number-Text ($p[2]-.1))+'); Corner('+(Number-Text ($p[0]+.1))+',0,'+(Number-Text ($p[2]-.1))+'); Corner('+(Number-Text ($p[0]+.1))+',0,'+(Number-Text ($p[2]+.1))+'); Corner('+(Number-Text ($p[0]-.1))+',0,'+(Number-Text ($p[2]+.1))+'); Flag(3); }'
Write-Source ([IO.Path]::ChangeExtension($world,'.bar')) $stockBar
$req=@'
ucft
{
    REQN { "world" "fixture" }
}
// REQN { "congraph" "fixture" }
// A trailing comment with }
'@
Write-Source ([IO.Path]::ChangeExtension($world,'.req')) $req
$beforePlan=[IO.File]::ReadAllBytes([IO.Path]::ChangeExtension($world,'.pln'))
$beforeBar=[IO.File]::ReadAllBytes([IO.Path]::ChangeExtension($world,'.bar'))
& $helper -WorldFile $world -WhatIf
Assert-True ([Convert]::ToBase64String($beforePlan) -eq [Convert]::ToBase64String([IO.File]::ReadAllBytes([IO.Path]::ChangeExtension($world,'.pln')))) 'WhatIf changed planning.'
Assert-True (!(Test-Path -LiteralPath (Report-Path $world))) 'WhatIf wrote a merge report.'
Assert-True (@(Get-ChildItem -LiteralPath ([IO.Path]::GetDirectoryName($world)) -Directory).Count -eq 0) 'WhatIf created backups.'
& $helper -WorldFile $world
$mergedPlan=[IO.File]::ReadAllText([IO.Path]::ChangeExtension($world,'.pln'));$mergedBar=[IO.File]::ReadAllText([IO.Path]::ChangeExtension($world,'.bar'));$mergedReq=[IO.File]::ReadAllText([IO.Path]::ChangeExtension($world,'.req'))
$report=Get-Content -LiteralPath (Report-Path $world) -Raw | ConvertFrom-Json
Assert-True ($report.Hubs -eq 4 -and $report.Connections -eq 2) 'Live source counts included commented examples or lost entries.'
Assert-True ($report.SuppressedGeneratedBarriers -contains $nav.barriers[0].name) 'A generated barrier obstructing a stock connection was not omitted.'
Assert-True ($report.ExistingBarrierConflicts.Count -eq 1) 'Existing barrier conflict was not reported.'
Assert-True ($mergedPlan.Contains($stock.Trim())) 'Stock planning or comments were changed.'
Assert-True ($mergedBar.Contains('stock_bar') -and !$mergedBar.Contains($nav.barriers[0].name)) 'Stock barrier preservation or generated suppression failed.'
Assert-True (([regex]::Matches($mergedReq,'"congraph"')).Count -eq 2) 'A commented graph request prevented insertion of a live request.'
Assert-True ($mergedReq.IndexOf('"congraph"') -lt $mergedReq.IndexOf('"world"')) 'Generated planning must load before its world.'
$backup=Get-ChildItem -LiteralPath ([IO.Path]::GetDirectoryName($world)) -Directory | Select-Object -First 1
Assert-True ([Convert]::ToBase64String($beforePlan) -eq [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $backup.FullName 'fixture.pln')))) 'Planning backup differs from the original bytes.'
Assert-True ([Convert]::ToBase64String($beforeBar) -eq [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $backup.FullName 'fixture.bar')))) 'Barrier backup differs from the original bytes.'
& $helper -WorldFile $world
Assert-True ($mergedPlan -eq [IO.File]::ReadAllText([IO.Path]::ChangeExtension($world,'.pln'))) 'Repeated merge duplicated or changed generated planning.'
Assert-True ($mergedBar -eq [IO.File]::ReadAllText([IO.Path]::ChangeExtension($world,'.bar'))) 'Repeated merge duplicated or changed barriers.'
Assert-True ($mergedReq -eq [IO.File]::ReadAllText([IO.Path]::ChangeExtension($world,'.req'))) 'Repeated merge duplicated the graph request.'

foreach ($kind in @('late-existing-graph','console-only-graph','correct-existing-order')) {
    $world=New-Fixture $kind
    $planBlock='REQN { "congraph" "fixture" }';$worldBlock='REQN { "world" "fixture" }'
    $text=if ($kind -eq 'late-existing-graph') {"ucft`n{`n    $worldBlock`n    $planBlock`n}`n"} elseif ($kind -eq 'console-only-graph') {"ucft`n{`n    REQN { `"congraph`" `"platform=ps2`" `"fixture`" }`n    $worldBlock`n}`n"} else {"ucft`n{`n    $planBlock`n    $worldBlock`n}`n"}
    $reqFile=[IO.Path]::ChangeExtension($world,'.req');Write-Source $reqFile $text
    & $helper -WorldFile $world
    $updated=[IO.File]::ReadAllText($reqFile)
    Assert-True ($updated.IndexOf($planBlock) -ge 0 -or $kind -eq 'console-only-graph') 'Existing planning block was lost.'
    $pcPlan=[regex]::Match($updated,'REQN\s*\{\s*"congraph"\s*"fixture"\s*\}')
    Assert-True ($pcPlan.Success -and $pcPlan.Index -lt $updated.IndexOf($worldBlock)) ('Planning still follows world in '+$kind)
    if ($kind -eq 'correct-existing-order') {Assert-True ($updated -eq $text) 'An already correct request was needlessly rewritten.'}
    if ($kind -eq 'console-only-graph') {Assert-True ($updated.Contains('"platform=ps2"')) 'Console request was changed.'}
    & $helper -WorldFile $world
    Assert-True ($updated -eq [IO.File]::ReadAllText($reqFile)) ('Reordering is not idempotent: '+$kind)
}

foreach ($invalid in @('ucft { REQN { "world" "fixture" }','ucft { REQN { "world" "fixture" } }}','ucft { REQN { "world" "fixture } }','ucft {} REQN { "world" "fixture" }','ucft { "ignored" REQN { "world" "fixture" } }','ucft { REQN { "world" "fixture" } REQN { REQN { "congraph" "fixture" } } }')) {
    $world=New-Fixture ('invalid-request-'+[guid]::NewGuid().ToString('N').Substring(0,6));$reqFile=[IO.Path]::ChangeExtension($world,'.req');Write-Source $reqFile $invalid;$failed=$false
    try {& $helper -WorldFile $world -LevelReq $reqFile} catch {$failed=$true}
    Assert-True $failed 'Malformed level request was accepted.'
    Assert-True ([IO.File]::ReadAllText($reqFile) -eq $invalid) 'Rejected level request was changed.'
    Assert-True (!(Test-Path -LiteralPath ([IO.Path]::ChangeExtension($world,'.pln')))) 'Rejected level request wrote planning.'
    Assert-True (@(Get-ChildItem -LiteralPath ([IO.Path]::GetDirectoryName($world)) -Directory).Count -eq 0) 'Rejected level request created backups.'
}

foreach ($extension in @('.pln','.bar','.req')) {
    $world=New-Fixture ('unsupported-comment-'+$extension.Substring(1));$path=[IO.Path]::ChangeExtension($world,$extension)
    $text=if ($extension -eq '.req') {'ucft { /* inactive request */ REQN { "world" "fixture" } }'} else {'/* inactive navigation */'}
    Write-Source $path $text;$message='';try {& $helper -WorldFile $world} catch {$message=$_.Exception.Message}
    Assert-True ($message -like '*do not support*block comments*') ('Native-incompatible comment was accepted in '+$extension)
    Assert-True ([IO.File]::ReadAllText($path) -eq $text) 'Rejected block comment was modified.'
    Assert-True (@(Get-ChildItem -LiteralPath ([IO.Path]::GetDirectoryName($world)) -Directory).Count -eq 0) 'Rejected block comment created backups.'
}

foreach ($extension in @('.pln','.bar','.req')) {
    $world=New-Fixture ('unsupported-line-comment-'+$extension.Substring(1));$path=[IO.Path]::ChangeExtension($world,$extension);$text=if ($extension -eq '.req') {"ucft {`n// inactive request`n}"} else {'// inactive navigation'}
    Write-Source $path $text;$message='';try {& $helper -WorldFile $world} catch {$message=$_.Exception.Message}
    Assert-True ($message -like '*do not support // comments*') ('Native-incompatible line comment was accepted in '+$extension)
    Assert-True ([IO.File]::ReadAllText($path) -eq $text) 'Rejected line comment was modified.'
    Assert-True (@(Get-ChildItem -LiteralPath ([IO.Path]::GetDirectoryName($world)) -Directory).Count -eq 0) 'Rejected line comment created backups.'
}

foreach ($kind in @('missing-reference','native-hub-limit','native-degree-limit','branch-weight-reference')) {
    $world=New-Fixture $kind;$source=''
    if ($kind -eq 'missing-reference') {$source=(Hub-Text 'valid' ([double[]]@(100,0,100)))+'Connection("bad") { Start("valid"); End("missing"); Flag(3); }'}
    elseif ($kind -eq 'native-hub-limit') {for ($i=0;$i -lt 255;$i++) {$source+=(Hub-Text ('s'+$i) ([double[]]@(100,0,$i)))}}
    elseif ($kind -eq 'native-degree-limit') {for ($i=0;$i -lt 10;$i++) {$source+=(Hub-Text ('s'+$i) ([double[]]@(100,0,$i)))};for ($i=1;$i -lt 10;$i++) {$source+='Connection("c'+$i+'") { Start("s0"); End("s'+$i+'"); Flag(3); }'}}
    else {$source=(Hub-Text 'valid' ([double[]]@(100,0,100))).Replace('Radius(0.4);','Radius(0.4); BranchWeight("missing",1,"missing",1);')}
    $path=[IO.Path]::ChangeExtension($world,'.pln');Write-Source $path $source;$failed=$false
    try {& $helper -WorldFile $world} catch {$failed=$true}
    Assert-True $failed ('Unsafe merge was accepted: '+$kind)
    Assert-True ([IO.File]::ReadAllText($path) -eq $source) ('Failed merge changed source: '+$kind)
    Assert-True (!(Test-Path -LiteralPath ([IO.Path]::ChangeExtension($world,'.bar')))) ('Failed merge wrote a barrier file: '+$kind)
    Assert-True (@(Get-ChildItem -LiteralPath ([IO.Path]::GetDirectoryName($world)) -Directory).Count -eq 0) ('Failed merge created backups: '+$kind)
}
if ($NativeToolsPath) {
    $nativeRoot=Join-Path $package ('_native-merge_'+[guid]::NewGuid().ToString('N').Substring(0,8));$caseIndex=0
    foreach ($name in @('protected-existing-navigation','late-existing-graph','correct-existing-order','console-only-graph')) {
        $source=Join-Path $root $name;$fixture=Join-Path $nativeRoot ($caseIndex++).ToString();$output=Join-Path $fixture 'compiled'
        New-Item -ItemType Directory -Path $output -Force | Out-Null
        foreach ($extension in @('.wld','.pln','.bar','.req')) {Copy-Item -LiteralPath (Join-Path $source ('fixture'+$extension)) -Destination $fixture}
        Push-Location $output
        try {
            foreach ($entry in @(@('WorldMunge.exe','fixture.wld'),@('PathPlanningMunge.exe','fixture.pln'),@('LevelPack.exe','fixture.req'))) {
                & (Join-Path $NativeToolsPath $entry[0]) -inputfile $entry[1] -platform PC -sourcedir $fixture -inputdir $output -outputdir $output -continue
                Assert-True ($LASTEXITCODE -eq 0) ('Native compiler failed: '+$entry[0])
                $log=Join-Path $output ([IO.Path]::GetFileNameWithoutExtension($entry[0])+'.log');$summaries=[regex]::Matches([IO.File]::ReadAllText($log),'(\d+)\s+Errors\s+(\d+)\s+Warnings')
                Assert-True ($summaries.Count -gt 0 -and [int]$summaries[$summaries.Count-1].Groups[1].Value -eq 0) ('Native compilation errors: '+$log)
            }
            $graph=[IO.File]::ReadAllBytes((Join-Path $output 'fixture.congraph'));$hubs=[BitConverter]::ToUInt16($graph,24);$connections=[BitConverter]::ToUInt16($graph,26)
            Assert-True ($hubs -eq $(if ($name -eq 'protected-existing-navigation') {4}else{2}) -and $connections -eq $(if ($name -eq 'protected-existing-navigation') {2}else{1})) ('Native graph lost records: '+$name)
            $worldText=[Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes((Join-Path $output 'fixture.world')))
            foreach ($barrier in [regex]::Matches([IO.File]::ReadAllText((Join-Path $fixture 'fixture.bar')),'\bBarrier\s*\(\s*"([^"]+)"')) {Assert-True ($worldText.Contains($barrier.Groups[1].Value+[char]0)) ('Native barrier name was lost: '+$barrier.Groups[1].Value)}
            $level=[IO.File]::ReadAllBytes((Join-Path $output 'fixture.lvl'));$tags=@();$offset=8
            while ($offset+8 -le $level.Length) {
                $length=[BitConverter]::ToUInt32($level,$offset+4);Assert-True ([long]$offset+8+$length -le $level.Length) 'Invalid packed merge fixture.'
                $tags+=[Text.Encoding]::ASCII.GetString($level,$offset,4);$offset=[int](($offset+8+[long]$length+3) -band -4)
            }
            Assert-True ([Array]::IndexOf($tags,'plan') -ge 0 -and [Array]::IndexOf($tags,'wrld') -gt [Array]::IndexOf($tags,'plan')) 'Native planning did not load before its world.'
        } finally {Pop-Location}
    }
    Write-Host ('Passed native planning/barrier compilation and packed load-order checks: '+$nativeRoot)
}
Write-Host ('Passed navigation merge integration checks. Reviewable fixtures: '+$root)
