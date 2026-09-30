# QuestNote Marketing Website — acceptance / deployment receipt

Policy update, 2026-10-01: the owner authorized policies using comparable App
norms. Privacy and terms v1.0 are now published, replacing the legal draft / owner
review status in this original website-release receipt. See
[policy basis](../../docs/legal-policy-basis.md) and
[the new verified deployment](legal-v1/deployment.json).

Date: 2026-10-01 (Asia/Taipei). This report separates source, Preview, production,
and owner review. The App runtime and preserved root drafts were not changed.

## Product and campaign

**小事，有回音。** A real-life task leaves a response in a shared journey with a
companion. Hero: **今天的待辦，成了你們的冒險。** The first-screen description
explicitly connects life tasks, companion growth, intimacy and opening the world.
Ten Traditional Chinese candidates and five criteria are recorded in
[the narrative](../../docs/marketing-narrative.md); scores are author judgments.

Story: Hero / immediate quest → what happens after a check → large companion →
summons and collection / expeditions → four actual product screens → a short
three-theme chapter → “下一件小事，有牠陪你。” CTA. The demo is intentionally
inside the first screen, rather than requiring four chapters before interaction.

The normal-task demo changes 2/5 to 3/5 and intimacy 10/50 to 15/50, awarding
20 stardust, 1 adventure energy and 5 intimacy. A subtle companion response,
progress and “你的小事，牠收到了。” appear immediately. Rewards match the App
service rules. No invented XP or instant visual evolution. It can reset and does
not write storage, login data or production App data.

Art direction: original gray wolf and existing world art, night forest / warm
paper / sage ink / restrained gold, Chinese serif headings and system sans body.
Single marketing identity; the three App themes remain a secondary choice.
The small design system is CSS tokens, spacing and reusable scene / CTA / tab
patterns. No web fonts, opening film, scroll hijack or image-generated character.
[Brand voice](../../docs/brand-voice.md) defines warm, human, encouraging, calm,
slightly magical, never guilt-inducing writing.

## Truthful product evidence

Work started from fetched origin/main `23d8cdc`, App V3.4.34, in a separate
`codex/questnote-marketing` worktree. The App was launched and operated at 393×852,
with 3 themes × 4 views. Disposable local sample data and blocked external
requests protected user / production state. Screenshots are real V3.4.34 App
rendering, clearly labeled as demonstration data on the website, not concept UI.
See [capture provenance](product-audit/provenance.json).

At initial audit the public PWA read V3.4.33. During this independent marketing
task another App release advanced main / public PWA to V3.4.35; its public
`src/version.js` was read back as HTTP 200 before final delivery. This site did
not deploy that App release. The marketing screenshots retain their explicit
V3.4.34 snapshot label. `git diff 23d8cdc -- src index.html service-worker.js data
assets` is empty; a diff against subsequently advanced main is not evidence of
marketing changes to the App.

## Build and actual visual QA

- Independent `marketing/`, static HTML / CSS / ES modules, development-only
  Node tooling, no runtime dependency, Functions, database or maintained server.
- `npm run lint`, `npm run typecheck`, four focused contract tests and the build
  passed. Total static payload: 28 files / 841,512 bytes (about 822 KiB), including
  the special Pages headers file. Public hosted files: 27. Runtime JS ~10 KiB
  uncompressed; images are responsive WebP with lazy loading where appropriate.
- The App baseline test run passed 203 Node cases plus summon reveal assertions.
- Actual Playwright / Edge QA: 320, 375, 393, 430, 768, 1440px; touch interaction,
  once-only reward, reset / reload / no persistence, tabs and keyboard, sticky
  CTA, no overflow, internal links / legal routes / assets / 404, SEO and OG/X.
- axe WCAG A/AA checks: zero detected violations. Reduced motion has no running
  animation and keyboard completion works. No-JS story / actual CTA work.
- Hero, demo, companion, product, final CTA and full-page captures are stored in
  `local/`, `preview/` and `production/`. Visual inspection corrected companion
  text covering the wolf's face and a completion message stacking vertically.
  Off-screen skip-link clipping was hardened after long-section screenshots.
- Three stress tests have actual no-motion / no-logo / mobile Hero screenshots.
  The [jury review](../../docs/marketing-jury-review.md) applies Webby, D&AD and
  One Show criteria. It is an internal review, not award recognition or a user
  study. Real novice comprehension and real iOS / LINE device checks remain.

Hosted validation compares every public file SHA-256 with the local build and
checks HTTPS / security headers. Performance profile: 393×852, 1.6Mbps, 150ms,
CPU×4, warm DNS/TLS and **cold HTTP cache**. Final Preview LCP 2.684s and
production LCP 2.624s / CLS 0 passed the 3.5s / 0.1 budget.
This Edge environment's raw cold DNS stalled about 9.1s; raw LCP 10.780s / 10.528s
was retained rather than omitted. These lab observations are not field Core Web
Vitals or an iPhone / social in-app browser speed guarantee. Final deployment
JSON records the final artifact's measurements and raw observations. Preview
and production each passed all 25 grouped browser checks, with zero runtime
errors or broken requested assets. The final canonical analytics probe passed
normal, DNT and GPC contexts, including the successful 204 ingestion response.

## Source and deployment

- Repository: [leotsouo/questnote-pwa](https://github.com/leotsouo/questnote-pwa).
  [PR #20, ready for review](https://github.com/leotsouo/questnote-pwa/pull/20) holds the
  independent website, assets, docs, workflow and review evidence.
- Final runtime / deployment source: `f251853f7be061548222ee59f3125d16e49945e9`.
  A subsequent evidence commit can add receipts without changing the artifact.
- Cloudflare Pages project: `questnote-marketing`, Direct Upload, production
  branch `main`, build root `marketing`, command `npm run build`, output `dist`.
- Final Preview: `https://30e69dcc.questnote-marketing.pages.dev`.
  Deployment ID `30e69dcc-6cf2-4331-b299-8afd964885f1`.
- **PREVIEW READY / PRODUCTION LIVE**: `https://questnote.taste-compare.com`,
  final production deployment `87101741-29fe-4e3f-98e8-c8d34a3181df`, success,
  27 public HTTPS hashes matched. [Deployment receipt](deployment-receipt.json).
- Final runtime GitHub CI succeeded:
  [run 36774682564](https://github.com/leotsouo/questnote-pwa/actions/runs/36774682564).
- The original preview `6a7b5e22-f3aa-423d-a064-fa9ac46b84fa` passed all 25 browser
  groups and 27 hashes before any new DNS record was created. The initial
  production deployment `0e1f2b55-158b-4831-9443-28dc35b5d282` was HTTPS validated.
  A canonical-only privacy probe then discovered provider-injected extra RUM.
  Final `_headers` uses `no-transform` to prevent this **only on this Pages
  site's responses**; one explicit beacon stays under DNT/GPC control. No zone
  setting or existing root site's analytics was changed. See
  [Cloudflare's documented injection behavior](https://developers.cloudflare.com/web-analytics/get-started/).
- Custom domain / certificate status: Active. Only a new proxied CNAME was added:
  `questnote.taste-compare.com` → `questnote-marketing.pages.dev`, automatic TTL.
  All 5 original root / www / mail records matched the before snapshot exactly.
  See [domain receipt](domain-receipt.json). No DNS owner action remains.
- No domain purchase, paid plan / add-on, Worker, database or VPS was added.

Cloudflare's GitHub installation returned `8000011` at setup. The site uses
Direct Upload from the checked-in repository build, with independent GitHub
Actions verification. Native Git integration was not falsely claimed. The
optional manual Actions deployment requires owner-provided scoped credentials;
source pushes and PR merges currently verify, **do not automatically publish**.
The App's deployment workflow remains separate.

## Distribution, metadata, social and analytics

Current `QUESTNOTE_DISTRIBUTION_MODE`: **web**, label **開啟 QuestNote**, targeting
the actual public PWA `https://leotsouo.github.io/questnote-pwa/`. The optional
CTA clarification did not receive an answer; this is the evidence-based default.
All URLs live in `marketing/config.js`. Waitlist / TestFlight / App Store modes
require real URLs before build. No fake App Store badge, waitlist signup claim,
guessed email or paid form service. `utm_source`, `utm_medium`, `utm_campaign`
are retained through distribution links without an identifying cookie.

SEO / sharing: canonical, meta description, semantic heading, sitemap, robots,
favicon, Apple Touch Icon, OG title / description / 1200×630 JPEG, X large card.
The image uses the same wolf, headline, completed reading quest and actual
rewards. Platform-specific crawler caches / final card rendering have not been
claimed as tested in LINE / Threads / Discord / X account UIs.

Three 1080×1350 social creative concepts are exported, not only written:

| Concept | Headline | Visual / format | CTA |
| --- | --- | --- | --- |
| A · 今天的 Quest | 讀完這幾頁，牠也靠近了一點。 | Reading quest / intimacy / night wolf; static IG or Threads image | 完成一件小事，看看牠的回應 |
| B · 小事的份量 | 今天沒有大事。有一件小事做完了。 | A walk / twilight wolf / true character line; static IG image | 下一件小事，有牠陪你 |
| C · 打勾以後 | 打勾以後，還有牠的回應。 | Tidy desk / completed check / real rewards; static image | 開啟 QuestNote |

Files: [OG](../../marketing/assets/og-questnote.jpg),
[A](social/a-todays-quest.png), [B](social/b-small-step.png),
[C](social/c-after-check.png). Not exported: Stories crops or video concepts.

Cloudflare Web Analytics is configured for the canonical hostname with a public
beacon token, not an API credential. The canonical browser probe verifies a
successful 204 beacon POST, DNT/GPC prevention, zero cookies and working demo.
Preview loads no beacon. No API credential is in source / deployment.

Instrumentation events: `page_view`, `hero_cta`, `demo_start`, `quest_completed`,
`demo_reset`, `final_cta`, `sticky_cta`, `distribution_click`, `product_screen`.
**Only page-view / performance aggregation is connected remotely.** The custom
funnel events emit `questnote:analytics` in the current browser page; no remote
custom-event collector is configured. A same-origin opt-in adapter exists.
Cloudflare Web Analytics is not presented as a custom-event database. No
fingerprinting, advertising tracker or persistent identifier was introduced.

## Owner actions and remaining confirmations

1. Review `/privacy` and `/terms` (visibly **OWNER REVIEW REQUIRED**), operator
   contact, asset rights and App data / reminder wording. `/support` is live.
   Drafts are not represented as legally approved documents.
2. Review / merge PR #20 to integrate source. Production hosting works already;
   merging source alone does not republish either product.
3. If desired, configure the optional manual marketing deployment workflow:
   repository secret `QUESTNOTE_PAGES_API_TOKEN` (Account / Cloudflare Pages Edit,
   only the relevant account), variable `CLOUDFLARE_ACCOUNT_ID`. Run it on the
   marketing branch for Preview and on `main` for production after QA. Secrets
   must remain in GitHub secret storage. A credential is not created for you.
4. Confirm the current `web` distribution or provide a real waitlist / TestFlight
   / App Store destination when ready. There is no paid signup service to cancel.
5. Remote CTA / demo conversion counts need an explicitly selected free event
   collector. This version supplies tested instrumentation, not invented counts.
6. Check an actual iPhone Safari / LINE browser and ask 3–5 new visitors the
   10-second understanding questions. Current evidence is real desktop Chromium
   emulation, not a real-device or novice research result.

No DNS change, new subscription, server maintenance or backend setup is needed
to use the published website. Preview and production validation JSON, screenshots
and the public PR retain the reviewable evidence.
