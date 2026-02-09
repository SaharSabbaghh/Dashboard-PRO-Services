/**
 * Script to import P&L complaints from CSV file
 * Usage: node scripts/import-pnl-complaints.mjs [csv-file-path]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CSV content
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const complaints = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Simple CSV parsing (handle quoted fields if needed)
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
    
    // Create complaint object
    const complaint = {};
    headers.forEach((header, idx) => {
      complaint[header] = values[idx] || '';
    });
    
    complaints.push(complaint);
  }
  
  return complaints;
}

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args[0] || path.join(process.cwd(), 'OEC_2026-02-09-2305.csv');
  
  console.log(`[Import] Reading CSV from: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`[Import] Error: File not found: ${csvPath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const complaints = parseCSV(content);
  
  console.log(`[Import] Parsed ${complaints.length} complaints from CSV`);
  
  // Import the processor (dynamic import for ESM)
  const processorPath = path.join(__dirname, '..', 'lib', 'pnl-complaints-processor.ts');
  
  // Since we can't directly import TS in Node, we'll write JSON and call the API
  // Or we can directly call the storage functions
  
  // For simplicity, let's write the data directly using the storage format
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Map complaints to the expected format
  const normalizedComplaints = complaints.map(c => ({
    contractId: c.CONTRACT_ID || '',
    housemaidId: c.HOUSEMAID_ID || '',
    clientId: c.CLIENT_ID || '',
    complaintType: c.COMPLAINT_TYPE || '',
    creationDate: c.CREATION_DATE || '',
  }));
  
  // Inline the processing logic (since we can't import TS)
  const COMPLAINT_TYPE_MAP = {
    'overseas employment certificate': 'oec',
    'overseas': 'oec',
    'oec': 'oec',
    'client owwa registration': 'owwa',
    'owwa registration': 'owwa',
    'owwa': 'owwa',
    'tourist visa to lebanon': 'ttl',
    'travel to lebanon': 'ttl',
    'ttl': 'ttl',
    'tourist visa to egypt': 'tte',
    'travel to egypt': 'tte',
    'tte': 'tte',
    'tourist visa to jordan': 'ttj',
    'travel to jordan': 'ttj',
    'ttj': 'ttj',
    'ethiopian passport renewal': 'ethiopianPP',
    'ethiopian pp': 'ethiopianPP',
    'filipina passport renewal': 'filipinaPP',
    'filipina pp': 'filipinaPP',
    'gcc travel': 'gcc',
    'gcc': 'gcc',
    'schengen': 'schengen',
    'schengen visa': 'schengen',
  };
  
  const SERVICE_NAMES = {
    oec: 'Overseas Employment Certificate',
    owwa: 'OWWA Registration',
    ttl: 'Travel to Lebanon',
    tte: 'Travel to Egypt',
    ttj: 'Travel to Jordan',
    schengen: 'Schengen Countries',
    gcc: 'GCC',
    ethiopianPP: 'Ethiopian Passport Renewal',
    filipinaPP: 'Filipina Passport Renewal',
  };
  
  const ALL_SERVICE_KEYS = ['oec', 'owwa', 'ttl', 'tte', 'ttj', 'schengen', 'gcc', 'ethiopianPP', 'filipinaPP'];
  
  function getServiceKey(complaintType) {
    const normalized = (complaintType || '').toLowerCase().trim();
    return COMPLAINT_TYPE_MAP[normalized];
  }
  
  function parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString();
    if (dateStr.includes('T')) return dateStr;
    
    const [datePart, timePart] = dateStr.split(' ');
    if (!datePart) return new Date().toISOString();
    
    const [year, month, day] = datePart.split('-').map(Number);
    const timeClean = (timePart || '0:0:0').split('.')[0];
    const [hour, minute, second] = timeClean.split(':').map(Number);
    
    return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).toISOString();
  }
  
  function isWithinThreeMonths(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
    
    const monthsDiff = Math.abs(
      (d2.getFullYear() - d1.getFullYear()) * 12 + 
      (d2.getMonth() - d1.getMonth())
    );
    
    if (monthsDiff < 3) return true;
    if (monthsDiff === 3) {
      const laterDate = d1 > d2 ? d1 : d2;
      const earlierDate = d1 > d2 ? d2 : d1;
      const threeMonthsLater = new Date(earlierDate);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      return laterDate < threeMonthsLater;
    }
    return false;
  }
  
  // Initialize result structure
  const result = {
    lastUpdated: new Date().toISOString(),
    rawComplaintsCount: normalizedComplaints.length,
    services: {},
    summary: {
      totalUniqueSales: 0,
      totalUniqueClients: 0,
      totalUniqueContracts: 0,
    },
  };
  
  for (const key of ALL_SERVICE_KEYS) {
    result.services[key] = {
      serviceKey: key,
      serviceName: SERVICE_NAMES[key],
      uniqueSales: 0,
      uniqueClients: 0,
      uniqueContracts: 0,
      totalComplaints: 0,
      byMonth: {},
      sales: [],
    };
  }
  
  // Filter and group complaints
  const validComplaints = [];
  for (const c of normalizedComplaints) {
    const serviceKey = getServiceKey(c.complaintType);
    if (serviceKey) {
      validComplaints.push({
        ...c,
        serviceKey,
        creationDate: parseDate(c.creationDate),
      });
    }
  }
  
  console.log(`[Import] ${validComplaints.length} complaints map to P&L services`);
  
  // Group by service + contract + client + housemaid
  const groups = new Map();
  for (const c of validComplaints) {
    const key = `${c.serviceKey}_${c.contractId || 'no-contract'}_${c.clientId || 'no-client'}_${c.housemaidId || 'no-housemaid'}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        serviceKey: c.serviceKey,
        contractId: c.contractId,
        clientId: c.clientId,
        housemaidId: c.housemaidId,
        complaints: [],
      });
    }
    groups.get(key).complaints.push(c);
  }
  
  // Apply 3-month deduplication
  const allClients = new Set();
  const allContracts = new Set();
  
  for (const [, group] of groups) {
    const service = result.services[group.serviceKey];
    
    if (group.clientId) allClients.add(group.clientId);
    if (group.contractId) allContracts.add(group.contractId);
    
    // Sort by date
    const sorted = [...group.complaints].sort((a, b) => 
      new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime()
    );
    
    // Apply 3-month windowing
    const periods = [];
    for (const c of sorted) {
      if (!c.creationDate) continue;
      
      let added = false;
      for (const p of periods) {
        if (isWithinThreeMonths(p.startDate, c.creationDate)) {
          p.dates.push(c.creationDate);
          if (new Date(c.creationDate) > new Date(p.endDate)) {
            p.endDate = c.creationDate;
          }
          added = true;
          break;
        }
      }
      
      if (!added) {
        periods.push({
          startDate: c.creationDate,
          endDate: c.creationDate,
          dates: [c.creationDate],
        });
      }
    }
    
    service.totalComplaints += group.complaints.length;
    service.uniqueSales += periods.length;
    
    // Track by month
    for (const p of periods) {
      const monthKey = p.startDate.substring(0, 7);
      if (monthKey && monthKey.length === 7) {
        service.byMonth[monthKey] = (service.byMonth[monthKey] || 0) + 1;
      }
      
      service.sales.push({
        id: `sale_${group.key}_${p.startDate.substring(0, 10)}`,
        serviceKey: group.serviceKey,
        contractId: group.contractId,
        clientId: group.clientId,
        housemaidId: group.housemaidId,
        firstSaleDate: p.startDate,
        lastSaleDate: p.endDate,
        occurrenceCount: p.dates.length,
        complaintDates: p.dates,
      });
    }
    
    service.uniqueClients = new Set(service.sales.map(s => s.clientId).filter(Boolean)).size;
    service.uniqueContracts = new Set(service.sales.map(s => s.contractId).filter(Boolean)).size;
  }
  
  // Calculate totals
  result.summary.totalUniqueSales = ALL_SERVICE_KEYS.reduce(
    (sum, key) => sum + result.services[key].uniqueSales, 0
  );
  result.summary.totalUniqueClients = allClients.size;
  result.summary.totalUniqueContracts = allContracts.size;
  
  // Save to file
  const outputPath = path.join(dataDir, 'pnl-complaints.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  console.log(`[Import] Saved to: ${outputPath}`);
  console.log(`[Import] Results:`);
  console.log(`  - Raw complaints: ${result.rawComplaintsCount}`);
  console.log(`  - Total unique sales: ${result.summary.totalUniqueSales}`);
  console.log(`  - Total unique clients: ${result.summary.totalUniqueClients}`);
  console.log(`  - Total unique contracts: ${result.summary.totalUniqueContracts}`);
  console.log(`  - Service breakdown:`);
  
  for (const key of ALL_SERVICE_KEYS) {
    const service = result.services[key];
    if (service.uniqueSales > 0) {
      console.log(`    ${service.serviceName}: ${service.uniqueSales} sales (${service.totalComplaints} complaints)`);
    }
  }
}

main().catch(err => {
  console.error('[Import] Error:', err);
  process.exit(1);
});

