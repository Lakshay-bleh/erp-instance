# IAM Policy for erp-incidents-user (DynamoDB + S3)

The error you saw:

```
User: arn:aws:iam::769607921880:user/erp-incidents-user is not authorized to perform: dynamodb:Scan on resource: arn:aws:dynamodb:us-east-1:769607921880:table/erp-incidents because no identity-based policy allows the dynamodb:Scan action
```

means the IAM user **erp-incidents-user** needs a policy that allows DynamoDB and S3 actions used by the backend.

---

## 1. Create the policy (AWS Console)

1. Go to **AWS Console** → **IAM** → **Policies** → **Create policy**.
2. Open the **JSON** tab and paste the policy below (replace `YOUR_ACCOUNT_ID` with `769607921880` and adjust table/bucket names if different).

---

## 2. Policy JSON (DynamoDB + S3)

Use your actual **table name** (e.g. `erp-incidents`) and **bucket name** (e.g. `erp-incident-bucket` or your bucket).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBTable",
      "Effect": "Allow",
      "Action": [
        "dynamodb:Scan",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:DescribeTable"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:769607921880:table/erp-incidents"
      ]
    },
    {
      "Sid": "S3Bucket",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::erp-incident-bucket",
        "arn:aws:s3:::erp-incident-bucket/*"
      ]
    },
    {
      "Sid": "LambdaInvoke",
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:us-east-1:769607921880:function:erp-incident-enrichment"
    }
  ]
}
```

- **DynamoDB:** Replace `erp-incidents` with your table name if different.
- **S3:** Replace `erp-incident-bucket` with your bucket name.
- **Lambda:** Only needed if you use `USE_LAMBDA_ENRICHMENT=true`. Remove the Lambda block if you don’t use Lambda.

---

## 3. Attach the policy to the user

1. **IAM** → **Users** → **erp-incidents-user** → **Add permissions** → **Attach policies directly**.
2. Search for the policy you created (e.g. `erp-incidents-api-policy`) and attach it.
3. Save.

---

## 4. Verify

After a few seconds, call the API again:

```powershell
curl.exe -s https://erp-instance-backend.vercel.app/api/incidents
```

You should get a JSON array (e.g. `[]` or a list of incidents) instead of an AccessDenied error.

---

## 5. Optional: AWS CLI

Create a policy file `erp-incidents-policy.json` with the JSON above, then:

```powershell
aws iam create-policy --policy-name erp-incidents-api-policy --policy-document file://erp-incidents-policy.json
```

Then attach it to the user:

```powershell
aws iam attach-user-policy --user-name erp-incidents-user --policy-arn arn:aws:iam::769607921880:policy/erp-incidents-api-policy
```

Replace the policy ARN if you used a different name.
