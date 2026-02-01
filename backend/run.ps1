# Run FastAPI backend using the project venv (ensures groq, boto3, etc. are available)
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPython = Join-Path $scriptDir ".venv\Scripts\python.exe"
$venvUvicorn = Join-Path $scriptDir ".venv\Scripts\uvicorn.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Virtual environment not found. Create it first:" -ForegroundColor Red
    Write-Host "  cd backend" -ForegroundColor Yellow
    Write-Host "  py -3.12 -m venv .venv" -ForegroundColor Yellow
    Write-Host "  .\.venv\Scripts\pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

Set-Location $scriptDir
& $venvPython -m uvicorn app.main:app --reload --port 8000
