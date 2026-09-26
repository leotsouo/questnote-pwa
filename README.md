# QuestNote

Browser PWA for tasks, habits, pet collection, summons and expeditions.

`main` is the shared source of truth. GitHub Pages serves the assembled application from `gh-pages`; merging source does not publish the website. Start new work from current `origin/main` in a clean checkout.

## Development

Use Node.js 24 and `npm ci`, then `npm test`. Serve the repository over HTTP (`python -m http.server 8000 --bind 127.0.0.1`); ES modules and service workers cannot run through `file://`.

## Working together

- [Branch roles, responsibilities and permissions](docs/project-governance.md)
- [September 27 consolidation audit](reports/branch-consolidation-2026-09-27.md)
- [Release history and deployed versions](docs/final-integration.md)
- [Immutable release assembly](docs/release-artifacts.md)
- [Public announcements and gifts](docs/mailbox-publishing.md)
- [Private feedback and authorized backend access](docs/feedback.md)
- [Card-pool authoring pipeline](docs/card-pool-pipeline.md)

Historical worktrees and milestone documents preserve earlier work; they are not active integration branches.
