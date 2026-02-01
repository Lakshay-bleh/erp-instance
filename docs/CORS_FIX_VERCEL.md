# Fix CORS on Vercel (proxy through frontend)

**Fix:** The frontend **always** uses same-origin `/api` in the browser, so requests go through Next.js rewrites to the backend. No cross-origin request → no CORS.

---

## 1. Frontend project (Vercel)

1. Open your **frontend** project on Vercel → **Settings** → **Environment Variables**.
2. Ensure the **rewrite target** is set so `/api/*` is proxied to the backend. Use **one** of:
   - **API_PROXY_TARGET** = `https://erp-incidents-api.vercel.app` (backend URL **without** `/api`), or
   - **NEXT_PUBLIC_API_URL** = `https://erp-incidents-api.vercel.app/api` (used only by the server for the rewrite; the browser still uses `/api`).
3. **Redeploy** the frontend.

Result: The browser always requests `https://your-frontend.vercel.app/api/*` (same-origin). Next.js rewrites those to the backend. No CORS.

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

## 4. 404 after CORS is fixed

If CORS is gone but you get **404** on GET/PATCH/DELETE for an incident:

- The request is reaching the backend; the backend is returning **404 (Incident not found)**.
- On Vercel, the backend uses **in-memory / file store** unless you set **DynamoDB**. So incidents may not persist across requests.
- **Fix:** Configure **DynamoDB** on the backend project (see [VERCEL_BACKEND.md](VERCEL_BACKEND.md)): set `USE_MEMORY_STORE=false`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `DYNAMODB_TABLE`, then redeploy the backend.

---

## 5. If you prefer direct backend URL (no proxy)

If you keep **NEXT_PUBLIC_API_URL** set to the backend URL (e.g. `https://erp-incidents-api.vercel.app/api`), the browser will call the backend directly and **CORS is required**. The backend (`app.py`) uses FastAPI `CORSMiddleware`; if CORS errors persist, use the proxy approach above.
