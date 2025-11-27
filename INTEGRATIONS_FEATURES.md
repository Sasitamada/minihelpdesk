# ✅ Integrations (ClickUp-style)

Your workspace now supports the same integration workflow ClickUp offers. Every integration can be connected, configured, synced, and disconnected per workspace.

## Available Integrations

| Integration | Capabilities (mirrors ClickUp) |
|-------------|--------------------------------|
| **Google Calendar** | Sync tasks & due dates into a calendar |
| **Slack** | Announce task updates to a channel |
| **GitHub** | Create/manage GitHub issues from tasks |
| **Zapier** | Trigger zaps on automation events |
| **Drive / Dropbox** | Attach cloud files to tasks |

## How it Works

1. Open a workspace → **Integrations** tab.
2. Each integration card shows status, settings, and actions.
3. Fill the required fields (calendar ID, Slack webhook, repo, etc.).
4. Hit **Connect** – the backend stores credentials/settings and simulates the external handshake.
5. Use **Sync Now** to trigger actions (e.g., send calendar updates).
6. **View Logs** to see the latest events per integration.
7. **Disconnect** to revoke the connection.

## Backend

- Tables: `integrations`, `integration_logs`.
- Routes (`/api/integrations/...`):
  - `GET /workspace/:workspaceId`
  - `POST /connect`
  - `POST /disconnect`
  - `POST /:id/sync`
  - `GET /:id/logs`
- `integrationClients.js` simulates Google Calendar/Slack/GitHub/Zapier/Drive behaviors. Swap with real SDKs when ready.

## Frontend

- `IntegrationsManager` component renders full UI (status chips, forms, buttons, logs).
- New **Integrations** tab inside `WorkspaceDetails`.
- API helpers inside `client/src/services/api.js`.

## Extending to Real APIs

- Replace the mock logic in `server/services/integrationClients.js` with actual API calls.
- Store OAuth tokens inside `auth_data` JSON.
- Add webhooks for push-based updates.

Everything is wired so you can drop in real credentials whenever you’re ready to go beyond the simulated implementation. 🚀

