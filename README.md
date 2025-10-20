# Dyno Multimedia Project Management Platform

Modern creative teams need a shared operating system for projects, communication, and assets. Dyno delivers that with an end‑to‑end workspace covering planning, production, and review. This repository contains both the Next.js front end and the Express/Prisma API that power the platform.

---

## Repository & Project Links

- Source: [`https://github.com/danielwellz/Dyno`](https://github.com/danielwellz/Dyno)
- Live preview (if configured): update with your deployment URL.
- Product documentation: see `/docs`.

---

## Feature Highlights

- **Project & Task Management** — Kanban, List, Gantt, and dependency graph views share a unified data model with rescheduling intelligence.
- **Creative Workspaces** — Dedicated Moodboard, Storyboard, Scenario, and Assets canvases with task linkage and metadata.
- **Team Collaboration** — Role-aware invitations, RTK Query backed messaging with Socket.IO presence, and real-time task updates.
- **Internationalization** — `next-intl` provides bilingual (English/Farsi) UI with automatic RTL handling.
- **AI-Ready Architecture** — Placeholder orchestration points and metadata fields anticipate future AI-assisted workflows.
- **Containerized Stack** — Docker tooling provisions Postgres, API, and client for consistent onboarding.

---

## Tech Stack

| Area       | Technologies                                                                                                      |
|------------|--------------------------------------------------------------------------------------------------------------------|
| Front end  | Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS + MUI, RTK Query, Redux Persist, next-intl             |
| Back end   | Express, Prisma ORM, Socket.IO, JSON Web Tokens, Nodemailer                                                        |
| Database   | PostgreSQL                                                                                                         |
| Tooling    | Docker Compose, ESLint (flat config), npm                                                                          |

---

## Quick Start (Docker)

```bash
git clone https://github.com/danielwellz/Dyno.git
cd Dyno
cp client/.env.docker.example client/.env.docker
cp server/.env.docker.example server/.env.docker
docker compose up --build
```

Once the containers report `Ready`:
- Client: http://localhost:3000
- API: http://localhost:8000
- Postgres: localhost:5433 (mapped)

Stop the stack with `docker compose down`.

---

## Local Development

> Requirements: Node.js 20+, npm 10+, PostgreSQL 16+, OpenSSL (server build).  
> Install global prisma CLI if desired: `npm install -g prisma`.

1. **Clone & Install**
   ```bash
   git clone https://github.com/danielwellz/Dyno.git
   cd Dyno
   npm install --prefix client --legacy-peer-deps
   npm install --prefix server
   ```

2. **Environment Files**
   ```bash
   # client/.env.local
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   NEXT_INTERNAL_API_BASE_URL=http://localhost:8000

   # server/.env
   PORT=8000
   DATABASE_URL=postgresql://postgres:<password>@localhost:5432/dyno?schema=public
   JWT_ACCESS_TOKEN_SECRET=replace-me
   JWT_REFRESH_TOKEN_SECRET=replace-me
   STATUS=development
   FRONTEND_URL=http://localhost:3000
   ```

3. **Database**
   ```bash
   # Ensure your Postgres database exists (e.g., created via psql or pgAdmin)
   npx prisma migrate deploy    # applies migrations
   npx prisma generate          # regenerates the Prisma client if schema changed
   ```

4. **Start Servers**
   ```bash
   npm run dev --prefix server   # API on http://localhost:8000
   npm run dev --prefix client   # UI on http://localhost:3000
   ```

---

## Scripts Overview

| Command                                   | Description                                                           |
|-------------------------------------------|-----------------------------------------------------------------------|
| `npm run dev --prefix client`             | Next.js development server with hot reload                            |
| `npm run build --prefix client`           | Production build with type checks                                     |
| `npm run start --prefix client`           | Launches Next.js in production mode                                   |
| `npm run dev --prefix server`             | Express server with TypeScript watch + nodemon                        |
| `npm run build --prefix server`           | Compiles TypeScript to `server/dist`                                  |
| `npm run start --prefix server`           | Runs compiled API from `dist`                                         |
| `npx prisma migrate dev --name <label>`   | Create & apply a new migration locally                                |
| `npx prisma migrate deploy`               | Apply pending migrations (used in CI / containers)                    |

---

## Project Structure

```
Dyno/
├─ client/               # Next.js app
│  ├─ public/
│  ├─ src/
│  │  ├─ app/            # App Router routes & layouts
│  │  ├─ components/
│  │  ├─ state/          # Redux slices & RTK Query API
│  │  └─ locales/        # next-intl translation bundles
│  └─ Dockerfile         # Containerized client build
├─ server/               # Express API
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ migrations/
│  ├─ src/
│  │  ├─ controllers/
│  │  ├─ routes/
│  │  ├─ sockets/
│  │  └─ utils/
│  └─ Dockerfile
├─ docs/                 # Supplemental documentation
├─ docker-compose.yml
└─ README.md             # You are here
```

---

## Database Notes

- Prisma migrations live under `server/prisma/migrations`.
- If starting from scratch, run `docker compose up db -d` to provision Postgres and `npx prisma migrate deploy` (or `dev`) to seed schema.
- The newest backfill migration (`20251017143000_backfill_schema`) guards creation of late-stage tables (Assets, Conversations, Project templates). Keep it committed; Prisma will skip statements already satisfied.

---

## Troubleshooting Tips

- **Docker build fails with `libssl` errors**: The API container now uses `node:20-bookworm-slim` and installs OpenSSL. Pull fresh base images (`docker compose build --no-cache server`).
- **Type errors during client build**: Run `npm run build --prefix client` locally to catch missing typings. Most fixes involve optional chaining or updated interfaces in `client/src/app/types/types.ts`.
- **Migration conflicts**: Inspect `_prisma_migrations` and either resolve with `prisma migrate resolve` or apply the guard migration above.
- **Lint noise**: Next.js build currently ignores ESLint during CI; address outstanding lint rules before enforcing.

---

## Contributing

1. Fork or branch from `main`.
2. Keep Prisma schema changes accompanied by a migration.
3. Run client + server builds before opening a PR.
4. Submit a pull request to `https://github.com/danielwellz/Dyno`.

> Note: GitHub previously attributed commits to another author. Subsequent pushes use the `danielwellz` account; no additional contributors are listed in this repository.

---

## License

License terms are not yet published. Until finalized, please request permission before deploying or distributing the project beyond evaluation purposes.

---

## Acknowledgements

- Graph-based task planning inspired by university research into topological sorting.
- UI assets and branding draw from the Dyno Multimedia identity contained in `/client/public`.

For questions or access requests, open an issue on the GitHub repo or contact `danielwellz`. Happy building!
