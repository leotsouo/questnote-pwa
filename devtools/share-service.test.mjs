import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_SHARE_URL, WEBSITE_SHARE_URL, APP_SHARE_TEXT, APP_SHARE_MESSAGE, shareQuestNote, copyQuestNoteInvitation } from '../src/shareService.js';

test('native share includes the official website once and the direct app once', async () => {
  let payload;
  const result = await shareQuestNote({ share: async (data) => { payload = data; } });
  assert.equal(result, 'shared');
  assert.deepEqual(payload, {
    title: 'QuestNote',
    text: APP_SHARE_TEXT,
    url: WEBSITE_SHARE_URL,
  });
  assert.equal(payload.text.split(APP_SHARE_URL).length - 1, 1);
  assert.equal(payload.text.includes(WEBSITE_SHARE_URL), false);
  assert.match(payload.text, /與夥伴一起成長/);
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
  assert.equal(await copyQuestNoteInvitation({ clipboard: { writeText: async (value) => { copied = value; } } }), true);
  assert.equal(copied, APP_SHARE_MESSAGE);
  assert.equal(copied.split(APP_SHARE_URL).length - 1, 1);
  assert.equal(copied.split(WEBSITE_SHARE_URL).length - 1, 1);

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
  assert.equal(await copyQuestNoteInvitation({ clipboard: { writeText: async () => { throw new Error('Denied'); } } }, documentLike), true);
  assert.equal(field.value, APP_SHARE_MESSAGE);
  assert.equal(removed, true);
});
