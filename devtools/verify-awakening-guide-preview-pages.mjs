/** Verify that the exact pinned preview commit completed its GitHub Pages deployment. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const report = path.join(root, 'reports/awakening-guide');
const deployment = JSON.parse(await fs.readFile(path.join(report, 'preview-deployment.json')));
const response = await fetch('https://api.github.com/repos/leotsouo/questnote-pwa-preview/actions/runs?per_page=20', {
  headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'questnote-release-check' },
});
assert.equal(response.ok, true, `GitHub Actions API returned ${response.status}`);
const { workflow_runs: runs = [] } = await response.json();
const run = runs.find((item) => item.head_sha === deployment.commit && item.name === 'pages build and deployment');
assert.ok(run, 'The preview commit has no matching Pages run');
assert.equal(run.status, 'completed', 'The preview Pages run has not completed');
assert.equal(run.conclusion, 'success', 'The preview Pages run failed');
const result = { status: 'passed', verifiedAt: new Date().toISOString(), commit: deployment.commit,
  runId: run.id, runUrl: run.html_url, statusLabel: run.status, conclusion: run.conclusion };
await fs.writeFile(path.join(report, 'preview-pages.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
