# Fix CORS on Vercel (proxy through frontend)

**Fix:** All `/api/*` requests are handled by a **Next.js API route** (`src/app/api/[...path]/route.ts`) that proxies to the backend on the server. The browser only talks to your frontend (same-origin) → no CORS.

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

- **next.config.js** already has the rewrite: `source: "/api/:path*"` → `destination: "${API_PROXY_TARGET}/api/:path*"`.
- **api.ts**: When `NEXT_PUBLIC_API_URL` is unset/empty, `getApiBase()` returns `"/api"` in the browser and `https://${VERCEL_URL}/api` on the server, so all requests go through the frontend and get proxied.

---

## 3. Verify

1. Open the app at your frontend URL (e.g. `https://erp-instance.vercel.app`).
2. Open DevTools → Network; trigger a request (e.g. list incidents or update status).
3. The request URL should be **same-origin** (e.g. `https://your-frontend.vercel.app/api/incidents/...`) and there should be **no CORS error**.

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
