# n8n Workflow Configuration for Agent Hours API

## Workflow Overview
This workflow runs daily to send agent hours data to your dashboard. Each execution creates a new entry in blob storage with the date as the key.

## Prerequisites
- Your source data should have fields: `FULL_NAME`, `HOURS_LOGGED`, `FIRST_LOGIN`, `LAST_LOGOUT`
- Replace `https://your-dashboard.vercel.app` with your actual dashboard URL

---

## Node 1: Format Agent Hours Data (Set Node)

### Configuration
- **Node Type**: `Set` (Edit Fields)
- **Version**: 3.3+

### Fields to Set

#### Field 1: analysisDate
- **Name**: `analysisDate`
- **Type**: `String`
- **Value**: 
  ```javascript
  {{ $now.format('yyyy-MM-dd') }}
  ```
- **Description**: Automatically uses today's date in YYYY-MM-DD format

#### Field 2: agents
- **Name**: `agents`
- **Type**: `Array`
- **Value**:
  ```javascript
  {{ $json.agents.map(agent => ({
    FULL_NAME: agent.FULL_NAME,
    HOURS_LOGGED: agent.HOURS_LOGGED,
    FIRST_LOGIN: agent.FIRST_LOGIN,
    LAST_LOGOUT: agent.LAST_LOGOUT
  })) }}
  ```
- **Description**: Maps your source data to the required format

### Alternative: Code Node (If you prefer JavaScript)

```javascript
// Assuming your input data is in $input.all()[0].json.agents
const inputData = $input.all()[0].json;

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

// Format the data
const formattedData = {
  analysisDate: today,
  agents: inputData.agents.map(agent => ({
    FULL_NAME: agent.FULL_NAME,
    HOURS_LOGGED: parseFloat(agent.HOURS_LOGGED) || 0,
    FIRST_LOGIN: agent.FIRST_LOGIN,
    LAST_LOGOUT: agent.LAST_LOGOUT
  }))
};

return [{ json: formattedData }];
```

---

## Node 2: POST to Dashboard API (HTTP Request Node)

### Configuration
- **Node Type**: `HTTP Request`
- **Version**: 4.2+

### Settings

#### Request Details
- **Method**: `POST`
- **URL**: `https://your-dashboard.vercel.app/api/agent-hours`
- **Authentication**: None (or add if you implement auth)

#### Body
- **Send Body**: `✓ Enabled`
- **Body Content Type**: `JSON`
- **Specify Body**: `Using Fields Below` or `JSON`

#### JSON Body
```javascript
{{ {
  "analysisDate": $json.analysisDate,
  "agents": $json.agents
} }}
```

**OR** if using raw JSON:

```javascript
{
  "analysisDate": "{{ $json.analysisDate }}",
  "agents": {{ $json.agents }}
}
```

#### Headers (Optional but Recommended)
- **Content-Type**: `application/json` (usually auto-added)

#### Options
- **Timeout**: `30000` (30 seconds)
- **Response Format**: `JSON`
- **Full Response**: `✗ Disabled` (unless you want headers)

---

## Complete Workflow Example

### Schedule Trigger (runs daily)
```javascript
// Node 0: Schedule Trigger
- Mode: Every Day
- Hour: 23:00 (or end of day)
- Timezone: Your timezone
```

### Your Data Source
```javascript
// Node 1: Get Agent Data from your source
// This could be:
// - Database Query
// - API Call to your system
// - Read from file
// - etc.

// Expected output format:
{
  "agents": [
    {
      "FULL_NAME": "John Doe",
      "HOURS_LOGGED": 8,
      "FIRST_LOGIN": "2026-02-16 09:00:00.000",
      "LAST_LOGOUT": "2026-02-16 17:00:00.000"
    }
  ]
}
```

### Format Node
```javascript
// Node 2: Format Agent Hours Data (as described above)
```

### POST Node
```javascript
// Node 3: POST to Dashboard API (as described above)
```

### Error Handler (Optional)
```javascript
// Node 4: Send notification if POST fails
// Connect to Slack, Email, etc.
```

---

## Expected Response

### Success Response
```json
{
  "success": true,
  "message": "Successfully stored agent hours data for 2026-02-16",
  "data": {
    "analysisId": "agent-hours/2026-02-16.json",
    "processedRecords": 3,
    "analysisDate": "2026-02-16"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "agents array is required and must not be empty",
  "message": "Failed to store agent hours data"
}
```

---

## Testing the Workflow

1. **Test with Sample Data**:
   - Add a "Manual Trigger" node before your workflow
   - Add an "Edit Fields (Set)" node with test data:
     ```json
     {
       "agents": [
         {
           "FULL_NAME": "Test Agent",
           "HOURS_LOGGED": 8,
           "FIRST_LOGIN": "2026-02-16 09:00:00.000",
           "LAST_LOGOUT": "2026-02-16 17:00:00.000"
         }
       ]
     }
     ```

2. **Run Manually**: Execute the workflow and check the response

3. **Verify in Dashboard**: 
   - Go to the Agents tab
   - Select today's date
   - You should see the agent hours data

---

## Import Instructions

1. Copy the contents of `n8n-agent-hours-workflow.json`
2. In n8n, go to **Workflows** → **Import from File** or **Import from URL**
3. Paste the JSON
4. Update the URL in the HTTP Request node to your actual dashboard URL
5. Connect your data source
6. Test and activate!

---

## Daily Automation

Each day the workflow runs, it will:
1. Collect agent hours data from your source
2. Format it with today's date as `analysisDate`
3. POST to the API
4. Create a new blob entry: `agent-hours/YYYY-MM-DD.json`

This means:
- ✅ Historical data is preserved (each day has its own file)
- ✅ You can view data for any past date in the dashboard
- ✅ No data is overwritten
- ✅ Easy to query specific dates via the API

---

## Troubleshooting

### Issue: "agents array is required"
- Check that your source data has an `agents` array
- Verify the Format node is mapping data correctly

### Issue: "No data showing in dashboard"
- Verify the date format is exactly `YYYY-MM-DD`
- Check the API response for errors
- Ensure time format is `YYYY-MM-DD HH:MM:SS.mmm`

### Issue: Agent names don't match between tables
- Agent names are matched case-insensitively
- Ensure names are consistent with your delay-time data
- Check for extra spaces or special characters

---

## Advanced: Specific Date (Not Today)

If you want to backfill data for a specific date:

```javascript
// In the Format node, replace:
{{ $now.format('yyyy-MM-dd') }}

// With a specific date:
"2026-02-15"

// Or from your input data:
{{ $json.reportDate }}
```

