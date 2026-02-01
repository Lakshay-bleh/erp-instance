# ERP Incident Triage Portal

AI-assisted platform for enterprise teams to submit, enrich, triage, and manage ERP incidents originating from Oracle ERP systems. Built as a production-grade, UI-first web application using the locked tech stack and AWS Free Tier only.

---

## Architecture (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                               │
│  Dashboard │ Submit Incident │ Incident List │ Incident Detail               │
│  Tailwind · shadcn-style UI · SWR · Framer Motion · Lucide                   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ REST (JSON)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI)                                   │
│  POST/GET /incidents  │  GET /incidents/:id  │  PATCH /incidents/:id/status   │
│  Pydantic · Logging → CloudWatch                                              │
└───┬─────────────┬─────────────┬─────────────────────┬───────────────────────┘
    │             │             │                     │
    ▼             ▼             ▼                     ▼
┌────────┐   ┌─────────┐   ┌──────────┐         ┌─────────────┐
│   S3   │   │DynamoDB │   │  Lambda  │         │  Groq API    │
│ Raw    │   │Primary  │   │Enrichment│         │  Summary +   │
│Payload │   │Store    │   │Severity  │         │  Next Action │
│+ Logs  │   │         │   │Category  │         │              │
└────────┘   └─────────┘   │Groq call │         └─────────────┘
                           └──────────┘
```

**Flow**

1. User submits incident from frontend → Backend receives POST.
2. Backend stores raw payload in **S3** (or local folder when `USE_LOCAL_AWS=true`).
3. Backend writes base record to **DynamoDB** (or local JSON store when local).
4. Backend invokes **Lambda** for enrichment (or runs enrichment in-process when local).
5. Lambda: applies severity/category rules, calls **Groq** for summary + suggested action, returns result.
6. Backend saves enriched data back to DynamoDB.
7. All steps are logged (stdout → **CloudWatch** when deployed).

---

## AWS Services (Free Tier)

| Service     | Role |
|------------|------|
| **DynamoDB** | Primary incident database. Stores id, title, description, erp_module, environment, business_unit, severity, category, status, auto_summary, suggested_action, created_at, updated_at. |
| **S3**       | Raw incident payload storage and logs. Key pattern: `incidents/{id}/payload.json`. |
| **Lambda**   | Enrichment execution: deterministic severity/category rules + Groq call for summary and suggested action. |
| **CloudWatch** | Logging for FastAPI and Lambda (via stdout when running in AWS). |

Local development uses in-memory/local file substitutes when `USE_LOCAL_AWS=true` (default).

**To run fully on AWS** (DynamoDB, S3, Lambda, CloudWatch), see **[docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md)** for step-by-step: create table & bucket, deploy Lambda, set permissions, and run backend with `USE_MEMORY_STORE=false` and `USE_LAMBDA_ENRICHMENT=true`.

---

## Groq Integration

- **Purpose:** Generate **auto_summary** (2–3 line professional summary) and **suggested_action** (clear next step) for each incident.
- **Usage:** Backend (or Lambda) sends title, description, erp_module, environment to Groq; response is parsed as JSON with `summary` and `suggested_action`.
- **Config:** `GROQ_API_KEY` and optional `GROQ_MODEL` (default `llama-3.1-8b-instant`). If key is missing, enrichment still runs with severity/category only; summary and action are null.

---

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- (Optional) Groq API key from [console.groq.com](https://console.groq.com)

### Backend

**PowerShell (Windows):**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Copy project root .env to backend\.env, or ensure backend loads from parent .env
$env:PYTHONPATH = (Get-Location).Path
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Bash (macOS/Linux):**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # or symlink/copy your project root .env
export PYTHONPATH=$(pwd)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- With `USE_LOCAL_AWS=true` or `USE_MEMORY_STORE=true` (default): DynamoDB and S3 are replaced by local JSON/file storage under `backend/data/`.
- Set `USE_MEMORY_STORE=false` and AWS credentials to use real DynamoDB/S3. Set `USE_LAMBDA_ENRICHMENT=true` to invoke Lambda for enrichment when using AWS.
- Env is loaded from `backend/.env` or project root `.env`.

**If `pip install` fails with "Rust/Cargo" or "metadata-generation-failed":**  
Some dependencies need to be built from source on Python 3.13 and require Rust. Use **Python 3.11 or 3.12** instead:

```powershell
# If you have py launcher: py -3.12 -m venv .venv
# Or install Python 3.12 from python.org, then:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # optional; default API URL is http://localhost:8000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run scripts (Windows)

From project root:

```powershell
.\scripts\run-backend.ps1   # Terminal 1
.\scripts\run-frontend.ps1  # Terminal 2
```

### Running Lambda Locally (optional)

Lambda handler lives in `lambda/enrichment/handler.py`. To run it locally (e.g. with a test event):

- Install deps: `pip install -r lambda/enrichment/requirements.txt`
- Set `GROQ_API_KEY`, `GROQ_MODEL` in env.
- Invoke with a JSON event containing `incident_id`, `title`, `description`, `erp_module`, `environment`.

When backend uses real AWS, set `USE_LOCAL_AWS=false` and configure AWS credentials; backend will invoke the deployed Lambda.

---

## Deploy frontend and backend together on Vercel

The repo deploys **both** the Next.js frontend and the FastAPI backend on a single Vercel project.

1. **Import** the repo in [Vercel](https://vercel.com) (e.g. from GitHub).
2. **Root Directory:** leave as **`.`** (repo root). The root `vercel.json` builds the frontend from `frontend/` and serves the API from `api/`.
3. **Environment variables** (Settings → Environment Variables): add at least **GROQ_API_KEY** (from [console.groq.com](https://console.groq.com)). Optional: **USE_MEMORY_STORE** = `true` for local storage on Vercel; for real AWS set **USE_MEMORY_STORE** = `false` and add AWS credentials, **DYNAMODB_TABLE**, **S3_BUCKET**, etc.
4. **Deploy:** push a commit or trigger **Redeploy** from the Deployments tab.

**Getting 404?** With combined deploy, Root Directory must be **`.`** (repo root). If it’s blank or `.`, Vercel builds from the repo root (no Next.js app there) and every route returns 404. Change it to `frontend` and redeploy.

**Result:** App at `https://your-project.vercel.app/`; API at `/api/incidents`, `/api/health`, etc. The frontend calls `/api` on the same origin. **Frontend only** (backend elsewhere): set **Root Directory** to **`frontend`** and **NEXT_PUBLIC_API_URL** to your backend URL.

---

## Assumptions

- **Auth:** Not implemented; suitable for internal/trusted network or behind corporate SSO.
- **DynamoDB table:** When using real AWS, table `erp-incidents` (or name from env) must exist with partition key `id` (String).
- **S3 bucket:** When using real AWS, bucket must exist; backend has write access.
- **Lambda:** When using real AWS, Lambda is deployed with Groq SDK (or layer), env vars `GROQ_API_KEY` and `GROQ_MODEL` set, and FastAPI has permission to invoke it.
- **CORS:** Backend allows `http://localhost:3000` and `http://127.0.0.1:3000` for local dev.

---

## Future Improvements

- User authentication and role-based access.
- Real-time updates (e.g. WebSocket or polling) when Lambda finishes enrichment.
- Pagination and sorting on incident list.
- Export (CSV/Excel) and advanced filters.
- Deploy backend and Lambda to AWS (e.g. API Gateway + Lambda for backend or ECS), frontend to Vercel or S3+CloudFront.
- DynamoDB streams to trigger Lambda on new items instead of synchronous invoke from API.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /incidents | Create incident (stores in S3, DynamoDB, runs enrichment). |
| GET    | /incidents | List incidents (optional query: `severity`, `erp_module`). |
| GET    | /incidents/{id} | Get one incident. |
| PATCH  | /incidents/{id}/status | Update status (Open \| In Progress \| Resolved). |

---

## Data Model (Incident)

- **id** (UUID), **title**, **description**
- **erp_module**: AP | AR | GL | Inventory | HR | Payroll
- **environment**: Prod | Test
- **business_unit**
- **severity**: P1 | P2 | P3 (rules: Prod + keywords → P1; Prod → P2; else P3)
- **category**: Configuration | Data | Integration | Security | Unknown (keyword-based)
- **status**: Open | In Progress | Resolved
- **auto_summary**, **suggested_action** (from Groq)
- **created_at**, **updated_at** (ISO 8601)

---

## Design System (UI)

- **Background:** #F8F9FB · **Surface:** #FFFFFF · **Primary:** #1A3E82 · **Accent:** #0A84FF
- **Success:** #22C55E · **Warning:** #F59E0B · **Danger:** #EF4444 · **Muted:** #6B7280
- Typography: headings 600, body 400, labels uppercase 12px tracking-wide.
- 24px base grid, max content width 1200px, Framer Motion for subtle transitions.
#   e r p - i n s t a n c e 
 
 