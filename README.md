# QuestNote

Browser PWA for tasks, habits, pet collection, summons and expeditions.

`main` is the released source and `dev` is the single development branch. GitHub Pages serves the assembled application from `gh-pages`; merging source does not publish the website. All rules are in [CLAUDE.md](CLAUDE.md).

## Development

Use Node.js 24 and `npm ci`, then `npm test`. Serve the repository with `npm run serve` (http://127.0.0.1:8000/); ES modules and service workers cannot run through `file://`.

## Working together

- [Review and release flow](docs/release-flow.md)
- [Branch roles, responsibilities and permissions](docs/project-governance.md)
- [Release history and deployed versions](docs/final-integration.md)
- [Immutable release assembly](docs/release-artifacts.md)
- [Public announcements and gifts](docs/mailbox-publishing.md)
- [Private feedback and authorized backend access](docs/feedback.md)
- [Card-pool authoring pipeline](docs/card-pool-pipeline.md)

The single preview site is https://leotsouo.github.io/questnote-pwa-preview/ (`npm run preview:deploy`).
