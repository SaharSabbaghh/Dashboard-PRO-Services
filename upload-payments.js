const fs = require('fs');
const https = require('https');

const csvPath = '/Users/saharsabbagh/Downloads/ALL PAYMENTS_2026-02-13-2214.csv';

console.log('Reading CSV file...');
const fileContent = fs.readFileSync(csvPath, 'utf-8');

// Simple CSV parser
const lines = fileContent.trim().split('\n');
const headers = lines[0].split(',');
const records = lines.slice(1).map(line => {
  const values = line.split(',');
  const record = {};
  headers.forEach((header, i) => {
    record[header] = values[i];
  });
  return record;
});

console.log(`Parsed ${records.length} payment records`);
console.log('Uploading to Vercel Blob via API...');

const data = JSON.stringify({ payments: records });

const options = {
  hostname: 'dashboard-pro-services.vercel.app',
  port: 443,
  path: '/api/ingest/payments',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    const result = JSON.parse(responseData);
    
    if (result.success) {
      console.log('\n✅ SUCCESS! Payment data uploaded to Vercel Blob');
      console.log(`Total processed: ${result.data.totalPayments}`);
      console.log('\nBreakdown by service:');
      console.log(`  OEC (received): ${result.data.breakdown.oec}`);
      console.log(`  OWWA (received): ${result.data.breakdown.owwa}`);
      console.log(`  Travel Visa (received): ${result.data.breakdown.travel_visa}`);
      console.log(`  Other: ${result.data.breakdown.other}`);
      console.log(`  Total RECEIVED: ${result.data.breakdown.received}`);
      console.log('\n🎉 Your Sales & P&L Dashboards are now ready!');
    } else {
      console.error('\n❌ Upload failed:', result.message);
      if (result.error) console.error('Error:', result.error);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();

