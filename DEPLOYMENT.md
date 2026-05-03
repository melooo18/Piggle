# Deployment Guide

This project is easiest to deploy as:

- `frontend`: static React app on Vercel
- `backend`: Node/Express API on Render

This repo now includes:

- `render.yaml` for the backend service
- `frontend/vercel.json` for frontend SPA routing

## 1. Backend Deployment on Render

Deploy this repo to Render and point it at the included `render.yaml`, or create a Web Service using the `backend` folder.

Build command:

```bash
npm install
```

Start command:

```bash
npm start
```

Required environment variables:

```env
PORT=5000
OPENROUTER_API_KEY=your_openrouter_api_key_here
FRONTEND_URL=https://your-frontend-domain
```

After deploy, copy the backend URL. Example:

```text
https://piggle-api.onrender.com
```

## 2. Frontend Deployment on Vercel

Deploy the `frontend` folder as a Vercel project.

Framework preset:

```text
Create React App
```

Build command:

```bash
npm install && npm run build
```

Output directory:

```text
build
```

Required environment variable:

```env
REACT_APP_API_URL=https://your-backend-domain
```

Example:

```env
REACT_APP_API_URL=https://piggle-api.onrender.com
```

## 3. Firebase Settings

In Firebase Authentication settings:

- add your deployed frontend domain to Authorized domains

Example:

- `your-app.vercel.app`
- `your-custom-domain.com`

Without this, Google sign-in and email auth can fail on production.

## 4. Recommended Order

1. Deploy the backend on Render.
2. Copy the backend URL.
3. Set `REACT_APP_API_URL` in Vercel using that backend URL.
4. Deploy the frontend on Vercel.
5. Add the Vercel domain to Firebase Authorized domains.
6. Update Render `FRONTEND_URL` to the final frontend domain.

## 5. Notes

- The frontend already falls back to `http://localhost:5000` for local development.
- The backend uses `FRONTEND_URL` for CORS, so set it to your deployed frontend URL in production.
- Firebase client config in the frontend is safe to expose publicly, but secrets like `OPENROUTER_API_KEY` must stay only on the backend.
