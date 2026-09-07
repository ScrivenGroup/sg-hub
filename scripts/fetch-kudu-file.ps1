# Download one wwwroot file via Kudu + Entra. Prints status/bytes only.
# Never prints token, file contents, or passwords.
param(
  [Parameter(Mandatory = $true)][string]$RelPath,
  [Parameter(Mandatory = $true)][string]$Dest
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
}

$scmHost = az webapp show --name app-scrivengroup --resource-group rg-scrivengroup --query "enabledHostNames[?contains(@, '.scm.')] | [0]" -o tsv
if (-not $scmHost) {
  Write-Output "status=0 bytes=0 via=no-scm-host"
  exit 1
}
Write-Output "scm-host=$scmHost"

$token = az account get-access-token --resource "https://management.azure.com/" --query accessToken -o tsv
if (-not $token) {
  Write-Output "status=0 bytes=0 via=no-token"
  exit 1
}

$headers = @{ Authorization = "Bearer $token" }
$url = "https://$scmHost/api/vfs/site/wwwroot/$RelPath"
try {
  Invoke-WebRequest -Uri $url -Headers $headers -OutFile $Dest -UseBasicParsing -TimeoutSec 60
  if (-not (Test-Path $Dest)) {
    Write-Output "try host=$scmHost status=200 bytes=0"
    exit 1
  }
  $bytes = (Get-Item $Dest).Length
  Write-Output "status=200 bytes=$bytes via=aad-vfs host=$scmHost"
  exit 0
} catch {
  $code = 0
  try { $code = [int]$_.Exception.Response.StatusCode } catch {}
  Write-Output "try host=$scmHost status=$code"
  exit 1
}
