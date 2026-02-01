# Activate All AWS Services (Full Deployment)

This guide gets the ERP Incident Triage Portal running **fully on AWS**: DynamoDB, S3, Lambda, and CloudWatch. The backend runs on your machine but uses real AWS resources.

---

## Prerequisites

1. **AWS account** (Free Tier is enough)
2. **AWS CLI** installed and configured  
   - Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html  
   - Configure: `aws configure` (Access Key, Secret Key, region e.g. `us-east-1`)
3. **Groq API key** in `backend\.env` (for Lambda enrichment):  
   `GROQ_API_KEY=gsk_...`  
   Get one: https://console.groq.com
4. **Backend `.env`** in `backend\.env` with at least:
   - `USE_MEMORY_STORE=false`
   - `USE_LAMBDA_ENRICHMENT=true`
   - `AWS_REGION=us-east-1`
   - `DYNAMODB_TABLE=erp-incidents`
   - `S3_BUCKET=erp-incident-bucket` (or a globally unique name)
   - `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (or use `aws configure` and omit these)

---

## Step 1: Configure AWS CLI

From a terminal:

```powershell
aws configure
```

Enter your **Access Key ID**, **Secret Access Key**, and default **region** (e.g. `us-east-1`).  
Verify:

```powershell
aws sts get-caller-identity
```

You should see your account ID and user/role.

---

## Step 2: Create DynamoDB Table and S3 Bucket

From the **project root**:

```powershell
.\scripts\setup_aws_services.ps1
```

This script:

- Creates the **DynamoDB** table (name from `DYNAMODB_TABLE` in `backend\.env`, default `erp-incidents`) with partition key `id` (String), **PAY_PER_REQUEST** billing.
- Creates the **S3** bucket (name from `S3_BUCKET`, default `erp-incident-bucket`; if the name is taken, it uses `erp-incident-bucket-<account-id>`).

If the table or bucket already exists, the script skips creation (idempotent).

---

## Step 3: Deploy the Lambda Function

From the **project root**:

```powershell
.\scripts\deploy_lambda.ps1
```

This script:

1. Builds a zip with `handler.py` and the `groq` dependency.
2. Creates an IAM role `erp-incident-lambda-role` for Lambda (if it doesn’t exist) with **AWSLambdaBasicExecutionRole** (CloudWatch Logs).
3. Creates or updates the Lambda function **erp-incident-enrichment** (Python 3.11, 256 MB, 30 s timeout).
4. Sets environment variables **GROQ_API_KEY** and **GROQ_MODEL** from `backend\.env` (or you can set **GROQ_API_KEY** later in the AWS Console).

**If you don’t put GROQ_API_KEY in `.env`:**  
After deployment, in AWS Console → Lambda → **erp-incident-enrichment** → Configuration → Environment variables → Edit → Add **GROQ_API_KEY** = your Groq key.

---

## Step 4: Allow the Backend to Invoke Lambda

The IAM user/role whose credentials you use for the backend (e.g. the one from `aws configure` or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in `.env`) must be allowed to invoke this Lambda.

**Option A – Using the same AWS user as backend**

If the backend uses the same AWS credentials as the one you used to run the deploy script, add a **resource-based policy** on the Lambda so that your account can invoke it:

```powershell
$AccountId = aws sts get-caller-identity --query Account --output text
$Region = "us-east-1"   # or your AWS_REGION
aws lambda add-permission `
  --function-name erp-incident-enrichment `
  --statement-id AllowBackendInvoke `
  --action lambda:InvokeFunction `
  --principal $AccountId `
  --region $Region
```

**Option B – IAM user/role used only for backend**

Attach an IAM policy to that user/role that allows invoking this Lambda, for example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:erp-incident-enrichment"
    }
  ]
}
```

Replace `us-east-1` and `YOUR_ACCOUNT_ID` with your region and account ID.  
Get account ID: `aws sts get-caller-identity --query Account --output text`

---

## Step 5: Backend `.env` for Full AWS

Ensure `backend\.env` has:

```env
# Use real AWS (not local store)
USE_MEMORY_STORE=false
USE_LOCAL_AWS=false

# Use Lambda for enrichment (not in-process)
USE_LAMBDA_ENRICHMENT=true

# AWS
AWS_REGION=us-east-1
DYNAMODB_TABLE=erp-incidents
S3_BUCKET=erp-incident-bucket
LAMBDA_FUNCTION_NAME=erp-incident-enrichment

# Credentials (if not using default profile from aws configure)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Groq (for backend fallback; Lambda has its own from deploy or Console)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant
```

Use the **same** `S3_BUCKET` and `DYNAMODB_TABLE` names you used in Step 2. If `setup_aws_services.ps1` printed a different bucket name (e.g. `erp-incident-bucket-123456789012`), set `S3_BUCKET` to that.

---

## Step 6: Run Backend and Frontend

**Terminal 1 – Backend:**

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 – Frontend:**

```powershell
cd frontend
npm run dev
```

Open **http://localhost:3000**. Submit an incident; it will:

1. Store the raw payload in **S3**
2. Write the record to **DynamoDB**
3. Invoke **Lambda** for enrichment (severity, category, summary, suggested action, tags)
4. Write the enriched data back to **DynamoDB**
5. Log to stdout (and, when run in AWS, to **CloudWatch**)

---

## Verify AWS Is Active

- **Backend config:**  
  Open **http://localhost:8000/config**  
  You should see `"use_aws": true`, `"storage_mode": "AWS (DynamoDB + S3)"`, `"enrichment_mode": "Lambda"`.
- **DynamoDB:**  
  AWS Console → DynamoDB → Tables → **erp-incidents** → Explore table items (after creating an incident).
- **S3:**  
  AWS Console → S3 → your bucket → prefix `incidents/`.
- **Lambda:**  
  AWS Console → Lambda → **erp-incident-enrichment** → Monitor → View logs in CloudWatch.
- **CloudWatch:**  
  Log groups for the Lambda and (if you run the backend on EC2/Lambda later) for the API.

---

## Summary: Order of Operations

| Step | What to run / do |
|------|-------------------|
| 1 | `aws configure` |
| 2 | `.\scripts\setup_aws_services.ps1` (DynamoDB + S3) |
| 3 | `.\scripts\deploy_lambda.ps1` (Lambda + role + env) |
| 4 | Add Lambda invoke permission (resource policy or IAM policy) |
| 5 | Set `backend\.env` (USE_MEMORY_STORE=false, USE_LAMBDA_ENRICHMENT=true, S3_BUCKET, etc.) |
| 6 | Run backend + frontend, test at http://localhost:3000 |

I cannot deploy to your AWS account from here; you run the scripts and CLI commands above in your environment. If a script fails, check AWS CLI version (`aws --version`), credentials (`aws sts get-caller-identity`), and region.
