# Run ERP Incident Triage Portal frontend (Next.js)
# Usage: from project root, .\scripts\run-frontend.ps1

$frontendDir = if (Test-Path "frontend") { "frontend" } else { $PSScriptRoot + "\..\frontend" }
Set-Location $frontendDir

if (-not (Test-Path "node_modules")) {
    npm install
}
npm run dev
