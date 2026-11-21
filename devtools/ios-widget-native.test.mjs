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
  assert.match(await read('ios/App/App/MainViewController.swift'), /let widgetBridge = QuestNoteWidgetBridge\(\)\s+bridge\?\.registerPluginInstance\(widgetBridge\)/);
});

test('the widget decodes the fields the snapshot sends', async () => {
  const swift = await read('ios/App/QuestNoteWidget/QuestNoteWidget.swift');
  for (const field of ['id', 'title', 'plannedDate', 'dueDate', 'priority', 'schemaVersion', 'today', 'unfinishedCount', 'tasks']) {
    assert.match(swift, new RegExp(`let ${field}:`), field);
  }
});

// TestFlight build 11 (V3.15.0): the widget appeared but never showed tasks. SceneDelegate built a
// plain CAPBridgeViewController, so MainViewController never ran and QuestNoteWidgetBridge was
// never registered; every snapshot from src/nativeBridge.js failed silently.
test('the scene shows MainViewController, which registers the widget bridge', async () => {
  const scene = await read('ios/App/App/SceneDelegate.swift');
  assert.match(scene, /rootViewController = MainViewController\(\)/);
  assert.doesNotMatch(scene, /rootViewController = CAPBridgeViewController\(\)/);
});

// V3.16.0: widget taps open the task list, a new task or the tapped task.
test('widget links, the URL scheme and the bridge agree', async () => {
  const { parseWidgetLink, WIDGET_LINK_EVENT } = await import('../src/nativeBridge.js');
  const info = await read('ios/App/App/Info.plist');
  assert.match(info, /<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>questnote<\/string>/);
  const widget = await read('ios/App/QuestNoteWidget/QuestNoteWidget.swift');
  for (const url of widget.matchAll(/URL\(string: "(questnote:\/\/[^"]+)"\)/g)) {
    const sample = url[1].replace('\(encoded)', 'task_1');
    assert.ok(parseWidgetLink(sample), sample);
  }
  assert.match(widget, /\.widgetURL\(WidgetLink\.tasks\)/);
  assert.match(widget, /Link\(destination: WidgetLink\.task\(task\.id\)\)/);
  assert.match(widget, /Link\(destination: WidgetLink\.add\)/);
  const bridge = await read('ios/App/App/QuestNoteWidgetBridge.swift');
  assert.match(bridge, /CAPPluginMethod\(name: "consumeLink"/);
  assert.equal(bridge.match(/linkEvent = "([^"]+)"/)[1], WIDGET_LINK_EVENT);
  const scene = await read('ios/App/App/SceneDelegate.swift');
  assert.match(scene, /connectionOptions\.urlContexts\.forEach \{ QuestNoteWidgetBridge\.receive\(\$0\.url\) \}/);
  assert.match(scene, /URLContexts\.forEach \{ QuestNoteWidgetBridge\.receive\(\$0\.url\) \}/);
  assert.match(await read('ios/App/App/MainViewController.swift'), /QuestNoteWidgetBridge\.current = widgetBridge/);
});
