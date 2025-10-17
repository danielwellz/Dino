# Dino Multimedia Project Management Platform – Usage Guide

This guide introduces the core areas of the Dino platform and the workflows currently available in the Next.js (frontend) client.

## Access & Session Flow
- Sign in or create an account through the authentication screens (`client/src/app/authentication/page.tsx`). Sessions are persisted with HTTP-only cookies and Redux Persist.
- After authentication you are redirected into the dashboard guard (`client/src/app/DashboardWrapper.tsx`) which enforces access to protected routes.

## Global Navigation
- **Dashboard** – Summaries for active projects, task status, and upcoming work (`client/src/app/dashboard/page.tsx`). Use card filters to jump deep into a project.
- **Projects** – `/projects/[id]` provides a project switcher and workspace selector. Tabs include Tasks (Board/List/Graph/Gantt views), Assets, Moodboard, Storyboard, and Scenario editors.
- **Messages** – Real-time team chat backed by Socket.IO (`client/src/app/messages/page.tsx`), including typing indicators and unread counts.
- **Teams & Members** – Manage team rosters, see roles, invite collaborators, and review participation.

## Project Workspaces
- **Tasks** – Drag-and-drop Kanban board, list table, dependency graph, and Gantt scheduling. Each view shares filters and uses RTK Query data from `src/state/api.ts`.
- **Assets** – Organize media items, tag them, and link to tasks. Supports folder taxonomy and previews where sources are available.
- **Moodboard / Storyboard / Scenario** – Creative workspaces for visual ideation:
  - Moodboard: arrange imagery, embeds, and notes on a canvas.
  - Storyboard: manage ordered frames, attach timings, and link back to tasks.
  - Scenario: collaborative narrative drafting with presence indicators and frame/task cross-links.

## Collaboration Features
- **Messaging** – Team-level channels today; message receipts and attachments are stored in the backend Prisma models.
- **Invitations & Members** – Use the Invite modal within project headers to add teammates.
- **Real-time Updates** – WebSocket events keep chat and presence signals in sync. RTK Query invalidates caches on mutations for consistent views.

## Localization & Branding
- The UI is prepared for bilingual English/Farsi rendering using `next-intl` with locale files in `client/src/locales`.
- Right-to-left support automatically activates when the locale is set to `fa` (`client/src/app/layout.tsx`).

## Troubleshooting & Tips
- If API requests fail, confirm your environment variables for `NEXT_PUBLIC_API_BASE_URL` and `NEXT_INTERNAL_API_BASE_URL`.
- Use the Task modal to create projects and link tasks; comments and attachments live under Task Details.
- To reset Redux-persisted auth state, clear browser storage and cookies for the app domain.
- For reporting issues, capture browser console logs and server logs (see `docs/operations.md`).
