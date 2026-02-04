# API Endpoints

## Frontend (what the app calls)

The app always calls the **frontend** origin so the proxy can forward to the backend (no CORS).

| Method | URL | Description |
|--------|-----|-------------|
| **GET** | `/api/health` | Frontend API health (returns `{"ok":true,"source":"frontend-api"}`) |
| **GET** | `/api/incidents` | List incidents (query: `?severity=P1`, `?erp_module=AP`) |
| **POST** | `/api/incidents` | Create incident (JSON body) |
| **GET** | `/api/incidents/{id}` | Get one incident |
| **PATCH** | `/api/incidents/{id}` | (Not used; use status/tags below) |
| **DELETE** | `/api/incidents/{id}` | Delete incident (204) |
| **GET** | `/api/incidents/{id}/status` | Get incident (same as GET by id) |
| **PATCH** | `/api/incidents/{id}/status` | Update status (body: `{"status":"Resolved"}`) |
| **PATCH** | `/api/incidents/{id}/tags` | Update tags (body: `{"tags":["urgent"]}`) |
| **POST** | `/api/incidents/{id}/enrich` | Re-run Groq enrichment |
| **GET** | `/api/debug-proxy` | Shows proxy config (backendBase, env hints) |

**Base URLs**

- **Local:** `http://localhost:3000` (or 3001) → e.g. `http://localhost:3000/api/incidents`
- **Vercel:** `https://erp-instance.vercel.app` → e.g. `https://erp-instance.vercel.app/api/incidents`

---

## Backend (direct)

Used when calling the backend directly (e.g. curl, Postman, or server-side with `API_PROXY_TARGET`).

### Local (uvicorn, no `/api` prefix)

Base: `http://localhost:8000`

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/health` | Health |
| GET | `/config` | Storage mode (no secrets) |
| GET | `/incidents` | List incidents |
| POST | `/incidents` | Create incident |
| GET | `/incidents/{id}` | Get one incident |
| GET | `/incidents/{id}/status` | Get incident |
| PATCH | `/incidents/{id}/status` | Update status |
| PATCH | `/incidents/{id}/tags` | Update tags |
| DELETE | `/incidents/{id}` | Delete incident (204) |
| POST | `/incidents/{id}/enrich` | Re-run enrichment |

### Vercel backend (mounted at `/api`)

Base: `https://YOUR-BACKEND.vercel.app`

Same paths as above but with **`/api`** prefix, e.g.:

- `GET /api/health`
- `GET /api/incidents`
- `POST /api/incidents`
- `GET /api/incidents/{id}`
- `PATCH /api/incidents/{id}/status`
- `DELETE /api/incidents/{id}`
- etc.

Example: `https://erp-incidents-api.vercel.app/api/incidents`

---

## Vercel: list works but get-by-id returns 404

If **GET /api/incidents** returns a list that includes an id, but **GET /api/incidents/{id}** returns 404 for that same id:

- On Vercel, the backend runs as **serverless**. Without **DynamoDB**, each request can run in a **different instance** with its own in-memory store. The list might be served from an instance that has data; the get-by-id request often hits another instance where that incident does not exist → 404.
- **Fix:** Configure **DynamoDB** on the backend so all instances share the same data:
  1. Backend project → **Settings** → **Environment Variables**
  2. Set `USE_MEMORY_STORE` = `false` and add AWS credentials + `DYNAMODB_TABLE` (e.g. `erp-incidents`)
  3. Create the table in AWS (partition key `id`, String)
  4. Redeploy the backend

See [VERCEL_BACKEND.md](VERCEL_BACKEND.md) for full steps.

---

## Examples (curl)

**Via frontend (same-origin):**

```bash
# List incidents
curl "https://erp-instance.vercel.app/api/incidents"

# Get one incident
curl "https://erp-instance.vercel.app/api/incidents/5208464c-be98-463d-b5d9-51670880490b"

# Update status
curl -X PATCH "https://erp-instance.vercel.app/api/incidents/5208464c-be98-463d-b5d9-51670880490b/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"Resolved"}'
```

**Direct to backend (local):**

```bash
curl "http://localhost:8000/incidents"
curl "http://localhost:8000/incidents/5208464c-be98-463d-b5d9-51670880490b"
```

**Direct to backend (Vercel):**

```bash
curl "https://YOUR-BACKEND.vercel.app/api/incidents"
```
