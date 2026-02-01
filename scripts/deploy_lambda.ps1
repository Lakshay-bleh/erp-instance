# Deploy ERP Incident Enrichment Lambda to AWS
# Prerequisites: AWS CLI installed and configured (aws configure)
# Usage: From project root, run: .\scripts\deploy_lambda.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = if (Test-Path "lambda") { (Get-Location).Path } else { (Get-Item $PSScriptRoot).Parent.FullName }
Set-Location $ProjectRoot

$LambdaDir = "lambda\enrichment"
$FunctionName = "erp-incident-enrichment"
$Region = $env:AWS_REGION
if (-not $Region) { $Region = "us-east-1" }

# Load .env from backend or project root for GROQ_API_KEY, GROQ_MODEL
$EnvFile = "backend\.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
}
$GroqKey = $env:GROQ_API_KEY
$GroqModel = $env:GROQ_MODEL
if (-not $GroqModel) { $GroqModel = "llama-3.1-8b-instant" }

Write-Host "Building Lambda package..."
$BuildDir = "lambda\enrichment\build"
$ZipPath = "lambda\enrichment\deploy.zip"
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null

# Copy handler
Copy-Item "$LambdaDir\handler.py" $BuildDir

# Install dependencies into build dir (groq)
pip install -q -r "$LambdaDir\requirements.txt" -t $BuildDir --upgrade 2>$null
if (-not (Test-Path "$BuildDir\groq")) {
    Write-Host "Installing groq into $BuildDir..."
    pip install groq==0.4.2 -t $BuildDir --upgrade
}

# Create zip (handler.py and dependencies at root of zip)
if (Test-Path $ZipPath) { Remove-Item $ZipPath }
Compress-Archive -Path "$BuildDir\*" -DestinationPath $ZipPath -Force
Write-Host "Package: $ZipPath"

# Check for Lambda execution role (create if missing)
$AccountId = aws sts get-caller-identity --query Account --output text 2>$null
if (-not $AccountId) { Write-Host "ERROR: AWS CLI not configured. Run: aws configure"; exit 1 }
$RoleName = "erp-incident-lambda-role"
$RoleArn = "arn:aws:iam::${AccountId}:role/$RoleName"
$RoleExists = aws iam get-role --role-name $RoleName 2>$null
if (-not $RoleExists) {
    Write-Host "Creating IAM role for Lambda: $RoleName"
    $TrustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@
    $TrustPolicy | Out-File -FilePath "$env:TEMP\lambda-trust.json" -Encoding utf8
    aws iam create-role --role-name $RoleName --assume-role-policy-document "file://$env:TEMP\lambda-trust.json" --description "ERP Incident Lambda execution"
    aws iam attach-role-policy --role-name $RoleName --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    Write-Host "Waiting 10s for IAM role to propagate..."
    Start-Sleep -Seconds 10
}

# Create or update Lambda
$Existing = aws lambda get-function --function-name $FunctionName --region $Region 2>$null
if ($Existing) {
    Write-Host "Updating Lambda function: $FunctionName"
    aws lambda update-function-code --function-name $FunctionName --zip-file "fileb://$ZipPath" --region $Region | Out-Null
    aws lambda wait function-updated --function-name $FunctionName --region $Region
    $EnvVars = "GROQ_MODEL=$GroqModel"
    if ($GroqKey) { $EnvVars = "GROQ_API_KEY=$GroqKey,GROQ_MODEL=$GroqModel" }
    aws lambda update-function-configuration --function-name $FunctionName --environment "Variables={$EnvVars}" --region $Region --timeout 30 --memory-size 256 | Out-Null
    Write-Host "Lambda updated. Set GROQ_API_KEY in AWS Console if not in .env."
} else {
    Write-Host "Creating Lambda function: $FunctionName"
    $EnvPayload = "Variables={GROQ_MODEL=$GroqModel}"
    if ($GroqKey) { $EnvPayload = "Variables={GROQ_API_KEY=$GroqKey,GROQ_MODEL=$GroqModel}" }
    aws lambda create-function `
        --function-name $FunctionName `
        --runtime python3.11 `
        --role $RoleArn `
        --handler handler.lambda_handler `
        --zip-file "fileb://$ZipPath" `
        --timeout 30 `
        --memory-size 256 `
        --environment $EnvPayload `
        --region $Region | Out-Null
    Write-Host "Lambda created."
}

# Allow same-account principals (e.g. your backend IAM user) to invoke Lambda
aws lambda add-permission --function-name $FunctionName --statement-id AllowSameAccountInvoke --action lambda:InvokeFunction --principal $AccountId --region $Region 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "Note: If Lambda invoke fails from backend, add permission: aws lambda add-permission --function-name $FunctionName --statement-id AllowBackendInvoke --action lambda:InvokeFunction --principal $AccountId --region $Region" }

Write-Host "Done. Test: aws lambda invoke --function-name $FunctionName --payload '{\"title\":\"Test\",\"description\":\"API down\",\"erp_module\":\"AP\",\"environment\":\"Prod\"}' --region $Region out.json; Get-Content out.json"
Remove-Item -Recurse -Force $BuildDir -ErrorAction SilentlyContinue
