# Fix CORS on Vercel (proxy through frontend)

If the backend response has **no `Access-Control-Allow-Origin`** header, the browser blocks it. Vercel does not expose a Headers UI, and the Python runtime may not forward custom response headers.

**Recommended fix: proxy the backend through the frontend** so the browser only talks to the frontend (same-origin). No CORS needed.

---

## 1. Proxy setup (frontend project on Vercel)

1. Open your **frontend** project on Vercel → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `API_PROXY_TARGET`
   - **Value:** `https://erp-instance-backend-8b41kejdj-lakshay-blehs-projects.vercel.app`  
     (your backend URL **without** `/api` at the end)
3. **Remove** or leave **empty** `NEXT_PUBLIC_API_URL` for Production/Preview so the client uses same-origin `/api`.
4. **Redeploy** the frontend.

The frontend `next.config.js` has a **rewrite**: requests to `https://your-frontend.vercel.app/api/*` are proxied to `API_PROXY_TARGET/api/*` on the server. The browser only sees the frontend origin, so there is no cross-origin request and no CORS.

---

## 2. Verify

- Open the app at `https://erp-instance.vercel.app` (or your frontend URL).
- Open DevTools → Network; reload and check the request to `/api/incidents`. It should be same-origin (no CORS error).

---

## 3. If you prefer direct backend URL (no proxy)

If you keep `NEXT_PUBLIC_API_URL` set to the backend URL, the browser will call the backend directly and CORS is required. The backend code and ASGI wrapper already try to add CORS headers; if they still don’t appear in the response, use the proxy approach above.
