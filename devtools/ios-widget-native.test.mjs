/**
 * V3.16.0: home-screen to-do widget (WidgetKit) fed by the QuestNoteWidgetBridge plugin.
 * Swift and the Xcode project only compile on the macOS CI runner, so these checks catch the
 * cheap mistakes locally: a dangling project object, a mismatched App Group, plugin name or
 * storyboard class.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const APP_GROUP = 'group.io.github.leotsouo.questnote';

test('every object the project file references is defined and braces balance', async () => {
  const pbx = await read('ios/App/App.xcodeproj/project.pbxproj');
  const defined = new Set([...pbx.matchAll(/^\t\t([0-9A-F]{24}) (?:\/\*[^*]*\*\/ )?= \{/gm)].map((m) => m[1]));
  const referenced = new Set([...pbx.matchAll(/\b([0-9A-F]{24})\b/g)].map((m) => m[1]));
  const missing = [...referenced].filter((id) => !defined.has(id));
  assert.deepEqual(missing, []);
  assert.equal((pbx.match(/\{/g) || []).length, (pbx.match(/\}/g) || []).length);
  assert.equal((pbx.match(/\(/g) || []).length, (pbx.match(/\)/g) || []).length);
});

test('the widget target is built, embedded and signed with its own bundle ID', async () => {
  const pbx = await read('ios/App/App.xcodeproj/project.pbxproj');
  assert.match(pbx, /productType = "com\.apple\.product-type\.app-extension";/);
  assert.match(pbx, /PRODUCT_BUNDLE_IDENTIFIER = io\.github\.leotsouo\.questnote\.widget;/);
  assert.match(pbx, /dstSubfolderSpec = 13;/);
  assert.match(pbx, /QuestNoteWidget\.appex in Embed Foundation Extensions/);
  assert.equal((pbx.match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g) || []).length, 2);
  assert.equal((pbx.match(/CODE_SIGN_ENTITLEMENTS = QuestNoteWidget\/QuestNoteWidget\.entitlements;/g) || []).length, 2);
  for (const file of ['MainViewController.swift', 'QuestNoteWidgetBridge.swift', 'QuestNoteWidget.swift']) {
    assert.match(pbx, new RegExp(`${file.replace('.', '\\.')} in Sources`), file);
  }
  const info = await read('ios/App/QuestNoteWidget/Info.plist');
  assert.match(info, /<string>com\.apple\.widgetkit-extension<\/string>/);
});

test('app, widget and bridge agree on the App Group, plugin name and controller', async () => {
  for (const file of ['ios/App/App/App.entitlements', 'ios/App/QuestNoteWidget/QuestNoteWidget.entitlements',
    'ios/App/App/QuestNoteWidgetBridge.swift', 'ios/App/QuestNoteWidget/QuestNoteWidget.swift']) {
    assert.ok((await read(file)).includes(APP_GROUP), file);
  }
  const bridgeSwift = await read('ios/App/App/QuestNoteWidgetBridge.swift');
  const bridgeJs = await read('src/nativeBridge.js');
  const jsName = bridgeSwift.match(/jsName = "([^"]+)"/)[1];
  assert.equal(bridgeJs.match(/WIDGET_PLUGIN = '([^']+)'/)[1], jsName);
  assert.match(bridgeSwift, /CAPPluginMethod\(name: "update"/);
  assert.match(bridgeJs, /nativePromise\(WIDGET_PLUGIN, 'update'/);
  const key = bridgeSwift.match(/snapshotKey = "([^"]+)"/)[1];
  assert.ok((await read('ios/App/QuestNoteWidget/QuestNoteWidget.swift')).includes(`snapshotKey = "${key}"`));
  const storyboard = await read('ios/App/App/Base.lproj/Main.storyboard');
  assert.match(storyboard, /customClass="MainViewController" customModule="App"/);
  assert.match(await read('ios/App/App/MainViewController.swift'), /registerPluginInstance\(QuestNoteWidgetBridge\(\)\)/);
});

test('the widget decodes the fields the snapshot sends', async () => {
  const swift = await read('ios/App/QuestNoteWidget/QuestNoteWidget.swift');
  for (const field of ['id', 'title', 'plannedDate', 'dueDate', 'priority', 'schemaVersion', 'today', 'unfinishedCount', 'tasks']) {
    assert.match(swift, new RegExp(`let ${field}:`), field);
  }
});
