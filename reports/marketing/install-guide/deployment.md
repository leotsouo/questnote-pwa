# Home screen guide — PRODUCTION LIVE

- Public site: https://questnote.taste-compare.com/.
- Preview: https://a9045fc9.questnote-marketing.pages.dev; deployment a9045fc9-b9f6-4114-8e18-4ccebe3bfea6.
- Production deployment: 0f225f65-e112-4eba-a52b-6105b4ff5cd0; verified source c5d23b286d9eb4cd140b6718ba18749b7e3d7d8f.
- Source PR32 merged into codex/questnote-marketing as a8ab23f630635af0a86ee0a8e676620d7b3b7179. No whole-website merge into App main.
- CI 36855123448 passed lint, typecheck, six Node tests, static build, 25 whole-site browser checks and 14 installation guide checks.
- Both final Preview and production: 33 raw HTTPS checks passed (four crawler UAs and all 29 public files), with SHA256 matching the same 30-file static build (_headers is deployment metadata).
- Final Preview: 14 real browser cases passed; 320 / 375 / 393 / 430px, iPad, Android Chrome and WebView, Safari and LINE UAs, plus 640px short viewports and desktop navigation. Keyboard, focus restoration, clipboard fallback, manual browser classification, visible close control during scroll, actual App URL / UTM and axe checks included.
- Production smoke: 393px Safari / LINE UA and desktop navigation. Screenshots visually inspected.
- No App runtime, data, manifest, service worker or version changes. App remains V3.4.39. The installation target is the App's existing GitHub Pages URL, never the marketing website.
- No DNS, Functions, backend, paid feature or new tracking changes.

The dialog is a website-owned invitation, not a native iOS installation prompt. Safari Add to Home Screen still requires the user to confirm through the browser. Cross-origin installation detection and automatic launch of an existing iOS PWA are not claimed. UA identification is advisory and manually correctable. Screenshots emulate browser UAs; physical iPhone / LINE behavior is not asserted from desktop automation.

The screenshot's Service Worker loader error does not indicate an already-installed App. The maintained bootstrap refuses to open an unverified release when Service Worker is unavailable. Embedded browsers can cause this condition despite HTTPS. The new entry guides visitors to Safari / Chrome without bypassing that safety boundary.
