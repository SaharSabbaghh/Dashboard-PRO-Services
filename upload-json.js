const fs = require('fs');
const https = require('https');

const csvPath = '/Users/saharsabbagh/Downloads/ALL PAYMENTS_2026-02-13-2214.csv';

console.log('Reading and parsing CSV...');
const fileContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV properly
const lines = fileContent.trim().split('\n');
const headers = lines[0].split(',');

const payments = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',');
  const payment = {
    PAYMENT_TYPE: values[0],
    CREATION_DATE: values[1],
    CONTRACT_ID: values[2],
    CLIENT_ID: values[3],
    STATUS: values[4],
    AMOUNT_OF_PAYMENT: values[5],
    DATE_OF_PAYMENT: values[6]
  };
  payments.push(payment);
}

console.log(`Converted ${payments.length} records to JSON format`);
console.log('\nSample payment:', JSON.stringify(payments[0], null, 2));
console.log('\nUploading to API...');

const payload = { payments };
const data = JSON.stringify(payload);

const options = {
  hostname: 'dashboard-pro-services.vercel.app',
  port: 443,
  path: '/api/ingest/payments',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log(`\nAPI Response (Status ${res.statusCode}):`);
    try {
      const result = JSON.parse(responseData);
      console.log(JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('\n✅ SUCCESS! Payment data uploaded to Vercel Blob');
        console.log(`Total processed: ${result.data.totalPayments}`);
        console.log(`OEC (received): ${result.data.breakdown.oec}`);
        console.log(`OWWA (received): ${result.data.breakdown.owwa}`);
        console.log(`Travel Visa (received): ${result.data.breakdown.travel_visa}`);
        console.log(`Total RECEIVED: ${result.data.breakdown.received}`);
      }
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.write(data);
req.end();

