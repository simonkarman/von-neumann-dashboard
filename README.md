# Von Neumann Dashboard template

The separate Next.js/React template for `von-neumann-platform`. Clone it into the platform checkout's ignored `dashboard-base/` directory. The platform README covers local, Docker and account-agnostic AWS deployment; this template alone is not the backend.

```bash
npm ci
npm run check
```

`main` contains an empty `dashboard.json`. The platform creates `session/<24-character-id>` branches, updates specifications/generated source, checks TypeScript, commits and pushes accepted edits. The trusted shell owns sharing/chat and the permanent prompt. UI remains on one page. A preview can use `SESSION_ID=<24-character-id> WATCHPACK_POLLING=1000 npm run dev`; data/chat require the platform reverse proxy.

Trusted widgets live in `src/components/widgets.tsx`; chat/shell in `src/components/shell.tsx`. Custom source is inert JSON interpreted in an isolated QuickJS/WASM worker, not an imported React module. Extend contracts in both repositories together. Keep lockfiles/interpreter bundles compatible with the session image; rebuild the bundle from the platform using `npm run build:custom`.

No original author's cloud identity, domain or account is required. Never embed keys, tokens or real data in the template. Environments/credential files are ignored, but review staged changes and scan full history before publication.

The platform defaults to a private local bare Git remote, not this GitHub repository. Publishing template `main` does not upload production session branches. If using `DASHBOARD_REPO_URL`, choose a private remote and separately provision scoped Git authentication in the trusted platform; never put tokens in URLs. Session specs/custom code can contain sensitive identifiers/text. SQLite chat/audit/sharing state needs separate backup.

Never publish template source with `git push --all` or `--mirror` from a production data repository. Keep Next.js development servers behind the authenticated platform.
