# Von Neumann base dashboard

This is the second, independent repository used by the Von Neumann platform. It contains a single-page Next.js app with a permanent prompt interface and a validated component toolkit.

`main` starts with an empty dashboard. The platform clones it and creates `session/<24-character-id>` branches. Each accepted edit changes `dashboard.json` and `src/generated/Dashboard.tsx`, validates TypeScript, commits, and pushes.

Run `npm ci` and `npm run check` to work on this template. To preview under a session prefix use `SESSION_ID=<id> WATCHPACK_POLLING=1000 npm run dev`; the full prompt/data workflow requires the platform API and authenticated reverse proxy. Running the template by itself is not a standalone deployment of the platform.

Trusted components live in `src/components/widgets.tsx`; sharing, history, and chat live in `src/components/shell.tsx`. Extend the widget schema in BOTH repositories when adding a new capability. Never embed data credentials or provider keys in this repository. `dashboard.json` is the portable source of dashboard state, while chat and sharing tokens stay in the platform database.

Publish this repository to your chosen Git host, then set `DASHBOARD_REPO_URL` in the infrastructure environment. Session branches contain UI configuration, not a snapshot of cloud data. Keep the template dependency lockfile compatible with the platform's pinned session image.
