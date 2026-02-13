#!/usr/bin/env node
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

/**
 * Script to import payments from CSV and send to dashboard API
 * Usage: node scripts/import-payments.mjs <path-to-csv>
 */

// Payment type mapping (same as in payment-types.ts)
const PAYMENT_TYPE_MAP = {
  "the maid's overseas employment certificate": 'oec',
  'overseas employment certificate': 'oec',
  'oec': 'oec',
  "the maid's contract verification": 'oec',
  'contract verification': 'oec',
  'owwa registration': 'owwa',
  'owwa': 'owwa',
  'travel to lebanon visa': 'travel_visa',
  'travel to egypt visa': 'travel_visa',
  'travel to jordan visa': 'travel_visa',
  'travel to morocco visa': 'travel_visa',
  'travel to turkey visa': 'travel_visa',
  'travel to philippines visa': 'travel_visa',
  'travel visa': 'travel_visa',
  'visa': 'travel_visa',
};

function mapPaymentTypeToService(paymentType) {
  const normalized = paymentType.toLowerCase().trim();
  
  if (PAYMENT_TYPE_MAP[normalized]) {
    return PAYMENT_TYPE_MAP[normalized];
  }
  
  if (normalized.includes('oec') || normalized.includes('employment certificate') || normalized.includes('contract verification')) {
    return 'oec';
  }
  
  if (normalized.includes('owwa')) {
    return 'owwa';
  }
  
  if (normalized.includes('visa') || normalized.includes('travel to')) {
    return 'travel_visa';
  }
  
  return 'other';
}

async function importPayments(csvPath, apiUrl = 'http://localhost:3000/api/ingest/payments') {
  try {
    console.log(`Reading CSV from: ${csvPath}`);
    
    // Read and parse CSV
    const fileContent = readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    console.log(`Parsed ${records.length} records from CSV`);
    
    // Preview first few records
    console.log('\nFirst 3 records:');
    records.slice(0, 3).forEach((record, i) => {
      const service = mapPaymentTypeToService(record.PAYMENT_TYPE || '');
      const amount = record.AMOUNT_OF_PAYMENT ? ` - AED ${record.AMOUNT_OF_PAYMENT}` : '';
      console.log(`${i + 1}. ${record.PAYMENT_TYPE} -> ${service} (${record.STATUS})${amount} - Contract: ${record.CONTRACT_ID}`);
    });
    
    // Count by service
    const serviceCounts = records.reduce((acc, record) => {
      const service = mapPaymentTypeToService(record.PAYMENT_TYPE || '');
      acc[service] = (acc[service] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nPayment breakdown:');
    Object.entries(serviceCounts).forEach(([service, count]) => {
      console.log(`  ${service}: ${count}`);
    });
    
    // Count by status
    const statusCounts = records.reduce((acc, record) => {
      const status = record.STATUS || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nStatus breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Send to API
    console.log(`\nSending ${records.length} payments to API: ${apiUrl}`);
    
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
      
      // Calculate total revenue if amounts are available
      const hasAmounts = records.some(r => r.AMOUNT_OF_PAYMENT);
      if (hasAmounts) {
        const totalRevenue = records
          .filter(r => r.STATUS === 'RECEIVED' && r.AMOUNT_OF_PAYMENT)
          .reduce((sum, r) => {
            const amount = typeof r.AMOUNT_OF_PAYMENT === 'number' 
              ? r.AMOUNT_OF_PAYMENT 
              : parseFloat(String(r.AMOUNT_OF_PAYMENT).replace(/[^0-9.-]/g, ''));
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);
        console.log(`\n💰 Total Revenue (RECEIVED payments): AED ${totalRevenue.toFixed(2)}`);
      }
    } else {
      console.error('\n❌ Failed to import payments');
      console.error('Message:', result.message);
      if (result.error) {
        console.error('Error:', result.error);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error importing payments:', error);
    process.exit(1);
  }
}

// Main execution
const csvPath = process.argv[2];

if (!csvPath) {
  console.error('Usage: node scripts/import-payments.mjs <path-to-csv> [api-url]');
  console.error('Example: node scripts/import-payments.mjs ./payments.csv');
  console.error('Example: node scripts/import-payments.mjs ./payments.csv https://your-dashboard.vercel.app/api/ingest/payments');
  process.exit(1);
}

const apiUrl = process.argv[3] || 'http://localhost:3000/api/ingest/payments';

importPayments(csvPath, apiUrl);

