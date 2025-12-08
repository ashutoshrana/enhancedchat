# Default Authenticated Mode - Implementation

## Change Summary
Changed the authentication mode default from **Unauthenticated** to **Authenticated** so all prechat fields are sent by default.

## Changes Made

### 1. JavaScript Variable Default
**Location:** [index.html:1216](index.html#L1216)

**Before:**
```javascript
let isAuthenticatedMode = false;  // Default: Unauthenticated
```

**After:**
```javascript
// Default: Authenticated mode (most users are logged in)
let isAuthenticatedMode = true;
```

### 2. HTML Checkbox Default State
**Location:** [index.html:742](index.html#L742)

**Before:**
```html
<input type="checkbox" id="authModeToggle" onchange="toggleAuthMode()">
```

**After:**
```html
<input type="checkbox" id="authModeToggle" onchange="toggleAuthMode()" checked>
```

### 3. Initial UI Display
**Location:** [index.html:737-739](index.html#L737-L739)

**Before:**
```html
<span id="authModeBadge" class="auth-mode-badge unauthenticated">Unauthenticated</span>
<small id="authModeDescription">Sending only email_custom (guest user)</small>
```

**After:**
```html
<span id="authModeBadge" class="auth-mode-badge authenticated">Authenticated</span>
<small id="authModeDescription">Sending all fields (_email, email_custom, _firstName, _lastName, subject)</small>
```

## Default Behavior

### On Page Load:
- ✅ Authentication checkbox is **CHECKED**
- ✅ Badge shows **"Authenticated"** (green)
- ✅ Description: "Sending all fields (_email, email_custom, _firstName, _lastName, subject)"
- ✅ `isAuthenticatedMode = true`

### Fields Sent by Default:
When user clicks "Chat Now" without changing anything:
```json
{
  "routingAttributes": {
    "_email": "dogz@mailinator.com",
    "email_custom": "dogz@mailinator.com",
    "_firstName": "Chat",
    "_lastName": "TestUser",
    "subject": "Chat Inquiry from Website"
  }
}
```

**Number of fields:** 5 (all fields)

### To Switch to Unauthenticated Mode:
Users can **uncheck** the toggle to switch to unauthenticated mode:
- Badge changes to **"Unauthenticated"** (gray)
- Description: "Sending only email_custom (guest user)"
- Only sends 1 field: `email_custom`

## Debug Logging Added

When clicking "Chat Now", console will show:

```
🖱️ CHAT BUTTON CLICKED
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

## Use Cases

### Typical User Flow (Authenticated - Default):
1. User lands on page
2. Page loads with authenticated mode ON by default
3. User clicks "Chat Now"
4. All 5 fields sent to Salesforce
5. Omni Flow routes based on email, name, subject

### Guest User Flow (Switch to Unauthenticated):
1. User lands on page
2. Admin unchecks the authentication toggle
3. Badge shows "Unauthenticated"
4. User clicks "Chat Now"
5. Only `email_custom` sent to Salesforce
6. Omni Flow routes based on email only

## Benefits

✅ **Most users are authenticated** - Default matches typical use case
✅ **Better routing** - Omni Flow receives all context fields by default
✅ **Improved user experience** - Names appear in agent console automatically
✅ **Flexibility maintained** - Can still switch to unauthenticated for guests
✅ **Better debugging** - Clear logs show mode and field count

## Testing

### Test 1: Default Authenticated Mode
1. Refresh the page
2. Verify checkbox is **checked**
3. Verify badge shows **"Authenticated"**
4. Click "Chat Now"
5. Check console - should see:
   - `isAuthenticatedMode = true`
   - `Number of fields = 5`
6. Check Network tab `/conversation` POST:
   - `routingAttributes` should have 5 fields

### Test 2: Switch to Unauthenticated
1. **Uncheck** the authentication toggle
2. Verify badge changes to **"Unauthenticated"**
3. Click "Chat Now"
4. Check console - should see:
   - `isAuthenticatedMode = false`
   - `Number of fields = 1`
5. Check Network tab:
   - `routingAttributes` should have only `email_custom`

### Test 3: Toggle Back to Authenticated
1. **Check** the authentication toggle again
2. Verify badge shows **"Authenticated"**
3. Click "Chat Now"
4. Should send all 5 fields again

## Related Files
- **Main Implementation:** [index.html](index.html)
- **Variable:** `isAuthenticatedMode` (line 1216)
- **Checkbox:** `authModeToggle` (line 742)
- **Function:** `getHiddenFieldsForMode()` (line 1249)

## Rollback Instructions

If you need to revert to unauthenticated default:

1. Change line 1216:
   ```javascript
   let isAuthenticatedMode = false;
   ```

2. Remove `checked` from line 742:
   ```html
   <input type="checkbox" id="authModeToggle" onchange="toggleAuthMode()">
   ```

3. Update initial badge (line 737):
   ```html
   <span id="authModeBadge" class="auth-mode-badge unauthenticated">Unauthenticated</span>
   ```

4. Update description (line 739):
   ```html
   <small id="authModeDescription">Sending only email_custom (guest user)</small>
   ```

## Status
✅ **IMPLEMENTED** - Authenticated mode is now the default

---
**Date Implemented:** 2025-11-05
**Default Mode:** Authenticated (all 5 fields sent)
**Fields Sent:** _email, email_custom, _firstName, _lastName, subject
