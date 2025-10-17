# Product Roadmap & Future Improvements

## Current Foundation
- **Frontend**: Next.js App Router with Tailwind + MUI, RTK Query/Redux Persist, bilingual layout (`client/src/app/layout.tsx`, `client/src/app/dashboard/page.tsx`, `client/src/app/projects/[id]/page.tsx`).
- **Backend**: Express + Prisma + Socket.IO (`server/src/index.ts`, `server/src/routes`, `server/src/sockets`), Postgres schema covering projects, tasks, conversations, assets, schedules, and creative artifacts.
- **Collaboration**: Team-wide chat, project invitations, shared workspaces (Assets, Moodboard, Storyboard, Scenario) with real-time presence scaffolding.
- **Branding & Localization**: Dino bilingual identity assets available, locale files stored under `client/src/locales`.

## Guiding Principles
1. **Creative Operations First** – Prioritize flows that unblock multimedia teams (briefing, scheduling, reviews).
2. **Bilingual Everywhere** – Every new feature ships with English + Farsi copy and RTL-aware UI.
3. **AI-Ready by Design** – Introduce placeholders, data contracts, and instrumentation so model-driven services can plug in later.
4. **Modular Architecture** – Feature domains (Projects, Assets, Storycraft, Communication, Finance, Extensions) remain loosely coupled via events and shared contracts.

## Phase 1 – Foundation Hardening (0–2 months)
- **Brand & Navigation**
  - Roll out Dino branding, favicon, and typography tokens across client & email templates.
  - Restructure navigation with module-first IA and persistent language switcher.
- **Onboarding & Projects**
  - Expand project creation form (type, workflow template, stage definitions, participant roster).
  - Implement invitation links, email delivery, and approvals.
  - Add onboarding wizard with bilingual copy and AI setup placeholder.
- **Communication & Assets**
  - Upgrade messaging to support group/direct threads, metadata, and read receipts.
  - Deliver Assets workspace MVP: folders, tags, previews, and drag/drop uploads.
- **DevOps**
  - Establish CI/CD for lint/test/build, automate Prisma migrations, publish Docker images.

## Phase 2 – Collaboration Depth (2–5 months)
- **Creative Workspaces**
  - Moodboard canvas with comments, version history, and media metadata.
  - Storyboard timelines linked to scenes/tasks with richer playback previews.
  - Scenario editor improvements: inline comments, shared cursors, embed integrations (Figma, Milantor).
- **Execution Workflows**
  - Unify Task views with shared filters, dependency overlays, and progress snapshots.
  - Enhance Graph view with critical path, slack, and dependency health indicators.
- **File Governance**
  - Role-based access policies, asset permissions, and audit logs.
  - AI placeholder modules for auto-tagging and compliance summaries.
- **Finance & Contracts**
  - Introduce contract templates, negotiation threads, invoice/milestone tracking.
- **Extensibility**
  - Plugin manager shell with manifest schema, upload/enable lifecycle, and marketplace gallery (Coming Soon badges).

## Phase 3 – Intelligence & Ecosystem (5–9 months)
- **AI Integrations**
  - Task suggestion engines, brief parsing, storyboard timing recommendations.
  - Performance coach insights and compliance assistant integrations.
  - Async job orchestration via Redis/BullMQ, with opt-in user controls and audit logs.
- **Marketplace & Extensions**
  - Curated marketplace for internal/external plugins, recommendation engine, billing integrations.
  - Secure sandbox/permission system for third-party extensions.
- **Analytics & Insights**
  - Cross-project dashboards, velocity metrics, and creative operations KPIs.
  - Data lineage linking briefs → tasks → contracts for compliance readiness.
- **Enterprise Readiness**
  - Single sign-on, API keys, audit trail exports, and regional data residency options.

## Cross-Cutting Initiatives
- **Localization QA** – Automated translation linting and screenshot diffing to catch copy regressions.
- **Accessibility** – Keyboard navigation, focus states, ARIA labeling, and color-contrast compliance.
- **Performance** – CDN/edge caching for static assets, query caching, and socket scaling strategy.
- **Security** – Refresh token rotation, WebSocket auth guards, encryption for sensitive records, periodic penetration testing.

## Success Metrics
- Time-to-onboard new project teams.
- Active creative sessions in Moodboard/Storyboard/Scenario modules.
- Task cycle time and dependency resolution rate.
- Adoption of bilingual UI and AI-assisted workflows.
- Uptime and incident recovery SLAs.
