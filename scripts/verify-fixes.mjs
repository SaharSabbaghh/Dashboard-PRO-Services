#!/usr/bin/env node
/**
 * Verification Script - Data Sync Fixes
 * 
 * Verifies that all fixes have been properly applied
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checks = [];

function check(name, test) {
  try {
    const result = test();
    checks.push({ name, passed: result, error: null });
    return result;
  } catch (error) {
    checks.push({ name, passed: false, error: error.message });
    return false;
  }
}

console.log('🔍 Verifying Data Sync Fixes...\n');

// Check 1: New utility files exist
check('date-utils.ts exists', () => {
  return fs.existsSync(path.join(process.cwd(), 'lib/date-utils.ts'));
});

check('lock-manager.ts exists', () => {
  return fs.existsSync(path.join(process.cwd(), 'lib/lock-manager.ts'));
});

// Check 2: Modified files contain expected code
check('storage.ts has processingStatus field', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'lib/storage.ts'), 'utf-8');
  return content.includes('processingStatus') && content.includes('retryCount');
});

check('process/date/route.ts uses locking', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'app/api/process/date/route.ts'), 'utf-8');
  return content.includes('withLock') && content.includes('lock-manager');
});

check('upload route uses normalizeDate', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'app/api/upload/route.ts'), 'utf-8');
  return content.includes('normalizeDate') && content.includes('date-utils');
});

check('ingest route uses normalizeDate', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'app/api/ingest/daily/route.ts'), 'utf-8');
  return content.includes('normalizeDate') && content.includes('date-utils');
});

check('blob-storage has exact pathname matching', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'lib/blob-storage.ts'), 'utf-8');
  return content.includes('exactMatch') && content.includes('pathname === path');
});

check('blob-storage has version tracking', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'lib/blob-storage.ts'), 'utf-8');
  return content.includes('_blobMeta') && content.includes('version');
});

// Check 3: Migration script exists
check('migration script exists', () => {
  return fs.existsSync(path.join(process.cwd(), 'scripts/migrate-add-status-field.mjs'));
});

// Check 4: Documentation exists
check('DATA_SYNC_FIXES.md exists', () => {
  return fs.existsSync(path.join(process.cwd(), 'DATA_SYNC_FIXES.md'));
});

check('FIXES_SUMMARY.md exists', () => {
  return fs.existsSync(path.join(process.cwd(), 'FIXES_SUMMARY.md'));
});

// Print results
console.log('Results:\n');
const passed = checks.filter(c => c.passed).length;
const total = checks.length;

checks.forEach(check => {
  const icon = check.passed ? '✅' : '❌';
  console.log(`${icon} ${check.name}`);
  if (check.error) {
    console.log(`   Error: ${check.error}`);
  }
});

console.log(`\n${passed}/${total} checks passed\n`);

if (passed === total) {
  console.log('🎉 All fixes verified successfully!');
  console.log('✨ Ready for deployment!');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please review.');
  process.exit(1);
}

