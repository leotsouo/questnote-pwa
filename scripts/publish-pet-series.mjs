#!/usr/bin/env node
/**
 * 發布寵物系列工作區
 * 用法：
 *   node scripts/publish-pet-series.mjs <seriesId> --dry-run
 *   node scripts/publish-pet-series.mjs <seriesId> --confirm <seriesId> --ack-warnings
 */
import {
  publishPetSeries,
  assertSafeSeriesId,
} from './petSeriesPublishService.mjs';

const args = process.argv.slice(2);
const seriesId = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const ackWarnings = args.includes('--ack-warnings');
const confirmIdx = args.indexOf('--confirm');
const confirmSeriesId = confirmIdx >= 0 ? args[confirmIdx + 1] : undefined;

if (!seriesId) {
  console.error('用法:');
  console.error('  node scripts/publish-pet-series.mjs <seriesId> --dry-run');
  console.error('  node scripts/publish-pet-series.mjs <seriesId> --confirm <seriesId> --ack-warnings');
  process.exit(1);
}

try {
  assertSafeSeriesId(seriesId);
  const result = await publishPetSeries(seriesId, {
    dryRun,
    confirmSeriesId: dryRun ? undefined : (confirmSeriesId || seriesId),
    acknowledgeWarnings: ackWarnings || dryRun,
  });

  if (result.stats) {
    console.log(`Pets: ${result.stats.beforePetCount} → ${result.stats.afterPetCount}`);
    console.log('Added:', result.stats.addedPets.map((p) => p.id).join(', ') || '(none)');
  }
  if (result.poolPreview) {
    console.log('Pool Preview:');
    for (const pool of result.poolPreview) {
      console.log(`  ${pool.name}: ${pool.before.total} → ${pool.after.total}`);
    }
  }
  if (result.warnings?.length) {
    console.log('Warnings:', result.warnings.length);
    for (const w of result.warnings) console.log(`  [WARN] ${w.message}`);
  }
  if (result.errors?.length) {
    console.log('Errors:', result.errors.length);
    for (const e of result.errors) console.log(`  [ERROR] ${e.message}`);
  }
  if (result.filesWouldChange) {
    console.log('Files that would change:');
    for (const f of result.filesWouldChange) console.log(`  - ${f}`);
  }
  if (result.report?.reportRelPath) {
    console.log('Report:', result.report.reportRelPath);
  }
  if (result.backupDir) {
    console.log('Backup:', result.backupDir);
  }
  if (result.error) {
    console.error('Publish error:', result.error);
  }

  console.log('Result:', result.ok ? (dryRun ? 'DRY-RUN PASS' : 'PUBLISHED') : 'FAIL');
  process.exit(result.ok ? 0 : 1);
} catch (err) {
  console.error('FATAL:', err?.message || err);
  process.exit(1);
}
