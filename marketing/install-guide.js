/** Browser hints are advisory: a website cannot detect another origin's installation. */
export function installationContext({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const android = /Android/i.test(userAgent);
  const embedded = /Line\/|LIFF|FBAN|FBAV|Instagram|MicroMessenger|; wv\)/i.test(userAgent)
    || (ios && !/Safari\//i.test(userAgent));
  return { ios, android, embedded, mobile: ios || android };
}

/** @param {string} appUrl */
export function createInstallGuide(appUrl) {
  const dialog = document.querySelector('#install-guide');
  if (typeof HTMLDialogElement === 'undefined' || !(dialog instanceof HTMLDialogElement)) return () => false;
  const context = installationContext(navigator);
  const intro = dialog.querySelector('#install-intro');
  const steps = dialog.querySelector('#install-steps');
  const open = dialog.querySelector('#install-open');
  const copy = dialog.querySelector('#install-copy');
  const input = dialog.querySelector('#install-link');
  const status = dialog.querySelector('#install-status');
  const switchBrowser = dialog.querySelector('#install-browser-switch');
  if (!(open instanceof HTMLAnchorElement) || !(copy instanceof HTMLButtonElement)
    || !(input instanceof HTMLInputElement)) return () => false;
  open.href = appUrl;
  input.value = appUrl;
  const browser = context.ios ? 'Safari' : 'Chrome';
  const render = () => {
    intro.textContent = context.embedded
      ? `目前是在 App 內建瀏覽器。先把連結帶到 ${browser}，就能加入主畫面。`
      : `在 ${browser} 開啟 QuestNote，再把夥伴留在主畫面。`;
    const instructions = context.embedded
      ? [`複製下方的 App 連結。`, `開啟 ${browser}，把連結貼到網址列。`, context.ios ? '點瀏覽器「分享」→「加入主畫面」。' : '點瀏覽器選單 →「安裝應用程式」或「加入主畫面」。']
      : ['先按下方按鈕，開啟 QuestNote。', context.ios ? '點 Safari「分享」→「加入主畫面」。' : '點 Chrome 選單 →「安裝應用程式」或「加入主畫面」。', '加入後，從主畫面的 QuestNote 圖示開始。'];
    steps.replaceChildren(...instructions.map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    open.hidden = context.embedded;
    copy.classList.toggle('button-primary', context.embedded);
    copy.classList.toggle('button-secondary', !context.embedded);
    switchBrowser.textContent = context.embedded ? `我已在 ${browser} 裡開啟` : '我是在 LINE／IG 裡開啟';
    switchBrowser.setAttribute('aria-pressed', String(context.embedded));
  };
  render();
  switchBrowser.addEventListener('click', () => {
    context.embedded = !context.embedded;
    status.textContent = '';
    render();
  });
  /** @type {HTMLElement | undefined} */
  let opener;
  const close = () => dialog.close();
  dialog.querySelectorAll('[data-close-install]').forEach(button => button.addEventListener('click', close));
  dialog.addEventListener('close', () => {
    document.body.classList.remove('install-guide-open');
    opener?.focus({ preventScroll: true });
  });
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      status.textContent = `已複製。打開 ${browser}，貼到網址列即可。`;
    } catch {
      input.focus();
      input.select();
      status.textContent = '請長按連結，選擇「複製」。';
    }
  });
  /** @param {HTMLElement} element */
  const offer = element => {
    if (!context.mobile || typeof dialog.showModal !== 'function') return false;
    opener = element;
    status.textContent = '';
    document.body.classList.add('install-guide-open');
    dialog.showModal();
    return true;
  };
  return offer;
}
