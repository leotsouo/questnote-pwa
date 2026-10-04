#requires -Version 7.4
param([string]$Root='',[string]$Policy,[string]$State,[string]$TaskName='QuestNote Disk Maintenance',[switch]$DryRun)
$ErrorActionPreference='Stop';Import-Module "$PSScriptRoot/lib/disk-governance.psm1"
$c=Get-QuestContext $Root $Policy $State;$lock=Enter-QuestLock $c
try{
 $runtime=Get-QuestPath (Join-Path ([IO.Path]::GetDirectoryName($c.state)) 'runtime');Assert-QuestLocal $runtime $runtime
 $files=@('worktree-audit.ps1','worktree-cleanup.ps1','worktree-create.ps1','worktree-lifecycle.ps1','worktree-artifact.ps1','disk-maintenance-runner.ps1','disk-governance-policy.json','lib/disk-governance.psm1','lib/disk-native.cs','lib/process-metadata.cs')
 $user=[Security.Principal.WindowsIdentity]::GetCurrent().Name;$pwsh=(Get-Process -Id $PID).Path
 if($DryRun){@{name=$TaskName;runtime=$runtime;state=$c.state;user=$user;schedule='Sunday 03:00 local time; missed run starts when available';multipleInstances='IgnoreNew';privilege='Limited / Interactive logon; no stored password';files=$files}|ConvertTo-Json;return}
 $records=@();foreach($file in $files){$target=Join-Path $runtime $file;[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))|Out-Null;Assert-QuestLocal $target $runtime;[IO.File]::Copy((Join-Path $PSScriptRoot $file),$target,$true);$records+=@{path=$file;sha256=[QuestDiskNative]::Hash($target)}}
 if($Policy){[IO.File]::Copy($c.policyPath,"$runtime/disk-governance-policy.json",$true);($records|Where-Object path -eq 'disk-governance-policy.json').sha256=[QuestDiskNative]::Hash("$runtime/disk-governance-policy.json")}
 Write-QuestJson "$runtime/runtime-manifest.json" @{schema=1;root=$c.root;sourceCommit=(Invoke-QuestGit $PSScriptRoot @('rev-parse','HEAD'));installed=[DateTime]::UtcNow.ToString('o');pwsh=$pwsh;files=$records}
 $bootstrap=[IO.Path]::GetFullPath($pwsh)
 $runnerWin="$runtime/disk-maintenance-runner.ps1".Replace('/','\');$rootWin=$c.root.Replace('/','\');$stateWin=$c.state.Replace('/','\')
 $arguments="-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$runnerWin`" -Root `"$rootWin`" -State `"$stateWin`""
 $action=New-ScheduledTaskAction -Execute $bootstrap -Argument $arguments -WorkingDirectory ([Environment]::SystemDirectory)
 $trigger=New-ScheduledTaskTrigger -Weekly -WeeksInterval 1 -DaysOfWeek Sunday -At '03:00'
 $settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
 $principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().User.Value) -LogonType Interactive -RunLevel Limited
 $task=New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Proof-gated local QuestNote disk governance; preserves unknown/unique/protected data. No push or deployment.'
 $existing=Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
 if($existing){if(-not $existing.Description.StartsWith('Proof-gated local QuestNote disk governance;')){throw 'Unrelated existing task with this name; refusing overwrite'};Set-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal|Out-Null}else{Register-ScheduledTask -TaskName $TaskName -InputObject $task|Out-Null}
 [IO.Directory]::CreateDirectory($c.state)|Out-Null;Export-ScheduledTask -TaskName $TaskName|Set-Content -LiteralPath "$($c.state)/scheduled-task.xml"
 $saved=Get-ScheduledTask -TaskName $TaskName
 @{name=$saved.TaskName;state=[string]$saved.State;runtime=$runtime;registry=$c.state;execute=$bootstrap;arguments=$arguments;schedule='Sunday 03:00 local time; missed run starts when available';multipleInstances='IgnoreNew';privilege='Limited / Interactive; no stored password'}|ConvertTo-Json -Depth 4
}finally{Exit-QuestLock $lock}
