# Deploy Frontend and Backend as Two Separate Projects

This guide deploys the **Next.js frontend** and **FastAPI backend** as **two independent deployments**, so you can host the frontend on Vercel and the backend on Railway, Render, Fly.io, or a second Vercel project.

---

## Overview

| Project   | What to deploy        | Root / path      | Example URL              |
|----------|------------------------|------------------|---------------------------|
| Frontend | Next.js app            | `frontend/`      | `https://your-app.vercel.app` |
| Backend  | FastAPI API            | `backend/`       | `https://your-api.railway.app` |

The frontend calls the backend using **NEXT_PUBLIC_API_URL**. The backend must allow the frontend URL in **CORS**.

---

## 1. Deploy the Backend (first)

Deploy the FastAPI app from the **backend** directory.

### Option A: Railway

1. Go to [railway.app](https://railway.app) and create a project.
2. **Add service** → **Deploy from GitHub** → select this repo.
3. **Settings** → **Root Directory**: set to **`backend`**.
4. **Settings** → **Build**: leave empty or set **Build Command** to `pip install -r requirements.txt` if needed.
5. **Settings** → **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Variables**: add at least:
   - `GROQ_API_KEY` (from [console.groq.com](https://console.groq.com))
   - For AWS: `USE_MEMORY_STORE=false`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DYNAMODB_TABLE`, `S3_BUCKET`, etc.
7. Deploy and copy the public URL (e.g. `https://your-api.up.railway.app`).

### Option B: Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**.
2. Connect the repo and set **Root Directory** to **`backend`**.
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Environment**: add `GROQ_API_KEY` and any AWS vars.
6. Deploy and copy the service URL (e.g. `https://your-api.onrender.com`).

### Option C: Fly.io

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/) and run `fly auth login`.
2. From **project root**: `cd backend` then `fly launch` (create app, no database if prompted).
3. Set secrets: `fly secrets set GROQ_API_KEY=...` (and AWS vars if needed).
4. Ensure `fly.toml` runs: `uvicorn app.main:app --host 0.0.0.0 --port 8080` (or use `PORT` from env).
5. Deploy: `fly deploy` and note the app URL (e.g. `https://your-api.fly.dev`).

### Option D: Vercel (backend as serverless API)

1. Create a **new Vercel project** (separate from the frontend).
2. **Root Directory**: **`.`** (repo root). The repo root `api/` folder will be used.
3. **Environment variables**: add `GROQ_API_KEY`, AWS vars, and **CORS_ORIGINS_EXTRA** = your frontend URL (e.g. `https://your-app.vercel.app`).
4. Deploy. The API will be at `https://your-api-project.vercel.app/api/incidents`, etc. So the **backend base URL** for the frontend is `https://your-api-project.vercel.app/api` (with `/api`).

---

## 2. Configure CORS on the backend

When the backend is on a different domain than the frontend, it must allow the frontend origin.

- **Railway / Render / Fly.io:** Set an environment variable in the dashboard:
  - **CORS_ORIGINS_EXTRA** = `https://your-app.vercel.app`  
  (or comma-separated: `https://app1.vercel.app,https://app2.vercel.app`)

- **Vercel (backend project):** Same: **CORS_ORIGINS_EXTRA** = `https://your-frontend.vercel.app`

The backend already allows `http://localhost:3000` and `http://127.0.0.1:3000` for local dev.

---

## 3. Deploy the Frontend

1. Go to [vercel.com](https://vercel.com) and import this repo.
2. **Root Directory**: set to **`frontend`**.
3. **Environment variables**:
   - **NEXT_PUBLIC_API_URL** = your backend base URL (no trailing slash), e.g.:
     - Railway: `https://your-api.up.railway.app`
     - Render: `https://your-api.onrender.com`
     - Fly.io: `https://your-api.fly.dev`
     - Vercel (backend): `https://your-api-project.vercel.app/api`
4. Deploy.

The frontend will call the backend at `NEXT_PUBLIC_API_URL` for all API requests.

---

## 4. Quick reference

| Step | Frontend (Vercel) | Backend (Railway / Render / Fly / Vercel) |
|------|-------------------|------------------------------------------|
| Root | `frontend`        | `backend` (or repo root if using root `api/`) |
| Env  | `NEXT_PUBLIC_API_URL` = backend URL | `GROQ_API_KEY`, AWS vars, `CORS_ORIGINS_EXTRA` = frontend URL |
| Build | (auto Next.js)   | `pip install -r requirements.txt` (if needed) |
| Start | (auto)           | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

---

## Local development with two deploys

- **Frontend:** `cd frontend && npm run dev` — set **NEXT_PUBLIC_API_URL** in `frontend/.env.local` to your deployed backend URL to hit prod API, or leave unset to use `http://localhost:8000`.
- **Backend:** `cd backend && uvicorn app.main:app --reload --port 8000` — CORS already allows `http://localhost:3000`.
