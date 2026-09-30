# QuestNote product website

Independent static project in the existing repository. No App runtime changes,
service worker, Functions, database, runtime dependencies, or server to maintain.
Node 24 is used for development/build only.

```sh
cd marketing
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
npm run qa
```

Open localhost:8031 over HTTP. Browser QA uses installed Edge by default;
on Linux install Playwright Chromium and set `QA_BROWSER_CHANNEL=chromium`.
The dist directory is the only deployment payload. Assets are checked-in output;
ordinary builds do not need image generation or screenshot capture. To regenerate
art sizes and social output, use `npm run qa:assets` and `node scripts/social.mjs`.
The source App audit can be reproduced with the dedicated UI-polish server and
`scripts/capture-product.cjs`; it requires a supplied `QUESTNOTE_NODE_MODULES`
pointing to Playwright. It only operates on disposable loopback browser data.

All distribution URLs and modes are in `config.js`. Current mode: `web`, the actual
public PWA. Waitlist/TestFlight/App Store modes fail build until a real URL is
configured. No fake store badge or form. An approved free external signup or
mailto address can be configured for waitlist without adding a backend.

`analytics.js` emits `questnote:analytics` CustomEvents with whitelisted UTM data.
Events: page_view, hero_cta, demo_start, quest_completed, demo_reset, final_cta,
sticky_cta, distribution_click, product_screen. Default custom-event adapter is
disabled; no remote funnel counts are claimed. Cloudflare's separate free page-view
beacon runs only on the canonical hostname and respects DNT/GPC. Public beacon
token is not an API credential. See privacy draft and deployment report.

Cloudflare project `questnote-marketing`: Direct Upload, production branch `main`.
The Cloudflare GitHub installation returned 8000011 during setup. Direct Upload
with a GitHub Actions build is the supported alternative; this project cannot be
converted to native Git integration in place. Marketing CI is independent from
App deployment; publishing requires a manual workflow_dispatch. Owner must add
the scoped `QUESTNOTE_PAGES_API_TOKEN` secret and `CLOUDFLARE_ACCOUNT_ID` variable
for that optional workflow. Do not place API credentials in source or assets.

The existing taste-compare-marketing project and root/www records are separate.
Only attach the questnote subdomain after the HTTPS Preview passes verification.
Legal text is explicitly OWNER REVIEW REQUIRED. Source screenshots are V3.4.34;
the App public URL advanced from V3.4.33 at the audit to V3.4.35 at delivery.
The screenshots keep their V3.4.34 snapshot label. Preview and production are
live; see `../reports/marketing/acceptance.md` for URLs, evidence and owner actions.
Pages headers use `no-transform` to prevent provider-injected extra analytics;
the site's explicit beacon stays under its DNT/GPC controls. This changes only
this marketing project's responses, not the existing root site's settings.
