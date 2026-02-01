# Sync backend/ into vercel-backend/backend for backend-only Vercel deploy.
# Run from project root: .\scripts\prepare-vercel-backend.ps1
# Then commit vercel-backend/ and deploy with Root Directory = vercel-backend.

$ErrorActionPreference = "Stop"
$ProjectRoot = if (Test-Path "backend") { (Get-Location).Path } else { (Get-Item $PSScriptRoot).Parent.FullName }
Set-Location $ProjectRoot

$dest = "vercel-backend\backend"
if (-not (Test-Path "vercel-backend")) { New-Item -ItemType Directory -Path "vercel-backend" | Out-Null }
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
Copy-Item -Path "backend" -Destination $dest -Recurse -Force
Write-Host "Done: backend copied to vercel-backend/backend. Commit and deploy with Root = vercel-backend."