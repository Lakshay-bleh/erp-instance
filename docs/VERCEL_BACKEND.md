# Deploy Backend on Vercel (separate project)

Deploy the FastAPI backend as its **own Vercel project** so the frontend (another Vercel project or any host) can call it via **NEXT_PUBLIC_API_URL**.

---

## 1. Prepare `vercel-backend/` (one-time or after backend changes)

The backend code must live under `vercel-backend/` so Vercel can deploy it without building the Next.js frontend.

**From project root (PowerShell):**

```powershell
.\scripts\prepare-vercel-backend.ps1
```

**Or manually (Bash/PowerShell):**

```powershell
# PowerShell
Remove-Item -Recurse -Force vercel-backend\backend -ErrorAction SilentlyContinue
Copy-Item -Path backend -Destination vercel-backend\backend -Recurse
```

```bash
# Bash
rm -rf vercel-backend/backend
cp -r backend vercel-backend/backend
```

Then **commit** so `vercel-backend/backend/` is in the repo (required for deploy).

---

## 2. Create the backend project on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. **Import** the same Git repo (e.g. GitHub) you use for the frontend.
3. **Configure:**
   - **Project Name:** e.g. `erp-incidents-api`.
   - **Root Directory:** click **Edit** → set to **`vercel-backend`** → **Save**.
   - **Framework Preset:** leave as **Other** (do not set Next.js).
4. **Override Build & Install (important):**  
   If the build still runs `cd frontend && npm install`, the repo root `vercel.json` is being used. Override it:
   - Go to **Settings** → **General** → **Build & Development Settings**.
   - Click **Override** next to **Install Command** → set to **`echo 'No install'`** (or leave empty if the UI allows).
   - Click **Override** next to **Build Command** → set to **`echo 'No build'`** (or leave empty).
   - **Output Directory:** leave empty.
   - Save. Then **Redeploy**.
5. **Environment Variables** (Settings → Environment Variables) — add at least:

   | Name | Value | Notes |
   |------|--------|--------|
   | `GROQ_API_KEY` | `gsk_...` | From [console.groq.com](https://console.groq.com) |
   | `CORS_ORIGINS_EXTRA` | `https://your-frontend.vercel.app` or `*` | Frontend URL(s), comma-separated; or `*` to allow any origin (fixes CORS for all Vercel preview URLs) |

   For real AWS (DynamoDB, S3, Lambda), also add:

   | Name | Value |
   |------|--------|
   | `USE_MEMORY_STORE` | `false` |
   | `AWS_ACCESS_KEY_ID` | your key |
   | `AWS_SECRET_ACCESS_KEY` | your secret |
   | `AWS_REGION` | `us-east-1` |
   | `DYNAMODB_TABLE` | `erp-incidents` |
   | `S3_BUCKET` | your bucket name |
   | `USE_LAMBDA_ENRICHMENT` | `true` (optional) |

6. Click **Deploy**.

---

## 3. Get the backend URL

After deploy, the API base URL is:

**`https://<your-backend-project>.vercel.app/api`**

Examples:

- Health: `https://erp-incidents-api.vercel.app/api/health`
- Incidents: `https://erp-incidents-api.vercel.app/api/incidents`

Use the **base** `https://<project>.vercel.app/api` (with `/api`) as the backend URL.

---

## 4. Point the frontend at this backend

In your **frontend** project (Vercel or other):

- Set **NEXT_PUBLIC_API_URL** = `https://<your-backend-project>.vercel.app/api`  
  (no trailing slash).

Example: `https://erp-incidents-api.vercel.app/api`

---

## 5. Commands summary

| Step | Command / action |
|------|-------------------|
| Sync backend into vercel-backend | `.\scripts\prepare-vercel-backend.ps1` (from repo root) |
| Commit | `git add vercel-backend && git commit -m "Sync vercel-backend" && git push` |
| Deploy | Trigger deploy in Vercel (push or **Redeploy** in dashboard) |
| Backend base URL | `https://<backend-project>.vercel.app/api` |
| Frontend env | `NEXT_PUBLIC_API_URL=https://<backend-project>.vercel.app/api` |

---

## 6. After changing `backend/` code

1. Run again: `.\scripts\prepare-vercel-backend.ps1`
2. Commit and push: `git add vercel-backend/backend && git commit -m "Update vercel-backend" && git push`
3. Vercel will redeploy automatically (or click **Redeploy**).

---

## Persistence (important)

**Without DynamoDB, incidents are not persisted on Vercel.**  
Vercel serverless runs each request in a new or different instance. The backend’s local/file store is not shared across instances, so:

- **Only incidents created in the same “session” (same instance)** may be visible.
- **Opening an existing incident** (from list or direct URL) often returns **404** because another instance serves the request and has an empty store.
- **PATCH (status update)** and **DELETE** also return **404** for the same reason: the incident is not in that instance’s store.

**Fix:** Configure **DynamoDB** for the backend (see Environment Variables above). Then all incidents persist and GET/PATCH/DELETE work across requests and deployments.

---

## Troubleshooting

- **404 when opening an incident detail, or when updating status / deleting:**  
  On Vercel serverless, each request can run in a different instance. If the backend uses **local/in-memory store** (no DynamoDB), data does not persist across requests: create succeeds in one instance, but GET/PATCH/DELETE run in another instance with an empty store → 404.  
  **Fix:** Use **DynamoDB** on the backend. In the backend Vercel project → Settings → Environment Variables, set:  
  `USE_MEMORY_STORE` = `false`, plus `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `DYNAMODB_TABLE` (e.g. `erp-incidents`), and create the table in AWS if needed. Then redeploy the backend.

- **CORS errors from frontend (200 OK but browser blocks):**
  1. Set **CORS_ORIGINS_EXTRA** = `*` on the backend project (env vars).
  2. **Add Response Headers in Vercel:** Backend project → **Settings** → **Headers** → **Add**:
     - **Source:** `/api/:path*` (or `/api/(.*)`)
     - Add header: **Access-Control-Allow-Origin** = `*`
     - Add header: **Access-Control-Allow-Methods** = `GET, POST, PATCH, PUT, DELETE, OPTIONS`
     - Add header: **Access-Control-Allow-Headers** = `*`
     - Add header: **Access-Control-Max-Age** = `86400`
  3. Redeploy the backend. Headers from the dashboard are applied at the edge to every response for that path.
- **404 on /api/...:** Confirm Root Directory is **`vercel-backend`** (not `.` or `frontend`).
- **Module not found (e.g. backend.app):** Ensure `vercel-backend/backend/` exists and is committed; re-run `.\scripts\prepare-vercel-backend.ps1` and commit.
