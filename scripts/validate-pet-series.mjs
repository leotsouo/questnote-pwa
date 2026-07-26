#!/usr/bin/env node
/**
 * 驗證寵物系列工作區
 * 用法：node scripts/validate-pet-series.mjs <seriesId>
 */
import {
  validateSeriesWorkspace,
  assertSafeSeriesId,
} from './petSeriesPublishService.mjs';

const seriesId = process.argv[2];
if (!seriesId) {
  console.error('用法: node scripts/validate-pet-series.mjs <seriesId>');
  process.exit(1);
}

try {
  assertSafeSeriesId(seriesId);
  const result = await validateSeriesWorkspace(seriesId);
  const ws = result.workspace;

  console.log('Series:', ws.seriesMeta.seriesId, '/', ws.seriesMeta.seriesName);
  console.log('Pet count:', (ws.petsData.pets || []).length);
  console.log('Lore count:', (ws.loreData.lore || []).length);
  console.log('Errors:', result.errors.length);
  for (const e of result.errors) {
    console.log(`  [ERROR][${e.code}] ${e.message}`);
  }
  console.log('Warnings:', result.warnings.length);
  for (const w of result.warnings) {
    console.log(`  [WARN][${w.code}] ${w.message}`);
  }
  console.log('Pool Preview:');
  for (const pool of result.poolPreview) {
    console.log(`  ${pool.name} (${pool.id}): ${pool.before.total} → ${pool.after.total}`);
    const br = pool.before.byRarity;
    const ar = pool.after.byRarity;
    console.log(`    N ${br.N}→${ar.N} | R ${br.R}→${ar.R} | SR ${br.SR}→${ar.SR} | SSR ${br.SSR}→${ar.SSR} | UR ${br.UR}→${ar.UR}`);
  }
  console.log('Result:', result.ok ? 'PASS' : 'FAIL');
  process.exit(result.ok ? 0 : 1);
} catch (err) {
  console.error('FATAL:', err?.message || err);
  process.exit(1);
}
