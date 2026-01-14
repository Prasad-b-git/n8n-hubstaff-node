# Hubstaff 2 for n8n

<div align="center">

![npm](https://img.shields.io/npm/v/n8n-nodes-hubstaff2?color=8b5cf6&style=for-the-badge)
![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-hubstaff2?color=10b981&style=for-the-badge)
![license](https://img.shields.io/npm/l/n8n-nodes-hubstaff2?color=0ea5e9&style=for-the-badge)

**Repository:** [github.com/Prasad-b-git/n8n-hubstaff-node](https://github.com/Prasad-b-git/n8n-hubstaff-node)

[Overview](#-overview) • [Install](#-install) • [Capabilities](#-capabilities) • [Usage Tips](#-usage-tips) • [Contribute](#-contribute)

</div>

---

## ✨ Overview

Hubstaff 2 for n8n wraps the full Hubstaff API v2 with a visual-first UX: every parameter is carefully described, optional filters are grouped, and authentication is handled with an automatic refresh-token exchange. Whether you are syncing Plane issues, automating payroll, or keeping Excel in line, this node keeps your workflow clean and reliable.

### Why teams pick this node

| ✅ Feature | 📌 What it means |
|-----------|------------------|
| Full API coverage | Projects, tasks, members, users, and time entries in one node. |
| Smart auth caching | Refresh-token exchange (OIDC discovery) with in-memory caching. |
| Task power filters | `status[]`, cursor pagination, `user_ids[]`, `project_ids[]`, `global_todo_ids[]`. |
| Dynamic members | Pass `members_payload` arrays to update project members in bulk. |
| Friendly errors | Human-readable messages instead of raw API dumps. |

> **Tip:** every operation exposes the exact Hubstaff field name in the description, so jumping between docs and n8n is painless.

---

## ⚙️ Install

### Community Nodes (UI)
1. Open n8n → **Settings** → **Community Nodes**.
2. Add `n8n-nodes-hubstaff2` and confirm the warning.
3. Restart n8n to load the node.

### npm (self-hosted builds)

```bash
npm install n8n-nodes-hubstaff2
```

---

## 🔐 Credentials

| Field | Notes |
|-------|-------|
| **Refresh Token** | Personal Access Token from the [Hubstaff Developer Portal](https://developer.hubstaff.com/personal_access_tokens). |
| **Organization ID** | Required for projects, tasks (unless you pass a `project_id`), and members. Optional for user-only flows. |

Tokens are exchanged for short-lived access tokens and cached until five minutes before expiry. Zero manual refreshing.

---

## 🧭 Capabilities

### Projects
- List, fetch, create, update, and read members.
- Additional fields include metadata, billing rates, budgets, and `members_payload` ingestion.

### Tasks
- List organization or project tasks with advanced filters.
- Get, create, update (with `lock_version`), and delete tasks.

### Time Entries
- List by date range with pagination controls.
- Create/update entries including notes, project/task links, and timestamps.

### Users & Members
- Fetch the current user or any user by ID.
- Pull the full member roster (emails, roles, profile info when permitted).

---

## 🛠 Usage Tips

- **Filters**: Provide comma lists (`1,2,3`) *or* JSON arrays (`[1,2,3]`); the node normalizes before calling Hubstaff.
- **Lock versions**: Read a task first, grab `lock_version`, then update to avoid optimistic-lock errors.
- **members_payload**: Build arrays upstream (Function node, Set node, etc.) and drop them into the project node to batch-manage members.
- **Return All vs Limit**: Toggle based on whether the workflow runs unattended (Return All) or during manual debugging (limit for speed).

---

## 👩‍💻 Contribute

```bash
git clone https://github.com/Prasad-b-git/n8n-hubstaff-node.git
cd n8n-hubstaff-node
npm install
npm run build
```

- Issues & PRs: [GitHub tracker](https://github.com/Prasad-b-git/n8n-hubstaff-node/issues)
- npm: [n8n-nodes-hubstaff2](https://www.npmjs.com/package/n8n-nodes-hubstaff2)
- Docs: [n8n](https://docs.n8n.io) • [Hubstaff API](https://developer.hubstaff.com/)

If this node saves you time, giving the repo a ⭐️ helps others find it too.

---

Made with ❤️ for the n8n community.
