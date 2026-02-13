# Payment-Based Conversions - Complete Implementation Guide

## Overview
The entire dashboard now calculates conversions and P&L metrics based on **payment data** (STATUS = "RECEIVED") instead of complaints data.

## What Changed

### 1. New Files Created
- `lib/payment-types.ts` - Type definitions and payment type mapping
- `lib/payment-processor.ts` - Payment processing and storage logic
- `app/api/ingest/payments/route.ts` - API endpoint for ingesting payments
- `scripts/import-payments.mjs` - Script to import payments from CSV

### 2. Updated Files
- `app/api/conversions/[date]/route.ts` - Now uses payment data instead of complaints
- `app/api/dates/[date]/route.ts` - Now calculates conversions from payments
- `app/api/pnl/route.ts` - **P&L dashboard now uses payment data**
- `app/page.tsx` - Updated to display payment info instead of complaints info

### 3. Removed Dependencies
- No longer depends on complaints data for conversion calculations or P&L metrics
- ProspectCards and P&L components work without any changes

## 🎯 Complete Integration

**Both dashboards now use the SAME payment data source:**
1. ✅ **Sales Dashboard** - Prospect conversions based on payments
2. ✅ **P&L Dashboard** - Revenue/costs calculated from **ACTUAL PAYMENT AMOUNTS**

### 💰 Revenue Calculation:
- **OLD**: P&L used fixed unit prices (e.g., OEC = AED 61.50)
- **NEW**: P&L uses actual `AMOUNT_OF_PAYMENT` from payment records
- **Benefit**: Real revenue tracking, not estimates!
- **Currency**: AED (United Arab Emirates Dirham)

## Expected CSV Format

```csv
PAYMENT_TYPE,CREATION_DATE,CONTRACT_ID,CLIENT_ID,STATUS,DATE_OF_PAYMENT,AMOUNT_OF_PAYMENT
the maid's contract verification,2026-01-14 14:22:31.000,1081356,188266,RECEIVED,2026-01-14,61.50
The Maid's Overseas Employment Certificate,2025-12-26 05:23:42.000,1015165,162287,RECEIVED,2025-12-25,61.50
OWWA Registration,2026-01-19 14:44:14.000,1078564,310973,RECEIVED,2026-01-19,92.00
Travel To Lebanon Visa,2025-07-04 15:32:45.000,1066811,48600,RECEIVED,2025-07-04,500.00
```

### Important Fields:
- **PAYMENT_TYPE**: String (mapped to service)
- **CONTRACT_ID**: String (used to match with prospects)
- **STATUS**: "RECEIVED" (only these count as conversions), "PRE_PDP", or other
- **DATE_OF_PAYMENT**: "YYYY-MM-DD" format (used for date-based filtering)
- **AMOUNT_OF_PAYMENT**: Number in AED (actual payment amount - NEW!) ← **CRITICAL FOR P&L**

### Backward Compatibility:
- ✅ If `AMOUNT_OF_PAYMENT` is missing, P&L will use fixed prices as fallback
- ✅ Old CSV format still works for conversions (Sales Dashboard)
- ✅ New CSV format enables accurate P&L revenue tracking

## Payment Type Mapping

The system maps payment types to services as follows:

### OEC (Contract Verification)
- "the maid's overseas employment certificate"
- "the maid's contract verification" ← This counts as OEC
- "contract verification"
- "oec"

### OWWA
- "owwa registration"
- "owwa"

### Travel Visa
- "travel to lebanon visa"
- "travel to egypt visa"
- "travel to jordan visa"
- "travel to morocco visa"
- "travel to turkey visa"
- "travel visa"

## How to Import Payment Data

### Option 1: Using the Import Script (Recommended)

```bash
# From your project root
node scripts/import-payments.mjs "/Users/saharsabbagh/Desktop/Dashboard/ALL PAYMENTS_2026-02-13-2155.csv"

# For production (after deploying):
node scripts/import-payments.mjs ./payments.csv https://your-dashboard.vercel.app/api/ingest/payments
```

### Option 2: Direct API Call

```bash
curl -X POST http://localhost:3000/api/ingest/payments \
  -H "Content-Type: application/json" \
  -d '{
    "payments": [
      {
        "PAYMENT_TYPE": "the maid'\''s contract verification",
        "CREATION_DATE": "2026-02-13 14:22:31.000",
        "CONTRACT_ID": "1081356",
        "CLIENT_ID": "188266",
        "STATUS": "RECEIVED",
        "DATE_OF_PAYMENT": "2026-02-13"
      }
    ]
  }'
```

## Expected CSV Format

```csv
PAYMENT_TYPE,CREATION_DATE,CONTRACT_ID,CLIENT_ID,STATUS,DATE_OF_PAYMENT
the maid's contract verification,2026-01-14 14:22:31.000,1081356,188266,RECEIVED,2026-01-14
The Maid's Overseas Employment Certificate,2025-12-26 05:23:42.000,1015165,162287,RECEIVED,2025-12-25
```

### Important Fields:
- **PAYMENT_TYPE**: String (mapped to service)
- **CONTRACT_ID**: String (used to match with prospects)
- **STATUS**: "RECEIVED" (only these count as conversions), "PRE_PDP", or other
- **DATE_OF_PAYMENT**: "YYYY-MM-DD" format (used for date-based filtering)

## How Conversions Work Now

### Sales Dashboard (Conversions):
1. Get prospect conversations for a date
2. Check if prospect's contractId exists in payment data
3. Filter payments where:
   - `DATE_OF_PAYMENT` matches the selected date
   - `STATUS` is "RECEIVED"
4. Count as conversion if match found

### P&L Dashboard (Revenue):
1. Get all payment data from blob storage
2. Filter by date range and STATUS = "RECEIVED"
3. Group by service (OEC, OWWA, Travel Visa, etc.)
4. **Calculate actual revenue** from `AMOUNT_OF_PAYMENT` field
5. Calculate costs using fixed unit costs
6. Display: Revenue (actual), Cost (fixed), Gross Profit, Net Profit

**Key Insight**: Both dashboards read from the **same `payments-data.json` file** in Vercel Blob Storage!

## API Endpoints

### POST /api/ingest/payments
Ingests payment data from CSV

**Request:**
```json
{
  "payments": [
    {
      "PAYMENT_TYPE": "...",
      "CREATION_DATE": "...",
      "CONTRACT_ID": "...",
      "CLIENT_ID": "...",
      "STATUS": "RECEIVED",
      "DATE_OF_PAYMENT": "2026-02-13"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed 1115 payments",
  "data": {
    "totalPayments": 1115,
    "breakdown": {
      "oec": 450,
      "owwa": 120,
      "travel_visa": 200,
      "other": 50,
      "received": 820,
      "total": 1115
    }
  }
}
```

### GET /api/ingest/payments
Get summary of stored payment data

### GET /api/conversions/[date]
Get conversions for a specific date (now uses payments)

### GET /api/dates/[date]
Get all data for a date including conversions (now uses payments)

## Testing Locally

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Import your payment data:**
   ```bash
   node scripts/import-payments.mjs "/Users/saharsabbagh/Desktop/Dashboard/ALL PAYMENTS_2026-02-13-2155.csv"
   ```

3. **Check the API:**
   ```bash
   # View payment summary
   curl http://localhost:3000/api/ingest/payments

   # Check conversions for a specific date
   curl http://localhost:3000/api/conversions/2026-02-13
   ```

4. **View on dashboard:**
   - Open http://localhost:3000
   - Select Sales Dashboard
   - Choose a date that has both prospects and payments
   - You should see conversion rates

## Deployment to Production

1. **Deploy your code:**
   ```bash
   git add .
   git commit -m "Switch from complaints to payment-based conversions"
   git push
   ```

2. **Wait for Vercel to deploy**

3. **Import payment data to production:**
   ```bash
   node scripts/import-payments.mjs ./payments.csv https://your-dashboard.vercel.app/api/ingest/payments
   ```

## Storage

- Payment data is stored in **Vercel Blob Storage** as `payments-data.json`
- Automatically overwrites on each import (delete-then-save logic)
- No local storage used for payments

## Key Differences from Complaints

| Feature | Complaints | Payments |
|---------|-----------|----------|
| Conversion indicator | Complaint exists | Payment STATUS = "RECEIVED" |
| Date matching | Complaint date | DATE_OF_PAYMENT |
| Service mapping | Complaint Name | PAYMENT_TYPE |
| Storage | pnl-complaints-data.json | payments-data.json |
| Import script | import-pnl-complaints.mjs | import-payments.mjs |

## Troubleshooting

### No conversions showing
1. Check if payment data is imported: `curl http://localhost:3000/api/ingest/payments`
2. Verify the date has both prospects AND payments with `DATE_OF_PAYMENT` matching
3. Check payment STATUS is "RECEIVED"
4. Verify CONTRACT_ID matches between prospects and payments

### Wrong conversion count
1. Check payment type mapping in `lib/payment-types.ts`
2. Verify STATUS field is exactly "RECEIVED" (case-insensitive)
3. Check DATE_OF_PAYMENT format is "YYYY-MM-DD"

### Import fails
1. Verify CSV has all required columns
2. Check CSV encoding (should be UTF-8)
3. Ensure API server is running
4. Check console logs for detailed error messages

