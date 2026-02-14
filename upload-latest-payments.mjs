#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSV file from Downloads
const csvPath = '/Users/saharsabbagh/Downloads/ALL PAYMENTS_2026-02-13-2214.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');

console.log('CSV Headers:', headers);
console.log('Expected format: PAYMENT_TYPE,CREATION_DATE,CONTRACT_ID,CLIENT_ID,STATUS,AMOUNT_OF_PAYMENT,DATE_OF_PAYMENT\n');

const payments = [];
let skippedLines = 0;

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',');
  
  // Expected format: PAYMENT_TYPE,CREATION_DATE,CONTRACT_ID,CLIENT_ID,STATUS,AMOUNT_OF_PAYMENT,DATE_OF_PAYMENT
  if (values.length >= 7) {
    payments.push({
      PAYMENT_TYPE: values[0].trim(),
      CREATION_DATE: values[1].trim(),
      CONTRACT_ID: values[2].trim(),
      CLIENT_ID: values[3].trim(),
      STATUS: values[4].trim(),
      AMOUNT_OF_PAYMENT: values[5].trim(), // Column 6 (index 5)
      DATE_OF_PAYMENT: values[6].trim(), // Column 7 (index 6)
    });
  } else {
    skippedLines++;
    if (skippedLines <= 5) {
      console.warn(`Skipped line ${i + 1} (not enough columns):`, lines[i].substring(0, 100));
    }
  }
}

console.log(`\nParsed ${payments.length} payments from CSV`);
console.log(`Skipped ${skippedLines} invalid lines`);

if (payments.length > 0) {
  console.log('\nSample payment:', JSON.stringify(payments[0], null, 2));
  
  // Calculate some stats
  const paymentTypes = {};
  const statuses = {};
  let receivedCount = 0;
  
  payments.forEach(p => {
    paymentTypes[p.PAYMENT_TYPE] = (paymentTypes[p.PAYMENT_TYPE] || 0) + 1;
    statuses[p.STATUS] = (statuses[p.STATUS] || 0) + 1;
    if (p.STATUS === 'RECEIVED') receivedCount++;
  });
  
  console.log('\nPayment Types:');
  Object.entries(paymentTypes).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });
  
  console.log('\nStatuses:');
  Object.entries(statuses).forEach(([status, count]) => {
    console.log(`  - ${status}: ${count}`);
  });
  
  console.log(`\nTotal RECEIVED payments: ${receivedCount}`);
}

// Post to API
const apiUrl = 'https://dashboard-pro-services.vercel.app/api/ingest/payments';
// const apiUrl = 'http://localhost:3000/api/ingest/payments'; // Use this for local testing

console.log(`\nPosting to ${apiUrl}...`);

fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ payments }), // Wrap in payments object
})
  .then(res => {
    if (!res.ok) {
      return res.text().then(text => {
        throw new Error(`HTTP ${res.status}: ${text}`);
      });
    }
    return res.json();
  })
  .then(data => {
    console.log('\n✅ Upload successful!');
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(error => {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  });

