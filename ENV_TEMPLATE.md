# Environment Variables Template

Copy these to your Vercel project settings or local `.env.local` file:

---

## Required for Vercel Blob Storage (Production)

```
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxx
```

Get this from your Vercel project: **Settings > Storage > Blob > Tokens**

---

## Required for API Security

```
INGEST_API_KEY=your-secure-api-key-here
```

Set a secure random string for authenticating external API calls to `/api/ingest/*` endpoints.

Generate one with: `openssl rand -hex 32`

---

## AI Analysis Configuration

### Option 1: OpenAI (Recommended)

```
USE_OPENAI=true
OPENAI_API_KEY=sk-xxxxx
```

Uses `gpt-4o-mini` model.

### Option 2: DeepSeek (via OpenRouter)

```
USE_OPENAI=false
OPENROUTER_API_KEY=sk-or-xxxxx
```

Uses `deepseek/deepseek-chat` model via OpenRouter.

---

## Setting Up Vercel Blob Storage

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Storage** tab
4. Click **Create Database** > **Blob**
5. Name it (e.g., "dashboard-storage")
6. The `BLOB_READ_WRITE_TOKEN` is automatically added to your project

---

## Vercel Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `BLOB_READ_WRITE_TOKEN` | Yes (prod) | Vercel Blob storage token |
| `INGEST_API_KEY` | Yes | API key for `/api/ingest/*` endpoints |
| `USE_OPENAI` | Yes | Set to `true` for OpenAI, `false` for DeepSeek |
| `OPENAI_API_KEY` | If using OpenAI | Your OpenAI API key |
| `OPENROUTER_API_KEY` | If using DeepSeek | Your OpenRouter API key |

---

## API Endpoints for External Triggers

All API endpoints require authentication via the `Authorization` header:

```
Authorization: Bearer <your-ingest-api-key>
```

### Daily Conversation Data

```bash
curl -X POST https://your-app.vercel.app/api/ingest/daily \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_INGEST_API_KEY" \
  -d '{
    "date": "2026-02-09",
    "conversations": [
      {
        "conversationId": "CH12345",
        "maidId": "12345",
        "clientId": "67890",
        "contractId": "1086364",
        "maidName": "Maria Santos",
        "clientName": "John Doe",
        "contractType": "CC",
        "messages": "Conversation text..."
      }
    ]
  }'
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `date` | No | Date for the data (defaults to today) |
| `conversations` | Yes | Array of conversation objects |
| `conversations[].conversationId` | Yes | Unique conversation ID |
| `conversations[].messages` | Yes | The conversation text |
| `conversations[].maidId` | No | Maid ID |
| `conversations[].clientId` | No | Client ID |
| `conversations[].contractId` | No | Contract ID (for household grouping) |
| `conversations[].maidName` | No | Maid name |
| `conversations[].clientName` | No | Client name |
| `conversations[].contractType` | No | "CC" or "MV" |
| `conversations[].chatStartDateTime` | No | ISO date string |

---

### OEC Sales (Complaints Data)

```bash
curl -X POST https://your-app.vercel.app/api/ingest/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_INGEST_API_KEY" \
  -d '{
    "replaceAll": false,
    "complaints": [
      {
        "contractId": "1086364",
        "clientId": "67890",
        "housemaidId": "12345",
        "complaintType": "Overseas Employment Certificate",
        "creationDate": "2026-01-29 21:00:35"
      }
    ]
  }'
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `replaceAll` | No | If `true`, replaces all existing data. Default: `false` (merge) |
| `complaints` | Yes | Array of complaint objects |
| `complaints[].contractId` | Yes | Contract ID |
| `complaints[].clientId` | Yes | Client ID |
| `complaints[].housemaidId` | Yes | Housemaid ID |
| `complaints[].complaintType` | Yes | Must be "Overseas Employment Certificate" for OEC sales |
| `complaints[].creationDate` | Yes | Date string (e.g., "2026-01-29 21:00:35") |
| `complaints[].id` | No | Unique ID for the complaint |

**Deduplication Logic:**
- Same `contractId` + `clientId` + `housemaidId` within 3 months = counted as 1 sale
- New entry after 3 months = counted as a new sale

---

## Security Notes

1. **Never commit API keys to your repository**
2. **API key is only passed in the Authorization header** - not in request bodies
3. **Vercel environment variables are encrypted** and never exposed to the client
4. **All requests without valid Authorization header are rejected with 401**
