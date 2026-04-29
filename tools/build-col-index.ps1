param(
  [Parameter(Mandatory=$true)]
  [string]$InputPath,

  [Parameter(Mandatory=$false)]
  [string]$OutputPath = "",

  [Parameter(Mandatory=$false)]
  [string]$SourceLabel = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir

if (-not $OutputPath) {
  $outputDir = Join-Path $projectDir "dist"
  $OutputPath = Join-Path $outputDir "catalogue-of-life-index.json"
}

$resolvedInput = Resolve-Path -LiteralPath $InputPath
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if (Test-Path -LiteralPath $bundledNode) {
  $node = $bundledNode
} else {
  $node = (Get-Command node -ErrorAction Stop).Source
}

& $node (Join-Path $scriptDir "build-col-index.js") --input $resolvedInput --output $OutputPath --source-label $SourceLabel
