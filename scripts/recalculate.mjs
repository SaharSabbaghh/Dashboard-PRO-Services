import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DAILY_DIR = path.join(__dirname, '..', 'data', 'daily');

function calculateSummary(results) {
  let oec = 0, owwa = 0, travelVisa = 0;
  let oecConverted = 0, owwaConverted = 0, travelVisaConverted = 0;
  const countryCounts = {};
  const byContractType = {
    CC: { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 },
    MV: { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 },
  };
  
  // Group results by household (CONTRACT_ID)
  const householdMap = new Map();
  
  for (const result of results) {
    const householdKey = result.contractId || `standalone_${result.id}`;
    if (!householdMap.has(householdKey)) {
      householdMap.set(householdKey, []);
    }
    householdMap.get(householdKey).push(result);
  }
  
  // Count prospects per household
  for (const [, members] of householdMap) {
    const contractType = members.find(m => m.contractType)?.contractType || '';
    
    const hasOEC = members.some(m => m.isOECProspect);
    const hasOWWA = members.some(m => m.isOWWAProspect);
    const hasTravelVisa = members.some(m => m.isTravelVisaProspect);
    
    const oecConv = members.some(m => m.oecConverted);
    const owwaConv = members.some(m => m.owwaConverted);
    const travelVisaConv = members.some(m => m.travelVisaConverted);
    
    if (hasOEC) {
      oec++;
      if (oecConv) oecConverted++;
      if (contractType === 'CC') byContractType.CC.oec++;
      else if (contractType === 'MV') byContractType.MV.oec++;
    }
    if (hasOWWA) {
      owwa++;
      if (owwaConv) owwaConverted++;
      if (contractType === 'CC') byContractType.CC.owwa++;
      else if (contractType === 'MV') byContractType.MV.owwa++;
    }
    if (hasTravelVisa) {
      travelVisa++;
      if (travelVisaConv) travelVisaConverted++;
      if (contractType === 'CC') byContractType.CC.travelVisa++;
      else if (contractType === 'MV') byContractType.MV.travelVisa++;
      
      const householdCountries = new Set();
      for (const member of members) {
        if (member.isTravelVisaProspect) {
          for (const country of member.travelVisaCountries || []) {
            householdCountries.add(country);
          }
        }
      }
      for (const country of householdCountries) {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
    }
  }
  
  return { oec, owwa, travelVisa, oecConverted, owwaConverted, travelVisaConverted, countryCounts, byContractType };
}

// Process all daily files
const files = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.json'));

console.log(`Found ${files.length} daily files to recalculate\n`);

for (const file of files) {
  const filePath = path.join(DAILY_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  const oldSummary = { ...data.summary };
  const newSummary = calculateSummary(data.results);
  
  data.summary = newSummary;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  console.log(`${file}:`);
  console.log(`  Before: OEC=${oldSummary.oec}, OWWA=${oldSummary.owwa}, TravelVisa=${oldSummary.travelVisa}`);
  console.log(`  After:  OEC=${newSummary.oec}, OWWA=${newSummary.owwa}, TravelVisa=${newSummary.travelVisa}`);
  console.log(`  Change: OEC ${oldSummary.oec - newSummary.oec > 0 ? '-' : '+'}${Math.abs(oldSummary.oec - newSummary.oec)}, OWWA ${oldSummary.owwa - newSummary.owwa > 0 ? '-' : '+'}${Math.abs(oldSummary.owwa - newSummary.owwa)}, TravelVisa ${oldSummary.travelVisa - newSummary.travelVisa > 0 ? '-' : '+'}${Math.abs(oldSummary.travelVisa - newSummary.travelVisa)}`);
  console.log();
}

console.log('Done! All summaries recalculated with household-based counting.');

