# Authentication Mode Fix - Prechat Fields

## Issue Summary
The button click handler was using **hardcoded email value** and ignoring the authentication mode toggle, causing all prechat fields to be overwritten regardless of the authentication checkbox state.

## Problem Location
**File:** `index.html`
**Lines:** 1441-1450 (before fix)

### Before Fix:
```javascript
const prechatFields = {
  email_custom: 'dogz@mailinator.com'  // HARDCODED!
};

embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(prechatFields);
```

**Issues:**
- ❌ Ignored authentication mode toggle
- ❌ Ignored user-edited prechat data
- ❌ Overwrote correct fields set in `onEmbeddedMessagingReady`
- ❌ Only sent `email_custom` with hardcoded value

## Solution Implemented

### After Fix:
```javascript
// Use getHiddenFieldsForMode() to respect authentication mode
const prechatFields = getHiddenFieldsForMode();

console.log('🔧 Setting prechat fields RIGHT BEFORE launch...');
console.log('🔐 Mode:', isAuthenticatedMode ? 'Authenticated (all fields)' : 'Unauthenticated (chat_source__c only)');
console.log('📋 Fields:', JSON.stringify(prechatFields, null, 2));

embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(prechatFields);
```

**Benefits:**
- ✅ Respects authentication mode toggle
- ✅ Uses current prechat data (from editor or defaults)
- ✅ Sends appropriate fields based on mode
- ✅ Better error tracking with authMode in debug logs

## Expected Behavior After Fix

### When Authentication Checkbox is UNCHECKED (Unauthenticated Mode):
**Fields Sent:**
```javascript
{
  chat_source__c: 'Website'  // Only chat source
}
```

**Use Case:** Guest users, no personal data available

---

### When Authentication Checkbox is CHECKED (Authenticated Mode):
**Fields Sent:**
```javascript
{
  email: 'user@example.com',
  email_custom: 'user@example.com',
  FirstName: 'John',
  LastName: 'Doe',
  Subject: 'Chat Inquiry from Website',
  chat_source__c: 'Website'
}
```

**Use Case:** Logged-in users with available profile data

## Function Reference

### `getHiddenFieldsForMode()`
Located at lines 1248-1266 in `index.html`

```javascript
function getHiddenFieldsForMode() {
  if (isAuthenticatedMode) {
    // Authenticated: Send all fields (user is logged in, we have their data)
    return {
      email: prechatData.email,
      email_custom: prechatData.email,
      FirstName: prechatData.firstName,
      LastName: prechatData.lastName,
      Subject: prechatData.subject,
      chat_source__c: prechatData.chat_source__c
    };
  } else {
    // Unauthenticated: Only send chat_source__c (guest user)
    return {
      chat_source__c: prechatData.chat_source__c
    };
  }
}
```

## Testing Instructions

### Test 1: Unauthenticated Mode
1. Ensure authentication checkbox is **UNCHECKED**
2. Open browser console
3. Click "Chat Now" button
4. Verify console logs show:
   ```
   🔐 Mode: Unauthenticated (chat_source__c only)
   📋 Fields: { "chat_source__c": "Website" }
   ```

### Test 2: Authenticated Mode
1. **CHECK** the authentication checkbox
2. Edit prechat fields (optional)
3. Click "Chat Now" button
4. Verify console logs show:
   ```
   🔐 Mode: Authenticated (all fields)
   📋 Fields: {
     "email": "user@example.com",
     "email_custom": "user@example.com",
     "FirstName": "John",
     "LastName": "Doe",
     "Subject": "Chat Inquiry from Website",
     "chat_source__c": "Website"
   }
   ```

### Test 3: Mode Switching
1. Start with checkbox UNCHECKED
2. CHECK the checkbox
3. Click "Chat Now" → Should send all fields
4. End chat
5. UNCHECK the checkbox
6. Click "Chat Now" → Should send only chat_source__c

## Debug Logging Improvements

The fix also adds better debug tracking:

```javascript
window.prechatDebug.attempts.push({
  timing: 'Before launchChat()',
  fields: prechatFields,
  authMode: isAuthenticatedMode ? 'authenticated' : 'unauthenticated',  // NEW
  success: true,
  time: new Date().toISOString()
});
```

Now you can check `window.prechatDebug.attempts` in console to see exactly which mode was used for each chat launch.

## Related Files
- **Main Implementation:** [index.html](index.html)
- **Duplicate Code Analysis:** [DUPLICATE_CODE_ANALYSIS.md](DUPLICATE_CODE_ANALYSIS.md)

## Status
✅ **FIXED** - Authentication mode toggle now properly controls which prechat fields are sent to Salesforce.

---
**Date Fixed:** 2025-11-05
**Location:** index.html:1441-1469
