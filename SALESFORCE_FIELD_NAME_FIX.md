# Salesforce Field Name Fix - Routing Attributes Empty Issue

## Issue Summary
**Problem:** `routingAttributes` were empty in Salesforce conversation payload
**Root Cause:** Field names in code didn't match Salesforce Channel Variable Names exactly

## Payload Before Fix:
```json
{
  "routingAttributes": {},  ❌ EMPTY!
  "conversationId": "c505908f-a708-4659-b873-57c5addad87c",
  "language": "en_US"
}
```

## Salesforce Channel Variable Names (From Screenshot)

### Custom Parameters:
| Parameter Name | Channel Variable Name | Data Type |
|---------------|----------------------|-----------|
| email_custom | `email_custom` | String |

### Parameter Mappings:
| Parameter Name | Parameter API Name | Channel Variable Name | Flow Variable Name |
|---------------|-------------------|----------------------|-------------------|
| First Name | `_FirstName` | `_firstName` | FirstName |
| Last Name | `_LastName` | `_lastName` | LastName |
| Email | `_Email` | `_email` | Email |
| Subject | `_Subject` | `subject` | Subject |
| email_custom | `email_custom` | `email_custom` | email_custom |

## Field Name Mismatches Found

| Code Was Sending | Salesforce Expected | Status |
|-----------------|-------------------|--------|
| `FirstName` | `_firstName` | ❌ WRONG |
| `LastName` | `_lastName` | ❌ WRONG |
| `email` | `_email` | ❌ WRONG |
| `Subject` | `subject` | ❌ WRONG (case) |
| `email_custom` | `email_custom` | ✅ CORRECT |
| `chat_source__c` | *not configured* | ❌ MISSING |

## Solution Implemented

### Updated `getHiddenFieldsForMode()` Function
**Location:** [index.html:1249-1267](index.html#L1249-L1267)

#### Before Fix:
```javascript
function getHiddenFieldsForMode() {
  if (isAuthenticatedMode) {
    return {
      email: prechatData.email,              // ❌ Wrong - Salesforce expects: _email
      email_custom: prechatData.email,       // ✅ Correct
      FirstName: prechatData.firstName,      // ❌ Wrong - Salesforce expects: _firstName
      LastName: prechatData.lastName,        // ❌ Wrong - Salesforce expects: _lastName
      Subject: prechatData.subject,          // ❌ Wrong - Salesforce expects: subject
      chat_source__c: prechatData.chat_source__c  // ❌ Not configured in Salesforce
    };
  } else {
    return {
      chat_source__c: prechatData.chat_source__c  // ❌ Not configured
    };
  }
}
```

#### After Fix:
```javascript
function getHiddenFieldsForMode() {
  if (isAuthenticatedMode) {
    // Authenticated: Send all fields (user is logged in, we have their data)
    // Field names MUST match Salesforce Channel Variable Names exactly
    return {
      _email: prechatData.email,           // ✅ Matches Salesforce: _email
      email_custom: prechatData.email,     // ✅ Matches Salesforce: email_custom
      _firstName: prechatData.firstName,   // ✅ Matches Salesforce: _firstName
      _lastName: prechatData.lastName,     // ✅ Matches Salesforce: _lastName
      subject: prechatData.subject         // ✅ Matches Salesforce: subject (lowercase)
    };
  } else {
    // Unauthenticated: Only send email_custom (guest user)
    return {
      email_custom: prechatData.email      // ✅ Matches Salesforce: email_custom
    };
  }
}
```

## Key Changes

### 1. Field Names Corrected:
- `email` → `_email` (added underscore prefix)
- `FirstName` → `_firstName` (added underscore, changed case)
- `LastName` → `_lastName` (added underscore, changed case)
- `Subject` → `subject` (lowercase)
- `email_custom` → unchanged ✅

### 2. Removed chat_source__c:
- **Reason:** Not configured in Salesforce Parameter Mappings
- **Impact:** Can't route based on chat source until added to Salesforce

### 3. Updated Unauthenticated Mode:
- **Before:** Sent `chat_source__c` (not configured)
- **After:** Sends `email_custom` (properly configured)

## Expected Payload After Fix

### Unauthenticated Mode (Checkbox UNCHECKED):
```json
{
  "routingAttributes": {
    "email_custom": "user@example.com"
  },
  "conversationId": "...",
  "language": "en_US"
}
```

### Authenticated Mode (Checkbox CHECKED):
```json
{
  "routingAttributes": {
    "_email": "user@example.com",
    "email_custom": "user@example.com",
    "_firstName": "John",
    "_lastName": "Doe",
    "subject": "Chat Inquiry from Website"
  },
  "conversationId": "...",
  "language": "en_US"
}
```

## UI Updates

### Authentication Toggle Description Updated:

**Before:**
- Unauthenticated: "Sending only chat_source__c (guest user)"
- Authenticated: "Sending all fields (email, email_custom, FirstName, LastName, Subject, chat_source__c)"

**After:**
- Unauthenticated: "Sending only email_custom (guest user)"
- Authenticated: "Sending all fields (_email, email_custom, _firstName, _lastName, subject)"

## Console Log Updates

Updated all console logs to reflect correct field names:

**Before:**
```
🔐 Mode: Authenticated (all fields)
📧 email: user@example.com
👤 FirstName: John
👤 LastName: Doe
📝 Subject: Chat Inquiry
🌐 chat_source__c: Website
```

**After:**
```
🔐 Mode: Authenticated (all fields)
📧 _email: user@example.com
📧 email_custom: user@example.com
👤 _firstName: John
👤 _lastName: Doe
📝 subject: Chat Inquiry
```

## Adding chat_source__c (Optional Future Enhancement)

If you want to add `chat_source__c` for routing, you need to:

### Step 1: Add to Salesforce
1. Go to **Setup** → **Embedded Service Deployments**
2. Edit your deployment
3. Under **Parameter Mappings**, click **New**
4. Add:
   - **Parameter Name:** Chat Source
   - **Parameter API Name:** `_ChatSource` or `chat_source`
   - **Channel Variable Name:** `chat_source__c`
   - **Flow Variable Name:** ChatSource

### Step 2: Update Code
```javascript
function getHiddenFieldsForMode() {
  if (isAuthenticatedMode) {
    return {
      _email: prechatData.email,
      email_custom: prechatData.email,
      _firstName: prechatData.firstName,
      _lastName: prechatData.lastName,
      subject: prechatData.subject,
      chat_source__c: prechatData.chat_source__c  // ADD THIS
    };
  } else {
    return {
      email_custom: prechatData.email,
      chat_source__c: prechatData.chat_source__c  // ADD THIS
    };
  }
}
```

## Testing Instructions

### Test 1: Unauthenticated Mode
1. Ensure checkbox is UNCHECKED
2. Open browser console
3. Click "Chat Now"
4. Check console for:
   ```
   🔐 Mode: Unauthenticated (email_custom only)
   📋 Fields: { "email_custom": "..." }
   ```
5. Check Network tab for `/conversation` POST:
   ```json
   {
     "routingAttributes": {
       "email_custom": "..."
     }
   }
   ```

### Test 2: Authenticated Mode
1. CHECK the authentication checkbox
2. Optionally edit prechat fields
3. Click "Chat Now"
4. Check console for:
   ```
   🔐 Mode: Authenticated (all fields)
   📋 Fields: {
     "_email": "...",
     "email_custom": "...",
     "_firstName": "...",
     "_lastName": "...",
     "subject": "..."
   }
   ```
5. Check Network tab - should see all 5 fields in `routingAttributes`

### Test 3: Omni Flow Routing
1. Start a chat in authenticated mode
2. Verify Omni Flow receives routing attributes:
   - Check Omni Flow debug logs in Salesforce
   - Verify routing works based on email/subject/name
3. Verify case/work record is created with correct field values

## Debug Commands

Run in browser console to verify:

```javascript
// Check what fields were sent
window.prechatDebug.attempts

// Should see entries like:
// {
//   timing: "Before launchChat()",
//   fields: {
//     _email: "...",
//     email_custom: "...",
//     _firstName: "...",
//     _lastName: "...",
//     subject: "..."
//   },
//   authMode: "authenticated",
//   success: true
// }
```

## Important Notes

1. **Field names are case-sensitive** - `_firstName` ≠ `_FirstName`
2. **Underscore prefix matters** - `_email` ≠ `email`
3. **Must match Salesforce exactly** - Check Channel Variable Name column in Salesforce
4. **Not all fields need __c suffix** - Only custom Salesforce fields use `__c`

## Related Files
- **Main Implementation:** [index.html](index.html)
- **Function Updated:** `getHiddenFieldsForMode()` (lines 1249-1267)
- **Previous Debug Doc:** [ROUTING_ATTRIBUTES_EMPTY_DEBUG.md](ROUTING_ATTRIBUTES_EMPTY_DEBUG.md)

## Status
✅ **FIXED** - Field names now match Salesforce Channel Variable Names exactly

---
**Date Fixed:** 2025-11-05
**Issue:** Empty routingAttributes in Salesforce payload
**Root Cause:** Field name mismatch
**Solution:** Updated field names to match Salesforce configuration exactly
