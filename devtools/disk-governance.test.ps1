#requires -Version 7.4
# Real isolated Git repositories, remote refs, child process lock and native deletion.
$ErrorActionPreference='Stop';$scripts=[IO.Path]::GetFullPath("$PSScriptRoot/../scripts");Import-Module "$scripts/lib/disk-governance.psm1" -DisableNameChecking
$pwsh=(Get-Process -Id $PID).Path;$fixture=Join-Path ([IO.Path]::GetTempPath()) "questnote-governance-test-$([Guid]::NewGuid().ToString('N'))";$repo="$fixture/repo";$state="$fixture/state";$remote="$fixture/remote";$results=@()
function Assert([bool]$Condition,[string]$Message){if(-not $Condition){throw "ASSERT: $Message"};$script:results+=,$Message;Write-Output "PASS $Message"}
function Git([string]$p,[string[]]$a){Invoke-QuestGit $p $a}
function RunScript([string]$File,[string[]]$Arguments){$psi=[Diagnostics.ProcessStartInfo]::new($pwsh);$psi.UseShellExecute=$false;$psi.CreateNoWindow=$true;$psi.RedirectStandardOutput=$true;$psi.RedirectStandardError=$true;foreach($a in @('-NoProfile','-File',"$scripts/$File")+$Arguments){$psi.ArgumentList.Add($a)};$p=[Diagnostics.Process]::Start($psi);$o=$p.StandardOutput.ReadToEndAsync();$e=$p.StandardError.ReadToEndAsync();$p.WaitForExit();return @{code=$p.ExitCode;out=$o.Result;error=$e.Result}}
function CreateFixture([string]$Name){$r=RunScript 'worktree-create.ps1' @('-Root',$repo,'-State',$state,'-Name',$Name,'-Task',"fixture-$Name",'-Owner','test-runner');if($r.code){throw $r.error};return Get-QuestPath "$repo/.worktrees/$Name"}
function AgeFixtures {
 $r=Get-QuestRegistry $script:c;foreach($m in $r.worktrees.Values){if($m.path -ne (Get-QuestPath $repo)){$m.lastActivity=[DateTime]::UtcNow.AddDays(-31).ToString('o');$m.status='completed';$m.reason='synthetic task completed';$m.fingerprint=$null}}
 foreach($a in $r.artifacts.Values){$a.created=[DateTime]::UtcNow.AddDays(-31).ToString('o')};Save-QuestRegistry $script:c $r
 $s=[QuestDiskNative]::Scan($repo);foreach($f in $s.Files){[IO.File]::SetLastWriteTimeUtc($f.Path,[DateTime]::UtcNow.AddDays(-31))}
}
try{
 [IO.Directory]::CreateDirectory($repo)|Out-Null;Git $repo @('init','-b','main')|Out-Null;Git $repo @('config','user.name','Governance Fixture')|Out-Null;Git $repo @('config','user.email','fixture@example.invalid')|Out-Null
 [IO.File]::WriteAllText("$repo/.gitignore",".worktrees/`n.dev-backups/`nnode_modules/`n")
 [IO.File]::WriteAllText("$repo/README.md",'synthetic source')
 [IO.File]::WriteAllText("$repo/generate.ps1",'param([string]$Output); [IO.Directory]::CreateDirectory($Output)|Out-Null; [IO.File]::WriteAllBytes("$Output/payload.bin",[byte[]]::new(2097152)); [IO.File]::WriteAllText("$Output/receipt.txt","synthetic disposable")')
 Git $repo @('add','.');Git $repo @('commit','-m','Synthetic governance fixture')|Out-Null
 [IO.Directory]::CreateDirectory($remote)|Out-Null;Git $remote @('init','--bare','-b','main')|Out-Null;Git $remote @('fetch',$repo,'main:refs/heads/main')|Out-Null;Git $repo @('remote','add','origin',$remote);Git $repo @('fetch','origin')|Out-Null
 $script:c=Get-QuestContext $repo "$scripts/disk-governance-policy.json" $state
 $clean=CreateFixture 'clean';$modified=CreateFixture 'modified';$untracked=CreateFixture 'untracked';$local=CreateFixture 'local';$deps=CreateFixture 'dependencies';$protected=CreateFixture 'protected'
 # Completed fixture metadata frees the active limit without altering any safety evidence.
 AgeFixtures;$nested=CreateFixture 'nested';AgeFixtures
 [IO.File]::WriteAllText("$modified/README.md",'unique uncommitted code');[IO.File]::WriteAllText("$untracked/unique.txt",'unique untracked')
 [IO.File]::WriteAllText("$local/README.md",'unique local commit');Git $local @('add','README.md');Git $local @('commit','-m','Unpushed fixture commit')|Out-Null
 [IO.Directory]::CreateDirectory("$nested/.dev-backups/nested")|Out-Null;Git "$nested/.dev-backups/nested" @('init')|Out-Null
 Write-QuestJson "$state/protected.json" @{worktrees=@($protected);paths=@()}
 # The producer wrapper records a NEW generated dependency-shaped output; no existing files can be blessed as disposable.
 $reg=Get-QuestRegistry $c;$reg.worktrees[$deps.ToLowerInvariant()].status='active';Save-QuestRegistry $c $reg
 & "$scripts/worktree-artifact.ps1" -Root $repo -State $state -Action Run -Path "$deps/node_modules" -Worktree $deps -Kind generated -Retention ephemeral -Inputs "$deps/generate.ps1" -Executable $pwsh -CommandArguments @('-NoProfile','-File',"$deps/generate.ps1",'-Output',"$deps/node_modules")|Out-Null
 $combined=CreateFixture 'combined'
 & "$scripts/worktree-artifact.ps1" -Root $repo -State $state -Action Run -Path "$combined/node_modules" -Worktree $combined -Kind generated -Retention ephemeral -Inputs "$combined/generate.ps1" -Executable $pwsh -CommandArguments @('-NoProfile','-File',"$combined/generate.ps1",'-Output',"$combined/node_modules")|Out-Null
 $manual=CreateFixture 'manual'
 & "$scripts/worktree-artifact.ps1" -Root $repo -State $state -Action Run -Path "$manual/node_modules" -Worktree $manual -Kind generated -Retention ephemeral -Inputs "$manual/generate.ps1" -Executable $pwsh -CommandArguments @('-NoProfile','-File',"$manual/generate.ps1",'-Output',"$manual/node_modules")|Out-Null
 [IO.File]::WriteAllText("$manual/node_modules/receipt.txt",'manual unique patch')
 [IO.File]::WriteAllText("$deps/README.md",'modified source must remain');AgeFixtures
 $before=Get-QuestSnapshot $c;$stateHash=[QuestDiskNative]::Hash("$state/registry.json")
 $dry=RunScript 'worktree-cleanup.ps1' @('-Root',$repo,'-State',$state,'-DryRun');if($dry.code){throw $dry.error};$dryReport=$dry.out|ConvertFrom-Json -AsHashtable
 Assert ($stateHash -eq [QuestDiskNative]::Hash("$state/registry.json")) 'DryRun leaves metadata unchanged'
 Assert (!!($dryReport.actions|Where-Object { $_.kind -eq 'worktree' -and $_.path -eq $clean })) '1 clean + merged + completed stale worktree eligible'
 foreach($pair in @(@($modified,'2 modified retained'),@($untracked,'3 untracked retained'),@($local,'4 local-only commit retained'),@($protected,'6 protected retained'),@($nested,'7 nested repository retained'))){Assert (-not ($dryReport.actions|Where-Object {$_.kind -eq 'worktree' -and $_.path -eq $pair[0]})) $pair[1]}
 Assert (!!($dryReport.actions|Where-Object { $_.path -eq "$deps/node_modules" })) '5 generated dependency output eligible while dirty worktree retained'
 Assert (!!($dryReport.actions|Where-Object { $_.kind -eq 'worktree' -and $_.path -eq $combined })) 'DryRun predicts source worktree removal after generated cleanup'
 Assert (-not ($dryReport.actions|Where-Object { $_.path -eq "$manual/node_modules" -or $_.path -eq $manual })) 'Manual dependency patch retains both output and worktree'
 # Actual cross-process mutex contention.
 $psi=[Diagnostics.ProcessStartInfo]::new($pwsh);$psi.UseShellExecute=$false;$psi.CreateNoWindow=$true;$psi.RedirectStandardInput=$true;$psi.RedirectStandardOutput=$true;$psi.RedirectStandardError=$true
 foreach($a in @('-NoProfile','-Command',"Import-Module '$scripts/lib/disk-governance.psm1' -DisableNameChecking; `$c=Get-QuestContext '$repo' '$scripts/disk-governance-policy.json' '$state'; `$l=Enter-QuestLock `$c; [Console]::WriteLine('LOCKED'); [Console]::ReadLine()|Out-Null; Exit-QuestLock `$l")){$psi.ArgumentList.Add($a)}
 $holder=[Diagnostics.Process]::Start($psi);Assert ($holder.StandardOutput.ReadLine() -eq 'LOCKED') 'Lock holder acquired';$second=RunScript 'worktree-cleanup.ps1' @('-Root',$repo,'-State',$state,'-DryRun');Assert ($second.code -ne 0 -and $second.error -match 'cleanup lock refused') '8 concurrent cleanup refused';$holder.StandardInput.WriteLine('release');$holder.WaitForExit()
 $real=RunScript 'worktree-cleanup.ps1' @('-Root',$repo,'-State',$state);if($real.code){throw ($real.out+$real.error)}
 Assert (-not (Test-Path -LiteralPath $clean)) 'Real normal git worktree remove succeeds'
 Assert (-not (Test-Path -LiteralPath $combined)) 'Real cleanup matches combined generated-plus-worktree DryRun'
 Assert (([IO.File]::ReadAllText("$manual/node_modules/receipt.txt")) -eq 'manual unique patch') 'Manual dependency patch survives actual cleanup'
 Assert (-not (Test-Path -LiteralPath "$deps/node_modules") -and (Test-Path -LiteralPath $deps)) 'Real generated deletion preserves modified worktree'
 Assert (([IO.File]::ReadAllText("$modified/README.md")) -eq 'unique uncommitted code') 'Modified bytes survive'
 Assert ((Invoke-QuestGit $repo @('show-ref')) -eq $before.refs) 'All refs survive actual cleanup'
 Git $repo @('remote','remove','origin');$fail=RunScript 'worktree-cleanup.ps1' @('-Root',$repo,'-State',$state);$failReport=$fail.out|ConvertFrom-Json -AsHashtable;Assert ($fail.code -ne 0 -and $failReport.actions.Count -eq 0 -and $failReport.destructiveActionsStopped) '9 Git failure stops destructive actions';Git $repo @('remote','add','origin',$remote)
 # Native hardlink accounting and wrong-hash atomic deletion rejection.
 [IO.Directory]::CreateDirectory("$fixture/links")|Out-Null;[IO.File]::WriteAllText("$fixture/links/a.txt",'shared bytes');New-Item -ItemType HardLink -Path "$fixture/b.txt" -Target "$fixture/links/a.txt"|Out-Null
 $s=[QuestDiskNative]::Scan("$fixture/links");Assert ((Get-QuestSpace $s.Files).reclaimable -eq 0) 'Hardlink outside target excluded from reclaim estimate'
 $rejected=$false;try{[QuestDiskNative]::DeleteVerified($s.Files[0].Path,$s.Files[0].Id,('0'*64))}catch{$rejected=$true};Assert ($rejected -and (Test-Path -LiteralPath "$fixture/links/a.txt")) 'Wrong SHA256 never deletes file'
 $r=RunScript 'worktree-artifact.ps1' @('-Root',$repo,'-State',$state,'-Action','Capture','-Path',"$deps/.dev-backups",'-Worktree',$deps,'-Retention','ephemeral','-Reason','name-only');Assert ($r.code -ne 0) 'Existing unique content cannot be blessed as regenerated'
 Git $repo @('fetch','origin')|Out-Null;$policy=Get-Content -LiteralPath "$scripts/disk-governance-policy.json" -Raw|ConvertFrom-Json -AsHashtable;$policy.thresholdsGiB.worktrees=@(0,0,0);Write-QuestJson "$fixture/critical-policy.json" $policy
 $refs=Git $repo @('show-ref');$blocked=RunScript 'worktree-create.ps1' @('-Root',$repo,'-State',$state,'-Policy',"$fixture/critical-policy.json",'-Name','blocked','-Task','fixture','-Owner','fixture','-DryRun')
 Assert ($blocked.code -ne 0 -and $blocked.error -match 'Critical' -and $refs -eq (Git $repo @('show-ref'))) 'Critical capacity refuses creation without ref changes'
 [IO.File]::WriteAllText("$fixture/single.zip",'synthetic archive bytes');$single=[QuestDiskNative]::Scan("$fixture/single.zip");Assert ($single.Files.Count -eq 1 -and $single.Unknown.Count -eq 0) 'Single ZIP/bundle metadata supported without recursive scan'
 $bytes=[Text.Encoding]::UTF8.GetBytes('original cached bytes');$digest=[Convert]::ToHexString([Security.Cryptography.SHA512]::HashData($bytes)).ToLowerInvariant();$content="$state/npm-cache/_cacache/content-v2/sha512/$($digest.Substring(0,2))/$($digest.Substring(2,2))/$($digest.Substring(4))";[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($content))|Out-Null;[IO.File]::WriteAllText($content,'manual cache patch');[IO.File]::SetLastWriteTimeUtc($content,[DateTime]::UtcNow.AddDays(-31));[IO.Directory]::CreateDirectory("$state/npm-cache/_cacache/index-v5/fixture")|Out-Null
 $entry=@{key='make-fetch-happen:request-cache:https://registry.npmjs.org/synthetic-fixture';integrity='sha512-'+[Convert]::ToBase64String([Security.Cryptography.SHA512]::HashData($bytes));metadata=@{resHeaders=@{etag='fixture'}}}|ConvertTo-Json -Depth 5 -Compress;[IO.File]::WriteAllText("$state/npm-cache/_cacache/index-v5/fixture/index", "fixture`t$entry`n")
 Assert ((Get-QuestCacheCandidates $c).Count -eq 0 -and (Test-Path -LiteralPath $content)) 'Modified cache bytes never treated as rebuildable public cache'
 $defaults=Get-QuestContext $repo "$scripts/disk-governance-policy.json" ''
 Assert ($defaults.state -eq (Get-QuestPath "$repo/.dev-backups/disk-governance/state") -and -not (Test-Path -LiteralPath $defaults.state)) 'Default shared state resolves from root without creating files'
 Assert (Test-QuestSensitive $defaults "$repo/.dev-backups/disk-governance/runtime/payload" $repo) 'Installed governance runtime and state are protected'
 $testOutput="$repo/.dev-backups/test-runs/held-evidence";[IO.Directory]::CreateDirectory($testOutput)|Out-Null;[IO.File]::WriteAllBytes("$testOutput/evidence.bin",[byte[]]::new(1048576))
 $capacity=Get-QuestAudit $c (Get-QuestRegistry $c)
 Assert ($capacity.space.tests.allocated -ge 1048576) 'New test-runs output is counted by test capacity guardrail even when held'
 Write-Output "RESULT: $($results.Count) assertions PASS"
}finally{
 # These are this test's synthetic files only. Enumerate exact files, no recursive delete / links traversal.
 if(Test-Path -LiteralPath $fixture){
  if(-not ([IO.Path]::GetFullPath($fixture)).StartsWith(([IO.Path]::GetFullPath([IO.Path]::GetTempPath())+'questnote-governance-test-'),[StringComparison]::OrdinalIgnoreCase)){throw 'Fixture cleanup boundary'}
  $scan=[QuestDiskNative]::Scan($fixture);if($scan.Unknown.Count){Write-Warning "Fixture retained due uncertainty: $fixture"}else{
   foreach($f in $scan.Files){$hash=[QuestDiskNative]::Hash($f.Path);[IO.File]::SetAttributes($f.Path,[IO.FileAttributes]::Normal);[QuestDiskNative]::DeleteVerified($f.Path,$f.Id,$hash)}
   foreach($d in ($scan.Directories|Sort-Object Length -Descending)){[IO.File]::SetAttributes($d,[IO.FileAttributes]::Directory);[IO.Directory]::Delete($d,$false)}
  }
 }
}
