# P&L Config Implementation Notes

## What Changed

### 1. New Config File: `lib/pnl-config.ts`
- **Extracted** hardcoded config values from `app/api/pnl/route.ts`
- **Same structure** as before:
  - `serviceCosts`: Record<PnLServiceKey, number>
  - `serviceFees`: Record<PnLServiceKey, number>
  - `monthlyFixedCosts`: { laborCost, llm, proTransportation }

### 2. Safe Parsing & Validation
- All values validated with sensible defaults
- Invalid/missing values fall back to defaults
- Numbers validated (must be >= 0, NaN-safe)
- Type-safe parsing from JSON/objects

### 3. Config Persistence (Blob Storage)
- **Saved to**: Vercel Blob Storage (`pnl-config.json`)
- **Load priority**: Blob storage → Remote URL → Defaults
- **Save function**: `savePnLConfig()` validates and persists config
- **Load function**: `loadPnLConfig()` checks blob first, then remote, then defaults

### 4. Network Calls with Timeout & Retries
- `loadPnLConfig()` supports optional remote URL
- **Timeout**: 5 seconds (configurable)
- **Max retries**: 2 attempts
- **Graceful fallback**: Always returns valid config (defaults on error)
- **No crashes**: All errors caught and logged

### 5. Updated Route: `app/api/pnl/route.ts`
- Uses `loadPnLConfig()` instead of hardcoded values
- Wrapped in try/catch with fallback to defaults
- Config loaded once per request
- All errors logged, never crashes

### 6. New API Endpoint: `app/api/pnl/config/route.ts`
- **GET**: Retrieve current config (from blob or defaults)
- **POST**: Save config to blob storage

## How Config is Saved

The config is **saved to Vercel Blob Storage** at `pnl-config.json`:

1. **Via API**: `POST /api/pnl/config` with config JSON in body
2. **Via Code**: `savePnLConfig(config)` function
3. **Storage**: Vercel Blob Storage (persistent, accessible across deployments)

## Usage

### Load Config (Automatic)
The P&L route automatically loads config with this priority:
1. **Blob storage** (if saved)
2. **Remote URL** (if `PNL_CONFIG_URL` env var set)
3. **Defaults** (hardcoded fallback)

```typescript
import { loadPnLConfig } from '@/lib/pnl-config';
const config = await loadPnLConfig(process.env.PNL_CONFIG_URL);
```

### Save Config

**Via API:**
```bash
curl -X POST /api/pnl/config \
  -H "Content-Type: application/json" \
  -d '{
    "serviceCosts": { "oec": 61.5, ... },
    "serviceFees": { "oec": 0, ... },
    "monthlyFixedCosts": { "laborCost": 55000, ... }
  }'
```

**Via Code:**
```typescript
import { savePnLConfig } from '@/lib/pnl-config';
const result = await savePnLConfig(config);
```

### Get Defaults (No Network Call)
```typescript
import { getDefaultPnLConfig } from '@/lib/pnl-config';
const config = getDefaultPnLConfig(); // Synchronous, instant
```

### Manual Parsing
```typescript
import { parsePnLConfigFromJSON } from '@/lib/pnl-config';
const config = parsePnLConfigFromJSON(jsonString);
```

## Safety Features

✅ **No fetch errors**: All network calls wrapped with timeout/retry  
✅ **No uncaught exceptions**: All errors caught and logged  
✅ **Clear defaults**: Sensible fallback values for all fields  
✅ **Small surface area**: Minimal, focused API  
✅ **Persistent storage**: Config saved to blob storage  

## Config Structure

```typescript
{
  serviceCosts: {
    oec: 61.5,
    owwa: 92,
    // ... all service keys
  },
  serviceFees: {
    oec: 0,
    owwa: 0,
    // ... all service keys (defaults to 0)
  },
  monthlyFixedCosts: {
    laborCost: 55000,
    llm: 3650,
    proTransportation: 2070,
  }
}
```

## Error Handling

- Network failures → defaults
- Invalid JSON → defaults
- Missing fields → defaults
- Invalid values → defaults
- Timeout → defaults
- Blob storage errors → remote URL → defaults

All errors are logged but never crash the app.
