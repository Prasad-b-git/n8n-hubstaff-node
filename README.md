# n8n Hubstaff Node (v2)

<div align="center">

![npm version](https://img.shields.io/npm/v/n8n-nodes-hubstaff2?style=for-the-badge)
![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-hubstaff2?style=for-the-badge)
![license](https://img.shields.io/npm/l/n8n-nodes-hubstaff2?style=for-the-badge)

**Official repository:** [github.com/Prasad-b-git/n8n-hubstaff-node](https://github.com/Prasad-b-git/n8n-hubstaff-node)

[Highlights](#highlights) • [Install](#install) • [Credentials](#credentials) • [Supported-operations](#supported-operations) • [Development](#development)

</div>

---

## Highlights

- **Full Hubstaff v2 coverage**: projects, tasks, time entries, users, and members.
- **Task filters**: status, pagination cursor, user/project/global todo lists.
- **Smart authentication**: refresh-token exchange using the Hubstaff OpenID discovery endpoint with caching.
- **n8n-first design**: every operation exposes friendly field descriptions, validation, and helpful error messages.
- **Actively maintained**: issues and pull requests are tracked in the public GitHub repo.

## Install

### Community Nodes (UI)
1. Open n8n → **Settings** → **Community Nodes**.
2. Add `n8n-nodes-hubstaff2` and confirm the warning.
3. Restart n8n to load the node.

### npm (self-hosted builds)

```bash
npm install n8n-nodes-hubstaff2
```

## Credentials

| Field | Description |
|-------|-------------|
| **Refresh Token** | Personal Access Token from [Hubstaff Developer Portal](https://developer.hubstaff.com/personal_access_tokens). |
| **Organization ID** | Optional for user endpoints, required for most project/task/member calls. |

The node exchanges the refresh token for short-lived access tokens, caches them, and reuses them until five minutes before expiration.

## Supported Operations

### User
- Get current user.
- Get user by ID.

### Project
- List, fetch, create, update, and fetch members.
- Create/update payloads accept metadata, billing rates, budgets, and dynamic member arrays (pass `members_payload` from previous nodes or configure via Additional Fields).

### Task
- List tasks by organization or project with optional filters (`status[]`, `user_ids[]`, `project_ids[]`, `global_todo_ids[]`, pagination cursors).
- Get single task, create, update (with optimistic `lock_version`), delete.

### Time Entry
- List with date range and pagination.
- Create (user/project/task, timestamps, notes) and update existing entries.

### Member
- List all members for the configured organization (includes email and profile data when permissions allow).

## Usage Tips

- **Filters**: For comma-separated ID lists, you can also pass JSON arrays (e.g., `=[123,456]`). The node will normalize values before calling the API.
- **Lock version**: When updating tasks, read the current `lock_version` from a preceding Get Task call to avoid conflicts.
- **members_payload**: Build arrays upstream (Function node or fetched data) and assign to `members_payload`—the node will submit it to `/update_members` after the main project update.
- **Return All vs limit**: Use `Return All` for automation runs, or set a per-page limit for quicker manual executions.

## Development

```bash
git clone https://github.com/Prasad-b-git/n8n-hubstaff-node.git
cd n8n-hubstaff-node
npm install
npm run build
```

Publish scripts use `tsc` if available but fall back gracefully. When contributing, run `npm pkg fix` to sync metadata before publishing.

## Support & Contributions

- **Issues & PRs**: [github.com/Prasad-b-git/n8n-hubstaff-node/issues](https://github.com/Prasad-b-git/n8n-hubstaff-node/issues)
- **Package**: [npmjs.com/package/n8n-nodes-hubstaff2](https://www.npmjs.com/package/n8n-nodes-hubstaff2)
- **n8n docs**: [docs.n8n.io](https://docs.n8n.io)

If this node streamlines your workflows, please star the GitHub repo. It helps others discover the package and keeps the project healthy.

---

Made with ❤️ for the n8n community.
