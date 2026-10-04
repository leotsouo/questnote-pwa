#requires -Version 7.4
param([string]$Root='',[string]$Policy,[string]$State,[switch]$DryRun)
$ErrorActionPreference='Stop';Import-Module "$PSScriptRoot/lib/disk-governance.psm1"
$c=Get-QuestContext $Root $Policy $State;$lock=Enter-QuestLock $c
try{$registry=Get-QuestRegistry $c;Get-QuestAudit $c $registry|ConvertTo-Json -Depth 20}finally{Exit-QuestLock $lock}
