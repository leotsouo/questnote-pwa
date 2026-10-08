#requires -Version 7.4
$ErrorActionPreference='Stop'
if(-not ('QuestDiskNative' -as [type])){Add-Type -Path "$PSScriptRoot/disk-native.cs"}
if(-not ('QuestProcessMetadata' -as [type])){Add-Type -Path "$PSScriptRoot/process-metadata.cs"}

function Invoke-QuestGit([string]$Path,[string[]]$Arguments){
 $psi=[Diagnostics.ProcessStartInfo]::new('git');$psi.RedirectStandardOutput=$true;$psi.RedirectStandardError=$true;$psi.UseShellExecute=$false;$psi.CreateNoWindow=$true
 foreach($a in @('-c','core.longpaths=true','-c','core.quotepath=false','-c',"safe.directory=$Path",'-C',$Path)+$Arguments){$psi.ArgumentList.Add($a)}
 $psi.Environment['GIT_OPTIONAL_LOCKS']='0';$psi.Environment['GIT_TERMINAL_PROMPT']='0';$psi.Environment['GCM_INTERACTIVE']='Never';$p=[Diagnostics.Process]::Start($psi);$out=$p.StandardOutput.ReadToEndAsync();$err=$p.StandardError.ReadToEndAsync();$p.WaitForExit()
 if($p.ExitCode){throw "Git failure [$($Arguments[0])] exit $($p.ExitCode): $($err.Result)"};return $out.Result.TrimEnd("`r","`n")
}
function Get-QuestPath([string]$Path){return [IO.Path]::GetFullPath($Path).Replace('\','/').TrimEnd('/')}
function Test-QuestInside([string]$Path,[string]$Root){$p=Get-QuestPath $Path;$r=Get-QuestPath $Root;return $p.Equals($r,[StringComparison]::OrdinalIgnoreCase) -or $p.StartsWith("$r/",[StringComparison]::OrdinalIgnoreCase)}
function Assert-QuestLocal([string]$Path,[string]$Root){
 if(-not (Test-QuestInside $Path $Root)){throw 'Target outside verified root'}
 $p=Get-QuestPath $Path;while($p){if(Test-Path -LiteralPath $p){try{[QuestDiskNative]::CheckAncestor($p)}catch{throw "Unsafe/unreadable ancestor $p : $($_.Exception.Message)"}}
  $parent=[IO.Path]::GetDirectoryName($p);if(-not $parent -or (Get-QuestPath $parent) -eq $p){break};$p=Get-QuestPath $parent}
}
function Read-QuestJson([string]$Path){
 Assert-QuestLocal $Path ([IO.Path]::GetDirectoryName((Get-QuestPath $Path)))
 return ([QuestDiskNative]::ReadLocalMetadata($Path)|ConvertFrom-Json -AsHashtable)
}
function Get-QuestContext([string]$Root,[string]$Policy,[string]$State){
 if(-not $Root){$manifest="$PSScriptRoot/../runtime-manifest.json";if(Test-Path -LiteralPath $manifest){$Root=(Read-QuestJson $manifest).root}else{$gitCommon=Invoke-QuestGit $PSScriptRoot @('rev-parse','--path-format=absolute','--git-common-dir');$Root=[IO.Path]::GetDirectoryName($gitCommon)}}
 $rootPath=Get-QuestPath $Root;Assert-QuestLocal $rootPath $rootPath
 $common=Get-QuestPath (Invoke-QuestGit $rootPath @('rev-parse','--path-format=absolute','--git-common-dir'))
 $id=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($common.ToLowerInvariant()))).Substring(0,16).ToLowerInvariant()
 if(-not $Policy){$Policy="$PSScriptRoot/../disk-governance-policy.json"};$config=Read-QuestJson $Policy
 if($config.schema -ne 1){throw 'Unknown policy schema'}
 if(-not $State){$State=Join-Path $rootPath '.dev-backups/disk-governance/state'};$statePath=Get-QuestPath $State;Assert-QuestLocal $statePath $statePath
 $extra="$statePath/protected.json";if(Test-Path -LiteralPath $extra){$add=Read-QuestJson $extra;$config.protectedWorktrees+=@($add.worktrees);$config.protectedPaths+=@($add.paths)}
 return @{root=$rootPath;common=$common;id=$id;policy=$config;policyPath=(Get-QuestPath $Policy);state=$statePath}
}
function Enter-QuestLock($Context){$m=[Threading.Mutex]::new($false,"Global\QuestNoteDiskGovernance-$($Context.id)");$held=$false;try{$held=$m.WaitOne(0)}catch [Threading.AbandonedMutexException]{$held=$true};if(-not $held){$m.Dispose();throw 'Another governance operation is active; cleanup lock refused'};return $m}
function Exit-QuestLock($Lock){$Lock.ReleaseMutex();$Lock.Dispose()}
function Write-QuestJson([string]$Path,$Data){Assert-QuestLocal $Path ([IO.Path]::GetDirectoryName($Path));[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($Path))|Out-Null;$temp="$Path.$([Guid]::NewGuid().ToString('N')).tmp";[IO.File]::WriteAllText($temp,($Data|ConvertTo-Json -Depth 30));[IO.File]::Move($temp,$Path,$true)}
function Get-QuestRegistry($Context){$p="$($Context.state)/registry.json";if(Test-Path -LiteralPath $p){$r=Read-QuestJson $p;if($r.schema -ne 1){throw 'Invalid registry schema'};return $r};return @{schema=1;worktrees=@{};artifacts=@{}}}
function Save-QuestRegistry($Context,$Registry){Write-QuestJson "$($Context.state)/registry.json" $Registry}
function Get-QuestRegistration($Context){
 $text=Invoke-QuestGit $Context.root @('worktree','list','--porcelain');$rows=@()
 foreach($block in ($text -split '\r?\n\r?\n')){$lines=$block -split '\r?\n';$path=Get-QuestPath $lines[0].Substring(9);$head=($lines|Where-Object {$_ -like 'HEAD *'}|Select-Object -First 1);$branch=($lines|Where-Object {$_ -like 'branch *'}|Select-Object -First 1);$rows+=@{path=$path;head=if($head){$head.Substring(5)}else{''};branch=if($branch){$branch.Substring(7)}else{'detached'};locked=!!($lines|Where-Object {$_ -like 'locked*'});prunable=!!($lines|Where-Object {$_ -like 'prunable*'})}}
 return ,$rows
}
function Get-QuestProcesses {
 $session=(Get-Process -Id $PID).SessionId;$result=@()
 foreach($p in Get-CimInstance Win32_Process|Where-Object SessionId -eq $session){if($p.ProcessId -eq $PID){continue};$m=[QuestProcessMetadata]::ReadCwd($p.ProcessId);$result+=@{pid=$p.ProcessId;name=$p.Name;command=[string]$p.CommandLine;cwd=$m[0];error=$m[2]}}
 return ,$result
}
function Get-QuestUsage([string]$Path,$Processes){
 $usage=@();foreach($p in $Processes){$cwd=if($p.cwd){Get-QuestPath $p.cwd}else{''};$cmd=$p.command.Replace('\','/');if(($cwd -and (Test-QuestInside $cwd $Path)) -or $cmd.Contains($Path,[StringComparison]::OrdinalIgnoreCase)){$usage+=@{pid=$p.pid;reason='cwd / command matches'}}elseif($p.error -and $p.name -match '^(node|node_repl|python|java|msbuild|dotnet|expo)' -and -not $p.cwd){$usage+=@{pid=$p.pid;reason='development process cwd unknown'}}};return ,$usage
}
function Test-QuestProtectedWorktree($Context,[string]$Path){foreach($p in $Context.policy.protectedWorktrees){$target=if([IO.Path]::IsPathRooted($p)){Get-QuestPath $p}else{Get-QuestPath (Join-Path $Context.root $p)};if($target.Equals($Path,[StringComparison]::OrdinalIgnoreCase)){return $true}};return $false}
function Test-QuestSensitive($Context,[string]$Path,[string]$Owner){
 $rel=[IO.Path]::GetRelativePath($Owner,$Path).Replace('\','/');if($rel -match '(^|/)(\.git|\.env[^/]*|credentials|signing)(/|$)|\.(db|sqlite\w*|keystore|p12|pfx|pem|key|mobileprovision)$'){return $true}
 foreach($p in $Context.policy.protectedPaths){$target=if([IO.Path]::IsPathRooted($p)){$p}else{Join-Path $Owner $p};if(Test-QuestInside $Path $target){return $true}};return $false
}
function Get-QuestSpace($Files){$seen=@{};$count=@{};$logical=0L;foreach($f in $Files){$logical+=$f.Bytes;$seen[$f.Id]=$f;$count[$f.Id]++};$allocated=0L;$reclaim=0L;foreach($f in $seen.Values){$allocated+=$f.Allocated;if($count[$f.Id] -eq $f.Links){$reclaim+=$f.Allocated}};return @{logical=$logical;allocated=$allocated;reclaimable=$reclaim;files=@($Files).Count}}
function Get-QuestSnapshot($Context){$rows=Get-QuestRegistration $Context;$states=@{};foreach($w in $rows){$states[$w.path]=@{head=(Invoke-QuestGit $w.path @('rev-parse','HEAD'));status=(Invoke-QuestGit $w.path @('status','--porcelain=v1','-z','--untracked-files=all'))}};return @{refs=(Invoke-QuestGit $Context.root @('show-ref'));states=$states;registration=$rows}}
function Assert-QuestSnapshot($Context,$Before,[string[]]$Removed=@()){
 if((Invoke-QuestGit $Context.root @('show-ref')) -ne $Before.refs){throw 'Unexpected Git ref change; halt destructive actions'}
 $current=Get-QuestRegistration $Context;foreach($w in $current){if(-not $Before.states.ContainsKey($w.path)){throw 'Unexpected worktree registration'};$old=$Before.states[$w.path];if((Invoke-QuestGit $w.path @('rev-parse','HEAD')) -ne $old.head -or (Invoke-QuestGit $w.path @('status','--porcelain=v1','-z','--untracked-files=all')) -ne $old.status){throw "Unexpected HEAD/status change: $($w.path)"}}
 foreach($old in $Before.states.Keys){if($old -notin $current.path -and $old -notin $Removed){throw "Unexpected missing worktree: $old"}}
}
function Get-QuestAudit($Context,$Registry){
 $now=[DateTime]::UtcNow;$registration=Get-QuestRegistration $Context;$scan=[QuestDiskNative]::Scan($Context.root);$processes=Get-QuestProcesses;$rows=@();$updated=@{}
 $live=Invoke-QuestGit $Context.root @('ls-remote','--heads','--tags','origin');$hashes=@{};foreach($l in ($live -split '\n')){if($l){$hashes[($l -split '\s+')[0]]=$true}}
 $refs=Invoke-QuestGit $Context.root @('show-ref');$retained=@($refs -split '\n'|Where-Object {$hashes.ContainsKey(($_ -split ' ')[0])}|ForEach-Object {($_ -split ' ')[1]})
 foreach($w in $registration){$path=$w.path;$status=Invoke-QuestGit $path @('status','--porcelain=v1','-z','--untracked-files=all');$ignored=Invoke-QuestGit $path @('ls-files','--others','--ignored','--exclude-standard','-z');$local=if($retained.Count){Invoke-QuestGit $path (@('rev-list','HEAD','--not')+$retained)}else{'UNKNOWN: no live retained refs'}
  # Root project allocation includes all descendants; worktree rows use direct ownership below.
  if(-not (Test-QuestInside $path $Context.root)){$outside=[QuestDiskNative]::Scan($path);$files=@($outside.Files);$unknown=@($outside.Unknown)}else{$children=@($registration|Where-Object {$_.path -ne $path -and (Test-QuestInside $_.path $path)}|ForEach-Object path);$files=@([QuestDiskNative]::Owned($scan,$path,[string[]]$children));$unknown=@($scan.Unknown|Where-Object {$_.Replace('\','/') -like "$path*"})}
  $key=$path.ToLowerInvariant();$meta=$Registry.worktrees[$key];if(-not $meta){$meta=@{path=$path;created=$null;firstSeen=$now.ToString('o');task='legacy / unknown';owner='unknown';status='hold';managed=$false;lastActivity=$now.ToString('o');reason='No task lifecycle evidence; legacy hold'}}else{$meta=$meta.Clone()}
  $fingerprint=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($w.head+$status))).ToLowerInvariant();if($meta.fingerprint -and $meta.fingerprint -ne $fingerprint){$meta.lastActivity=$now.ToString('o')}
  $latest=($files|Sort-Object Modified -Descending|Select-Object -First 1).Modified;if($latest -and $latest -gt [DateTime]$meta.lastActivity){$meta.lastActivity=$latest.ToUniversalTime().ToString('o')};$meta.fingerprint=$fingerprint;$meta.branch=$w.branch;$meta.head=$w.head;$updated[$key]=$meta
  $age=($now-[DateTime]$meta.lastActivity).TotalDays;$merged=((Invoke-QuestGit $path @('merge-base','HEAD','origin/main')) -eq $w.head);$nested=@($scan.Directories|Where-Object {(Test-QuestInside $_ $path) -and (Get-QuestPath $_) -ne $Context.common -and ([IO.Path]::GetFileName($_) -eq '.git')});$nestedWT=@($registration|Where-Object {$_.path -ne $path -and (Test-QuestInside $_.path $path)}).path
  $usage=Get-QuestUsage $path $processes;$protected=Test-QuestProtectedWorktree $Context $path;$reasons=@();if($protected){$reasons+='protected'};if(-not $meta.managed){$reasons+='legacy lifecycle unknown'};if($status){$reasons+='modified / untracked'};if($local){$reasons+='local-only commit or unknown remote proof'};if($ignored){$reasons+='ignored material retained'};if($nested.Count -or $nestedWT.Count){$reasons+='nested repository / worktree'};if($unknown.Count){$reasons+='cloud / reparse / scan uncertainty'};if($usage.Count){$reasons+='process usage / unknown development process'};if($meta.status -ne 'completed'){$reasons+='task not explicitly completed'};if($age -lt $Context.policy.staleDays){$reasons+='inactive period insufficient'};if(-not (Test-QuestInside $path "$($Context.root)/.worktrees")){$reasons+='outside managed worktree area'};if($w.locked -or $w.prunable){$reasons+='Git registration protection / anomaly'}
  $branchRemote=($w.branch -ne 'detached' -and !!($live -split '\n'|Where-Object {($_ -split '\s+')[1] -eq $w.branch}))
  $rows+=@{path=$path;branch=$w.branch;branchOnRemote=$branchRemote;head=$w.head;status=$status;ignored=$ignored;localCommits=$local;mergedMain=$merged;metadata=$meta;ageDays=$age;aging=if($age -lt 7){'Active'}elseif($age -lt 14){'Idle'}elseif($age -lt 30){'Stale'}else{'Old'};usage=$usage;protected=$protected;nested=$nested;nestedWorktrees=$nestedWT;unknown=$unknown;space=(Get-QuestSpace $files);removeEligible=($reasons.Count -eq 0);retainReasons=$reasons}
 }
 $all=@($scan.Files);$testPaths=@($Registry.artifacts.Values|Where-Object {$_.kind -in @('test-success','test-failure')}|ForEach-Object path);$tests=@($all|Where-Object {$f=$_;$f.Path.Replace('\','/') -match '/(test-runs|test-results|playwright-report|coverage|screenshots|traces|videos)/' -or !!($testPaths|Where-Object {Test-QuestInside $f.Path $_})});$spaces=@{project=(Get-QuestSpace $all);worktrees=(Get-QuestSpace @($all|Where-Object {Test-QuestInside $_.Path "$($Context.root)/.worktrees"}));backups=(Get-QuestSpace @($all|Where-Object {$_.Path.Replace('\','/').Contains('/.dev-backups/')}));tests=(Get-QuestSpace $tests)};$levels=@{};foreach($name in $spaces.Keys){$g=$spaces[$name].allocated/1GB;$t=$Context.policy.thresholdsGiB[$name];$levels[$name]=if($g -ge $t[2]){'Critical'}elseif($g -ge $t[1]){'High'}elseif($g -ge $t[0]){'Warning'}else{'Healthy'}}
 $cache="$($Context.state)/npm-cache";$spaces.sharedCache=if(Test-Path -LiteralPath $cache){$cs=[QuestDiskNative]::Scan($cache);Get-QuestSpace $cs.Files}else{@{logical=0;allocated=0;reclaimable=0;files=0}};$t=$Context.policy.thresholdsGiB.sharedCache;$g=$spaces.sharedCache.allocated/1GB;$levels.sharedCache=if($g -ge $t[2]){'Critical'}elseif($g -ge $t[1]){'High'}elseif($g -ge $t[0]){'Warning'}else{'Healthy'}
 return @{time=$now.ToString('o');rows=$rows;registryUpdates=$updated;space=$spaces;levels=$levels;unknown=$scan.Unknown;freeBytes=[QuestDiskNative]::Free();liveRemoteHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($live)));retainedRefs=$retained}
}
function Get-QuestCacheCandidates($Context){
 $root="$($Context.state)/npm-cache/_cacache";if(-not (Test-Path -LiteralPath $root)){return ,@()};Assert-QuestLocal $root $Context.state;$scan=[QuestDiskNative]::Scan($root);if($scan.Unknown.Count){return ,@()};$indexed=@{}
 foreach($f in $scan.Files|Where-Object {$_.Path.Replace('\','/').Contains('/index-v5/')}){
  foreach($line in [IO.File]::ReadAllLines($f.Path)){try{$entry=($line -split "`t",2)[1]|ConvertFrom-Json -AsHashtable;if($entry.key -notmatch '^make-fetch-happen:request-cache:(https://registry\.npmjs\.org/[^?#\s]+)$'){continue};$url=$Matches[1];if($entry.integrity -notmatch '^sha512-([A-Za-z0-9+/=]+)$'){continue};$digest=[Convert]::ToHexString([Convert]::FromBase64String($Matches[1])).ToLowerInvariant();$indexed[$digest]=@{url=$url;headers=$entry.metadata.resHeaders}}catch{continue}}
 }
 $candidates=@();$attempts=0;foreach($f in $scan.Files|Where-Object {$_.Modified -lt [DateTime]::UtcNow.AddDays(-$Context.policy.cacheDays)}|Sort-Object Allocated -Descending){
  $p=$f.Path.Replace('\','/');if($p -notmatch '/content-v2/sha512/([a-f0-9]{2})/([a-f0-9]{2})/([a-f0-9]{124})$'){continue};$digest=$Matches[1]+$Matches[2]+$Matches[3];$proof=$indexed[$digest];if(-not $proof -or -not $proof.headers.etag -or [QuestDiskNative]::Hash512($f.Path) -ne $digest){continue};if($attempts++ -ge 64){break}
  try{$response=Invoke-WebRequest -Uri $proof.url -Method Head -MaximumRedirection 0 -TimeoutSec 5;if([int]$response.StatusCode -ne 200 -or ([string]$response.Headers.ETag) -ne ([string]$proof.headers.etag) -or [long]([string]$response.Headers.'Content-Length') -ne $f.Bytes){continue}}catch{continue}
  $candidates+=@{file=$f;sha256=[QuestDiskNative]::Hash($f.Path);evidence='owned cache / public registry / SHA512 content / current HEAD ETag+length / aged'}
 };return ,$candidates
}
function Test-QuestArtifact($Context,$Artifact,$Audit){
 $reasons=@();$owner=Get-QuestPath $Artifact.owner;$path=Get-QuestPath $Artifact.path;$row=$Audit.rows|Where-Object path -eq $owner|Select-Object -First 1
 if(-not $row){$reasons+='unknown owner'};if($row.protected){$reasons+='protected worktree'};if($row.metadata.status -eq 'active'){$reasons+='task explicitly active'};if($row.ageDays -lt $Context.policy.idleDays){$reasons+='active environment'};if($row.usage.Count){$reasons+='active/unknown process'};if($Artifact.retention -ne 'ephemeral'){$reasons+='release / unique recovery / evidence hold'};if($Artifact.kind -eq 'test-failure' -and -not $Artifact.reviewed){$reasons+='failure diagnostics not reviewed'}
 if(-not $Context.policy.artifactDays.ContainsKey($Artifact.kind)){$reasons+='unknown artifact kind'}elseif(([DateTime]::UtcNow-[DateTime]$Artifact.created).TotalDays -lt $Context.policy.artifactDays[$Artifact.kind]){$reasons+='retention period'}
 if(-not (Test-QuestInside $path $owner) -or $path -eq $owner -or (Test-QuestSensitive $Context $path $owner)){$reasons+='protected / outside output path'}
 if(-not (Test-Path -LiteralPath $path)){$reasons+='output missing'}
 if($reasons.Count){return @{eligible=$false;reasons=$reasons;files=@();space=@{logical=0;allocated=0;reclaimable=0}}}
 Assert-QuestLocal $path $owner;$scan=[QuestDiskNative]::Scan($path);if($scan.Unknown.Count){throw 'Artifact scan unsafe'}
 if((Invoke-QuestGit $owner @('ls-files','--',$Artifact.relative))){throw 'Tracked artifact encountered'}
 if($scan.Directories|Where-Object {[IO.Path]::GetFileName($_) -eq '.git'}){throw 'Nested repository artifact'}
 if($scan.Files.Count -ne @($Artifact.files).Count){return @{eligible=$false;reasons=@('artifact file set changed');files=@();space=(Get-QuestSpace $scan.Files)}}
 $proof=@{};foreach($f in $Artifact.files){$proof[$f.relative]=$f};foreach($f in $scan.Files){$rel=[IO.Path]::GetRelativePath($path,$f.Path).Replace('\','/');$saved=$proof[$rel];if(-not $saved -or (Test-QuestSensitive $Context $f.Path $owner) -or $f.Id -ne $saved.id -or $f.Bytes -ne $saved.bytes -or [QuestDiskNative]::Hash($f.Path) -ne $saved.sha256){return @{eligible=$false;reasons=@('manual modification / unique bytes / sensitive content');files=@();space=(Get-QuestSpace $scan.Files)}}}
 foreach($input in $Artifact.inputs){Assert-QuestLocal $input.path $owner;if([QuestDiskNative]::Hash($input.path) -ne $input.sha256){return @{eligible=$false;reasons=@('rebuild inputs changed');files=@();space=(Get-QuestSpace $scan.Files)}}}
 Invoke-QuestGit $owner @('cat-file','-e',"$($Artifact.sourceHead)^{commit}")|Out-Null
 if($Artifact.kind -eq 'backup-duplicate'){Assert-QuestLocal $Artifact.recoveryPath $Artifact.recoveryPath;$recovery=[QuestDiskNative]::Scan($Artifact.recoveryPath);if($recovery.Unknown.Count -or $recovery.Files.Count -ne $scan.Files.Count){throw 'Recovery copy no longer valid'};$recoveryMap=@{};foreach($f in $recovery.Files){$recoveryMap[[IO.Path]::GetRelativePath($Artifact.recoveryPath,$f.Path).Replace('\','/')]=[QuestDiskNative]::Hash($f.Path)};foreach($rel in $proof.Keys){if($recoveryMap[$rel] -ne $proof[$rel].sha256){throw 'Recovery SHA256 mismatch'}}}
 return @{eligible=$true;reasons=@('complete registered output / unchanged SHA256 / rebuild inputs / inactive owner');files=$scan.Files;directories=$scan.Directories;proof=$proof;space=(Get-QuestSpace $scan.Files)}
}
function Remove-QuestArtifact($Context,$Artifact,$Proof){
 Assert-QuestLocal $Artifact.path $Artifact.owner;foreach($f in $Proof.files){Assert-QuestLocal $f.Path $Artifact.path;$rel=[IO.Path]::GetRelativePath($Artifact.path,$f.Path).Replace('\','/');[QuestDiskNative]::DeleteVerified($f.Path,$f.Id,$Proof.proof[$rel].sha256)}
 foreach($d in ($Proof.directories|Sort-Object Length -Descending)){Assert-QuestLocal $d $Artifact.path;[IO.Directory]::Delete($d,$false)}
}
Export-ModuleMember -Function *-Quest*
