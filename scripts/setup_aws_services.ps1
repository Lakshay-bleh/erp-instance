# Create DynamoDB table and S3 bucket for ERP Incident Triage (idempotent)
# Prerequisites: AWS CLI installed and configured (aws configure)
# Usage: From project root, run: .\scripts\setup_aws_services.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = if (Test-Path "lambda") { (Get-Location).Path } else { (Get-Item $PSScriptRoot).Parent.FullName }
Set-Location $ProjectRoot

# Load .env for table/bucket names
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

$Region = $env:AWS_REGION
if (-not $Region) { $Region = "us-east-1" }
$TableName = $env:DYNAMODB_TABLE
if (-not $TableName) { $TableName = "erp-incidents" }
$BucketName = $env:S3_BUCKET
if (-not $BucketName) { $BucketName = "erp-incident-bucket" }

# Ensure bucket name is globally unique (S3 requirement)
$AccountId = aws sts get-caller-identity --query Account --output text 2>$null
if (-not $AccountId) { Write-Host "ERROR: AWS CLI not configured. Run: aws configure"; exit 1 }
if ($BucketName -notmatch "^\w[\w.-]*$") {
    $BucketName = "erp-incident-bucket-$AccountId"
    Write-Host "Using S3 bucket: $BucketName (sanitized)"
}

Write-Host "Region: $Region | DynamoDB table: $TableName | S3 bucket: $BucketName"

# DynamoDB table
$TableExists = aws dynamodb describe-table --table-name $TableName --region $Region 2>$null
if ($TableExists) {
    Write-Host "DynamoDB table '$TableName' already exists."
} else {
    Write-Host "Creating DynamoDB table: $TableName"
    aws dynamodb create-table `
        --table-name $TableName `
        --attribute-definitions AttributeName=id,AttributeType=S `
        --key-schema AttributeName=id,KeyType=HASH `
        --billing-mode PAY_PER_REQUEST `
        --region $Region | Out-Null
    aws dynamodb wait table-exists --table-name $TableName --region $Region
    Write-Host "DynamoDB table created."
}

# S3 bucket
aws s3api head-bucket --bucket $BucketName 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "S3 bucket '$BucketName' already exists."
} else {
    Write-Host "Creating S3 bucket: $BucketName"
    if ($Region -eq "us-east-1") {
        aws s3api create-bucket --bucket $BucketName --region $Region
    } else {
        aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region
    }
    Write-Host "S3 bucket created."
}

Write-Host "AWS resources ready. Update backend .env with S3_BUCKET=$BucketName if different."
