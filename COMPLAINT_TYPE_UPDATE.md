# ✅ Updated: Complaint Type Recognition

## What Changed

The complaint type matching is now **much more flexible** and will recognize more variations.

### New Rules

**OEC (Overseas Employment Certificate)** now includes:
- ✅ "Overseas Employment Certificate"
- ✅ "Client Contract Verification" ⭐ NEW
- ✅ "Contract Verification" ⭐ NEW
- ✅ "Maid Contract Verification" ⭐ NEW
- ✅ Anything containing "overseas" ⭐ NEW
- ✅ Anything containing "contract verification" ⭐ NEW

**Travel to Lebanon** now includes:
- ✅ "Tourist Visa to Lebanon"
- ✅ "Travel to Lebanon"
- ✅ Anything containing "lebanon"

## Your Data Examples

From your sample data:

```json
{
  "COMPLAINT_TYPE": "Client Contract Verification"
}
```
**Result:** ✅ NOW RECOGNIZED as **OEC**

```json
{
  "COMPLAINT_TYPE": "Tourist Visa to Lebanon"  
}
```
**Result:** ✅ Recognized as **TTL** (Travel to Lebanon)

```json
{
  "COMPLAINT_TYPE": "Overseas Employment Certificate"
}
```
**Result:** ✅ Recognized as **OEC**

## Matching Logic

The system checks in this order:

1. **Exact match** (case-insensitive)
2. **Partial match using keywords:**
   - "contract verification" → OEC
   - "overseas" → OEC
   - "owwa" → OWWA
   - "lebanon" → TTL
   - "egypt" → TTE
   - "jordan" → TTJ
   - "schengen" → Schengen
   - "ethiopian" + "passport" → Ethiopian PP
   - "filipina" + "passport" → Filipina PP
   - "gcc" → GCC

## Test Your Data

Now when you POST your complaints:

```json
{
  "date": "2026-02-16",
  "complaints": [
    {
      "complaintType": "Client Contract Verification"  ← OEC
    },
    {
      "complaintType": "Tourist Visa to Lebanon"  ← TTL
    },
    {
      "complaintType": "Overseas Employment Certificate"  ← OEC
    }
  ]
}
```

**Expected P&L Result:**
- OEC: 2 sales (Contract Verification + Overseas Employment)
- TTL: 1 sale (Tourist Visa to Lebanon)

## Verification

After posting your data:

```bash
# 1. Check P&L
curl https://your-dashboard.vercel.app/api/pnl

# Look for:
{
  "source": "complaints",
  "aggregated": {
    "services": {
      "oec": {
        "volume": 2,  ← Should show 2 now!
        ...
      },
      "ttl": {
        "volume": 1,
        ...
      }
    }
  }
}
```

## Case Insensitive

All matching is case-insensitive, so these all work:
- "Client Contract Verification"
- "client contract verification"
- "CLIENT CONTRACT VERIFICATION"
- "ClIeNt CoNtRaCt VeRiFiCaTiOn"

All map to → **OEC** ✅

---

**Status**: ✅ Updated and ready
**Impact**: Contract Verification complaints now count as OEC sales
**Your data**: Should now display correctly in the P&L dashboard!

Try refreshing the P&L tab - your data should now appear! 🎉

