# Decor Solution

Monorepo with separate frontend and backend folders.

## Structure

- client/ - Vite React frontend
- server/ - Node/Express backend

## Deploy to Vercel

The repository root is the Vercel project root. `vercel.json` builds the Vite client into `client/dist`, serves it as the SPA, and sends `/api/*` requests to the Express serverless function in `api/`. The serverless function reuses MongoDB connections between warm invocations.

Before the first deployment:

1. Import this repository into Vercel with the repository root as the project root.
2. Create a MongoDB Atlas database and allow connections from Vercel. Use a restricted database user; configure Atlas network access for your Vercel deployment as appropriate.
3. Create and connect a Vercel Blob store to the Vercel project. Existing local-disk uploads are not deployed because `uploads/` is ignored and Vercel filesystems are temporary.
4. Set the environment variables below for Preview and Production, then deploy.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Long, random secret used to sign authentication tokens |
| `BLOB_READ_WRITE_TOKEN` | Yes for uploads | Added when a Blob store is connected; used to authorize signed browser uploads |
| `VITE_UPLOAD_PROVIDER` | Yes for uploads | Set to `vercel-blob` so browser uploads go directly to persistent Blob storage |
| `CLIENT_ORIGIN` | Custom domains only | Comma-separated frontend origins when using custom domains; Vercel deployment and preview hosts are allowed automatically |
| `VITE_API_BASE_URL` | No | Leave unset for the single-project deployment; the frontend calls `/api` on its own origin |

If the database already references files in a local `uploads/` directory, migrate them before deploying. With `MONGODB_URI` and `BLOB_READ_WRITE_TOKEN` available in the server environment, run `npm run migrate:uploads-to-blob` from `server/`. The script updates product, review, and site-setting media URLs in MongoDB; it does not delete the local source files.

Vercel builds the client with `npm run build:vercel` after `npm run install:vercel`. For local development, the existing `npm run dev` workflow remains available. Local uploads continue using the filesystem unless `VITE_UPLOAD_PROVIDER=vercel-blob` is set.

## Local development

Set `VITE_API_BASE_URL` in `client/.env` to the backend origin (for example, `http://127.0.0.1:5000`). For a deployed frontend, set it to the public backend origin in the frontend hosting environment. Set `CLIENT_ORIGIN` in `server/.env` to the frontend origin so the backend allows cross-origin browser requests.

Frontend:

1. cd client
2. npm install
3. npm run dev

Backend:

1. cd server
2. npm install
3. npm run dev

# Decor_solution
