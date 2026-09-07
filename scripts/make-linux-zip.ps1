# Creates a zip with forward-slash paths (required for Linux Kudu extract).
param(
  [string]$SourceDir = ".\.azure-deploy",
  [string]$ZipPath = ".\scrivengroup-deploy.zip"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (-not (Test-Path $SourceDir)) { throw "Missing $SourceDir" }
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

$sourceFull = (Resolve-Path $SourceDir).Path
$zipFull = Join-Path (Get-Location) $ZipPath
$zip = [System.IO.Compression.ZipFile]::Open($zipFull, [System.IO.Compression.ZipArchiveMode]::Create)

try {
  $skippedData = 0
  Get-ChildItem -Path $sourceFull -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($sourceFull.Length + 1).Replace("\", "/")
    if ($rel -eq "data" -or $rel.StartsWith("data/")) {
      $skippedData++
      return
    }
    if ($rel.StartsWith(".next/static/development/") -or $rel -match "hmr-client" -or $rel -match "_browser_dev_") {
      return
    }
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $_.FullName,
      $rel,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
  if ($skippedData -gt 0) {
    Write-Host ("Excluded {0} file(s) under data/ (laptop JSON must not ship)" -f $skippedData)
  }
}
finally {
  $zip.Dispose()
}

$size = (Get-Item $ZipPath).Length / 1MB
Write-Host ("Created {0} ({1:N1} MB) with forward-slash paths" -f $ZipPath, $size)
