/**
 * V3.14.0: the iOS app (Capacitor) runs the same verified artifact with an `ios` profile.
 * Files are bundled in the app, so boot must not wait for a service worker, the profile keeps
 * the production database name inside the app's own container, and the native project carries
 * the identifiers registered in the developer account.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bootApplication } from '../src/bootstrap.js';
import { validateReleaseProfile } from '../src/releaseCatalog.js';
import { POOL_CONTENT_SCHEMA_VERSION } from '../src/poolContentContract.js';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const HASH = 'a'.repeat(64);
const iosProfile = {
  schemaVersion: 1, profile: 'ios', artifactId: HASH, sourceCommit: 'b'.repeat(40), scopePath: '/',
  runtimeContentSchema: POOL_CONTENT_SCHEMA_VERSION, dbName: 'QuestNoteDB', cacheNamespace: 'questnote-ios-',
  contentBundleSha256: HASH, contentBundleUrl: `data/releases/${HASH}/catalog.json`,
};

test('the ios profile is a valid release profile with the production database name', () => {
  assert.equal(validateReleaseProfile(iosProfile).profile, 'ios');
  assert.throws(() => validateReleaseProfile({ ...iosProfile, dbName: 'QuestNotePreviewDB' }), /Invalid/);
});

// TestFlight build 3 (V3.14.0) could not open: db.js only knew production/preview and threw
// "Invalid release database profile" for the ios profile.
test('db.js accepts every release profile with the same database name', async () => {
  const source = await read('src/db.js');
  const table = source.match(/const PROFILE_DATABASES = Object\.freeze\((\{[^}]+\})\)/)[1];
  const databases = Function(`return ${table}`)();
  for (const profile of ['production', 'preview', 'ios']) {
    const descriptor = { ...iosProfile, profile, scopePath: profile === 'ios' ? '/' : `/${profile}/`,
      dbName: databases[profile], cacheNamespace: `questnote-${profile}-` };
    assert.equal(validateReleaseProfile(descriptor).dbName, databases[profile], profile);
  }
});

test('the bundled ios app starts without a service worker', async () => {
  let started = false;
  const result = await bootApplication({ profile: iosProfile, marker: HASH, serviceWorker: null,
    baseUrl: 'capacitor://localhost/', attemptStorage: null, start: async () => { started = true; } });
  assert.equal(result, 'bundled');
  assert.equal(started, true);
  await assert.rejects(() => bootApplication({ profile: iosProfile, marker: 'c'.repeat(64), serviceWorker: null,
    baseUrl: 'capacitor://localhost/', start: async () => {} }), /版本不一致/);
});

test('the ios app skips worker registration but still refreshes after the day changes', async () => {
  const source = await read('src/app.js');
  const body = source.slice(source.indexOf('async function registerServiceWorker'));
  const iosBranch = body.slice(0, body.indexOf("if (!('serviceWorker' in navigator))"));
  assert.match(iosBranch, /RELEASE_PROFILE\?\.profile === 'ios'/);
  assert.match(iosBranch, /refreshAfterDayChange\(\)/);
  assert.doesNotMatch(iosBranch, /serviceWorker\.register/);
});

test('the native project matches the registered identifiers', async () => {
  const config = JSON.parse(await read('capacitor.config.json'));
  assert.equal(config.appId, 'io.github.leotsouo.questnote');
  assert.equal(config.webDir, 'ios-web');
  const pbxproj = await read('ios/App/App.xcodeproj/project.pbxproj');
  assert.match(pbxproj, /PRODUCT_BUNDLE_IDENTIFIER = io\.github\.leotsouo\.questnote;/);
  const plist = await read('ios/App/App/Info.plist');
  for (const key of ['NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription', 'ITSAppUsesNonExemptEncryption']) {
    assert.match(plist, new RegExp(`<key>${key}</key>`));
  }
  const exportOptions = await read('ios/ExportOptions.plist');
  assert.match(exportOptions, /<string>app-store-connect<\/string>/);
  assert.match(exportOptions, /<string>N5QFL8LN64<\/string>/);
});

test('the workflow keeps the signing key out of the repository', async () => {
  const workflow = await read('.github/workflows/ios.yml');
  assert.match(workflow, /secrets\.ASC_KEY_P8/);
  assert.match(workflow, /trap 'rm -f "\$KEY_PATH"' EXIT/);
  assert.match(workflow, /npm run ios:web/);
  const ignore = await read('.gitignore');
  assert.match(ignore, /^ios-web\/$/m);
});
