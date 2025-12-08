# Routing Attributes Empty - Debug Guide

## Issue
The Salesforce conversation payload shows **empty routing attributes**:

```json
{
  "routingAttributes": {},
  "conversationId": "c505908f-a708-4659-b873-57c5addad87c",
  "language": "en_US"
}
```

This means none of the prechat fields (email_custom, email, FirstName, LastName, Subject, chat_source__c) are being sent to Salesforce for routing.

## Possible Causes

### 1. Channel Variable Name Mismatch
The field names used in `setHiddenPrechatFields()` must **EXACTLY match** the Channel Variable Names configured in Salesforce Omni Flow.

**Check Required:**
- Go to Salesforce Setup → Omni-Channel Settings → Routing Configuration
- Verify Channel Variable Names for your chat deployment
- Ensure they match EXACTLY (case-sensitive)

**Current Field Names Being Sent:**
```javascript
// Unauthenticated mode:
{
  chat_source__c: 'Website'
}

// Authenticated mode:
{
  email: 'user@example.com',
  email_custom: 'user@example.com',
  FirstName: 'John',
  LastName: 'Doe',
  Subject: 'Chat Inquiry from Website',
  chat_source__c: 'Website'
}
```

### 2. Timing Issue - API Called Too Early
`setHiddenPrechatFields()` might be called before Salesforce is ready to accept them.

**Current Timing:**
1. ✅ Called in `onEmbeddedMessagingReady` event (line 1384)
2. ✅ Called in button click handler before launch (line 1449)

### 3. Field Name Case Sensitivity
Salesforce field names are **case-sensitive**. Common mismatches:

| Code | Salesforce Might Expect |
|------|------------------------|
| `FirstName` | `firstName` or `first_name` |
| `LastName` | `lastName` or `last_name` |
| `Subject` | `subject` |
| `email` | `Email` or `EMAIL` |

### 4. Custom Field API Name Format
Custom fields in Salesforce must use API name format with `__c` suffix.

**Current:** `chat_source__c` ✅ (correct format)

But check if Salesforce expects:
- `chat_source__c` (current)
- `ChatSource__c` (PascalCase)
- `Chat_Source__c` (with capital letters)

## Debug Steps

### Step 1: Check Console Logs
Open browser console and check for these logs when clicking "Chat Now":

```javascript
// Should see:
🔧 Setting prechat fields RIGHT BEFORE launch...
🔐 Mode: Authenticated (all fields) OR Unauthenticated (chat_source__c only)
📋 Fields: { ... }
✅ setHiddenPrechatFields() called successfully
```

**Run this in console:**
```javascript
// Check what was sent
window.prechatDebug.attempts
```

### Step 2: Verify Salesforce Channel Configuration

1. Go to **Salesforce Setup**
2. Search for **"Embedded Service Deployments"**
3. Open your chat deployment
4. Go to **"Omni-Channel Routing"** section
5. Check **"Channel Variable Names"** - they must match your field names EXACTLY

### Step 3: Test with Only One Field
Temporarily test with just one field to isolate the issue:

```javascript
// In getHiddenFieldsForMode() function (line 1249)
// Temporarily change to:
function getHiddenFieldsForMode() {
  return {
    email_custom: 'test@example.com'
  };
}
```

If this one field works, then:
- ✅ API timing is correct
- ✅ Connection is working
- ❌ Other field names are incorrect

### Step 4: Check Embedded Messaging Settings
Verify in Salesforce Setup:

1. **Embedded Service Deployment** → Your Chat Deployment
2. **Pre-Chat** section → Check if "Collect user data before starting chat" is enabled
3. **Routing Attributes** → Verify which fields are configured

## Common Salesforce Field Name Formats

Based on Salesforce documentation, try these field name variations:

### Option 1: camelCase (Most Common)
```javascript
{
  email: 'user@example.com',
  emailCustom: 'user@example.com',  // Changed from email_custom
  firstName: 'John',                 // Changed from FirstName
  lastName: 'Doe',                   // Changed from LastName
  subject: 'Chat Inquiry',          // Changed from Subject
  chatSource: 'Website'             // Changed from chat_source__c
}
```

### Option 2: snake_case
```javascript
{
  email: 'user@example.com',
  email_custom: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe',
  subject: 'Chat Inquiry',
  chat_source: 'Website'
}
```

### Option 3: Salesforce Custom Field Format
```javascript
{
  Email__c: 'user@example.com',
  Email_Custom__c: 'user@example.com',
  First_Name__c: 'John',
  Last_Name__c: 'Doe',
  Subject__c: 'Chat Inquiry',
  Chat_Source__c: 'Website'
}
```

## Quick Fix to Test

### Test 1: Check Previous Working Configuration
You mentioned `email_custom` was working earlier. Let's verify what changed:

**Was the old working code using:**
```javascript
{
  email_custom: 'value'  // This worked before
}
```

**And now using:**
```javascript
{
  email: 'value',
  email_custom: 'value',
  FirstName: 'value',
  // ... more fields
}
```

**The issue:** Adding multiple fields broke routing. This suggests:
1. Field names are wrong for the new fields
2. OR Salesforce Omni Flow doesn't have all fields configured

### Test 2: Revert to Single Field
Try reverting to ONLY email_custom (which you said worked):

```javascript
function getHiddenFieldsForMode() {
  return {
    email_custom: prechatData.email
  };
}
```

If this works again, then the problem is with the additional field names.

## Solution Path

### Immediate Action Required:
**Please provide the following information:**

1. **Check Salesforce Setup:**
   - What are the exact Channel Variable Names in your Omni Flow configuration?
   - Screenshot or list of configured routing attributes

2. **Check Console Output:**
   - What does `window.prechatDebug.attempts` show?
   - What fields are logged before `launchChat()`?

3. **Previous Working Config:**
   - What field names were used when only email_custom worked?
   - Was chat_source__c being sent successfully?

### Expected Fix:
Once we know the correct Salesforce field names, we'll update `getHiddenFieldsForMode()` function to use the exact names Salesforce expects.

## Status
🔍 **INVESTIGATING** - Need Salesforce Omni Flow configuration details to fix field name mismatch

---
**Issue Date:** 2025-11-05
**Symptom:** Empty routingAttributes in conversation payload
**Likely Cause:** Field name mismatch with Salesforce Channel Variable Names
