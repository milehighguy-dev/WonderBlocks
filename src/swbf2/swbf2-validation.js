// Development/test utility, never included in exported packages. Compiles into a fresh folder;
// it never launches the game, edits a map, or runs a deployment script.
export const SWBF2_VALIDATION_SCRIPT=String.raw`[CmdletBinding()]
param([string]$ToolsPath = 'C:\SWBF2_ModTools\BF2_ModTools\ToolsFL\bin')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$packageRoot = $PSScriptRoot
$report = Get-Content -LiteralPath (Join-Path $packageRoot 'export-report.json') -Raw | ConvertFrom-Json
$outputRoot = Join-Path $packageRoot ('_validation\' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + [guid]::NewGuid().ToString('N').Substring(0,8))
function Get-PackageSources([string]$Folder,[string]$Filter = '*') {
    $path = Join-Path $packageRoot $Folder
    if (Test-Path -LiteralPath $path -PathType Container) { Get-ChildItem -LiteralPath $path -File -Filter $Filter }
}
$expectedFiles = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($relative in $report.files) {
    if (!(Test-Path -LiteralPath (Join-Path $packageRoot $relative) -PathType Leaf)) { throw ('Missing package file: ' + $relative) }
    [void]$expectedFiles.Add($relative.Replace('\','/'))
}
# An overwritten ZIP can leave deleted or renamed assets from an older export.
# Refuse them before compiling or counting resources against the current report.
foreach ($folder in @('msh','odf','world1')) {
    foreach ($source in Get-PackageSources $folder) {
        if ($source.Extension -in @('.msh','.tga','.odf','.wld','.lyr','.pln','.bar','.req','.ldx') -and !$expectedFiles.Contains($folder+'/'+$source.Name)) {
            throw ('Unexpected source file: '+$folder+'/'+$source.Name+'. Extract the ZIP into a new empty folder; files from another export cannot be validated against this report.')
        }
    }
}
foreach ($tool in @('pc_ModelMunge.exe','pc_TextureMunge.exe','OdfMunge.exe','WorldMunge.exe')) {
    if (!(Test-Path -LiteralPath (Join-Path $ToolsPath $tool) -PathType Leaf)) { throw ('Missing Mod Tools compiler: ' + $tool) }
}
if (Get-PackageSources 'world1' '*.pln') {
    if (!(Test-Path -LiteralPath (Join-Path $ToolsPath 'PathPlanningMunge.exe'))) { throw 'Missing Mod Tools compiler: PathPlanningMunge.exe' }
}
if (Get-PackageSources 'world1' '*.req') {
    if (!(Test-Path -LiteralPath (Join-Path $ToolsPath 'LevelPack.exe'))) { throw 'Missing Mod Tools compiler: LevelPack.exe' }
}
foreach ($odf in Get-PackageSources 'odf' '*.odf') {
    $text = Get-Content -LiteralPath $odf.FullName -Raw
    foreach ($match in [regex]::Matches($text, '(?m)^\s*(GeometryName|Texture|AttachOdf)\s*=\s*"([^"]+)"')) {
        $kind = $match.Groups[1].Value
        $name = $match.Groups[2].Value
        $folder = 'msh'
        $extension = if ($kind -eq 'GeometryName') { '.msh' } elseif ($kind -eq 'Texture') { '.tga' } else { '.odf' }
        if ($kind -eq 'AttachOdf') { $folder = 'odf' }
        if (!$name.EndsWith($extension, [StringComparison]::OrdinalIgnoreCase)) { $name += $extension }
        if (!(Test-Path -LiteralPath (Join-Path (Join-Path $packageRoot $folder) $name) -PathType Leaf)) { throw ('Unresolved dependency in ' + $odf.Name + ': ' + $name) }
    }
}
New-Item -ItemType Directory -Path $outputRoot | Out-Null
function Invoke-Compiler([string]$Tool, [string]$Pattern, [string]$Folder, [string[]]$ExtraArgs = @()) {
    if (!(Get-PackageSources $Folder ($Pattern.Replace('$','')))) { return }
    & (Join-Path $ToolsPath $Tool) -inputfile $Pattern -platform PC -sourcedir (Join-Path $packageRoot $Folder) -outputdir $outputRoot -continue @ExtraArgs
    if ($LASTEXITCODE -ne 0) { throw ($Tool + ' exited with code ' + $LASTEXITCODE) }
    $log = Join-Path $outputRoot ([IO.Path]::GetFileNameWithoutExtension($Tool) + '.log')
    if (!(Test-Path -LiteralPath $log)) { throw ('Compiler did not produce its log: ' + $Tool) }
    $text = Get-Content -LiteralPath $log -Raw
    $summary = [regex]::Matches($text, '(\d+)\s+Errors\s+(\d+)\s+Warnings')
    if (!$summary.Count -or [int]$summary[$summary.Count-1].Groups[1].Value -gt 0) { throw ('Compilation errors; inspect ' + $log) }
}
function Get-CompiledBarriers([byte[]]$Data) {
    $found = [Collections.Generic.List[object]]::new()
    $walk = {
        param([int]$Start,[int]$End)
        while ($Start+8 -le $End) {
            $tag = [Text.Encoding]::ASCII.GetString($Data,$Start,4)
            $length = [BitConverter]::ToUInt32($Data,$Start+4)
            $next = [long]$Start+8+$length
            if ($next -gt $End) { throw 'Invalid native barrier chunk.' }
            if ($tag -eq 'BARR') {
                $fields = @{}
                $info = $Start+8
                if ([Text.Encoding]::ASCII.GetString($Data,$info,4) -ne 'INFO') { throw 'Native barrier is missing INFO.' }
                $infoEnd = [long]$info+8+[BitConverter]::ToUInt32($Data,$info+4)
                if ($infoEnd -gt $next) { throw 'Invalid native barrier INFO.' }
                $child = $info+8
                while ($child+8 -le $infoEnd) {
                    $name = [Text.Encoding]::ASCII.GetString($Data,$child,4)
                    $size = [BitConverter]::ToUInt32($Data,$child+4)
                    if ([long]$child+8+$size -gt $infoEnd) { throw 'Invalid native barrier field.' }
                    $fields[$name] = @{Offset=$child+8;Length=$size}
                    $child = [int](($child+8+[long]$size+3) -band -4)
                }
                foreach ($name in @('NAME','XFRM','SIZE','FLAG')) { if (!$fields.ContainsKey($name)) { throw ('Missing native barrier field: '+$name) } }
                if ($fields.XFRM.Length -ne 48 -or $fields.SIZE.Length -ne 12 -or $fields.FLAG.Length -ne 4) { throw 'Invalid native barrier dimensions.' }
                $transform = @();for ($i=0;$i -lt 12;$i++) { $transform += [double][BitConverter]::ToSingle($Data,$fields.XFRM.Offset+$i*4) }
                $dimensions = @();for ($i=0;$i -lt 3;$i++) { $dimensions += [double][BitConverter]::ToSingle($Data,$fields.SIZE.Offset+$i*4) }
                foreach ($value in @($transform)+@($dimensions)) { if ([double]::IsNaN($value) -or [double]::IsInfinity($value)) { throw 'Non-finite native barrier transform.' } }
                $found.Add([pscustomobject]@{Name=[Text.Encoding]::ASCII.GetString($Data,$fields.NAME.Offset,$fields.NAME.Length).TrimEnd([char]0);Transform=$transform;Size=$dimensions;Flags=[BitConverter]::ToUInt32($Data,$fields.FLAG.Offset)})
            }
            if ($tag -in @('ucfb','wrld')) { & $walk ($Start+8) ([int]$next) }
            $Start = [int](($next+3) -band -4)
        }
    }
    & $walk 0 $Data.Length
    return $found
}
function Test-TextureRuntime([byte[]]$Data) {
    $walk = {
        param([int]$Start,[int]$End,[string]$Parent)
        while ($Start+8 -le $End) {
            $tag=[Text.Encoding]::ASCII.GetString($Data,$Start,4)
            $size=[BitConverter]::ToUInt32($Data,$Start+4)
            $next=[long]$Start+8+$size
            if ($next -gt $End) {throw 'Invalid native texture chunk.'}
            if ($tag -eq 'INFO' -and $Parent -eq 'FMT_') {
                if ($size -lt 16) {throw 'Invalid native texture format info.'}
                $format=[Text.Encoding]::ASCII.GetString($Data,$Start+8,4)
                $width=[BitConverter]::ToUInt16($Data,$Start+12)
                $height=[BitConverter]::ToUInt16($Data,$Start+14)
                $maps=[BitConverter]::ToUInt16($Data,$Start+18)
                if (!$width -or !$height -or !$maps) {throw 'Invalid native texture dimensions.'}
                if ($format -match '^DXT[1-5]$' -and ($width % 4 -or $height % 4)) {throw ('Compressed texture base dimensions must be multiples of four for Direct3D 11 renderers: '+$width+'x'+$height)}
            }
            if ($tag -in @('ucfb','tex_','FMT_')) {& $walk ($Start+8) ([int]$next) $tag}
            $Start=[int](($next+3) -band -4)
        }
    }
    & $walk 0 $Data.Length ''
}
function Get-SourceShadowChecks([byte[]]$Data) {
    $found = [Collections.Generic.List[object]]::new()
    $walk = {
        param([int]$Start, [int]$End)
        while ($Start + 8 -le $End) {
            $tag = [Text.Encoding]::ASCII.GetString($Data,$Start,4)
            $size = [BitConverter]::ToUInt32($Data,$Start+4)
            $next = [long]$Start + 8 + $size
            if ($next -gt $End) { throw 'Invalid source MSH chunk.' }
            if ($tag -eq 'SHDW') {
                $vertices = [BitConverter]::ToUInt32($Data,$Start+8)
                $countAt = [long]$Start + 12 + 12 * $vertices
                if ($countAt + 4 -gt $next) { throw 'Invalid shadow vertex data.' }
                $count = [BitConverter]::ToUInt32($Data,[int]$countAt)
                $edgeAt = $countAt + 4
                if (!$count -or $count % 3 -or $edgeAt + 8 * $count -gt $next) { throw 'Invalid shadow edge data.' }
                for ($i=0; $i -lt $count; $i++) {
                    $at = [int]($edgeAt + 8 * $i)
                    $vertex = [BitConverter]::ToUInt16($Data,$at)
                    $loop = [BitConverter]::ToUInt16($Data,$at+2)
                    $twin = [BitConverter]::ToUInt16($Data,$at+4)
                    if ($vertex -ge $vertices -or $loop -ge $count -or $twin -ge $count) { throw 'Shadow volume contains an open or invalid edge.' }
                    $twinAt = [int]($edgeAt + 8 * $twin)
                    if ([BitConverter]::ToUInt16($Data,$twinAt+4) -ne $i) { throw 'Shadow edge twins are not reciprocal.' }
                    $twinNext = [BitConverter]::ToUInt16($Data,$twinAt+2)
                    if ($twinNext -ge $count -or [BitConverter]::ToUInt16($Data,[int]($edgeAt+8*$twinNext)) -ne $vertex) { throw 'Shadow edge directions are inconsistent.' }
                    $second = [BitConverter]::ToUInt16($Data,[int]($edgeAt+8*$loop+2))
                    if ($second -ge $count -or [BitConverter]::ToUInt16($Data,[int]($edgeAt+8*$second+2)) -ne $i) { throw 'Shadow face is not a closed triangle.' }
                }
                $found.Add([pscustomobject]@{Vertices=$vertices;Edges=$count;Closed=$true})
            }
            if ($tag -in @('HEDR','MSH2','MODL','GEOM','SEGM')) { & $walk ($Start+8) ([int]$next) }
            $Start = [int](($next+3) -band -4)
        }
    }
    & $walk 0 $Data.Length
    return $found
}
function Get-CompiledShadowChecks([byte[]]$Data) {
    $found = [Collections.Generic.List[object]]::new()
    $walk = {
        param([int]$Start, [int]$End, [string]$Context)
        while ($Start + 8 -le $End) {
            $tag = [Text.Encoding]::ASCII.GetString($Data,$Start,4)
            $size = [BitConverter]::ToUInt32($Data,$Start+4)
            $next = [long]$Start + 8 + $size
            if ($next -gt $End) { throw 'Invalid compiled shadow chunk.' }
            if ($tag -eq 'DATA' -and $Context -eq 'CSHD') {
                $fields = @{}
                $child = $Start + 8
                while ($child + 8 -le $next) {
                    $name = [Text.Encoding]::ASCII.GetString($Data,$child,4)
                    $length = [BitConverter]::ToUInt32($Data,$child+4)
                    if ([long]$child + 8 + $length -gt $next) { throw 'Invalid compiled shadow data.' }
                    $fields[$name] = @{Offset=$child+8;Length=$length}
                    $child = [int](($child+8+[long]$length+3) -band -4)
                }
                foreach ($name in @('INFO','SHDV','SHDI')) {
                    if (!$fields.ContainsKey($name)) { throw ('Missing compiled shadow field: ' + $name) }
                }
                if ($fields.INFO.Length -ne 8 -or $fields.SHDI.Length % 8) { throw 'Invalid compiled shadow layout.' }
                $vertices = [BitConverter]::ToUInt32($Data,$fields.INFO.Offset)
                $indices = [BitConverter]::ToUInt32($Data,$fields.INFO.Offset+4)
                $count = [int]($fields.SHDI.Length / 8)
                if (!$count -or $fields.SHDV.Length -ne 12*$vertices -or $indices -ne 4*$count) { throw 'Invalid compiled shadow counts.' }
                for ($i=0; $i -lt 3*$vertices; $i++) {
                    $value = [BitConverter]::ToSingle($Data,$fields.SHDV.Offset+4*$i)
                    if ([Single]::IsNaN($value) -or [Single]::IsInfinity($value)) { throw 'Non-finite compiled shadow vertex.' }
                }
                $origins = [int[]]::new($count)
                $loops = [int[]]::new($count)
                $twins = [int[]]::new($count)
                for ($i=0; $i -lt $count; $i++) {
                    $at = $fields.SHDI.Offset + 8*$i
                    $origins[$i] = [BitConverter]::ToUInt16($Data,$at)
                    $loops[$i] = [BitConverter]::ToUInt16($Data,$at+2)
                    $twins[$i] = [BitConverter]::ToUInt16($Data,$at+4)
                    if ($origins[$i] -ge $vertices -or $loops[$i] -ge $count -or $twins[$i] -ge $count) { throw 'Compiled shadow has an open or invalid edge.' }
                }
                for ($i=0; $i -lt $count; $i++) {
                    $twin = $twins[$i]
                    if ($twins[$twin] -ne $i -or $origins[$loops[$twin]] -ne $origins[$i] -or $origins[$twin] -ne $origins[$loops[$i]]) { throw 'Compiled shadow edge twins are inconsistent.' }
                }
                $seen = [bool[]]::new($count)
                $faces = 0
                for ($first=0; $first -lt $count; $first++) {
                    if ($seen[$first]) { continue }
                    $edge = $first
                    $sides = 0
                    while (!$seen[$edge]) { $seen[$edge]=$true; $sides++; $edge=$loops[$edge] }
                    if ($edge -ne $first -or $sides -lt 3) { throw 'Compiled shadow face is not closed.' }
                    $faces++
                }
                $found.Add([pscustomobject]@{Vertices=$vertices;Edges=$count;Faces=$faces;Closed=$true})
            }
            if ($tag -in @('ucfb','modl','shdw','CSHD')) { & $walk ($Start+8) ([int]$next) $tag }
            $Start = [int](($next+3) -band -4)
        }
    }
    & $walk 0 $Data.Length ''
    return $found
}
function Get-CollisionMasks([byte[]]$Data, [hashtable]$Details) {
    $found = [Collections.Generic.List[object]]::new()
    $walk = {
        param([int]$Start, [int]$End, [string]$Context)
        while ($Start + 8 -le $End) {
            $tag = [Text.Encoding]::ASCII.GetString($Data,$Start,4)
            $size = [BitConverter]::ToUInt32($Data,$Start+4)
            $next = [long]$Start + 8 + $size
            if ($next -gt $End) { throw 'Invalid compiled UCFB chunk.' }
            if ($tag -eq 'MASK' -and $Context -in @('prim','coll')) {
                $found.Add([pscustomobject]@{Type=$Context;Mask=[BitConverter]::ToUInt32($Data,$Start+8)})
            }
            if ($tag -eq 'DATA' -and $Context -eq 'prim') {
                $shape = [BitConverter]::ToUInt32($Data,$Start+8)
                if ($shape -notin @(0,4)) { throw ('Unexpected collision primitive shape: ' + $shape) }
                $Details.PrimitiveShapes.Add($shape)
                for ($axis=0; $axis -lt 3; $axis++) {
                    $value = [BitConverter]::ToSingle($Data,$Start+12+4*$axis)
                    if ([Single]::IsNaN($value) -or [Single]::IsInfinity($value) -or ($shape -eq 4 -and $value -le 0) -or ($shape -eq 0 -and ($value -lt 0 -or ($axis -eq 0 -and $value -eq 0)))) { throw 'Invalid primitive dimensions.' }
                }
                if (!$Details.PrimitiveFrame) { throw 'Missing primitive transform.' }
                $dimensions = @(0,1,2 | ForEach-Object {[double][BitConverter]::ToSingle($Data,$Start+12+4*$_)})
                if ($shape -eq 0) { $dimensions = @($dimensions[0],$dimensions[0],$dimensions[0]) }
                foreach ($x in @(-1,1)) { foreach ($y in @(-1,1)) { foreach ($z in @(-1,1)) {
                    for ($axis=0; $axis -lt 3; $axis++) {
                        $frame = $Details.PrimitiveFrame
                        $value = if ($shape -eq 0) { $frame[9+$axis]+@($x,$y,$z)[$axis]*$dimensions[0] } else { $frame[$axis]*$x*$dimensions[0]+$frame[3+$axis]*$y*$dimensions[1]+$frame[6+$axis]*$z*$dimensions[2]+$frame[9+$axis] }
                        $Details.PhysicalMin[$axis] = [Math]::Min($Details.PhysicalMin[$axis],$value)
                        $Details.PhysicalMax[$axis] = [Math]::Max($Details.PhysicalMax[$axis],$value)
                    }
                } } }
            }
            if ($tag -eq 'XFRM' -and $Context -eq 'prim') {
                if ($size -ne 48) { throw 'Invalid primitive transform buffer.' }
                $Details.PrimitiveFrame = @(0..11 | ForEach-Object {[double][BitConverter]::ToSingle($Data,$Start+8+4*$_)})
                foreach ($value in $Details.PrimitiveFrame) { if ([double]::IsNaN($value) -or [double]::IsInfinity($value)) { throw 'Non-finite primitive transform.' } }
            }
            if ($tag -eq 'INFO' -and $Context -eq 'modl') {
                if ($size -lt 40) { throw 'Missing native render bounds.' }
                for ($axis=0; $axis -lt 3; $axis++) {
                    $low = [double][BitConverter]::ToSingle($Data,$Start+24+4*$axis)
                    $high = [double][BitConverter]::ToSingle($Data,$Start+36+4*$axis)
                    if ([double]::IsNaN($low) -or [double]::IsNaN($high) -or [double]::IsInfinity($low) -or [double]::IsInfinity($high) -or $low -gt $high) { throw 'Invalid native render bounds.' }
                    $Details.RenderMin[$axis] = [Math]::Min($Details.RenderMin[$axis],$low)
                    $Details.RenderMax[$axis] = [Math]::Max($Details.RenderMax[$axis],$high)
                }
            }
            if ($tag -eq 'shdw') { $Details.ShadowChunks++ }
            if ($tag -eq 'POSI' -and $Context -eq 'coll') {
                if ($size % 12) { throw 'Invalid collision position buffer.' }
                $Details.CollisionVertices = [int]($size / 12)
                for ($i=0; $i -lt $size / 4; $i++) {
                    $value = [BitConverter]::ToSingle($Data,$Start+8+4*$i)
                    if ([Single]::IsNaN($value) -or [Single]::IsInfinity($value)) { throw 'Non-finite collision vertex.' }
                    $axis = $i % 3
                    $Details.PhysicalMin[$axis] = [Math]::Min($Details.PhysicalMin[$axis],$value)
                    $Details.PhysicalMax[$axis] = [Math]::Max($Details.PhysicalMax[$axis],$value)
                }
            }
            if ($tag -eq 'LEAF' -and $Context -eq 'coll') {
                $count = [int]$Data[$Start+8]
                if ($count -lt 3 -or $count -gt 100 -or 7+2*$count -gt $size) { throw 'Collision polygon exceeds the engine vertex limit or has invalid data.' }
                for ($i=0; $i -lt $count; $i++) {
                    if ([BitConverter]::ToUInt16($Data,$Start+15+2*$i) -ge $Details.CollisionVertices) { throw 'Collision polygon references a missing vertex.' }
                }
                $Details.CollisionPolygons++
                $Details.MaximumPolygonVertices = [Math]::Max($Details.MaximumPolygonVertices,$count)
            }
            if ($tag -eq 'modl') { $Details.RenderModels++ }
            if ($tag -eq 'LOWD') { $Details.LowDetailChunks++ }
            if ($tag -in @('ucfb','modl','gmod','prim','coll','TREE')) {
                if ($tag -eq 'prim') { $Details.PrimitiveFrame=$null }
                $childContext = if ($tag -in @('prim','coll','gmod','modl')) { $tag } else { $Context }
                & $walk ($Start+8) ([int]$next) $childContext
            }
            $Start = [int](($next+3) -band -4)
        }
    }
    & $walk 0 $Data.Length ''
    return $found
}
$checks = [Collections.Generic.List[object]]::new()
Push-Location $outputRoot
try {
    Invoke-Compiler 'pc_ModelMunge.exe' '$*.msh' 'msh'
    Invoke-Compiler 'pc_TextureMunge.exe' '$*.tga' 'msh'
    foreach ($texture in Get-ChildItem -LiteralPath $outputRoot -Filter '*.texture') {Test-TextureRuntime ([IO.File]::ReadAllBytes($texture.FullName))}
    Invoke-Compiler 'OdfMunge.exe' '$*.odf' 'odf'
    Invoke-Compiler 'WorldMunge.exe' '$*.lyr' 'world1'
    Invoke-Compiler 'WorldMunge.exe' '$*.wld' 'world1'
    if (Get-PackageSources 'world1' '*.pln') { Invoke-Compiler 'PathPlanningMunge.exe' '$*.pln' 'world1' }
    if (Get-PackageSources 'world1' '*.req') { Invoke-Compiler 'LevelPack.exe' '*.req' 'world1' @('-inputdir',$outputRoot) }
    foreach ($pair in @(@('msh','*.msh','.model'),@('msh','*.tga','.texture'),@('odf','*.odf','.class'),@('world1','*.lyr','.world'),@('world1','*.wld','.world'),@('world1','*.pln','.congraph'),@('world1','*.req','.lvl'))) {
        foreach ($source in Get-PackageSources $pair[0] $pair[1]) {
            $compiled = Join-Path $outputRoot ($source.BaseName + $pair[2])
            if (!(Test-Path -LiteralPath $compiled) -or (Get-Item -LiteralPath $compiled).Length -lt 8) { throw ('Missing compiled output: ' + $compiled) }
        }
    }
    if ($report.PSObject.Properties.Name -contains 'navigation') {
        $nav = Get-Content -LiteralPath (Join-Path $packageRoot $report.navigation.report) -Raw | ConvertFrom-Json
        $graph = [IO.File]::ReadAllBytes((Join-Path $outputRoot ([IO.Path]::GetFileNameWithoutExtension($report.navigation.planningFile) + '.congraph')))
        if ($graph.Length -lt 30 -or [Text.Encoding]::ASCII.GetString($graph,16,4) -ne 'INFO' -or [BitConverter]::ToUInt16($graph,24) -ne $nav.hubs.Count -or [BitConverter]::ToUInt16($graph,26) -ne $nav.connections.Count) { throw 'Native planning counts differ from generated navigation.' }
        $names = [Text.Encoding]::ASCII.GetString($graph)
        foreach ($hub in $nav.hubs) {
            $entry = $names.IndexOf($hub.name + [char]0,[StringComparison]::Ordinal)
            if ($entry -lt 0 -or $entry + 32 -gt $graph.Length) { throw ('Compiled planning hub name was lost or truncated: ' + $hub.name) }
            $expected = @($hub.position[0],$hub.position[1],-$hub.position[2],$hub.radius)
            for ($axis=0; $axis -lt 4; $axis++) {
                $actual = [BitConverter]::ToSingle($graph,$entry+16+$axis*4)
                $tolerance = [Math]::Max(.00001,[Math]::Abs($expected[$axis])*.000001)
                if ([double]::IsNaN($actual) -or [double]::IsInfinity($actual) -or [Math]::Abs($actual-$expected[$axis]) -gt $tolerance) { throw ('Compiled planning coordinate or radius changed: ' + $hub.name) }
            }
        }
        foreach ($connection in $nav.connections) {
            $entry = $names.IndexOf($connection.name + [char]0,[StringComparison]::Ordinal)
            if ($entry -lt 0 -or $entry + 26 -gt $graph.Length) { throw ('Compiled planning connection name was lost or truncated: ' + $connection.name) }
            $start = [int]$graph[$entry+16]
            $end = [int]$graph[$entry+17]
            if ($start -ge $nav.hubs.Count -or $end -ge $nav.hubs.Count -or $nav.hubs[$start].name -ne $connection.start -or $nav.hubs[$end].name -ne $connection.end -or [BitConverter]::ToUInt32($graph,$entry+18) -ne $connection.flags) { throw ('Compiled planning endpoints or unit flags changed: ' + $connection.name) }
        }
        $world = [IO.File]::ReadAllBytes((Join-Path $outputRoot ([IO.Path]::GetFileNameWithoutExtension($report.navigation.barrierFile) + '.world')))
        $nativeBarriers = @(Get-CompiledBarriers $world)
        $barrierCount = $nativeBarriers.Count
        if ($barrierCount -ne $nav.barriers.Count) { throw 'Native world did not retain all generated AI barriers.' }
        $byName = @{};foreach ($barrier in $nativeBarriers) { if ($byName.ContainsKey($barrier.Name)) { throw 'Duplicate native barrier name.' };$byName[$barrier.Name]=$barrier }
        $maximumBarrierError = 0.0
        foreach ($expected in $nav.barriers) {
            if (!$byName.ContainsKey($expected.name)) { throw ('Native barrier name was lost: '+$expected.name) }
            $actual = $byName[$expected.name]
            if ($actual.Flags -ne $expected.flags) { throw ('Native barrier unit flags changed: '+$expected.name) }
            $m = $actual.Transform;$size = $actual.Size
            # The native world loader flips XFRM translation Z, while its axes
            # already use engine coordinates. Compare the four runtime corners.
            foreach ($x in @(-1,1)) { foreach ($z in @(-1,1)) {
                $point = @(($m[9]+$x*$size[0]*$m[0]+$z*$size[2]*$m[6]),($m[10]+$x*$size[0]*$m[1]+$z*$size[2]*$m[7]),(-$m[11]+$x*$size[0]*$m[2]+$z*$size[2]*$m[8]))
                $nearest = [double]::PositiveInfinity
                foreach ($corner in $expected.corners) { $distance=[Math]::Sqrt([Math]::Pow($point[0]-$corner[0],2)+[Math]::Pow($point[1]-$corner[1],2)+[Math]::Pow($point[2]+$corner[2],2));$nearest=[Math]::Min($nearest,$distance) }
                $tolerance = [Math]::Max(.0001,([Math]::Abs($point[0])+[Math]::Abs($point[2]))*.000002)
                if ($nearest -gt $tolerance) { throw ('Compiled barrier footprint differs from generated source: '+$expected.name+' ('+$nearest+' metres)') }
                $maximumBarrierError = [Math]::Max($maximumBarrierError,$nearest)
            } }
        }
        $level = [IO.File]::ReadAllBytes((Join-Path $outputRoot ([IO.Path]::GetFileNameWithoutExtension($report.navigation.planningFile) + '.lvl')))
        $offset = 8
        $hasPlanning = $false
        $hasWorld = $false
        while ($offset + 8 -le $level.Length) {
            $tag = [Text.Encoding]::ASCII.GetString($level,$offset,4)
            $length = [BitConverter]::ToUInt32($level,$offset+4)
            if ([long]$offset + 8 + $length -gt $level.Length) { throw 'Invalid packed level chunk.' }
            if ($tag -eq 'plan') { $hasPlanning=$true }
            if ($tag -eq 'wrld') { if (!$hasPlanning) {throw 'Packed AI planning must load before its world.'};$hasWorld=$true }
            $offset = [int](($offset + 8 + [long]$length + 3) -band -4)
        }
        if (!$hasPlanning -or !$hasWorld) { throw 'Packed level is missing the world or AI planning graph request.' }
        [pscustomobject]@{Hubs=$nav.hubs.Count;Connections=$nav.connections.Count;Barriers=$barrierCount;NamesPreserved=$true;CoordinatesAndRadiiPreserved=$true;ConnectionFlagsPreserved=$true;BarrierFootprintsAndFlagsPreserved=$true;MaximumBarrierFootprintErrorMetres=$maximumBarrierError;GraphIncludedInLevel=$true} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputRoot 'ai-navigation-checks.json') -Encoding UTF8
    }
    $nativePrimitiveTotal = 0
    $nativeCollisionMeshTotal = 0
    foreach ($source in Get-PackageSources 'msh' '*.msh') {
        $compiled = Join-Path $outputRoot ($source.BaseName + '.model')
        $sourceShadows = @(Get-SourceShadowChecks ([IO.File]::ReadAllBytes($source.FullName)))
        $details = @{PrimitiveShapes=[Collections.Generic.List[int]]::new();ShadowChunks=0;LowDetailChunks=0;RenderModels=0;CollisionVertices=0;CollisionPolygons=0;MaximumPolygonVertices=0;PrimitiveFrame=$null;PhysicalMin=[double[]]@([double]::PositiveInfinity,[double]::PositiveInfinity,[double]::PositiveInfinity);PhysicalMax=[double[]]@([double]::NegativeInfinity,[double]::NegativeInfinity,[double]::NegativeInfinity);RenderMin=[double[]]@([double]::PositiveInfinity,[double]::PositiveInfinity,[double]::PositiveInfinity);RenderMax=[double[]]@([double]::NegativeInfinity,[double]::NegativeInfinity,[double]::NegativeInfinity)}
        $compiledData = [IO.File]::ReadAllBytes($compiled)
        $masks = @(Get-CollisionMasks $compiledData $details)
        $nativePrimitiveTotal += $details.PrimitiveShapes.Count
        $nativeCollisionMeshTotal += @($masks | Where-Object {$_.Type -eq 'coll'}).Count
        $compiledShadows = @(Get-CompiledShadowChecks $compiledData)
        if (!$details.RenderModels) { throw ('Model cannot load as world geometry; missing native render model: ' + $source.Name) }
        if ($masks.Count -gt 64) { throw ('Compiled model exceeds the total collision-object limit: ' + $source.Name) }
        if ($masks.Count) { for ($axis=0; $axis -lt 3; $axis++) {
            if ($details.PhysicalMin[$axis] -lt $details.RenderMin[$axis]-.0001 -or $details.PhysicalMax[$axis] -gt $details.RenderMax[$axis]+.0001) { throw ('Native render bounds do not cover collision: ' + $source.Name) }
        } }
        $option = $source.FullName + '.option'
        $noCollision = (Test-Path -LiteralPath $option) -and ((Get-Content -LiteralPath $option -Raw) -match '(?m)^-nocollision\s*$')
        if ($noCollision -and $masks.Count) { throw ('Decorative geometry acquired collision: ' + $source.Name) }
        foreach ($mask in $masks) {
            if ($mask.Mask -notin @(7,16,23)) { throw ('Unexpected collision mask in ' + $source.Name + ': ' + $mask.Mask) }
        }
        $asset = @($report.assets | Where-Object {$_.name -eq $source.BaseName})
        if ($asset.Count -and $asset[0].role -eq 'collision' -and $asset[0].PSObject.Properties['meshSerializedBoxes'] -and ($details.CollisionPolygons -gt 64 -or $details.MaximumPolygonVertices -gt 3)) { throw ('Mesh-serialized box helper exceeds its preparation budget: ' + $source.Name) }
        if ($asset.Count -and $asset[0].PSObject.Properties['contactPartitionTriangles'] -and $asset[0].contactPartitionTriangles -and ($details.CollisionPolygons -gt $asset[0].contactPartitionTriangles -or $details.MaximumPolygonVertices -gt 3)) { throw ('Dense collision partition no longer fits the contact buffer: ' + $source.Name) }
        if ($asset.Count -and $asset[0].PSObject.Properties['collisionBodies']) {
            $expected = @($asset[0].collisionBodies | ForEach-Object { $_.type + ':' + $_.mask } | Sort-Object)
            $actual = @($masks | ForEach-Object { $_.Type + ':' + $_.Mask } | Sort-Object)
            if (($expected -join ',') -ne ($actual -join ',')) { throw ('Compiled collision categories differ from the object collision: ' + $source.Name) }
        }
        if ($asset.Count -and $asset[0].PSObject.Properties['primitiveCollision'] -and $details.PrimitiveShapes.Count -ne $asset[0].primitiveCollision) { throw ('A collision primitive was lost or added during compilation: ' + $source.Name) }
        if ($asset.Count -and $asset[0].PSObject.Properties['ordnanceCollision'] -and $asset[0].ordnanceCollision -and !($masks | Where-Object {$_.Type -eq 'coll' -and ($_.Mask -band 16)})) { throw ('Missing ordnance collision mesh: ' + $source.Name) }
        if ($asset.Count -and $asset[0].PSObject.Properties['collisionMask'] -and $asset[0].collisionMask -eq 'svb' -and !($masks | Where-Object {$_.Type -eq 'coll' -and $_.Mask -eq 7})) { throw ('Missing soldier/vehicle mesh: ' + $source.Name) }
        if ($asset.Count -and $asset[0].PSObject.Properties['collisionMask'] -and $asset[0].collisionMask -eq 'svbo' -and !($masks | Where-Object {$_.Type -eq 'coll' -and $_.Mask -eq 23})) { throw ('Missing shared movement/ordnance mesh: ' + $source.Name) }
        if ($asset.Count -and $asset[0].PSObject.Properties['shadowTriangles'] -and $asset[0].shadowTriangles -gt 0 -and (!$sourceShadows.Count -or !$details.ShadowChunks -or !$compiledShadows.Count)) { throw ('Missing shadow volume: ' + $source.Name) }
        if ($asset.Count -and $asset[0].PSObject.Properties['lowDetailTriangles'] -and $asset[0].lowDetailTriangles -gt 0 -and !$details.LowDetailChunks) { throw ('Missing distant model: ' + $source.Name) }
        $checks.Add([pscustomobject]@{Model=$source.BaseName;CollisionMasks=$masks;PrimitiveShapes=$details.PrimitiveShapes;CollisionPolygons=$details.CollisionPolygons;MaximumPolygonVertices=$details.MaximumPolygonVertices;SourceShadows=$sourceShadows;CompiledShadows=$details.ShadowChunks;CompiledShadowChecks=$compiledShadows;DistantModels=$details.LowDetailChunks;NoCollision=$noCollision})
    }
    if ($nativePrimitiveTotal -gt 768) { throw ('Compiled scene exceeds the global collision primitive budget: ' + $nativePrimitiveTotal + ' (768 available; 256 reserved for mission/side assets).') }
    if ($nativeCollisionMeshTotal -gt 768) { throw ('Compiled scene exceeds the global collision mesh budget: ' + $nativeCollisionMeshTotal) }
    if ($report.PSObject.Properties['primitiveBudget'] -and $nativePrimitiveTotal -ne $report.primitiveBudget.native) { throw 'Compiled global primitive count differs from the export report.' }
    [pscustomobject]@{NativePrimitives=$nativePrimitiveTotal;Budget=768;Reserved=256;RuntimeCapacity=1024} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputRoot 'primitive-budget-checks.json') -Encoding UTF8
    $checks | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $outputRoot 'collision-checks.json') -Encoding UTF8
    Write-Host ('Validated ' + $checks.Count + ' models. Compiler logs and collision checks: ' + $outputRoot)
    Write-Host 'The game was not launched. Source navigation was checked; in-game AI behavior still needs a playtest.'
} finally { Pop-Location }
`;
