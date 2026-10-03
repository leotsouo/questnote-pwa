// Public marketing settings only. Never put credentials here.
export const QUESTNOTE_DISTRIBUTION_MODE = 'web';

export const MARKETING_CONFIG = Object.freeze({
  canonicalUrl: 'https://questnote.taste-compare.com',
  distributionMode: QUESTNOTE_DISTRIBUTION_MODE,
  distribution: {
    web: { label: '開啟 QuestNote', url: 'https://leotsouo.github.io/questnote-pwa/', note: '直接用瀏覽器開始，不用下載、不用註冊。' },
    waitlist: { label: '加入 QuestNote 測試', url: '', note: '測試開放時，讓我們通知你。' },
    testflight: { label: '在 TestFlight 試用', url: '', note: '使用 iPhone 的 TestFlight 加入測試。' },
    appstore: { label: 'App Store 下載', url: '', note: '前往 App Store 查看與下載。' },
  },
  supportUrl: 'https://github.com/leotsouo/questnote-pwa/issues',
  sourceUrl: 'https://github.com/leotsouo/questnote-pwa',
  // Optional public Cloudflare beacon token; custom events need a separate adapter.
  analytics: { cloudflareToken: '704c6dd6ebc84dde991754f06a9582b5', eventEndpoint: '' },
});

export function getDistribution(config = MARKETING_CONFIG) {
  const selected = config.distribution[config.distributionMode];
  if (!selected?.url || !/^(https:\/\/|mailto:)/.test(selected.url)) {
    throw new Error('Configure a real distribution URL before selecting this CTA mode.');
  }
  return selected;
}
