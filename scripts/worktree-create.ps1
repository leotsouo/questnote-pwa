#requires -Version 7.4
param([Parameter(Mandatory)][string]$Name,[Parameter(Mandatory)][string]$Task,[Parameter(Mandatory)][string]$Owner,[string]$Branch="codex/$Name",[string]$StartPoint='origin/main',[string]$Root='',[string]$Policy,[string]$State,[switch]$DryRun)
$ErrorActionPreference='Stop';Import-Module "$PSScriptRoot/lib/disk-governance.psm1"
if($Name -notmatch '^[a-z][a-z0-9-]{0,63}$' -or $Name -match '^(con|prn|aux|nul|com[1-9]|lpt[1-9])$'){throw 'Unsafe worktree name'}
if($Branch -notlike 'codex/*'){throw 'Use a codex/ feature branch'}
$c=Get-QuestContext $Root $Policy $State;$lock=Enter-QuestLock $c
try{
 $registry=Get-QuestRegistry $c;$audit=Get-QuestAudit $c $registry;$count=@($registry.worktrees.Values|Where-Object {$_.managed -and $_.status -eq 'active'}).Count
 if($count -ge $c.policy.maxActiveManagedWorktrees){throw 'Managed active worktree limit reached; complete/hold existing tasks first'}
 $sourceBytes=0L;foreach($line in ((Invoke-QuestGit $c.root @('ls-tree','-r','-l',$StartPoint)) -split '\n')){if($line -match '^\d+ blob [a-f0-9]+\s+(\d+)\t'){$sourceBytes+=[long]$Matches[1]}}
 if($audit.space.worktrees.allocated+$sourceBytes+32MB -ge $c.policy.thresholdsGiB.worktrees[2]*1GB -or $audit.space.project.allocated+$sourceBytes+32MB -ge $c.policy.thresholdsGiB.project[2]*1GB){throw 'Projected worktree/project allocation reaches Critical; refuse creation rather than delete protected data'}
 $path=Get-QuestPath (Join-Path "$($c.root)/.worktrees" $Name);Assert-QuestLocal $path $c.root;if(Test-Path -LiteralPath $path){throw 'Target already exists'}
 if($DryRun){@{path=$path;branch=$Branch;task=$Task;owner=$Owner;projectedLogicalSourceBytes=$sourceBytes;level=$audit.levels.worktrees;installDependencies=$false}|ConvertTo-Json;return}
 Invoke-QuestGit $c.root @('worktree','add','-b',$Branch,$path,$StartPoint)|Out-Null
 $now=[DateTime]::UtcNow.ToString('o');$registry.worktrees[$path.ToLowerInvariant()]=@{path=$path;created=$now;firstSeen=$now;lastActivity=$now;branch="refs/heads/$Branch";head=(Invoke-QuestGit $path @('rev-parse','HEAD'));task=$Task;owner=$Owner;managed=$true;status='active';reason='standard wrapper'}
 # Check the ignore policy without changing the checkout or installing anything.
 $ignore=Invoke-QuestGit $path @('check-ignore','--no-index','node_modules/','.dev-backups/','.worktrees/')
 $checked=@($ignore -split '\r?\n');if(@('node_modules/','.dev-backups/','.worktrees/')|Where-Object {$_ -notin $checked}){$registry.worktrees[$path.ToLowerInvariant()].status='hold';$registry.worktrees[$path.ToLowerInvariant()].reason='Incomplete ignore policy; retain created worktree';Save-QuestRegistry $c $registry;throw 'Incomplete ignore policy; new checkout retained and marked hold'}
 Save-QuestRegistry $c $registry
 @{path=$path;branch=$Branch;task=$Task;owner=$Owner;ignoreChecked=$ignore;dependenciesInstalled=$false;environment='Node 24 / npm ci only when execution is needed';state=$c.state;cleanup='touch activity; complete task; weekly proof-gated cleanup'}|ConvertTo-Json
}finally{Exit-QuestLock $lock}
