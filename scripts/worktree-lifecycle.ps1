#requires -Version 7.4
param([Parameter(Mandatory)][ValidateSet('Adopt','Touch','Complete','Hold')][string]$Action,[Parameter(Mandatory)][string]$Path,[string]$Task,[string]$Owner,[string]$Reason,[string]$Root='',[string]$Policy,[string]$State,[switch]$DryRun)
$ErrorActionPreference='Stop';Import-Module "$PSScriptRoot/lib/disk-governance.psm1"
$c=Get-QuestContext $Root $Policy $State;$lock=Enter-QuestLock $c
try{
 $path=Get-QuestPath $Path;$rows=Get-QuestRegistration $c;if($path -notin $rows.path){throw 'Not a registered worktree'};$registry=Get-QuestRegistry $c;$key=$path.ToLowerInvariant();$meta=$registry.worktrees[$key];$now=[DateTime]::UtcNow.ToString('o')
 if($Action -eq 'Adopt'){if(-not $Task -or -not $Owner){throw 'Adopt requires explicit task and owner'};$meta=@{path=$path;created=$null;firstSeen=$now;managed=$true;task=$Task;owner=$Owner;status='active';lastActivity=$now;reason='explicitly adopted; historical creation time unknown'}}elseif(-not $meta){throw 'Unknown lifecycle; adopt with actual owner/task first'}
 if($Action -eq 'Touch'){$meta.status='active';$meta.lastActivity=$now}
 if($Action -eq 'Complete'){if(-not $Reason){throw 'Record integration / remote retention / task completion evidence'};$meta.status='completed';$meta.reason=$Reason;$meta.lastActivity=$now}
 if($Action -eq 'Hold'){if(-not $Reason){throw 'Hold reason required'};$meta.status='hold';$meta.reason=$Reason;$meta.lastActivity=$now}
 $meta.head=Invoke-QuestGit $path @('rev-parse','HEAD');$meta.gitStatus=Invoke-QuestGit $path @('status','--porcelain=v1','--untracked-files=all');$registry.worktrees[$key]=$meta
 if(-not $DryRun){Save-QuestRegistry $c $registry};$meta|ConvertTo-Json -Depth 8
}finally{Exit-QuestLock $lock}
