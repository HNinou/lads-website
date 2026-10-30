# Les Alpages du Soleil: website starter kit

Everything Claude Code needs to build the chalet's website and check its own work. Same system as the Dolce & Azzurra site.

## How to use it
1. Create an empty **public** GitHub repository (e.g. `chalet-website`) and clone it to your Mac.
2. Unzip this kit and copy **everything** into the repository, including the hidden `.github` and `.claude` folders. Commit and push.
3. On GitHub: **Settings → Pages → Source: GitHub Actions**.
4. Open the folder in Claude Code and type `/build-site`. Use `/verify` any time to re-run all checks.
5. Proofread French and English, mark the pages reviewed, then follow `docs/LAUNCH-CHECKLIST.md`.

## What's inside
| Path | Purpose |
| --- | --- |
| `CLAUDE.md` | The build spec |
| `content/chalet.yaml` | All facts (edit facts here only) |
| `content/photos.yaml` | 45 photos with roles, seasons, alt text and the missing-shot list |
| `content/copy-brief.md` | Voice, banned claims, front-page order, FR/EN headlines |
| `assets/` | Photos (resized, renamed) and logo/favicon |
| `reference/` | The two old site versions (content source only) |
| `scripts/` | `verify.mjs`, `visual-check.mjs`, `owner-todo.mjs` |
| `.github/workflows/deploy.yml` | Build, check and publish on every push |
| `.claude/commands/` | `/build-site` and `/verify` |
| `docs/` | Strategy summary, launch checklist, build report |
