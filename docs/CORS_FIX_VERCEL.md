# Fix CORS and 404 on Vercel (proxy through frontend)

**Fix:** All `/api/*` requests are handled by **Next.js API routes** that proxy to the backend. The browser only talks to your frontend (same-origin) → no CORS. CORS headers are added to all API responses so preview URLs and cross-origin work.

---

## Quick checklist (CORS + 404)

| Step | Where | What to do |
|------|--------|------------|
| 1 | **Frontend** Vercel project → Settings → General | **Root Directory** = `frontend` (so `src/app/api/` is deployed). |
| 2 | **Frontend** → Settings → Environment Variables | Add **API_PROXY_TARGET** = `https://YOUR-BACKEND.vercel.app` (backend URL **without** `/api`). Apply to Production, Preview, Development. |
| 3 | **Backend** Vercel project → Settings → General | **Root Directory** = `vercel-backend`. |
| 4 | Redeploy | Redeploy **frontend** and **backend** after changing env or root. |

Then test: `https://YOUR-FRONTEND.vercel.app/api/health` → `{"ok":true,"source":"frontend-api"}`. If you get 502 on `/api/incidents`, the proxy can’t reach the backend → check API_PROXY_TARGET and that the backend project is deployed.

---

## 1. Frontend project (Vercel)

1. Open your **frontend** project on Vercel → **Settings** → **Environment Variables**.
2. Set the **backend URL** so the proxy knows where to forward. Use **one** of:
   - **API_PROXY_TARGET** = `https://erp-incidents-api.vercel.app` (backend URL **without** `/api`), or
   - **NEXT_PUBLIC_API_URL** = `https://erp-incidents-api.vercel.app/api`
3. **Redeploy** the frontend.

Result: The browser requests `https://your-frontend.vercel.app/api/*` (same-origin). The API route forwards to the backend and returns the response. No cross-origin request → no CORS.

---

## 2. How it works

| Env (frontend)           | Client calls      | Server rewrites to                    |
|--------------------------|-------------------|----------------------------------------|
| `API_PROXY_TARGET` set   | `/api/incidents`  | `https://backend.vercel.app/api/incidents` |
| `NEXT_PUBLIC_API_URL` unset | Same-origin `/api` | Backend                               |

- **No rewrites:** All `/api/*` requests are handled by Next.js API routes (`src/app/api/...`) that proxy to the backend. No `next.config` rewrite.
- **api.ts**: In the browser `getApiBase()` always returns `"/api"` (same-origin). On the server (SSR) it returns `https://${VERCEL_URL}/api` on Vercel so server-side fetches hit the same frontend and get proxied. Set **API_PROXY_TARGET** on the frontend so the proxy knows the backend URL.

---

## 3. Verify

1. Open the app at your frontend URL (e.g. `https://erp-instance.vercel.app`).
2. Open DevTools → Network; trigger a request (e.g. list incidents or update status).
3. The request URL should be **same-origin** (e.g. `https://your-frontend.vercel.app/api/incidents/...`) and there should be **no CORS error**.

### Test with curl (or PowerShell)

**Frontend API (proxy) is running if this returns 200 and JSON:**

```bash
# Bash / Git Bash
curl -s "https://erp-instance.vercel.app/api/health"
# Expected: {"ok":true,"source":"frontend-api"}
```

```powershell
# PowerShell
Invoke-WebRequest -Uri "https://erp-instance.vercel.app/api/health" -UseBasicParsing | Select-Object StatusCode, Content
# Expected: StatusCode 200, Content {"ok":true,"source":"frontend-api"}
```

**Backend must respond; if this returns 404, the backend project is not deployed correctly:**

```bash
# Replace with your backend URL (e.g. erp-incidents-api.vercel.app)
curl -s "https://YOUR-BACKEND.vercel.app/api/health"
# Or root: curl -s "https://YOUR-BACKEND.vercel.app/"
```

**PATCH (Mark Resolved) – if you get 502:** The proxy is running but cannot reach the backend. Set **API_PROXY_TARGET** (or **NEXT_PUBLIC_API_URL**) on the **frontend** project to the **backend** URL and redeploy. Ensure the **backend** project returns 200 for `/api/health` or `/` (see [VERCEL_BACKEND.md](VERCEL_BACKEND.md)).

---

## 4. 404 "The page could not be found" / NOT_FOUND (e.g. on PATCH / Mark Resolved)

If the request URL is **your frontend** (e.g. `https://erp-instance.vercel.app/api/incidents/.../status`) and you get **"The page could not be found"** with a long NOT_FOUND id (especially on **PATCH** for Mark Resolved):

- **Vercel is not running your API route** — no handler matched that path.
- **Fix:** In the **frontend** Vercel project (the one whose URL is in the request — e.g. erp-instance):
  1. Go to **Settings** → **General** → **Root Directory**.
  2. Set it to **`frontend`** (the folder that has `src/app/api/` and `package.json`).
  3. **Save** and **Redeploy** the project.
- **Test:** After redeploy, open `https://erp-instance.vercel.app/api/health`. If you see `{"ok":true,"source":"frontend-api"}`, API routes (including PATCH) are working. Then Mark Resolved and other `/api/incidents/...` requests will be handled by the proxy.

## 5. 404 from backend (Incident not found)

If `/api/health` works but opening an incident or PATCH/DELETE returns **404** with a **JSON** body like `{"detail":"Incident not found"}`:

- The **proxy is working**; the backend is returning **404** because that incident is not in its store.
- On Vercel, the backend uses **in-memory / file store** by default, so data does **not** persist across serverless invocations. Only incidents created in the same “session” may exist.
- **Fix:** Configure **DynamoDB** on the **backend** Vercel project so incidents persist:
  1. Backend project → **Settings** → **Environment Variables**
  2. Add: `USE_MEMORY_STORE` = `false`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `DYNAMODB_TABLE` (e.g. `erp-incidents`)
  3. In **AWS Console** → DynamoDB → create table `erp-incidents` with partition key `id` (String)
  4. **Redeploy** the backend

  See [VERCEL_BACKEND.md](VERCEL_BACKEND.md) for full steps.

---

## 6. If you prefer direct backend URL (no proxy)

If you keep **NEXT_PUBLIC_API_URL** set to the backend URL (e.g. `https://erp-incidents-api.vercel.app/api`), the browser will call the backend directly and **CORS is required**. The backend (`app.py`) uses FastAPI `CORSMiddleware`; if CORS errors persist, use the proxy approach above.
