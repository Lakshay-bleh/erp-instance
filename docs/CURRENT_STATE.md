# Current State & Next Steps

Quick reference after a break: what’s done and what to do next.

---

## What’s in place

- **Frontend (Next.js)**  
  - Proxy: all `/api/*` go to `src/app/api/[...path]/route.ts` (and shared `lib/api-proxy.ts`).  
  - **Explicit route** for status: `src/app/api/incidents/[id]/status/route.ts` handles GET and PATCH so Vercel doesn’t 404 on `/api/incidents/:id/status`.  
  - Env: proxy target from `API_PROXY_TARGET` or `NEXT_PUBLIC_API_URL` (no trailing `/api`).

- **Backend (FastAPI)**  
  - **Root:** `backend/` — used for local runs.  
  - **Vercel:** `vercel-backend/` — single entry `app.py`, mounts `backend.app.main` at `/api` and `/`.  
  - **Incidents API:** GET/POST `/incidents`, GET/PATCH/DELETE `/incidents/:id`, GET/PATCH `/incidents/:id/status`, PATCH `/incidents/:id/tags`, POST `/incidents/:id/enrich`.  
  - GET `/incidents/:id/status` returns the same as GET `/incidents/:id` (so GET to status no longer 404s).

- **Vercel backend config**  
  - `vercel-backend/vercel.json`: builds `app.py` with `@vercel/python`, routes `/(.*)` to `app.py`.

---

## What you should do next

1. **Run locally (optional check)**  
   - Backend: `cd backend`, venv, `uvicorn app.main:app --reload --port 8000`.  
   - Frontend: `cd frontend`, `npm run dev`.  
   - Frontend talks to backend via `/api` (proxy in dev uses `localhost:8000` if env not set).

2. **Deploy backend (Vercel)**  
   - Project **Root Directory** = `vercel-backend`.  
   - Env vars: at least `GROQ_API_KEY`, `CORS_ORIGINS_EXTRA` (or `*`). For persistence: AWS vars + `USE_MEMORY_STORE=false`.  
   - See [docs/VERCEL_BACKEND.md](VERCEL_BACKEND.md).

3. **Deploy frontend (Vercel)**  
   - Set **API_PROXY_TARGET** = `https://<your-backend>.vercel.app` (no `/api`).  
   - Redeploy so the explicit `api/incidents/[id]/status` route is live.

4. **Verify**  
   - `GET https://<frontend>/api/health` → frontend API.  
   - `GET https://<frontend>/api/debug-proxy` → shows `backendBase` the proxy uses.  
   - `GET/PATCH https://<frontend>/api/incidents/<id>/status` → goes to backend (no 404 from frontend; backend returns incident for GET, updates for PATCH).

---

## If something breaks

- **404 on `/api/incidents/.../status`**  
  Redeploy frontend so the explicit route `api/incidents/[id]/status/route.ts` is deployed.  
- **502 from proxy**  
  Backend URL wrong or backend down. Check `API_PROXY_TARGET` and backend deployment; hit `https://<backend>/api/health`.  
- **Backend “Incident not found”**  
  Configure DynamoDB (or use local storage); see [VERCEL_BACKEND.md](VERCEL_BACKEND.md) env vars.
