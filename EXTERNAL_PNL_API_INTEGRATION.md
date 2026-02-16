# P&L Dashboard - External Complaints API Integration

## 🎯 What Changed

The P&L dashboard now fetches sales data from the **external Pro Services Dashboard API** instead of local data sources.

### Data Source Priority (Auto Mode)

1. **🌐 External API** (NEW - Highest Priority)
   - URL: `https://dashboard-pro-services.vercel.app/api/ingest/pnl-complaints`
   - Live data with 3-month deduplication
   - **1,886 unique sales** across all services
   - Last updated: 2026-02-16

2. **💾 Local Complaints** (Fallback #1)
   - Local blob storage complaints data
   - Used if external API is unavailable

3. **💳 Payments Data** (Fallback #2)
   - Payment processor data
   - Used if no complaints data available

4. **📄 Excel Files** (Fallback #3)
   - P&L Excel files in `/P&L` directory
   - Used if all other sources fail

## 📊 Current External API Data

Based on the live data from dashboard-pro-services.vercel.app:

| Service | Unique Sales |
|---------|-------------|
| OEC | 1,245 |
| OWWA | 161 |
| Travel to Lebanon | 391 |
| Travel to Egypt | 61 |
| Travel to Jordan | 0 |
| Schengen | 9 |
| GCC | 0 |
| Ethiopian PP | 19 |
| Filipina PP | 0 |
| **TOTAL** | **1,886** |

## 🔧 Technical Changes

### 1. API Route (`app/api/pnl/route.ts`)
- Added `fetchExternalComplaintsData()` function
- Fetches data from external API via GET request
- Parses and formats service volumes
- Integrated into data source priority waterfall

### 2. UI (`app/page.tsx`)
- Updated `pnlSource` type to include `'external'`
- Added banner for external data source
- Shows: "External Pro Services API (Live)"
- Displays URL: dashboard-pro-services.vercel.app

### 3. Data Flow

```
External API Request
    ↓
GET https://dashboard-pro-services.vercel.app/api/ingest/pnl-complaints
    ↓
Parse Response
    ↓
Extract Service Volumes
    ↓
Apply Config Prices & Costs
    ↓
Calculate P&L
    ↓
Display in Dashboard
```

## 🎨 UI Changes

The P&L tab now shows a blue banner when using external data:

```
🔷 External Pro Services API (Live)
   Reading from dashboard-pro-services.vercel.app • Real-time sales data with 3-month deduplication
```

## 🧪 Testing

### Check Current Data Source
```bash
curl https://your-dashboard.vercel.app/api/pnl | jq '.source'
# Should return: "external"
```

### View External API Directly
```bash
curl https://dashboard-pro-services.vercel.app/api/ingest/pnl-complaints | jq
```

### Force Specific Source
```bash
# Force external (default)
curl https://your-dashboard.vercel.app/api/pnl?source=external

# Force local complaints
curl https://your-dashboard.vercel.app/api/pnl?source=complaints

# Force payments
curl https://your-dashboard.vercel.app/api/pnl?source=payments

# Force Excel files
curl https://your-dashboard.vercel.app/api/pnl?source=excel
```

## 🔄 Deduplication Logic

The external API applies the same deduplication rules:
- Groups by: `CONTRACT_ID` + `CLIENT_ID` + `HOUSEMAID_ID` + `COMPLAINT_TYPE`
- Time window: **3 months**
- Rule: Same combination within 3 months = 1 sale
- Rule: New complaint > 3 months later = NEW sale

## 📈 Benefits

1. **✅ Single Source of Truth**: All dashboards use the same data
2. **✅ Real-time Updates**: Data refreshes automatically
3. **✅ No Manual Uploads**: No need to sync data between systems
4. **✅ Consistent Deduplication**: Same logic across all dashboards
5. **✅ Reliable Fallback**: Falls back to local data if external API is down

## 🚨 Error Handling

If the external API fails:
- ❌ Returns 404 or timeout
- 🔄 Automatically falls back to local complaints data
- 📝 Logs error to console
- ✅ Dashboard continues to work with fallback data

## 🔐 No Authentication Required

The external API's GET endpoint is public - no API key needed for reading data.

## 📝 Response Format

The API returns data matching your local format:

```json
{
  "source": "external",
  "aggregated": {
    "files": ["external-complaints-api"],
    "services": {
      "oec": { "name": "OEC", "volume": 1245, ... },
      "owwa": { "name": "OWWA", "volume": 161, ... },
      ...
    },
    "summary": {
      "totalRevenue": 123456.78,
      "totalCost": 98765.43,
      "totalGrossProfit": 24691.35,
      "fixedCosts": {...},
      "netProfit": 12345.67
    }
  },
  "complaintsData": {
    "lastUpdated": "2026-02-16T10:00:50.747Z",
    "totalComplaints": 2537,
    "totalUniqueSales": 1886,
    "source": "External Pro Services Dashboard",
    "serviceBreakdown": {...}
  }
}
```

## 🎯 Next Steps

1. ✅ Deploy changes to production
2. ✅ Verify external API is accessible
3. ✅ Check P&L dashboard shows "External" source
4. ✅ Confirm sales numbers match external dashboard
5. ✅ Test fallback behavior (if external API goes down)

---

**Status**: ✅ Ready for deployment
**Priority**: 🔴 High (replaces manual data sync process)

