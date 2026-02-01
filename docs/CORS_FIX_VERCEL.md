# Fix CORS on Vercel Backend (Response has no CORS headers)

If the response has **no `Access-Control-Allow-Origin`** header, the browser blocks it and you get a CORS error.

**Vercel has no "Headers" section in the dashboard** for adding response headers; headers are set in **vercel.json** or in the app. This project fixes CORS **in code** via raw ASGI middleware in `vercel-backend/api/[...path].py`.

---

## What the code does

- **Raw ASGI middleware** in `api/[...path].py` wraps every response and injects CORS headers into the `http.response.start` message before it is sent.
- Path `/api/incidents` is rewritten to `/incidents` and passed to the FastAPI backend; the response is then sent with CORS headers added.
- OPTIONS requests return 200 with CORS headers immediately.

After you **commit and push** the latest `vercel-backend/api/[...path].py` and **redeploy** the backend on Vercel, responses should include `Access-Control-Allow-Origin: *`.

---

## Verify

```powershell
$r = Invoke-WebRequest -Uri "https://YOUR-BACKEND.vercel.app/api/incidents" -UseBasicParsing
$r.Headers['Access-Control-Allow-Origin']
```

You should see `*`. Then hard refresh the frontend (Ctrl+Shift+R).
