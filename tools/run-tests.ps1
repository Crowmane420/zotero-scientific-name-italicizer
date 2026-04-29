$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if (Test-Path -LiteralPath $bundledNode) {
  $node = $bundledNode
} else {
  $node = (Get-Command node -ErrorAction Stop).Source
}

& $node (Join-Path $projectDir "tests\matcher.test.js")
& $node (Join-Path $projectDir "tests\build-col-index.test.js")
