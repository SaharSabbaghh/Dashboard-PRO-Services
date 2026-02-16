# 🚀 Quick Setup: n8n Agent Hours Integration

## The 2 Essential Nodes You Need

### 📝 Node 1: Format Agent Hours Data
**Type:** `Set` (Edit Fields)

**Field 1 - analysisDate:**
```javascript
{{ $now.format('yyyy-MM-dd') }}
```

**Field 2 - agents:**
```javascript
{{ $json.agents.map(agent => ({
  FULL_NAME: agent.FULL_NAME,
  HOURS_LOGGED: agent.HOURS_LOGGED,
  FIRST_LOGIN: agent.FIRST_LOGIN,
  LAST_LOGOUT: agent.LAST_LOGOUT
})) }}
```

---

### 🌐 Node 2: POST to Dashboard API
**Type:** `HTTP Request`

- **Method:** `POST`
- **URL:** `https://your-dashboard.vercel.app/api/agent-hours`
- **Body Type:** `JSON`
- **JSON Body:**
```javascript
{{ {
  "analysisDate": $json.analysisDate,
  "agents": $json.agents
} }}
```

---

## Expected Input Format (from your data source)

```json
{
  "agents": [
    {
      "FULL_NAME": "Christian Rizkallah",
      "HOURS_LOGGED": 3,
      "FIRST_LOGIN": "2026-02-16 09:26:33.000",
      "LAST_LOGOUT": "2026-02-16 12:22:37.000"
    },
    {
      "FULL_NAME": "Omar Abou Zaid",
      "HOURS_LOGGED": 8,
      "FIRST_LOGIN": "2026-02-16 14:04:51.000",
      "LAST_LOGOUT": "2026-02-16 22:01:27.000"
    }
  ]
}
```

---

## Expected Output (API Response)

```json
{
  "success": true,
  "message": "Successfully stored agent hours data for 2026-02-16",
  "data": {
    "analysisId": "agent-hours/2026-02-16.json",
    "processedRecords": 2,
    "analysisDate": "2026-02-16"
  }
}
```

---

## ⏰ Daily Automation

**Add a Schedule Trigger:**
- **Trigger Type:** `Schedule Trigger`
- **Cron Expression:** `0 23 * * *` (runs at 11 PM daily)
- **Timezone:** Your timezone

**Flow:**
```
Schedule (11 PM) → Your Data Source → Format Node → POST Node
```

---

## 🎯 Result

Each day creates a new blob entry:
- `agent-hours/2026-02-16.json`
- `agent-hours/2026-02-17.json`
- `agent-hours/2026-02-18.json`
- etc.

View in dashboard: **Agents Tab** → Select Date → See hours logged data!

---

## 🔧 Replace This Line

In Node 2 (HTTP Request), replace:
```
https://your-dashboard.vercel.app/api/agent-hours
```

With your actual dashboard URL:
```
https://[your-app-name].vercel.app/api/agent-hours
```

---

## 📦 Import Ready-Made Workflow

1. Go to n8n
2. Click **Workflows** → **Import from File**
3. Select: `n8n-complete-workflow.json`
4. Update the URL in HTTP Request node
5. Connect your data source
6. Activate! ✅

