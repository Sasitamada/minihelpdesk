# ✅ Spaces, Folders & Lists (ClickUp Style)

## Overview
The hierarchy now matches ClickUp’s structure:

`Workspace → Space → Folder → List → Task`

- **Spaces** sit inside a workspace and group high-level teams or departments.
- **Folders** live inside a space and group lists (optional, you can have list directly in a space).
- **Lists** are the former “projects” and contain tasks.

## Backend
- Tables: `spaces`, `folders`, `projects` (lists) with `space_id` + `folder_id`.
- Routes:
  - `GET/POST/PUT/DELETE /api/spaces`
  - `GET/POST/PUT/DELETE /api/folders`
  - Existing `/api/projects` now understands `spaceId` + `folderId`.
- `GET /projects/:id` returns `space_name`, `folder_name`, `workspace_name`.

## Frontend
- `SpaceManager` component (Workspace → “Spaces” tab) handles:
  - Creating/deleting spaces.
  - Creating/deleting folders per space.
  - Creating/deleting lists and jumping right into the list (ProjectView).
- Workspace Overview stats now call lists “Lists”.
- Lists can still be created from Overview; they drop into the first space automatically.
- ProjectView header shows breadcrumb (Workspace • Space • Folder).

## How to Use
1. Open a workspace → “Spaces” tab.
2. Create a Space (e.g. “Product”).
3. Inside the space, add Folders (e.g. “Q1 Goals”) or just Lists.
4. Click any List to open it in full Project/Task view.

All existing lists are automatically placed into the default “General Space” to keep data intact. 🎉

