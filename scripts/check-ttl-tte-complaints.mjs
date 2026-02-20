/**
 * Script to check TTL and TTE complaint data
 * Usage: node scripts/check-ttl-tte-complaints.mjs
 */

import fs from 'fs';
import path from 'path';

// Complaint type mapping (from lib/pnl-complaints-types.ts)
function getServiceKeyFromComplaintType(complaintType) {
  const normalized = (complaintType || '').toLowerCase().trim();
  
  // Travel Visas - Lebanon (check specific entry types first)
  if (normalized.includes('lebanon')) {
    if (normalized.includes('single entry') || normalized.includes('single-entry')) {
      return 'ttlSingle';
    }
    if (normalized.includes('double entry') || normalized.includes('double-entry')) {
      return 'ttlDouble';
    }
    if (normalized.includes('multiple entry') || normalized.includes('multiple-entry')) {
      return 'ttlMultiple';
    }
    return 'ttl'; // Generic Lebanon visa
  }
  
  // Travel Visas - Egypt (check specific entry types first)
  if (normalized.includes('egypt')) {
    if (normalized.includes('single entry') || normalized.includes('single-entry')) {
      return 'tteSingle';
    }
    if (normalized.includes('double entry') || normalized.includes('double-entry')) {
      return 'tteDouble';
    }
    if (normalized.includes('multiple entry') || normalized.includes('multiple-entry')) {
      return 'tteMultiple';
    }
    return 'tte'; // Generic Egypt visa
  }
  
  return undefined;
}

async function main() {
  console.log('[Check] Analyzing TTL/TTE complaint data...');
  
  // Check if there's complaint data in the data directory
  const dataDir = path.join(process.cwd(), 'data');
  const complaintsFile = path.join(dataDir, 'pnl-complaints.json');
  
  if (fs.existsSync(complaintsFile)) {
    console.log('[Check] Found P&L complaints data file');
    
    const data = JSON.parse(fs.readFileSync(complaintsFile, 'utf-8'));
    console.log(`[Check] Total raw complaints: ${data.rawComplaintsCount || 0}`);
    
    // Check TTL and TTE volumes
    console.log('\n[Check] Current P&L Volumes:');
    console.log(`  TTL (Lebanon): ${data.services?.ttl?.uniqueSales || 0} sales, ${data.services?.ttl?.totalComplaints || 0} complaints`);
    console.log(`  TTL Single: ${data.services?.ttlSingle?.uniqueSales || 0} sales, ${data.services?.ttlSingle?.totalComplaints || 0} complaints`);
    console.log(`  TTL Double: ${data.services?.ttlDouble?.uniqueSales || 0} sales, ${data.services?.ttlDouble?.totalComplaints || 0} complaints`);
    console.log(`  TTL Multiple: ${data.services?.ttlMultiple?.uniqueSales || 0} sales, ${data.services?.ttlMultiple?.totalComplaints || 0} complaints`);
    console.log(`  TTE (Egypt): ${data.services?.tte?.uniqueSales || 0} sales, ${data.services?.tte?.totalComplaints || 0} complaints`);
    console.log(`  TTE Single: ${data.services?.tteSingle?.uniqueSales || 0} sales, ${data.services?.tteSingle?.totalComplaints || 0} complaints`);
    console.log(`  TTE Double: ${data.services?.tteDouble?.uniqueSales || 0} sales, ${data.services?.tteDouble?.totalComplaints || 0} complaints`);
    console.log(`  TTE Multiple: ${data.services?.tteMultiple?.uniqueSales || 0} sales, ${data.services?.tteMultiple?.totalComplaints || 0} complaints`);
  } else {
    console.log('[Check] No P&L complaints data file found');
  }
  
  // Check for sample CSV files
  const csvFiles = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.csv'));
  if (csvFiles.length > 0) {
    console.log(`\n[Check] Found ${csvFiles.length} CSV files:`);
    csvFiles.forEach(f => console.log(`  - ${f}`));
    
    // Analyze the first CSV file
    const csvPath = csvFiles[0];
    console.log(`\n[Check] Analyzing ${csvPath}...`);
    
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log(`[Check] Headers: ${headers.join(', ')}`);
    
    // Find complaint type column
    const complaintTypeIndex = headers.findIndex(h => 
      h.toLowerCase().includes('complaint') && h.toLowerCase().includes('type')
    );
    
    if (complaintTypeIndex >= 0) {
      console.log(`[Check] Found complaint type column at index ${complaintTypeIndex}`);
      
      // Analyze complaint types
      const complaintTypes = new Set();
      const lebanonComplaints = [];
      const egyptComplaints = [];
      
      for (let i = 1; i < Math.min(lines.length, 1000); i++) { // Check first 1000 rows
        const values = lines[i].split(',');
        const complaintType = values[complaintTypeIndex]?.replace(/"/g, '').trim();
        
        if (complaintType) {
          complaintTypes.add(complaintType);
          
          const normalized = complaintType.toLowerCase();
          if (normalized.includes('lebanon')) {
            lebanonComplaints.push(complaintType);
          }
          if (normalized.includes('egypt')) {
            egyptComplaints.push(complaintType);
          }
        }
      }
      
      console.log(`\n[Check] Found ${complaintTypes.size} unique complaint types`);
      console.log(`[Check] Lebanon complaints: ${lebanonComplaints.length}`);
      console.log(`[Check] Egypt complaints: ${egyptComplaints.length}`);
      
      if (lebanonComplaints.length > 0) {
        console.log('\n[Check] Sample Lebanon complaint types:');
        [...new Set(lebanonComplaints)].slice(0, 5).forEach(type => {
          const serviceKey = getServiceKeyFromComplaintType(type);
          console.log(`  "${type}" → ${serviceKey || 'NOT MAPPED'}`);
        });
      }
      
      if (egyptComplaints.length > 0) {
        console.log('\n[Check] Sample Egypt complaint types:');
        [...new Set(egyptComplaints)].slice(0, 5).forEach(type => {
          const serviceKey = getServiceKeyFromComplaintType(type);
          console.log(`  "${type}" → ${serviceKey || 'NOT MAPPED'}`);
        });
      }
      
      if (lebanonComplaints.length === 0 && egyptComplaints.length === 0) {
        console.log('\n[Check] No Lebanon or Egypt complaints found in sample data');
        console.log('[Check] Sample complaint types:');
        [...complaintTypes].slice(0, 10).forEach(type => {
          console.log(`  "${type}"`);
        });
      }
    } else {
      console.log('[Check] Could not find complaint type column');
    }
  } else {
    console.log('\n[Check] No CSV files found in current directory');
  }
  
  console.log('\n[Check] Recommendations:');
  console.log('1. Import complaint data using: node scripts/import-pnl-complaints.mjs [csv-file]');
  console.log('2. Check that complaint types contain "lebanon" or "egypt" keywords');
  console.log('3. Verify complaint data has proper contract/client/maid IDs for linking');
  console.log('4. Check P&L dashboard to see if volumes are now showing');
}

main().catch(err => {
  console.error('[Check] Error:', err);
  process.exit(1);
});
