/**
 * Script to sync local pnl-complaints.json directly to Vercel Blob
 * 
 * Usage: 
 *   BLOB_READ_WRITE_TOKEN=your-token node scripts/sync-pnl-to-blob.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { put } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!BLOB_TOKEN) {
  console.error('[Sync] ERROR: BLOB_READ_WRITE_TOKEN environment variable is required');
  console.error('  Usage: BLOB_READ_WRITE_TOKEN=your-token node scripts/sync-pnl-to-blob.mjs');
  process.exit(1);
}

async function main() {
  const jsonPath = path.join(__dirname, '..', 'data', 'pnl-complaints.json');
  
  console.log(`[Sync] Reading local data from: ${jsonPath}`);
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`[Sync] Error: File not found: ${jsonPath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content);
  
  console.log(`[Sync] Found ${data.rawComplaintsCount} complaints, ${data.summary.totalUniqueSales} unique sales`);
  console.log(`[Sync] Last updated: ${data.lastUpdated}`);
  
  // Upload to Vercel Blob using @vercel/blob package
  console.log(`[Sync] Uploading to Vercel Blob (overwriting pnl-complaints.json)...`);
  
  try {
    const blob = await put('pnl-complaints.json', content, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    
    console.log('\n[Sync] SUCCESS!');
    console.log('Blob URL:', blob.url);
    console.log('\nData synced:');
    console.log(`  - Total complaints: ${data.rawComplaintsCount}`);
    console.log(`  - Unique sales: ${data.summary.totalUniqueSales}`);
    console.log(`  - Unique clients: ${data.summary.totalUniqueClients}`);
    
    // Show service breakdown
    console.log('\nService breakdown:');
    for (const [key, service] of Object.entries(data.services)) {
      if (service.uniqueSales > 0) {
        console.log(`  - ${service.serviceName}: ${service.uniqueSales} sales`);
      }
    }
    
  } catch (error) {
    console.error('[Sync] Error:', error.message);
    process.exit(1);
  }
}

main();

