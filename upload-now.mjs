#!/usr/bin/env node
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const csvPath = '/Users/saharsabbagh/Downloads/ALL PAYMENTS_2026-02-13-2214.csv';
const apiUrl = 'https://dashboard-pro-services.vercel.app/api/ingest/payments';

console.log(`Reading CSV from: ${csvPath}`);

const fileContent = readFileSync(csvPath, 'utf-8');
const records = parse(fileContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

console.log(`Parsed ${records.length} records from CSV`);
console.log(`\nSending to API: ${apiUrl}`);

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    payments: records,
  }),
});

const result = await response.json();

if (result.success) {
  console.log('\n✅ Success!');
  console.log(`Total processed: ${result.data.totalPayments}`);
  console.log('Breakdown:');
  console.log(`  OEC (received): ${result.data.breakdown.oec}`);
  console.log(`  OWWA (received): ${result.data.breakdown.owwa}`);
  console.log(`  Travel Visa (received): ${result.data.breakdown.travel_visa}`);
  console.log(`  Other: ${result.data.breakdown.other}`);
  console.log(`  Total received: ${result.data.breakdown.received}`);
} else {
  console.error('\n❌ Failed to import payments');
  console.error('Message:', result.message);
  if (result.error) {
    console.error('Error:', result.error);
  }
  process.exit(1);
}

