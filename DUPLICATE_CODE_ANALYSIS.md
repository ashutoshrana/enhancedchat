# Duplicate Code Analysis - Hidden Prechat Fields

**Issue:** Multiple places in index.html are setting hidden prechat fields with duplicate code and potentially conflicting values.

---

## Problem Summary

There are **4 different places** where `setHiddenPrechatFields()` is called, and they're sending **different field values**:

### Location 1: toggleAuthMode() - Line 1240
**Context:** When user toggles authentication mode
**Fields Sent:** Uses `getHiddenFieldsForMode()`
- Authenticated: email, email_custom, FirstName, LastName, Subject, chat_source__c
- Unauthenticated: chat_source__c only

```javascript
// Line 1236-1245 in toggleAuthMode()
if (typeof embeddedservice_bootstrap !== 'undefined' && embeddedservice_bootstrap.prechatAPI) {
  try {
    const hiddenFields = getHiddenFieldsForMode();
    embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);
    console.log('✅ Updated hidden prechat fields based on authentication mode:', hiddenFields);
  } catch (e) {
    console.warn('⚠️ Could not update hidden prechat fields:', e);
  }
}
```

---

### Location 2: savePrechatInfo() - Line 1318
**Context:** When user saves prechat editor changes
**Fields Sent:** Uses `getHiddenFieldsForMode()`
- Authenticated: email, email_custom, FirstName, LastName, Subject, chat_source__c
- Unauthenticated: chat_source__c only

```javascript
// Line 1314-1324 in savePrechatInfo()
if (typeof embeddedservice_bootstrap !== 'undefined' && embeddedservice_bootstrap.prechatAPI) {
  try {
    const hiddenFields = getHiddenFieldsForMode();
    embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);
    console.log('✅ Updated hidden prechat fields:', hiddenFields);
    console.log('   Mode:', isAuthenticatedMode ? 'Authenticated (all fields)' : 'Unauthenticated (chat_source__c only)');
  } catch (e) {
    console.warn('⚠️ Could not update hidden prechat fields:', e);
  }
}
```

---

### Location 3: onEmbeddedMessagingReady Event - Line 1384 ⭐ MAIN
**Context:** When Salesforce chat loads (this is the primary place)
**Fields Sent:** Uses `getHiddenFieldsForMode()`
- Authenticated: email, email_custom, FirstName, LastName, Subject, chat_source__c
- Unauthenticated: chat_source__c only

```javascript
// Line 1380-1406 in onEmbeddedMessagingReady event
try {
  // Get hidden fields based on authentication mode
  const hiddenFields = getHiddenFieldsForMode();

  embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);

  console.log('✅ setHiddenPrechatFields() called:');
  console.log('   🔐 Mode:', isAuthenticatedMode ? 'Authenticated (all fields)' : 'Unauthenticated (chat_source__c only)');
  console.log('   📋 Fields sent:', hiddenFields);

  if (isAuthenticatedMode) {
    console.log('   📧 email:', prechatData.email);
    console.log('   📧 email_custom:', prechatData.email);
    console.log('   👤 FirstName:', prechatData.firstName);
    console.log('   👤 LastName:', prechatData.lastName);
    console.log('   📝 Subject:', prechatData.subject);
  }
  console.log('   🌐 chat_source__c:', prechatData.chat_source__c);

  window.prechatDebug.attempts.push({
    timing: 'onEmbeddedMessagingReady',
    fields: hiddenFields,
    prechatData: { ...prechatData },
    authMode: isAuthenticatedMode ? 'authenticated' : 'unauthenticated',
    success: true,
    time: new Date().toISOString()
  });
} catch (err) {
  console.error('❌ Error setting prechat fields:', err);
}
```

---

### Location 4: Custom Chat Button Click - Line 1450 ⚠️ CONFLICT!
**Context:** Right before launching chat when custom button is clicked
**Fields Sent:** HARDCODED - Only `email_custom: 'dogz@mailinator.com'`

```javascript
// Line 1434-1461 in custom button click handler
customBtn.addEventListener('click', () => {
  console.log('🖱️ CHAT BUTTON CLICKED');

  // CRITICAL: Set prechat fields RIGHT BEFORE launching chat
  const prechatFields = {
    email_custom: 'dogz@mailinator.com'  // ⚠️ HARDCODED!
  };

  console.log('🔧 Setting email_custom field RIGHT BEFORE launch...');
  console.log('📋 Fields:', JSON.stringify(prechatFields, null, 2));

  try {
    // Set prechat fields immediately before launching
    embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(prechatFields);
    console.log('✅ setHiddenPrechatFields({ email_custom: "dogz@mailinator.com" }) called');

    window.prechatDebug.attempts.push({
      timing: 'Before launchChat()',
      fields: prechatFields,
      success: true,
      time: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error setting prechat before launch:', err);
  }

  // Small delay to ensure prechat data is processed
  setTimeout(() => {
    embeddedservice_bootstrap.utilAPI.launchChat();
  }, 100);
});
```

---

## The Conflict

### What's Happening:

1. **onEmbeddedMessagingReady** (Line 1384) sets fields based on authentication mode
   - Authenticated: Sends 6 fields (email, email_custom, FirstName, LastName, Subject, chat_source__c)
   - Unauthenticated: Sends 1 field (chat_source__c)

2. **Custom Button Click** (Line 1450) **OVERRIDES** everything with hardcoded value
   - Always sends ONLY: `{ email_custom: 'dogz@mailinator.com' }`
   - Ignores authentication mode
   - Ignores user-edited values from prechat editor
   - Hardcoded email address

### Result:
**Location 4 WINS** because it's called last (right before chat launch), so it overwrites everything set by Locations 1-3.

---

## Why This Is a Problem

### Issue 1: Hardcoded Email
Location 4 uses a **hardcoded email** (`dogz@mailinator.com`) instead of using the `prechatData.email` variable that can be edited by the user.

### Issue 2: Ignores Authentication Mode
Location 4 doesn't check `isAuthenticatedMode`, so it always sends the same field regardless of whether user is authenticated or not.

### Issue 3: Overrides User Edits
If user edits their prechat information (using the editor), Location 4 ignores those changes and sends the hardcoded value.

### Issue 4: Missing Fields
Location 4 only sends `email_custom`, but based on authentication mode, it should send:
- **Authenticated:** email, email_custom, FirstName, LastName, Subject, chat_source__c
- **Unauthenticated:** chat_source__c

---

## Solution

### Option 1: Remove Location 4 (Custom Button Handler)
**Remove the duplicate code from the custom button click handler** and rely on Location 3 (onEmbeddedMessagingReady) which already sets the fields correctly.

**Change this:**
```javascript
// Line 1434-1461 - REMOVE THIS ENTIRE BLOCK
customBtn.addEventListener('click', () => {
  const prechatFields = {
    email_custom: 'dogz@mailinator.com'
  };
  embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(prechatFields);
  setTimeout(() => {
    embeddedservice_bootstrap.utilAPI.launchChat();
  }, 100);
});
```

**To this:**
```javascript
// Line 1434+ - SIMPLIFIED
customBtn.addEventListener('click', () => {
  console.log('🖱️ CHAT BUTTON CLICKED');
  console.log('📋 Using prechat fields already set in onEmbeddedMessagingReady');

  // No need to set fields again - already set in onEmbeddedMessagingReady
  embeddedservice_bootstrap.utilAPI
    .launchChat()
    .then(() => {
      console.log('✅ Chat launched successfully');
    })
    .catch((err) => {
      console.error('❌ Error launching chat:', err);
    });
});
```

---

### Option 2: Use getHiddenFieldsForMode() in Location 4
**Keep Location 4 but use the proper function** instead of hardcoded values:

```javascript
// Line 1434+ - USE PROPER FUNCTION
customBtn.addEventListener('click', () => {
  console.log('🖱️ CHAT BUTTON CLICKED');

  // Get fields based on current authentication mode
  const hiddenFields = getHiddenFieldsForMode();

  console.log('🔧 Setting prechat fields before launch...');
  console.log('📋 Fields:', hiddenFields);
  console.log('   Mode:', isAuthenticatedMode ? 'Authenticated' : 'Unauthenticated');

  try {
    embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);
    console.log('✅ Prechat fields set before launch');
  } catch (err) {
    console.error('❌ Error setting prechat before launch:', err);
  }

  // Launch chat
  setTimeout(() => {
    embeddedservice_bootstrap.utilAPI
      .launchChat()
      .then(() => {
        console.log('✅ Chat launched successfully');
      })
      .catch((err) => {
        console.error('❌ Error launching chat:', err);
      });
  }, 100);
});
```

---

## Recommendation: **Option 1 (Remove Duplicate)**

**Reason:**
- Fields are already set correctly in `onEmbeddedMessagingReady` (Location 3)
- No need to set them again on button click
- Reduces code duplication
- Eliminates risk of conflicts
- Simpler and cleaner

The `onEmbeddedMessagingReady` event fires **before** the button is created, so the fields are already set when the user clicks the button.

---

## Current Field Flow

```
Page Load
    ↓
onEmbeddedMessagingReady fires (Location 3)
    ↓
setHiddenPrechatFields() called with getHiddenFieldsForMode()
    ↓
Fields stored in Salesforce chat widget
    ↓
User clicks chat button
    ↓
Custom button handler (Location 4) ⚠️ OVERWRITES with hardcoded value
    ↓
launchChat()
    ↓
Fields sent to Salesforce (wrong values!)
```

---

## Proposed Field Flow (After Fix)

```
Page Load
    ↓
onEmbeddedMessagingReady fires (Location 3)
    ↓
setHiddenPrechatFields() called with getHiddenFieldsForMode()
    ↓
Fields stored in Salesforce chat widget
    ↓
[User edits prechat info - optional]
    ↓
[savePrechatInfo() updates fields - optional]
    ↓
User clicks chat button
    ↓
Custom button handler just launches chat (no field changes)
    ↓
launchChat()
    ↓
Fields sent to Salesforce (correct values!)
```

---

## Summary of All Locations

| Location | Line | Context | Fields Sent | Issue |
|----------|------|---------|-------------|-------|
| 1 | 1240 | Toggle auth mode | Uses getHiddenFieldsForMode() | ✅ OK - Updates when mode changes |
| 2 | 1318 | Save prechat editor | Uses getHiddenFieldsForMode() | ✅ OK - Updates when user edits |
| 3 | 1384 | onEmbeddedMessagingReady | Uses getHiddenFieldsForMode() | ✅ OK - Primary setup |
| 4 | 1450 | Custom button click | Hardcoded email_custom only | ❌ BAD - Overwrites everything! |

---

## Implementation Plan

### Step 1: Remove Location 4 (Custom Button Handler Duplicate)
Remove lines 1439-1461 (the hardcoded prechat setting)

### Step 2: Simplify Custom Button Handler
Keep only the chat launch logic

### Step 3: Test
1. Load page
2. Check console - fields set in onEmbeddedMessagingReady
3. Click chat button
4. Verify correct fields sent to Salesforce (check Network tab)
5. Edit prechat info
6. Click chat button again
7. Verify updated fields sent

---

**Created:** 2025-11-02
**Issue:** Duplicate setHiddenPrechatFields() calls causing conflicts
**Root Cause:** Custom button click handler (Location 4) overwrites fields with hardcoded value
**Solution:** Remove duplicate code from Location 4, rely on Location 3
**Impact:** Fixes issue where email_custom is always "dogz@mailinator.com" regardless of user input
