const ERROR_MESSAGES = {
  'not-allowed': '麥克風權限未開啟，請允許後再試一次。',
  'service-not-allowed': '瀏覽器未允許語音辨識，請檢查權限設定。',
  'audio-capture': '找不到可用的麥克風，請檢查裝置。',
  network: '語音辨識暫時無法連線，請稍後再試。',
  'no-speech': '沒有聽到聲音，請再試一次。',
};

function speechText(results) {
  let finalText = '';
  let interimText = '';
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    const text = result[0]?.transcript || '';
    if (result.isFinal) finalText += text;
    else interimText += text;
  }
  return finalText + interimText;
}

/** Voice recognition only edits the draft. The existing form submit still saves it. */
export function attachTaskVoiceInput(form, section, input, options = {}) {
  const Recognition = options.Recognition ?? window.SpeechRecognition ?? window.webkitSpeechRecognition;
  const supported = !!Recognition && (options.secureContext ?? window.isSecureContext);
  const field = document.createElement('div');
  field.className = 'task-voice-field';
  input.replaceWith(field);
  field.append(input);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'task-voice-button';
  button.setAttribute('aria-label', '開始語音輸入');
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-controls', input.id);
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg>';
  field.append(button);

  const status = document.createElement('p');
  status.className = 'task-voice-status';
  status.id = 'task-voice-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  section.append(status);
  button.setAttribute('aria-describedby', status.id);

  if (!supported) {
    button.disabled = true;
    status.textContent = '此瀏覽器無法使用語音輸入；仍可直接打字。';
    return { stop() {}, abort() {} };
  }
  status.textContent = '點麥克風開始說話；語音可能由瀏覽器服務處理。';

  let recognition = null;
  let baseText = '';
  let lastError = '';
  let applyingResult = false;
  function setActive(active) {
    button.classList.toggle('is-listening', active);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? '停止語音輸入' : '開始語音輸入');
  }
  function stop() {
    if (!recognition) return;
    button.disabled = true;
    status.textContent = '正在完成語音轉文字…';
    try { recognition.stop(); }
    catch { button.disabled = false; }
  }
  function abort() {
    if (!recognition) return;
    const session = recognition;
    recognition = null;
    session.onstart = null;
    session.onresult = null;
    session.onerror = null;
    session.onend = null;
    try { session.abort(); } catch { /* The browser may already have ended recognition. */ }
    button.disabled = false;
    setActive(false);
  }
  button.addEventListener('click', () => {
    if (recognition) { stop(); return; }
    let session;
    try { session = new Recognition(); }
    catch {
      status.textContent = '無法啟動語音辨識，請改用文字輸入。';
      return;
    }
    recognition = session;
    baseText = input.value;
    lastError = '';
    session.lang = 'zh-TW';
    session.continuous = true;
    session.interimResults = true;
    session.maxAlternatives = 1;
    session.onstart = () => {
      if (recognition !== session) return;
      setActive(true);
      status.textContent = '正在聆聽…再點一次麥克風即可結束。';
    };
    session.onresult = (event) => {
      if (recognition !== session) return;
      const transcript = speechText(event.results);
      if (!transcript) return;
      applyingResult = true;
      input.value = `${baseText}${baseText.trim() ? '\n' : ''}${transcript}`;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      applyingResult = false;
      status.textContent = '已轉成文字，可繼續說話或點麥克風結束。';
    };
    session.onerror = (event) => {
      if (recognition !== session) return;
      lastError = ERROR_MESSAGES[event.error] || '語音辨識未完成，請再試一次。';
      status.textContent = lastError;
    };
    session.onend = () => {
      if (recognition !== session) return;
      recognition = null;
      button.disabled = false;
      setActive(false);
      if (!lastError) status.textContent = input.value !== baseText ? '語音已填入，請確認內容後繼續。' : '已停止聆聽，可以再點麥克風重試。';
    };
    status.textContent = '正在啟動麥克風…';
    try { session.start(); }
    catch {
      recognition = null;
      setActive(false);
      status.textContent = '無法啟動語音辨識，請再試一次。';
    }
  });
  input.addEventListener('input', () => {
    if (!recognition || applyingResult) return;
    abort();
    status.textContent = '已停止聆聽，你可以直接修改文字。';
  });

  const overlay = form.closest('.modal-overlay');
  if (overlay) {
    const observer = new MutationObserver(() => {
      if (form.isConnected && overlay.classList.contains('open')) return;
      abort();
      observer.disconnect();
    });
    observer.observe(overlay, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
  }
  return { stop, abort };
}
