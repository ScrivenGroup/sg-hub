# Deploys scrivengroup-deploy.zip via Kudu using a downloaded Azure publish profile.
# Usage:
#   .\scripts\deploy-with-publish-profile.ps1 -PublishProfilePath ".\app-scrivengroup.PublishSettings"

param(
  [Parameter(Mandatory = $true)]
  [string]$PublishProfilePath,
  [string]$ZipPath = ".\scrivengroup-deploy.zip",
  [switch]$CleanFirst
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (-not (Test-Path $PublishProfilePath)) {
  throw "Publish profile not found: $PublishProfilePath"
}
if (-not (Test-Path $ZipPath)) {
  throw "Zip not found: $ZipPath. Run npm run build and npm run deploy:prepare first."
}

[xml]$xml = Get-Content -Raw $PublishProfilePath
$profile = $xml.publishData.publishProfile |
  Where-Object { $_.publishMethod -eq "MSDeploy" } |
  Select-Object -First 1

if (-not $profile) {
  throw "No MSDeploy profile found in publish settings file"
}

$user = $profile.userName
$pass = $profile.userPWD
$hostName = ($profile.publishUrl -split ":")[0]
if ($hostName -notmatch "\.scm\.") {
  $hostName = $hostName -replace "\.azurewebsites\.net$", ".scm.azurewebsites.net"
}

$pair = "{0}:{1}" -f $user, $pass
$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{ Authorization = "Basic $basic" }

Write-Host "Kudu host: $hostName"

if ($CleanFirst) {
  Write-Host "Cleaning /home/site/wwwroot via Kudu command API..."
  $cmdBody = @{
    command = "bash -c `"rm -rf /home/site/wwwroot/* /tmp/*; df -h /home`""
    dir     = "/home/site/wwwroot"
  } | ConvertTo-Json
  try {
    $clean = Invoke-RestMethod -Method POST -Uri "https://$hostName/api/command" -Headers $headers -ContentType "application/json" -Body $cmdBody -TimeoutSec 120
    Write-Host $clean.Output
    if ($clean.Error) { Write-Host $clean.Error }
  }
  catch {
    Write-Warning "Clean command failed (continuing to zip deploy): $_"
  }
}

Write-Host "Uploading zip synchronously (can take several minutes)..."
$zipFull = (Resolve-Path $ZipPath).Path
# isAsync=false so Kudu finishes extracting node_modules before returning
$deployUri = "https://$hostName/api/zipdeploy?isAsync=false"
try {
  Invoke-RestMethod -Method POST -Uri $deployUri -Headers $headers -InFile $zipFull -ContentType "application/octet-stream" -TimeoutSec 1200
}
catch {
  $status = $null
  try { $status = [int]$_.Exception.Response.StatusCode } catch {}
  if ($status -eq 401) {
    throw @"
Kudu returned 401 Unauthorized. SCM Basic Auth is probably Off.
Portal → app-scrivengroup → Configuration → General settings →
SCM Basic Auth Publishing Credentials → On → Apply, then re-run this script.
"@
  }
  throw
}
Write-Host "Zip deploy finished."
Write-Host "Site: https://app-scrivengroup-ebcdarc2cwbtcjaa.australiaeast-01.azurewebsites.net"
