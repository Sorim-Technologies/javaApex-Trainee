# JavaApex Trainee

This project has:

- A React + Vite frontend in the repository root
- A FastAPI backend in `java-migration-backend/Java_Migration_Accelerator_backend/java-migration-backend`

## Local setup

Frontend dependencies are already installed when `node_modules` is present.

Backend dependencies are installed in:

- `java-migration-backend/Java_Migration_Accelerator_backend/java-migration-backend/venv`

## Run locally

Start the backend first:

```powershell
npm run dev:backend
```

Start the frontend in a second terminal:

```powershell
npm run dev:frontend
```

Expected local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8001`
- Health check: `http://localhost:8001/health`

## Why `ERR_CONNECTION_REFUSED` happens

The frontend calls the FastAPI server on port `8001` during local development.
If the backend is not running, requests such as `/api/java-versions` and
`/api/conversion-types` will fail with `ERR_CONNECTION_REFUSED`.

## Environment notes

- `.env.production` is only for production builds.
- Local development currently falls back to `http://localhost:8001`.
- Optional backend integrations use environment variables such as
  `GITHUB_TOKEN`, `HF_TOKEN`, `SONARQUBE_URL`, `SONARQUBE_TOKEN`,
  `FOSSA_API_KEY`, `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD`.

## Validation

Verified during review:

- Frontend production build succeeds with `npm.cmd run build`
- Backend imports cleanly from its local virtual environment
- Backend starts successfully on port `8001` when launched from the backend folder
