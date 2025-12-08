# Authenticated Mode Not Sending All Fields - Debug Guide

## Issue Observed
From the screenshot, we can see:
- **UI shows:** "Authentication Mode: AUTHENTICATED - All prechat fields will be sent"
- **Prechat data contains all fields correctly:**
  ```javascript
  {
    email: 'dogz@mailinator.com',
    firstName: 'Chat',
    lastName: 'TestUser',
    subject: 'Chat Inquiry from Website',
    chat_source__c: 'Website'
  }
  ```
- **BUT payload only sends:**
  ```json
  {
    "routingAttributes": {
      "email_custom": "dogz@mailinator.com"
    }
  }
  ```

This means only 1 field is being sent instead of 5 fields expected in authenticated mode.

## Root Cause Analysis

The `isAuthenticatedMode` variable is `false` when the button is clicked, even though the UI shows "Authenticated".

### Possible Causes:

#### 1. Variable Not Syncing with Checkbox State
The variable `isAuthenticatedMode` might not be updating when the checkbox is toggled.

#### 2. Page Refresh After Toggling
If the page is refreshed after checking the authentication toggle, the checkbox state is lost (no persistence).

#### 3. Timing Issue
The checkbox might be checked visually but the event handler didn't fire to update the variable.

## Debug Steps Added

I've added debug logging to the button click handler to diagnose the issue:

```javascript
// Debug: Check authentication mode state
console.log('🔍 DEBUG: isAuthenticatedMode =', isAuthenticatedMode);
console.log('🔍 DEBUG: Checkbox checked =', document.getElementById('authModeToggle').checked);
console.log('🔍 DEBUG: Number of fields =', Object.keys(prechatFields).length);
```

## What to Check Next

### Step 1: Check Console Logs
When you click "Chat Now", look for these debug logs:

**Expected if authenticated:**
```
🔍 DEBUG: isAuthenticatedMode = true
🔍 DEBUG: Checkbox checked = true
🔍 DEBUG: Number of fields = 5
🔐 Mode: Authenticated (all fields)
📋 Fields: {
  "_email": "dogz@mailinator.com",
  "email_custom": "dogz@mailinator.com",
  "_firstName": "Chat",
  "_lastName": "TestUser",
  "subject": "Chat Inquiry from Website"
}
```

**If you see this (BUG):**
```
🔍 DEBUG: isAuthenticatedMode = false  ❌ WRONG!
🔍 DEBUG: Checkbox checked = true     ← Checkbox IS checked
🔍 DEBUG: Number of fields = 1        ❌ Only 1 field
🔐 Mode: Unauthenticated (email_custom only)
```

This would confirm: Checkbox is checked but `isAuthenticatedMode` variable is not synced.

### Step 2: Test Sequence

**Test A: Check the Box and Immediately Click Chat**
1. Refresh the page
2. Check the "Authentication Mode" toggle
3. Immediately click "Chat Now" (without refreshing)
4. Check console logs

**Test B: Check if Page Was Refreshed**
1. Did you refresh the page AFTER checking the authentication toggle?
2. If yes, the checkbox state is lost (we need to add persistence)

## Likely Issue: Page Refresh Loses Checkbox State

Based on your screenshot showing "Authenticated" but only sending 1 field, I suspect:

1. You checked the authentication checkbox ✅
2. You refreshed the page 🔄
3. The visual UI text might have been cached/persisted somewhere
4. But the actual checkbox state (`<input>`) was reset to unchecked
5. So `isAuthenticatedMode = false` but UI shows "Authenticated"

### Quick Fix Test:

Run this in browser console to manually set the mode and test:

```javascript
// Manually set authenticated mode
isAuthenticatedMode = true;

// Click the chat button
document.getElementById('capellaChatBtn').click();

// Check the payload - should now have 5 fields
```

## Permanent Solution Options

### Option 1: Check Checkbox State Directly in getHiddenFieldsForMode()
Instead of relying on the `isAuthenticatedMode` variable, read the checkbox directly:

```javascript
function getHiddenFieldsForMode() {
  // Always read current checkbox state
  const isAuthenticated = document.getElementById('authModeToggle').checked;

  if (isAuthenticated) {
    return {
      _email: prechatData.email,
      email_custom: prechatData.email,
      _firstName: prechatData.firstName,
      _lastName: prechatData.lastName,
      subject: prechatData.subject
    };
  } else {
    return {
      email_custom: prechatData.email
    };
  }
}
```

### Option 2: Add localStorage Persistence
Save checkbox state to localStorage so it persists across page refreshes:

```javascript
function toggleAuthMode() {
  isAuthenticatedMode = document.getElementById('authModeToggle').checked;

  // Save to localStorage
  localStorage.setItem('authMode', isAuthenticatedMode);

  // ... rest of function
}

// On page load, restore from localStorage
window.addEventListener('DOMContentLoaded', () => {
  const savedAuthMode = localStorage.getItem('authMode');
  if (savedAuthMode !== null) {
    isAuthenticatedMode = savedAuthMode === 'true';
    document.getElementById('authModeToggle').checked = isAuthenticatedMode;
    toggleAuthMode(); // Update UI
  }
});
```

### Option 3: Default to Authenticated Mode
If most users should be authenticated, change the default:

```javascript
// Change from:
let isAuthenticatedMode = false;

// To:
let isAuthenticatedMode = true;

// And update the HTML checkbox to be checked by default:
<input type="checkbox" id="authModeToggle" onchange="toggleAuthMode()" checked>
```

## Immediate Action Required

**Please check the browser console logs when clicking "Chat Now" and report:**

1. What does `🔍 DEBUG: isAuthenticatedMode =` show?
2. What does `🔍 DEBUG: Checkbox checked =` show?
3. What does `🔍 DEBUG: Number of fields =` show?

This will tell us whether:
- Variable is not syncing with checkbox (need Option 1)
- Page refresh is losing state (need Option 2)
- Default should be authenticated (need Option 3)

## Related Files
- **Main Implementation:** [index.html](index.html)
- **Function to Check:** `getHiddenFieldsForMode()` (line 1249)
- **Variable Declaration:** `isAuthenticatedMode` (line 1215)
- **Toggle Function:** `toggleAuthMode()` (line 1218)

---
**Issue Date:** 2025-11-05
**Status:** 🔍 INVESTIGATING - Need console log output to confirm root cause
