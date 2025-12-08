# Fix: Send ALL Prechat Fields to Salesforce

**Issue:** Only `email_custom` was being sent, missing FirstName, LastName, Subject, and chat_source__c
**Commit:** 3524e4e
**Date:** 2025-11-02

## Problem

The prechat editor was only sending the email field:

```javascript
// BEFORE (❌ Only email)
embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
  email_custom: prechatData.email
});
```

**Result:** Only email was passed to Salesforce. FirstName, LastName, Subject, and chat_source__c were missing!

## Solution

Updated to send ALL prechat fields:

```javascript
// AFTER (✅ All fields)
const hiddenFields = {
  email_custom: prechatData.email,
  FirstName: prechatData.firstName,
  LastName: prechatData.lastName,
  Subject: prechatData.subject,
  chat_source__c: prechatData.chat_source__c
};

embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);
```

## Changes Made

### 1. Updated prechatData Object

Added `chat_source__c` field:

```javascript
let prechatData = {
  email: 'dogz@mailinator.com',
  firstName: 'Chat',
  lastName: 'TestUser',
  subject: 'Chat Inquiry from Website',
  chat_source__c: 'Website' // NEW!
};
```

### 2. Updated setHiddenPrechatFields Calls

**In `onEmbeddedMessagingReady` event:**
```javascript
const hiddenFields = {
  email_custom: prechatData.email,
  FirstName: prechatData.firstName,
  LastName: prechatData.lastName,
  Subject: prechatData.subject,
  chat_source__c: prechatData.chat_source__c
};

embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);
```

**In `savePrechatInfo()` function:**
```javascript
if (embeddedservice_bootstrap?.prechatAPI) {
  const hiddenFields = {
    email_custom: prechatData.email,
    FirstName: prechatData.firstName,
    LastName: prechatData.lastName,
    Subject: prechatData.subject,
    chat_source__c: prechatData.chat_source__c
  };
  embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);
}
```

### 3. Added Chat Source Field to Editor

Added dropdown select in modal:

```html
<div class="form-group">
  <label for="edit_chat_source">Chat Source (chat_source__c)</label>
  <select id="edit_chat_source">
    <option value="Website">Website</option>
    <option value="Mobile App">Mobile App</option>
    <option value="Email">Email</option>
    <option value="Social Media">Social Media</option>
    <option value="Other">Other</option>
  </select>
</div>
```

### 4. Updated Display

Added 5th field to prechat info box:

```html
<div class="prechat-value-item">
  <div class="prechat-value-label">Chat Source (chat_source__c)</div>
  <div class="prechat-value-text" id="display_chat_source">Website</div>
</div>
```

### 5. Enhanced Console Logging

Now shows ALL fields being sent:

```javascript
console.log('✅ setHiddenPrechatFields() called with ALL fields:');
console.log('   📧 email_custom:', prechatData.email);
console.log('   👤 FirstName:', prechatData.firstName);
console.log('   👤 LastName:', prechatData.lastName);
console.log('   📝 Subject:', prechatData.subject);
console.log('   🌐 chat_source__c:', prechatData.chat_source__c);
```

## Verification Steps

### Step 1: Check Console Logs

1. Reload: https://ashutoshrana.github.io/enhancedchat/
2. Open console (F12)
3. Look for:

```
✅ setHiddenPrechatFields() called with ALL fields:
   📧 email_custom: dogz@mailinator.com
   👤 FirstName: Chat
   👤 LastName: TestUser
   📝 Subject: Chat Inquiry from Website
   🌐 chat_source__c: Website
```

### Step 2: Check prechatDebug

Run in console:

```javascript
console.log(window.prechatDebug.attempts[0].fields);
```

**Expected Output:**
```javascript
{
  email_custom: "dogz@mailinator.com",
  FirstName: "Chat",
  LastName: "TestUser",
  Subject: "Chat Inquiry from Website",
  chat_source__c: "Website"
}
```

### Step 3: Test Editor

1. Click "✏️ Edit" button
2. Verify you see 5 fields:
   - Email
   - First Name
   - Last Name
   - Subject
   - Chat Source (dropdown)
3. Change values and save
4. Verify all 5 display values update

### Step 4: Verify Network Request

1. Open DevTools → Network tab
2. Filter: `conversation`
3. Click Salesforce chat button
4. Find POST request
5. Check Payload contains ALL fields:

```json
{
  "routingAttributes": {
    "email_custom": "dogz@mailinator.com",
    "FirstName": "Chat",
    "LastName": "TestUser",
    "Subject": "Chat Inquiry from Website",
    "chat_source__c": "Website"
  }
}
```

## Field Mapping

| prechatData Field | Salesforce Field | Type | Description |
|-------------------|------------------|------|-------------|
| `email` | `email_custom` | String | Email address (custom hidden field) |
| `firstName` | `FirstName` | String | Contact first name |
| `lastName` | `LastName` | String | Contact last name |
| `subject` | `Subject` | String | Chat subject/reason |
| `chat_source__c` | `chat_source__c` | String | Custom field tracking chat origin |

## Expected Console Output

### On Page Load:

```
🚀 Initializing Salesforce Embedded Messaging...
📋 Org ID: 00DEc00000GfZ2M
...
========================================
✅ EVENT: onEmbeddedMessagingReady FIRED
========================================
🔧 Setting hidden prechat fields...
📋 Using prechat data: {
  email: "dogz@mailinator.com",
  firstName: "Chat",
  lastName: "TestUser",
  subject: "Chat Inquiry from Website",
  chat_source__c: "Website"
}
✅ setHiddenPrechatFields() called with ALL fields:
   📧 email_custom: dogz@mailinator.com
   👤 FirstName: Chat
   👤 LastName: TestUser
   📝 Subject: Chat Inquiry from Website
   🌐 chat_source__c: Website
```

### After Editing:

```
📝 Prechat editor opened

(User makes changes)

💾 Prechat info saved: {
  email: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  subject: "Test Chat",
  chat_source__c: "Mobile App"
}
✅ Updated ALL hidden prechat fields: {
  email_custom: "test@example.com",
  FirstName: "John",
  LastName: "Doe",
  Subject: "Test Chat",
  chat_source__c: "Mobile App"
}
```

## Testing Script

Run this in console after page loads:

```javascript
// Verify all fields are being sent
const attempt = window.prechatDebug.attempts[0];
const fields = attempt?.fields || {};

console.log('\n🧪 PRECHAT FIELDS VERIFICATION:');
console.log('================================');

const requiredFields = [
  'email_custom',
  'FirstName',
  'LastName',
  'Subject',
  'chat_source__c'
];

let allPresent = true;
requiredFields.forEach(field => {
  const present = field in fields;
  const status = present ? '✅' : '❌';
  console.log(`${status} ${field}: ${fields[field] || 'MISSING'}`);
  if (!present) allPresent = false;
});

console.log('================================');
if (allPresent) {
  console.log('🎉 ALL FIELDS PRESENT!');
} else {
  console.log('⚠️ MISSING FIELDS!');
}
```

**Expected Output:**
```
🧪 PRECHAT FIELDS VERIFICATION:
================================
✅ email_custom: dogz@mailinator.com
✅ FirstName: Chat
✅ LastName: TestUser
✅ Subject: Chat Inquiry from Website
✅ chat_source__c: Website
================================
🎉 ALL FIELDS PRESENT!
```

## Chat Source Options

The dropdown provides these options:

- **Website** (default) - Chat initiated from website
- **Mobile App** - Chat from mobile application
- **Email** - Chat triggered from email link
- **Social Media** - Chat from social media platform
- **Other** - Other sources

You can add more options by editing the select dropdown in index.html.

## Summary

✅ **Fixed Issues:**
- Now sending ALL 5 prechat fields (was only sending 1)
- Added chat_source__c tracking field
- Editor now includes all fields
- Display shows all 5 values
- Console logs show all fields being sent

✅ **What Works Now:**
- Email → `email_custom` ✅
- First Name → `FirstName` ✅
- Last Name → `LastName` ✅
- Subject → `Subject` ✅
- Chat Source → `chat_source__c` ✅

---

**Last Updated:** 2025-11-02
**Commit:** 3524e4e
**Status:** ✅ Fixed and Deployed
