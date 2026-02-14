#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSV file
const csvPath = path.join(__dirname, 'ALL PAYMENTS_2026-02-13-2155.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.trim().split('\n');
const headers = lines[0].split(',');

const payments = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',');
  if (values.length >= 6) {
    payments.push({
      PAYMENT_TYPE: values[0],
      CREATION_DATE: values[1],
      CONTRACT_ID: values[2],
      CLIENT_ID: values[3],
      STATUS: values[4],
      DATE_OF_PAYMENT: values[5],
      AMOUNT_OF_PAYMENT: values[6] || '0' // Include amount if present
    });
  }
}

console.log(`Parsed ${payments.length} payments from CSV`);

// Post to API
const apiUrl = 'https://dashboard-pro-services.vercel.app/api/ingest/payments';
// const apiUrl = 'http://localhost:3000/api/ingest/payments'; // Use this for local testing

console.log(`Posting to ${apiUrl}...`);

fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payments),
})
  .then(res => res.json())
  .then(data => {
    console.log('Upload successful!');
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(error => {
    console.error('Upload failed:', error);
    process.exit(1);
  });

