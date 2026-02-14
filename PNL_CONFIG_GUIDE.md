# Dynamic P&L Cost Configuration System

## Overview
A system that allows you to dynamically update unit costs and service fees through a UI interface. Changes apply from today forward, preserving historical calculations.

## How It Works

### 1. Configuration History
- Each time you update costs, a new configuration snapshot is created
- Each snapshot has an `effectiveDate` (the date it starts applying)
- Historical data uses the configuration that was active on each payment's date

### 2. Cost Calculation
For each payment, the system:
1. Looks up the configuration that was effective on that payment's date
2. Calculates cost as: `unitCost + serviceFee`
3. Uses this to calculate: `grossProfit = revenue - cost`

### 3. UI Interface (Settings Tab)
Located at: **Settings** tab in the sidebar

**Features:**
- Edit unit costs and service fees for all services
- See total cost per payment (unit cost + service fee)
- View configuration history
- Changes apply from today forward automatically

## API Endpoints

### GET `/api/pnl-config`
Retrieve current configuration and history
```json
{
  "success": true,
  "currentConfig": { ... },
  "history": [ ... ]
}
```

### POST `/api/pnl-config`
Update configuration (creates new snapshot for today)
```json
{
  "services": {
    "oec": { "unitCost": 61.5, "serviceFee": 0 },
    "owwa": { "unitCost": 92, "serviceFee": 10 },
    ...
  }
}
```

## Example Scenario

**Scenario:** TTL costs increase from 400 to 450 AED on Feb 15, 2026

1. **Before Feb 15:**
   - Payment on Feb 10: uses 400 AED cost
   - Payment on Feb 14: uses 400 AED cost

2. **Update on Feb 15:**
   - Go to Settings tab
   - Change TTL unit cost from 400 to 450
   - Click "Save Configuration"

3. **After Feb 15:**
   - Payment on Feb 15: uses 450 AED cost
   - Payment on Feb 20: uses 450 AED cost
   - **Old payments still show 400 AED** (historical accuracy preserved)

## Services Configuration

### Current Services:
- **OEC** - DMW Fees
- **OWWA** - OWWA Fees
- **TTL** - Travel to Lebanon (Embassy + transport)
- **TTE** - Travel to Egypt (Embassy + transport)
- **TTJ** - Travel to Jordan (Embassy + facilitator)
- **Schengen** - Schengen countries
- **GCC** - GCC countries (Dubai Police)
- **Ethiopian PP** - Ethiopian Passport Renewal (Government fees)
- **Filipina PP** - Filipina Passport Renewal

## Benefits

1. **No Code Deployment Needed** - Update costs through UI
2. **Historical Accuracy** - Old data keeps original calculations
3. **Audit Trail** - Full history of all configuration changes
4. **Date-Based** - Each change is timestamped and dated
5. **Flexible** - Change both unit costs and service fees independently

