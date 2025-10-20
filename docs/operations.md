# Operations & Maintenance Guide

This document explains how to run, monitor, and maintain the Dyno platform across the Next.js client and Express/Prisma API server.

## 1. Runtime Options
- **Docker (recommended):**
  1. Copy supplied environment templates:
     ```bash
     cp client/.env.docker.example client/.env.docker
     cp server/.env.docker.example server/.env.docker
     ```
  2. Start the stack:
     ```bash
     docker compose up --build
     ```
     - Client available at `http://localhost:3000`.
     - API running at `http://localhost:8000`.
     - Postgres exposed on `localhost:5433`.
  3. Stop with `docker compose down`. Add `-v` to drop the Postgres volume.
- **Local development (without Docker):**
  1. Install dependencies in both `client/` and `server/`.
  2. Provide `.env.local` (client) and `.env` (server) files mirroring the docker equivalents.
  3. Start Postgres locally and update `DATABASE_URL`.
  4. Run `npm run dev` in both folders.

## 2. Environment Variables
- Client:
  - `NEXT_PUBLIC_API_BASE_URL` – URL browsers use to reach the API (usually `http://localhost:8000`).
  - `NEXT_INTERNAL_API_BASE_URL` – Internal service URL used by server-side rendering inside the client container (defaults to `http://server:8000` in Docker).
- Server:
  - `PORT` – API port (default 8000).
  - `DATABASE_URL` – Postgres connection string (`postgresql://postgres:postgres@db:5432/pm_app?schema=public` in Docker).
  - `JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET` – Replace with secure random strings before production usage.
  - `FRONTEND_URL` – Origin allowed for CORS and cookie policies.
  - `STATUS` – `development` | `production` toggle for logging verbosity.

## 3. Database Management
- Prisma schema lives at `server/prisma/schema.prisma`.
- Apply migrations:
  ```bash
  # Docker
  docker compose run --rm server npx prisma migrate deploy

  # Local
  cd server && npx prisma migrate deploy
  ```
- Generate client:
  ```bash
  npx prisma generate
  ```
- Backups: snapshot the `postgres-data` volume or use `pg_dump`:
  ```bash
  docker compose exec db pg_dump -U postgres pm_app > backup.sql
  ```

## 4. Monitoring & Logging
- Client logs appear in the container output or `npm run dev` console.
- API logs stream to stdout (access + application logs via `morgan`). Capture them with `docker logs <container>`.
- Add structured logging or ship to observability stack (e.g., OpenTelemetry) before production.

## 5. Routine Maintenance
- **Dependency updates:** run `npm outdated`, update mindfully, and lint/test before deploying.
- **Prisma migrations:** keep schema changes in version control; never edit the generated migrations manually.
- **Secrets rotation:** replace JWT secrets regularly and rotate credentials in Postgres.
- **Data hygiene:** periodically purge stale sessions, orphaned assets, and archived projects.
- **Security:** enable HTTPS termination, configure CORS policies, and audit third-party integrations.

## 6. Scaling Considerations
- Use Postgres connection pooling (pgBouncer) when traffic increases.
- Add Redis + BullMQ for background jobs (AI workflows, notifications).
- Scale Socket.IO with Redis adapter for multi-instance deployments.
- Container images are built for Node 20 on Alpine; customize base images if platform-specific dependencies are required.
