export const SWBF2_AI_MERGE_CHECKS=String.raw`
function Get-AIMaskedSource([string]$Text,[switch]$LevelRequest) {
    $chars=$Text.ToCharArray();$quoted=$false;$escaped=$false;$line=$false;$depth=0;$opened=$false
    for ($i=0;$i -lt $chars.Length;$i++) {
        $c=$Text[$i];$next=if ($i+1 -lt $chars.Length) {$Text[$i+1]} else {[char]0}
        if ($line) { if ($c -eq [char]10 -or $c -eq [char]13) {$line=$false} else {$chars[$i]=' '};continue }
        if ($quoted) { if ($escaped) {$escaped=$false} elseif ($c -eq '\') {$escaped=$true} elseif ($c -eq '"') {$quoted=$false};continue }
        if ($c -eq '"') {$quoted=$true;continue}
        if ($c -eq '{') {$depth++;$opened=$true} elseif ($c -eq '}') {$depth--}
        if ($c -eq '/' -and $next -eq '/') {if (!$LevelRequest -or !$opened -or $depth -ne 0) {throw 'Native planning and barriers do not support // comments; level requests allow them only after the closing ucft scope. Remove incompatible comments before merging.'};$chars[$i]=' ';$chars[$i+1]=' ';$i++;$line=$true}
        elseif ($c -eq '/' -and $next -eq '*') {throw 'Native planning, barriers and level requests do not support /* ... */ block comments. Remove incompatible block comments before merging.'}
    }
    return -join $chars
}
function Get-AIBlocks([string]$Text) {
    $masked=Get-AIMaskedSource $Text
    foreach ($match in [regex]::Matches($masked,'\b(Hub|Connection|Barrier)\s*\(\s*"([^"\r\n]+)"\s*\)\s*\{')) {
        $end=$match.Index+$match.Length;$depth=1;$quoted=$false;$escaped=$false
        while ($end -lt $masked.Length -and $depth) {
            $c=$masked[$end];$end++
            if ($quoted) { if ($escaped) {$escaped=$false} elseif ($c -eq '\') {$escaped=$true} elseif ($c -eq '"') {$quoted=$false};continue }
            if ($c -eq '"') {$quoted=$true} elseif ($c -eq '{') {$depth++} elseif ($c -eq '}') {$depth--}
        }
        if ($depth) {throw ('Unclosed AI source block: '+$match.Groups[2].Value)}
        if ($end -lt $Text.Length -and $Text[$end] -eq ';') {$end++}
        [pscustomobject]@{Kind=$match.Groups[1].Value;Name=$match.Groups[2].Value;Start=$match.Index;Length=$end-$match.Index;Text=$Text.Substring($match.Index,$end-$match.Index);Masked=$masked.Substring($match.Index,$end-$match.Index)}
    }
}
function Remove-AIRecords([string]$Text,[string[]]$Names) {
    $selected=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($name in $Names) { [void]$selected.Add($name) }
    foreach ($entry in @(Get-AIBlocks $Text | Where-Object {$selected.Contains($_.Name)} | Sort-Object Start -Descending)) {$Text=$Text.Remove($entry.Start,$entry.Length)}
    return $Text
}
function Set-AIBarrierCount([string]$Text) {
    $masked=Get-AIMaskedSource $Text
    foreach ($match in @([regex]::Matches($masked,'\bBarrierCount\s*\(\s*\d+\s*\)\s*;') | Sort-Object Index -Descending)) {$Text=$Text.Remove($match.Index,$match.Length)}
    $count=@(Get-AIBlocks $Text | Where-Object Kind -eq 'Barrier').Count
    return 'BarrierCount('+$count+');'+[Environment]::NewLine+$Text.Trim()+[Environment]::NewLine
}
function Get-AIFloat([string]$Value) {return [double]::Parse($Value,[Globalization.NumberStyles]::Float,[Globalization.CultureInfo]::InvariantCulture)}
function Get-AIPosition([string]$Text,[string]$Field) {
    $number='([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)'
    foreach ($match in [regex]::Matches($Text,'\b'+$Field+'\s*\(\s*'+$number+'\s*,\s*'+$number+'\s*,\s*'+$number+'\s*\)')) {
        ,([double[]]@((Get-AIFloat $match.Groups[1].Value),(Get-AIFloat $match.Groups[2].Value),(Get-AIFloat $match.Groups[3].Value)))
    }
}
function Test-AIBarrierTouches($Barrier,[double[]]$Start,[double[]]$End,[double]$Padding) {
    if ([Math]::Max($Start[0],$End[0]) -lt $Barrier.MinX-$Padding -or [Math]::Min($Start[0],$End[0]) -gt $Barrier.MaxX+$Padding -or [Math]::Max($Start[2],$End[2]) -lt $Barrier.MinZ-$Padding -or [Math]::Min($Start[2],$End[2]) -gt $Barrier.MaxZ+$Padding) {return $false}
    $p=@((($Start[0]-$Barrier.X)*$Barrier.Dx+($Start[2]-$Barrier.Z)*$Barrier.Dz),(($Start[0]-$Barrier.X)*(-$Barrier.Dz)+($Start[2]-$Barrier.Z)*$Barrier.Dx))
    $q=@((($End[0]-$Barrier.X)*$Barrier.Dx+($End[2]-$Barrier.Z)*$Barrier.Dz),(($End[0]-$Barrier.X)*(-$Barrier.Dz)+($End[2]-$Barrier.Z)*$Barrier.Dx))
    $half=@(($Barrier.Length/2+$Padding),($Barrier.Width/2+$Padding));$lo=0.0;$hi=1.0
    for ($i=0;$i -lt 2;$i++) {$delta=$q[$i]-$p[$i];if ([Math]::Abs($delta) -lt 1e-9) {if ([Math]::Abs($p[$i]) -gt $half[$i]) {return $false};continue};$a=(-$half[$i]-$p[$i])/$delta;$b=($half[$i]-$p[$i])/$delta;if ($a -gt $b) {$swap=$a;$a=$b;$b=$swap};$lo=[Math]::Max($lo,$a);$hi=[Math]::Min($hi,$b);if ($lo -gt $hi) {return $false}}
    return $true
}
function Test-AIMergedNavigation([string]$Planning,[string]$Barriers,[string]$Prefix) {
    $hubs=@{};$connections=@{};$degrees=@{};$marker=$Prefix+'_';$warnings=[Collections.Generic.List[string]]::new()
    foreach ($block in @(Get-AIBlocks $Planning | Where-Object Kind -eq 'Hub')) {
        if ($hubs.ContainsKey($block.Name)) {throw ('Duplicate planning hub: '+$block.Name)}
        $position=@(Get-AIPosition $block.Masked 'Pos');$radius=[regex]::Match($block.Masked,'\bRadius\s*\(\s*([^\)]+)\)')
        if ($position.Count -ne 1 -or !$radius.Success) {throw ('Invalid planning hub: '+$block.Name)}
        $r=Get-AIFloat $radius.Groups[1].Value;if ($r -lt 0 -or [double]::IsNaN($r) -or [double]::IsInfinity($r)) {throw 'Invalid planning radius.'}
        $hubs[$block.Name]=[pscustomobject]@{Name=$block.Name;Position=$position[0];Radius=$r;Flags=0;Generated=$block.Name.StartsWith($marker,[StringComparison]::Ordinal)}
    }
    foreach ($block in @(Get-AIBlocks $Planning | Where-Object Kind -eq 'Connection')) {
        if ($connections.ContainsKey($block.Name)) {throw ('Duplicate planning connection: '+$block.Name)}
        $start=[regex]::Match($block.Masked,'\bStart\s*\(\s*"([^"]+)"\s*\)');$end=[regex]::Match($block.Masked,'\bEnd\s*\(\s*"([^"]+)"\s*\)');$flag=[regex]::Match($block.Masked,'\bFlag\s*\(\s*(\d+)\s*\)')
        if (!$start.Success -or !$end.Success -or !$flag.Success) {throw ('Invalid planning connection: '+$block.Name)}
        $a=$start.Groups[1].Value;$b=$end.Groups[1].Value
        if (!$hubs.ContainsKey($a) -or !$hubs.ContainsKey($b)) {throw ('Merge would leave a connection to a missing hub: '+$block.Name)}
        $flags=[uint32]::Parse($flag.Groups[1].Value)
        foreach ($name in @($a,$b)) {if (!$degrees.ContainsKey($name)) {$degrees[$name]=0};$degrees[$name]++;if ($degrees[$name] -gt 8) {throw ('Merged planning exceeds eight connections at hub: '+$name)};$hubs[$name].Flags=$hubs[$name].Flags -bor $flags}
        $connections[$block.Name]=[pscustomobject]@{Name=$block.Name;Start=$hubs[$a];End=$hubs[$b];Flags=$flags;Generated=$block.Name.StartsWith($marker,[StringComparison]::Ordinal)}
    }
    if ($hubs.Count -gt 255 -or $connections.Count -gt 255) {throw 'Merged planning exceeds the native limit of 255 hubs or connections. Export into a world with enough remaining planning capacity.'}
    foreach ($match in [regex]::Matches((Get-AIMaskedSource $Planning),'\bBranchWeight\s*\(\s*"([^"]+)"\s*,[^,]+,\s*"([^"]+)"')) {if (!$hubs.ContainsKey($match.Groups[1].Value) -or !$connections.ContainsKey($match.Groups[2].Value)) {throw 'Merge would leave a BranchWeight reference to a missing hub or connection.'}}
    $protected=[Collections.Generic.List[object]]::new();$generated=[Collections.Generic.List[object]]::new()
    foreach ($hub in $hubs.Values) {$target=$protected;if ($hub.Generated) {$target=$generated};$target.Add([pscustomobject]@{Name=$hub.Name;Start=$hub.Position;End=$hub.Position;Padding=$hub.Radius+.3;Flags=$hub.Flags})}
    foreach ($connection in $connections.Values) {$target=$protected;if ($connection.Generated) {$target=$generated};$target.Add([pscustomobject]@{Name=$connection.Name;Start=$connection.Start.Position;End=$connection.End.Position;Padding=[Math]::Max($connection.Start.Radius,$connection.End.Radius)+.3;Flags=$connection.Flags})}
    $suppressed=[Collections.Generic.List[string]]::new();$conflicts=[Collections.Generic.List[string]]::new();$names=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($block in @(Get-AIBlocks $Barriers | Where-Object Kind -eq 'Barrier')) {
        if (!$names.Add($block.Name)) {throw ('Duplicate AI barrier: '+$block.Name)}
        $corners=@(Get-AIPosition $block.Masked 'Corner');$flag=[regex]::Match($block.Masked,'\bFlag\s*\(\s*(\d+)\s*\)')
        if ($corners.Count -ne 4 -or !$flag.Success) {throw ('Invalid AI barrier: '+$block.Name)}
        $dx=$corners[1][0]-$corners[0][0];$dz=$corners[1][2]-$corners[0][2];$length=[Math]::Sqrt($dx*$dx+$dz*$dz);$width=[Math]::Sqrt([Math]::Pow($corners[3][0]-$corners[0][0],2)+[Math]::Pow($corners[3][2]-$corners[0][2],2))
        if ($length -le 0 -or $width -le 0) {throw 'Degenerate AI barrier footprint.'}
        $xs=@($corners | ForEach-Object {$_[0]});$zs=@($corners | ForEach-Object {$_[2]});$bar=[pscustomobject]@{X=($xs | Measure-Object -Average).Average;Z=($zs | Measure-Object -Average).Average;Dx=$dx/$length;Dz=$dz/$length;Length=$length;Width=$width;MinX=($xs | Measure-Object -Minimum).Minimum;MaxX=($xs | Measure-Object -Maximum).Maximum;MinZ=($zs | Measure-Object -Minimum).Minimum;MaxZ=($zs | Measure-Object -Maximum).Maximum;Flags=[uint32]::Parse($flag.Groups[1].Value)}
        $owned=$block.Name.StartsWith($marker,[StringComparison]::Ordinal);$targets=if ($owned) {$protected} else {$generated}
        foreach ($target in $targets) {if (($bar.Flags -band $target.Flags) -and (Test-AIBarrierTouches $bar $target.Start $target.End $target.Padding)) {if ($owned) {$suppressed.Add($block.Name)} else {$conflicts.Add($block.Name)};break}}
    }
    $stacked=0;$stackedExamples=[Collections.Generic.List[object]]::new()
    foreach ($new in @($hubs.Values | Where-Object Generated)) {foreach ($old in @($hubs.Values | Where-Object {!$_.Generated})) {if (!(($old.Flags -band $new.Flags) -band 3) -or [Math]::Abs($old.Position[1]-$new.Position[1]) -lt 1.8) {continue};$distance=[Math]::Sqrt([Math]::Pow($old.Position[0]-$new.Position[0],2)+[Math]::Pow($old.Position[2]-$new.Position[2],2));if ($distance -lt $old.Radius+$new.Radius) {$stacked++;if ($stackedExamples.Count -lt 200) {$stackedExamples.Add([pscustomobject]@{Existing=$old.Name;Generated=$new.Name})}}}}
    if ($suppressed.Count) {$warnings.Add(($suppressed.Count.ToString()+' generated AI barriers were omitted to preserve existing planning corridors at all heights.'))}
    if ($conflicts.Count) {$warnings.Add(($conflicts.Count.ToString()+' existing AI barriers intersect the generated planning. Existing barriers were retained; inspect the merge report before gameplay testing.'))}
    if ($stacked) {$warnings.Add(($stacked.ToString()+' hub overlaps at different heights involve existing planning. Native node circles ignore height; existing hub radii were retained. Review those locations for floor ambiguity.'))}
    return [pscustomobject]@{SuppressedGeneratedBarriers=@($suppressed.ToArray());ExistingBarrierConflicts=@($conflicts.ToArray());StackedHubPairs=$stacked;StackedHubExamples=@($stackedExamples.ToArray());Warnings=@($warnings.ToArray());Hubs=$hubs.Count;Connections=$connections.Count}
}
`;
