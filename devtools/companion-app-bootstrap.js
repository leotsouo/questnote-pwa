import { LOCAL_ART_PREVIEW } from '../src/localArtPreview.js';
import { APP_VERSION } from '../src/version.js';
if (!LOCAL_ART_PREVIEW) throw new Error('Please use the dedicated local art review server');
document.body.dataset.artReviewVersion = APP_VERSION;
document.title = `QuestNote · V${APP_VERSION} 完整 App 美術測試`;
document.querySelector('.identity-review-bar span').textContent = `美術整合測試 · V${APP_VERSION} · 展示資料 · 重新整理重設`;
if (new URLSearchParams(location.search).get('legacy') !== '1') {
  document.querySelector('link[href^="devtools/companion-app-identity.css"]').href = `devtools/companion-app-identity.css?v=${APP_VERSION}`;
  await import(`./companion-app-identity.js?v=${APP_VERSION}`);
}
await import('../src/app.js');
