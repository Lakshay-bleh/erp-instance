# Run ERP Incident Triage Portal backend (FastAPI)
# Usage: from project root, .\scripts\run-backend.ps1
# Or: cd backend; ..\scripts\run-backend.ps1

$backendDir = if (Test-Path "backend") { "backend" } else { $PSScriptRoot + "\..\backend" }
Set-Location $backendDir

if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
& .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -q
$env:PYTHONPATH = $backendDir
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
