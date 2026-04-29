param(
  [Parameter(Mandatory=$false)]
  [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir
$pluginDir = Join-Path $projectDir "plugin"

if (-not $OutputDir) {
  $OutputDir = Join-Path $projectDir "dist"
}
$manifestPath = Join-Path $pluginDir "manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$packageName = "scientific-name-italicizer-$($manifest.version).xpi"
$xpiPath = Join-Path $OutputDir $packageName

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

if (Test-Path -LiteralPath $xpiPath) {
  Remove-Item -LiteralPath $xpiPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($xpiPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
Get-ChildItem -LiteralPath $pluginDir -Recurse -File | ForEach-Object {
    $pluginRoot = $pluginDir.TrimEnd("\", "/") + [System.IO.Path]::DirectorySeparatorChar
    $relative = $_.FullName.Substring($pluginRoot.Length).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $_.FullName,
      $relative,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
}
finally {
  $zip.Dispose()
}

Write-Host "Wrote $xpiPath"
