# Creative Workspaces Overview

This document captures the server and client additions that power the Smart File Management workspace plus the creative collaboration modules (Moodboard, Storyboard, Scenario). It also outlines validation touch points and proposed testing coverage.

## Data Model Updates

- Added a `TeamMemberRole` enum in Prisma so that team roles are strongly typed (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`). The following models now use the enum instead of free form strings:
  - `TeamMember.role`
  - `ProjectStage.ownerRole`
  - `ProjectParticipant.role`
  - `ProjectInvitation.role`
  - `AssetFolderRolePolicy.role`
- Asset folders now create default role policies on creation (owner/admin full control, member upload only, viewer read only).
- `AssetFolder` responses include nested children and a `permissions` snapshot so the client can respect folder level ACLs.
- New `/api/creative` endpoints:
  - `PATCH /moodboards/:moodboardId/items/:itemId` to persist drag positioning and annotation updates.
  - `PATCH /storyboards/:storyboardId/frames/:frameId` to reorder frames, adjust durations, or update linked tasks.
  - `PATCH /scenarios/:scenarioId/blocks/:blockId` for inline script edits.
- Moodboard, storyboard, and scenario creation endpoints now accept optional metadata payloads so embeds and AI placeholders can be stored alongside primary fields.

## Smart File Management UI Flow

1. **Library Overview** - summary tiles show folder and asset counts, plus quick refresh actions.
2. **Folder Taxonomy** - hierarchical tree with counts, inheriting role based permissions. Default policy creation ensures every folder has predictable ACLs.
3. **Upload Surface** - drag and drop or file picker writes assets to the selected folder. Auto tag metadata is stored as a placeholder and echoed back to the UI for future AI integration.
4. **Tag Management** - dropdowns and creatable tags hydrate team level keywords so assets are easy to find across modules.
5. **Filtering and Preview** - search, tag filters, and inline previews (with project link counts) provide a central asset library for the creative workstreams.

## Creative Modules

### Moodboard Workspace

- Board selector with create form (title, description, sharing).
- Canvas supports drag and drop images, notes, color swatches, and embed links (Figma, Milantor, etc).
- Pointer based drag repositions items and patches positions via the new API.
- AI placeholder banner surfaces stored suggestions and documents the integration point for future tagging services.

### Storyboard Workspace

- Timeline driven view that links frames to tasks and optionally embeds design sources.
- Reorder buttons call the frame update endpoint; durations are editable inline to build a rough timing pass.
- AI assistant notice highlights where script summaries or automated beats could sit once wired to an LLM.

### Scenario Workspace

- Scenario list with create form (title + summary) and collaborative block editor.
- Blocks are typed (Heading, Action, Dialogue, Note) and can link back to tasks or storyboard frames.
- Presence indicator uses `BroadcastChannel` to show concurrent editors; update endpoints persist inline edits.
- AI assistant placeholder metadata is stored per block for future suggestion overlays.

## Validation Plan

- **Server** - membership checks guard every endpoint (project or team scoped). Enum casting rejects invalid roles. Folder creation enforces required fields and parent lookups. Moodboard and storyboard updates validate ownership and entity existence before patching.
- **Client** - inputs validate for empty titles, URLs, and permission checks (cannot upload without folder access). Drag operations guard against missing bounds.
- **Follow Ups** - consider schema level constraints for asset metadata shape, optional upload size limits, and per module optimistic cache revalidation.

## Testing Coverage

- **Unit (API)** - add tests for team member role casting, asset permission defaults, and creative controller patch endpoints (position reorder, metadata merge).
- **Integration (Client)** - cover workspace tab switching, drag events (assets + moodboard), frame reorder actions, and inline scenario edits using React Testing Library.
- **Manual / Exploratory** - verify uploads for each role, cross browser drag interactions, embed iframes (Figma/Milantor), and multi tab presence messaging.
- **Future Automation** - add playbooks for end to end flows: create folder -> upload asset -> reference in storyboard -> annotate in scenario. Tie into CI once headless browser coverage is available.
