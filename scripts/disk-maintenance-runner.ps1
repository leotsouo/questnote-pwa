# Bootstrap also runs under Windows PowerShell 5.1. No persistent execution-policy change.
param([Parameter(Mandatory)][string]$Root,[Parameter(Mandatory)][string]$State)
$ErrorActionPreference='Stop'
function Assert-LocalRuntimeFile([string]$Path){
 # Inspect metadata before reading bytes; never recall an offloaded OneDrive file.
 $attrs=[IO.File]::GetAttributes($Path)
 if(([int]$attrs -band 0x00441400) -ne 0){throw "Runtime file is offline, cloud/reparse or recall-on-access: $Path"}
}
$manifestPath="$PSScriptRoot/runtime-manifest.json";Assert-LocalRuntimeFile $manifestPath
$manifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json
foreach($file in $manifest.files){$path=Join-Path $PSScriptRoot $file.path;Assert-LocalRuntimeFile $path;if((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256){throw "Installed governance runtime changed: $($file.path)"}}
$pwsh=$manifest.pwsh
if(-not (Test-Path -LiteralPath $pwsh)){$pwsh=(Get-Command pwsh -ErrorAction Stop).Source}
& $pwsh -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PSScriptRoot/worktree-cleanup.ps1" -Root $Root -State $State -Policy "$PSScriptRoot/disk-governance-policy.json"
exit $LASTEXITCODE
