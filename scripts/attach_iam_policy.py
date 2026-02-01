#!/usr/bin/env python3
"""Attach IAM inline policy to erp-incidents-user so they can use DynamoDB and S3.

Requires AWS credentials that have iam:PutUserPolicy (e.g. admin or root).
The user erp-incidents-user cannot attach policies to itself.

  python scripts/attach_iam_policy.py
  python scripts/attach_iam_policy.py --profile admin
"""
import argparse
import json
import os
import sys
from pathlib import Path

_project_root = Path(__file__).resolve().parent.parent
_env_file = _project_root / "backend" / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

try:
    import boto3
except ImportError:
    print("boto3 not installed. Run: pip install boto3")
    sys.exit(1)

def main():
    p = argparse.ArgumentParser(description="Attach IAM policy to erp-incidents-user")
    p.add_argument("--profile", default=None, help="AWS profile name (admin)")
    args = p.parse_args()
    kw = {"region_name": os.environ.get("AWS_REGION", "us-east-1")}
    if args.profile:
        kw["profile_name"] = args.profile

    policy_path = _project_root / "scripts" / "erp-incidents-policy.json"
    if not policy_path.exists():
        print(f"Policy file not found: {policy_path}")
        sys.exit(1)
    policy_doc = json.loads(policy_path.read_text())

    iam = boto3.client("iam", **kw)
    user_name = "erp-incidents-user"
    policy_name = "erp-incidents-api"
    iam.put_user_policy(
        UserName=user_name,
        PolicyName=policy_name,
        PolicyDocument=json.dumps(policy_doc),
    )
    print(f"Done: attached inline policy '{policy_name}' to user '{user_name}'.")

if __name__ == "__main__":
    main()
