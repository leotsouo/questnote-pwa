import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_SHARE_URL, shareQuestNote, copyQuestNoteUrl } from '../src/shareService.js';

test('share sends only the public production link and app description', async () => {
  let payload;
  const result = await shareQuestNote({ share: async (data) => { payload = data; } });
  assert.equal(result, 'shared');
  assert.deepEqual(payload, {
    title: 'QuestNote',
    text: '用 QuestNote 記錄任務、養成習慣，和幻獸一起冒險。',
    url: APP_SHARE_URL,
  });
});

test('unsupported sharing and user cancellation remain distinct', async () => {
  assert.equal(await shareQuestNote({}), 'unsupported');
  assert.equal(await shareQuestNote({ share: async () => {
    throw new DOMException('Cancelled', 'AbortError');
  } }), 'cancelled');
  assert.equal(await shareQuestNote({ share: async () => {
    throw new Error('Blocked');
  } }), 'failed');
});

test('copy uses Clipboard API and falls back when permission is denied', async () => {
  let copied = '';
  assert.equal(await copyQuestNoteUrl({ clipboard: { writeText: async (value) => { copied = value; } } }), true);
  assert.equal(copied, APP_SHARE_URL);

  let removed = false;
  const field = {
    style: {},
    setAttribute() {},
    select() {},
    remove() { removed = true; },
  };
  const documentLike = {
    body: { appendChild() {} },
    createElement(name) { assert.equal(name, 'textarea'); return field; },
    execCommand(command) { assert.equal(command, 'copy'); return true; },
  };
  assert.equal(await copyQuestNoteUrl({ clipboard: { writeText: async () => { throw new Error('Denied'); } } }, documentLike), true);
  assert.equal(field.value, APP_SHARE_URL);
  assert.equal(removed, true);
});
