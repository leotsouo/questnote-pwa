/**
 * ui.js was split into src/ui/*.js. A function that moved into a module but is still called from
 * another file without an export/import (or connect…() injection) only fails at runtime, e.g.
 * "Can't find variable: getMailboxCatalogs" on the bulk claim button (V3.10.1–V3.12.0).
 * This check finds calls to a function that is declared only in a different split file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = ['src/ui.js', ...fs.readdirSync(path.join(root, 'src/ui')).filter((name) => name.endsWith('.js')).map((name) => `src/ui/${name}`)];

/** Strip comments and string contents so names inside text or CSS are not mistaken for calls. */
function code(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, (literal) => literal.replace(/[^$`{}]+(?![^{]*})/g, ' '));
}

function scan(file) {
  const src = code(file);
  const declared = new Set();
  for (const match of src.matchAll(/\bfunction\*?\s+([A-Za-z_$][\w$]*)/g)) declared.add(match[1]);
  for (const match of src.matchAll(/\b(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) declared.add(match[1]);
  // `let a, b, c;` — the bindings a connect…(deps) call fills in.
  for (const match of src.matchAll(/\b(?:let|var)\s+([A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)+)\s*;/g)) {
    for (const name of match[1].split(',')) declared.add(name.trim());
  }
  for (const match of src.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) declared.add(part.split(':').pop().split('=')[0].trim());
  }
  for (const match of src.matchAll(/import\s*\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) declared.add(part.trim().split(/\s+as\s+/).pop());
  }
  const topLevelFunctions = new Set([...src.matchAll(/^(?:export\s+)?(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));
  const exported = new Set([...src.matchAll(/^export\s+(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));
  const called = new Set([...src.replace(/\.\.\./g, ' ').matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]));
  return { declared, topLevelFunctions, exported, called };
}

test('split UI files only call functions they declare, import or receive', () => {
  const scans = Object.fromEntries(files.map((file) => [file, scan(file)]));
  const problems = [];
  for (const [file, info] of Object.entries(scans)) {
    for (const name of info.called) {
      if (info.declared.has(name)) continue;
      const owners = Object.entries(scans).filter(([other, data]) => other !== file && data.topLevelFunctions.has(name)).map(([other]) => other);
      if (owners.length) problems.push(`${file} calls ${name}() which only ${owners.join(', ')} declares${owners.some((owner) => !scans[owner].exported.has(name)) ? ' (not exported)' : ' (not imported)'}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the bulk claim gets mailbox catalogs from the mailbox module', () => {
  const ui = scan('src/ui.js');
  const mailbox = scan('src/ui/mailboxView.js');
  assert.ok(ui.called.has('getMailboxCatalogs') && ui.declared.has('getMailboxCatalogs'));
  assert.ok(mailbox.exported.has('getMailboxCatalogs'));
});
