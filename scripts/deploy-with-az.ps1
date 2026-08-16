# Deploys scrivengroup-deploy.zip via Azure CLI (Entra login — no SCM Basic Auth).
# Usage:
#   .\scripts\deploy-with-az.ps1
#   .\scripts\deploy-with-az.ps1 -ZipPath ".\scrivengroup-deploy.zip"

param(
  [string]$ResourceGroup = "rg-scrivengroup",
  [string]$AppName = "app-scrivengroup",
  [string]$ZipPath = ".\scrivengroup-deploy.zip"
)

$ErrorActionPreference = "Stop"

$az = Get-Command az -ErrorAction SilentlyContinue
if (-not $az) {
  $candidates = @(
    "$env:ProgramFiles\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
    "$env:LOCALAPPDATA\Programs\Azure\CLI2\wbin\az.cmd"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) {
      $env:Path = "$(Split-Path $c -Parent);$env:Path"
      break
    }
  }
  $az = Get-Command az -ErrorAction SilentlyContinue
}

if (-not $az) {
  throw "Azure CLI (az) not found. Install with: winget install -e --id Microsoft.AzureCLI"
}

if (-not (Test-Path $ZipPath)) {
  throw "Zip not found: $ZipPath. Run npm run build, npm run deploy:prepare, npm run deploy:zip first."
}

Write-Host "Checking Azure login..."
try {
  $account = az account show --output json 2>$null | ConvertFrom-Json
  if (-not $account) { throw "not logged in" }
  Write-Host ("Logged in as {0} ({1})" -f $account.user.name, $account.name)
}
catch {
  throw "Not logged into Azure CLI. Run: az login"
}

$zipFull = (Resolve-Path $ZipPath).Path
Write-Host "Deploying $zipFull → $AppName ($ResourceGroup)..."
az webapp deploy `
  --resource-group $ResourceGroup `
  --name $AppName `
  --src-path $zipFull `
  --type zip `
  --async false

if ($LASTEXITCODE -ne 0) {
  throw "az webapp deploy failed (exit $LASTEXITCODE)"
}

Write-Host "Zip deploy finished."
Write-Host "Site: https://app-scrivengroup-ebcdarc2cwbtcjaa.australiaeast-01.azurewebsites.net"
Write-Host "SCM Basic Auth can stay Off - this path uses Entra via az."
