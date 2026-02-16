# Daily Complaints API Documentation

## Overview
The Daily Complaints API allows you to store complaints data on a **day-by-day basis**. Each day creates a separate file in blob storage, making it easy to track daily data and aggregate across date ranges.

## Data Storage Pattern
- One file per day: `complaints-daily/YYYY-MM-DD.json`
- Example: `complaints-daily/2026-02-16.json`
- Each file contains all complaints for that specific date
- Historical data preserved indefinitely

## API Endpoints

### 1. POST `/api/complaints-daily`
Store complaints data for a specific date.

**Request Body:**
```json
{
  "date": "2026-02-16",
  "complaints": [
    {
      "contractId": "1086364",
      "housemaidId": "12345",
      "clientId": "67890",
      "complaintType": "Overseas Employment Certificate",
      "creationDate": "2026-02-16 21:00:35.000"
    },
    {
      "contractId": "1086365",
      "housemaidId": "12346",
      "clientId": "67891",
      "complaintType": "Travel to Lebanon",
      "creationDate": "2026-02-16 15:30:00.000"
    }
  ]
}
```

**Field Names (Case Insensitive):**
- `contractId` or `CONTRACT_ID`
- `housemaidId` or `HOUSEMAID_ID`
- `clientId` or `CLIENT_ID`
- `complaintType` or `COMPLAINT_TYPE`
- `creationDate` or `CREATION_DATE`

**Response:**
```json
{
  "success": true,
  "message": "Successfully stored 2 complaints for 2026-02-16",
  "data": {
    "date": "2026-02-16",
    "complaintsCount": 2
  }
}
```

### 2. GET `/api/complaints-daily?date=YYYY-MM-DD`
Retrieve complaints data for a specific date.

**Example:**
```
GET /api/complaints-daily?date=2026-02-16
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-02-16",
    "lastUpdated": "2026-02-16T10:30:00.000Z",
    "complaints": [
      {
        "contractId": "1086364",
        "housemaidId": "12345",
        "clientId": "67890",
        "complaintType": "Overseas Employment Certificate",
        "creationDate": "2026-02-16 21:00:35.000"
      }
    ],
    "totalComplaints": 1
  }
}
```

### 3. GET `/api/complaints-daily/dates`
Get all available dates with complaints data.

**Response:**
```json
{
  "success": true,
  "dates": [
    "2026-02-14",
    "2026-02-15",
    "2026-02-16"
  ]
}
```

## Supported Complaint Types

| Complaint Type | Service Key | Service Name |
|----------------|-------------|--------------|
| Overseas Employment Certificate | `oec` | OEC |
| OWWA Registration | `owwa` | OWWA |
| Travel to Lebanon | `ttl` | Travel to Lebanon |
| Travel to Egypt | `tte` | Travel to Egypt |
| Travel to Jordan | `ttj` | Travel to Jordan |
| Schengen Countries | `schengen` | Schengen Countries |
| GCC | `gcc` | GCC |
| Ethiopian Passport Renewal | `ethiopianPP` | Ethiopian Passport Renewal |
| Filipina Passport Renewal | `filipinaPP` | Filipina Passport Renewal |

## Deduplication Logic

When querying P&L data, complaints are automatically deduplicated:
- **Grouping Key**: `serviceKey + contractId + clientId + housemaidId`
- **Time Window**: 3 months
- **Rule**: Same combination within 3 months = 1 sale
- **Rule**: New complaint > 3 months later = NEW sale

## cURL Examples

### Store Daily Complaints
```bash
curl -X POST https://your-dashboard.vercel.app/api/complaints-daily \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-02-16",
    "complaints": [
      {
        "contractId": "1086364",
        "housemaidId": "12345",
        "clientId": "67890",
        "complaintType": "Overseas Employment Certificate",
        "creationDate": "2026-02-16 21:00:35.000"
      }
    ]
  }'
```

### Retrieve Daily Complaints
```bash
curl https://your-dashboard.vercel.app/api/complaints-daily?date=2026-02-16
```

### Get Available Dates
```bash
curl https://your-dashboard.vercel.app/api/complaints-daily/dates
```

## n8n Integration

### Daily Workflow (Automated)

**Node 1: Format Data**
```javascript
const items = $input.all();
const today = new Date().toISOString().split('T')[0];

const complaints = items.map(item => ({
  contractId: item.json.contractId || item.json.CONTRACT_ID,
  housemaidId: item.json.housemaidId || item.json.HOUSEMAID_ID,
  clientId: item.json.clientId || item.json.CLIENT_ID,
  complaintType: item.json.complaintType || item.json.COMPLAINT_TYPE,
  creationDate: item.json.creationDate || item.json.CREATION_DATE
}));

return [{
  json: {
    date: today,
    complaints: complaints
  }
}];
```

**Node 2: POST to API**
- **Method**: POST
- **URL**: `https://your-dashboard.vercel.app/api/complaints-daily`
- **Body**:
```javascript
{
  "date": "{{ $json.date }}",
  "complaints": {{ $json.complaints }}
}
```

## P&L Integration

The daily complaints automatically integrate with your P&L dashboard:

### Data Source Priority
1. **Daily Complaints** (Primary) - Uses date-based files
2. External Pro Services API (Fallback)
3. Local Complaints Blob (Fallback)
4. Payments Data (Fallback)
5. Excel Files (Fallback)

### P&L API Query
```bash
# Get P&L from daily complaints (auto mode)
curl https://your-dashboard.vercel.app/api/pnl

# Force daily complaints source
curl https://your-dashboard.vercel.app/api/pnl?source=daily

# Filter by date range
curl https://your-dashboard.vercel.app/api/pnl?startDate=2026-02-01&endDate=2026-02-16
```

## Daily Workflow Summary

```
┌─────────────────────────────────────────┐
│  Day 1: 2026-02-16                     │
│  POST /api/complaints-daily            │
│  Creates: complaints-daily/            │
│           2026-02-16.json              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Day 2: 2026-02-17                     │
│  POST /api/complaints-daily            │
│  Creates: complaints-daily/            │
│           2026-02-17.json              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  View P&L Dashboard                    │
│  Aggregates all daily files            │
│  Applies 3-month deduplication         │
│  Shows total sales volumes             │
└─────────────────────────────────────────┘
```

## Benefits vs Single File Approach

✅ **Daily Files (NEW)**:
- One file per day (isolated)
- Easy to query specific dates
- No data conflicts
- Perfect for daily automation
- Fast queries for date ranges

❌ **Single File (OLD)**:
- All data in one file
- Must load everything to query
- Append/replace complexity
- Risk of data corruption

## Error Handling

### Missing date
```json
{
  "success": false,
  "error": "date is required (format: YYYY-MM-DD)"
}
```

### Empty complaints array
```json
{
  "success": false,
  "error": "complaints array is required and must not be empty"
}
```

### No data found for date
```json
{
  "success": false,
  "error": "No complaints data found for date: 2026-02-16"
}
```

## Testing

```bash
# 1. POST today's complaints
curl -X POST http://localhost:3000/api/complaints-daily \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-02-16",
    "complaints": [{"contractId": "123", "housemaidId": "456", "clientId": "789", "complaintType": "Overseas Employment Certificate", "creationDate": "2026-02-16 10:00:00.000"}]
  }'

# 2. GET today's complaints
curl http://localhost:3000/api/complaints-daily?date=2026-02-16

# 3. List all dates
curl http://localhost:3000/api/complaints-daily/dates

# 4. View P&L (uses daily complaints automatically)
curl http://localhost:3000/api/pnl
```

---

**Status**: ✅ Ready to use
**Storage**: Vercel Blob (one file per day)
**Deduplication**: Automatic (3-month window)

