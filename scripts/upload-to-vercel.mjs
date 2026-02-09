/**
 * Script to upload P&L complaints data to Vercel deployment
 * 
 * Usage: 
 *   INGEST_API_KEY=your-key node scripts/upload-to-vercel.mjs
 * 
 * Or set the API key in the script below
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION - Update these values
// ============================================
const VERCEL_URL = 'https://dashboard-pro-services.vercel.app';
const API_KEY = process.env.INGEST_API_KEY || 'YOUR_API_KEY_HERE'; // Set your API key
// ============================================

// Parse CSV content
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const complaints = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const complaint = {};
    headers.forEach((header, idx) => {
      complaint[header] = values[idx] || '';
    });
    
    complaints.push(complaint);
  }
  
  return complaints;
}

async function main() {
  const csvPath = path.join(process.cwd(), 'OEC_2026-02-09-2305.csv');
  
  console.log(`[Upload] Reading CSV from: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`[Upload] Error: File not found: ${csvPath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const complaints = parseCSV(content);
  
  console.log(`[Upload] Parsed ${complaints.length} complaints`);
  console.log(`[Upload] Uploading to: ${VERCEL_URL}/api/ingest/pnl-complaints`);
  
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('\n[Upload] ERROR: Please set your INGEST_API_KEY!');
    console.error('  Option 1: INGEST_API_KEY=your-key node scripts/upload-to-vercel.mjs');
    console.error('  Option 2: Edit the API_KEY variable in this script');
    process.exit(1);
  }
  
  try {
    const response = await fetch(`${VERCEL_URL}/api/ingest/pnl-complaints`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ complaints }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error(`[Upload] Error: ${response.status} ${response.statusText}`);
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }
    
    console.log('\n[Upload] SUCCESS!');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('[Upload] Network error:', error.message);
    process.exit(1);
  }
}

main();

