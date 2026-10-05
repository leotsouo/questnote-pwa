#requires -Version 7.4
param([string]$Root='',[string]$Policy,[string]$State,[switch]$DryRun)
$ErrorActionPreference='Stop';Import-Module "$PSScriptRoot/lib/disk-governance.psm1"
$c=Get-QuestContext $Root $Policy $State;$lock=Enter-QuestLock $c;$report=@{schema=1;time=[DateTime]::UtcNow.ToString('o');dryRun=[bool]$DryRun;actions=@();retained=@();errors=@();gitIntegrity='NOT RUN'}
try{
 $registry=Get-QuestRegistry $c;$before=Get-QuestSnapshot $c;Invoke-QuestGit $c.root @('fsck','--connectivity-only')|Out-Null
 $audit=Get-QuestAudit $c $registry;$report.before=$audit.space;$report.freeBefore=$audit.freeBytes;$report.thresholdsBefore=$audit.levels;$removed=@()
 foreach($key in $audit.registryUpdates.Keys){$registry.worktrees[$key]=$audit.registryUpdates[$key]}
 $cache=Get-QuestCacheCandidates $c;if($cache.Count){Assert-QuestSnapshot $c $before $removed;$space=Get-QuestSpace @($cache|ForEach-Object {$_.file});$report.actions+=@{kind='shared-cache';path="$($c.state)/npm-cache/_cacache/content-v2";files=$cache.Count;logical=$space.logical;estimatedRecoverable=$space.reclaimable;evidence=@('owned public cache / native identities / SHA512 / live HEAD ETag+length / 30-day retention');executed=(-not $DryRun)};if(-not $DryRun){foreach($item in $cache){Assert-QuestLocal $item.file.Path $c.state;[QuestDiskNative]::DeleteVerified($item.file.Path,$item.file.Id,$item.sha256)};Assert-QuestSnapshot $c $before $removed}}
 $candidates=@();foreach($id in @($registry.artifacts.Keys)){$a=$registry.artifacts[$id];$proof=Test-QuestArtifact $c $a $audit;if($proof.eligible){$candidates+=@{id=$id;artifact=$a;proof=$proof}}else{$report.retained+=@{kind='artifact';path=$a.path;reasons=$proof.reasons}}}
 foreach($item in ($candidates|Sort-Object {$_.proof.space.reclaimable} -Descending)){
  Assert-QuestSnapshot $c $before $removed;$a=$item.artifact;$usage=Get-QuestUsage $a.owner (Get-QuestProcesses);if($usage.Count){$report.retained+=@{path=$a.path;reasons=@('current process usage')};continue}
  $fresh=Test-QuestArtifact $c $a $audit;if(-not $fresh.eligible){$report.retained+=@{path=$a.path;reasons=$fresh.reasons};continue}
  $report.actions+=@{kind=$a.kind;path=$a.path;logical=$fresh.space.logical;estimatedRecoverable=$fresh.space.reclaimable;evidence=$fresh.reasons;executed=(-not $DryRun)}
  if(-not $DryRun){Remove-QuestArtifact $c $a $fresh;$registry.artifacts.Remove($item.id);Assert-QuestSnapshot $c $before $removed}
 }
 # A fresh audit sees ignored outputs disappear, but cannot promote legacy metadata.
 $review=if($DryRun){$audit}else{Get-QuestAudit $c $registry}
 if($DryRun){foreach($w in $review.rows){$outputs=@($candidates|Where-Object {$_.artifact.owner -eq $w.path});$remainingIgnored=@($w.ignored -split "`0"|Where-Object {$_}|Where-Object {$rel=$_; -not ($outputs|Where-Object {$prefix=$_.artifact.relative.TrimEnd('/');$rel -eq $prefix -or $rel.StartsWith("$prefix/",[StringComparison]::OrdinalIgnoreCase)})});if($outputs.Count -and -not $remainingIgnored.Count){$w.retainReasons=@($w.retainReasons|Where-Object {$_ -ne 'ignored material retained'});$w.removeEligible=($w.retainReasons.Count -eq 0)}}}
 foreach($w in ($review.rows|Sort-Object {$_.space.reclaimable} -Descending)){
  if(-not $w.removeEligible){$report.retained+=@{kind='worktree';path=$w.path;reasons=$w.retainReasons};continue}
  Assert-QuestSnapshot $c $before $removed;Assert-QuestLocal $w.path $c.root
  if((Get-QuestUsage $w.path (Get-QuestProcesses)).Count){$report.retained+=@{path=$w.path;reasons=@('current process usage')};continue}
  if((Invoke-QuestGit $w.path @('status','--porcelain=v1','--untracked-files=all')) -or ((-not $DryRun) -and (Invoke-QuestGit $w.path @('ls-files','--others','--ignored','--exclude-standard')))){throw 'Fresh worktree status/ignored changed'}
  if((Invoke-QuestGit $w.path (@('rev-list','HEAD','--not')+$review.retainedRefs))){throw 'Fresh remote retention proof failed'}
  $tree=[QuestDiskNative]::Scan($w.path);if($tree.Unknown.Count){throw 'Fresh scan uncertainty'};foreach($f in $tree.Files){[QuestDiskNative]::Probe($f.Path)}
  $residual=$tree.Files;if($DryRun){$outputs=@($candidates|Where-Object {$_.artifact.owner -eq $w.path});$residual=@($tree.Files|Where-Object {$f=$_; -not ($outputs|Where-Object {Test-QuestInside $f.Path $_.artifact.path})})};$remainingSpace=Get-QuestSpace $residual
  $report.actions+=@{kind='worktree';path=$w.path;logical=$remainingSpace.logical;estimatedRecoverable=$remainingSpace.reclaimable;evidence=@('clean / no ignored unique file / live remote ancestry / completed task / aged / no process or nested repo');executed=(-not $DryRun)}
  if(-not $DryRun){Invoke-QuestGit $c.root @('worktree','remove',$w.path)|Out-Null;$removed+=,$w.path;$registry.worktrees[$w.path.ToLowerInvariant()].status='removed';$registry.worktrees[$w.path.ToLowerInvariant()].removedAt=[DateTime]::UtcNow.ToString('o');Assert-QuestSnapshot $c $before $removed}
 }
 Assert-QuestSnapshot $c $before $removed;Invoke-QuestGit $c.root @('fsck','--connectivity-only')|Out-Null;$report.gitIntegrity='PASS'
 $after=if($DryRun){$audit}else{Get-QuestAudit $c $registry};$report.after=$after.space;$report.freeAfter=[QuestDiskNative]::Free();$report.observedFreeDelta=if($DryRun){0}else{[long]$report.freeAfter-[long]$report.freeBefore};$report.thresholdsAfter=$after.levels;$report.remainingWorktrees=$after.rows.Count;$report.measurementUnknown=$after.unknown
 if(-not $DryRun){foreach($key in $after.registryUpdates.Keys){$registry.worktrees[$key]=$after.registryUpdates[$key]};foreach($key in @($registry.worktrees.Keys)){$m=$registry.worktrees[$key];if($m.status -eq 'removed' -and $m.removedAt -and $m.path -notin $after.rows.path -and [DateTime]$m.removedAt -lt [DateTime]::UtcNow.AddDays(-$c.policy.logDays)){$registry.worktrees.Remove($key)}};Save-QuestRegistry $c $registry}
}catch{$report.errors+=,$_.Exception.Message;$report.gitIntegrity='FAIL / STOPPED';$report.destructiveActionsStopped=$true}
finally{
 if(-not $DryRun){
  Write-QuestJson "$($c.state)/latest.json" $report
  $log="$($c.state)/logs/maintenance-$([DateTime]::UtcNow.ToString('yyyyMMddTHHmmss'))-$([Guid]::NewGuid().ToString('N')).json";Write-QuestJson $log $report
  $logs=@(Get-ChildItem -LiteralPath "$($c.state)/logs" -File|Where-Object Name -match '^maintenance-\d{8}T\d{6}-[a-f0-9]{32}\.json$'|Sort-Object LastWriteTimeUtc -Descending)
  for($i=0;$i -lt $logs.Count;$i++){if($i -ge $c.policy.logCount -or $logs[$i].LastWriteTimeUtc -lt [DateTime]::UtcNow.AddDays(-$c.policy.logDays)){Assert-QuestLocal $logs[$i].FullName "$($c.state)/logs";[IO.File]::Delete($logs[$i].FullName)}}
 }
 Exit-QuestLock $lock
}
$report|ConvertTo-Json -Depth 20
if($report.errors.Count){exit 1};if(@($report.thresholdsAfter.Values|Where-Object {$_ -eq 'Critical'}).Count){exit 2}
