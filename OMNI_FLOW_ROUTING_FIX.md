# Omni Flow Routing Issue - email_custom Not Being Recognized

**Issue:** When sending multiple hidden prechat fields, Salesforce Omni Flow is not recognizing `email_custom` field (which worked when it was the only field).

---

## Problem Analysis

### What Was Working
```javascript
// BEFORE - Single field (WORKED)
embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
  email_custom: 'dogz@mailinator.com'
});
```
✅ Omni Flow recognized `email_custom`

### What Stopped Working
```javascript
// NOW - Multiple fields (NOT WORKING)
embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
  email: 'dogz@mailinator.com',
  email_custom: 'dogz@mailinator.com',
  FirstName: 'Chat',
  LastName: 'TestUser',
  Subject: 'Chat Inquiry from Website',
  chat_source__c: 'Website'
});
```
❌ Omni Flow NOT recognizing `email_custom` (or any fields)

---

## Root Cause

**Issue:** Salesforce Embedded Messaging has specific requirements for field naming and mapping when using multiple hidden prechat fields.

### Possible Causes:

#### 1. **Field Name Case Sensitivity**
Salesforce expects exact field API names. Check your Omni Flow routing configuration:
- Is it `email_custom` or `Email_custom__c`?
- Is it `FirstName` or `First_Name__c`?
- Custom fields need `__c` suffix

#### 2. **Routing Configuration Mismatch**
Your Omni Flow routing might be configured for:
- Different field names than what JavaScript is sending
- Only `email_custom` (not the other fields)

#### 3. **Missing Field Mapping**
With multiple fields, you might need to use `extraPrechatFormDetails` instead of just `setHiddenPrechatFields()`.

---

## Diagnostic Steps

### Step 1: Check Salesforce Routing Configuration

**In Salesforce:**
1. Go to **Setup** → **Messaging Settings** → **Embedded Service Deployments**
2. Find your deployment: `admission_github`
3. Click **Edit** → **Routing** tab
4. Check **Routing Configuration**

**What to look for:**
- What are the exact field API names configured?
- Is `email_custom` listed as a routing attribute?
- Are the other fields (`FirstName`, `LastName`, `Subject`, `chat_source__c`) configured?

**Take a screenshot of your Routing Configuration and share it.**

---

### Step 2: Check Field API Names

**Common Issues:**

| JavaScript Field | Might Need To Be | Reason |
|------------------|------------------|---------|
| `email_custom` | `email_custom__c` | Custom fields need __c suffix |
| `FirstName` | `First_Name__c` | API name might be different |
| `LastName` | `Last_Name__c` | API name might be different |
| `Subject` | `Subject__c` | Might be a custom field |
| `chat_source__c` | ✅ Correct | Already has __c suffix |

---

### Step 3: Test with ONLY email_custom Again

Let's confirm it still works alone:

**Temporarily change code to:**
```javascript
// Test: Send ONLY email_custom (like before)
const hiddenFields = {
  email_custom: prechatData.email
};
embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);
```

**Does this work?**
- ✅ YES → Field name is correct, issue is with multiple fields
- ❌ NO → Something else changed

---

## Solutions

### Solution 1: Use Correct Field API Names (Most Likely Fix)

If your Salesforce org expects custom field names with `__c` suffix:

```javascript
function getHiddenFieldsForMode() {
  if (isAuthenticatedMode) {
    return {
      email_custom__c: prechatData.email,           // Added __c
      First_Name__c: prechatData.firstName,         // Changed to API name
      Last_Name__c: prechatData.lastName,           // Changed to API name
      Subject__c: prechatData.subject,              // Added __c if custom
      chat_source__c: prechatData.chat_source__c   // Already correct
    };
  } else {
    return {
      chat_source__c: prechatData.chat_source__c
    };
  }
}
```

**Note:** The exact field names depend on your Salesforce Omni Flow configuration.

---

### Solution 2: Use extraPrechatFormDetails for Complex Mapping

For multiple fields with proper mapping:

```javascript
// Set hidden fields
embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);

// ALSO set extra prechat form details (for proper routing)
embeddedservice_bootstrap.settings.extraPrechatFormDetails = [
  {
    label: 'Email',
    name: 'email_custom',
    value: prechatData.email,
    displayToAgent: true,
    transcriptFields: ['email_custom__c']  // Maps to Salesforce field
  },
  {
    label: 'First Name',
    name: 'FirstName',
    value: prechatData.firstName,
    displayToAgent: true,
    transcriptFields: ['First_Name__c']
  },
  {
    label: 'Last Name',
    name: 'LastName',
    value: prechatData.lastName,
    displayToAgent: true,
    transcriptFields: ['Last_Name__c']
  },
  {
    label: 'Subject',
    name: 'Subject',
    value: prechatData.subject,
    displayToAgent: true,
    transcriptFields: ['Subject__c']
  },
  {
    label: 'Chat Source',
    name: 'chat_source__c',
    value: prechatData.chat_source__c,
    displayToAgent: true,
    transcriptFields: ['chat_source__c']
  }
];
```

---

### Solution 3: Use Only Routing-Configured Fields

If your Omni Flow is only configured for certain fields:

```javascript
function getHiddenFieldsForMode() {
  if (isAuthenticatedMode) {
    // Send ONLY fields configured in Omni Flow routing
    return {
      email_custom: prechatData.email,
      chat_source__c: prechatData.chat_source__c
    };
  } else {
    return {
      chat_source__c: prechatData.chat_source__c
    };
  }
}
```

---

## Quick Test Code

Add this to your console to test field recognition:

```javascript
// Test 1: Single field (like before)
console.log('🧪 TEST 1: Single field (email_custom only)');
embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
  email_custom: 'test@example.com'
});

// Wait 2 seconds, then test multiple fields
setTimeout(() => {
  console.log('🧪 TEST 2: Multiple fields');
  embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({
    email_custom: 'test@example.com',
    FirstName: 'John',
    LastName: 'Doe',
    chat_source__c: 'Website'
  });
}, 2000);

// Check what was sent
setTimeout(() => {
  console.log('🔍 Checking prechatDebug:', window.prechatDebug);
}, 4000);
```

---

## What I Need From You

To provide the exact fix, please share:

### 1. **Salesforce Routing Configuration**
- Screenshot or details of your Omni Flow routing configuration
- What fields are configured as routing attributes?
- What are the exact field API names?

### 2. **Current Behavior**
When you send multiple fields now:
- Does the chat still route?
- What happens to the `email_custom` value?
- Can you see it in the conversation transcript?
- Can you see it in the routing work item?

### 3. **Network Request**
Open DevTools → Network tab → Find POST to `/conversation`:
- What does the `routingAttributes` object contain?
- Are all fields present in the payload?
- Share a screenshot or copy the payload

### 4. **Console Errors**
Any errors in the browser console when clicking the chat button?

---

## Expected Behavior

**When working correctly:**

**Console Log:**
```
✅ setHiddenPrechatFields() called:
   📋 Fields sent: {
     email_custom: "dogz@mailinator.com",
     FirstName: "Chat",
     LastName: "TestUser",
     Subject: "Chat Inquiry from Website",
     chat_source__c: "Website"
   }
```

**Network Request (POST /conversation):**
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

**In Salesforce (Omni Supervisor):**
- All fields visible in routing work item
- `email_custom` recognized by routing rules
- Conversation routed correctly based on fields

---

## Temporary Workaround

Until we identify the exact issue, use **ONLY** the fields that your Omni Flow is configured to recognize:

```javascript
function getHiddenFieldsForMode() {
  if (isAuthenticatedMode) {
    // Send only email_custom (what was working before)
    return {
      email_custom: prechatData.email,
      chat_source__c: prechatData.chat_source__c
    };
  } else {
    return {
      chat_source__c: prechatData.chat_source__c
    };
  }
}
```

This will restore functionality while we debug the multiple fields issue.

---

## Common Salesforce Field Naming Patterns

Standard fields (no __c):
- `Email`
- `FirstName`
- `LastName`
- `Subject`

Custom fields (with __c):
- `email_custom__c`
- `First_Name__c`
- `Last_Name__c`
- `Subject__c`
- `chat_source__c`

**Your Omni Flow routing configuration will tell you which pattern to use.**

---

## Next Steps

1. **Share your Salesforce routing configuration** (field API names)
2. **Test with single field again** to confirm it still works
3. **Check network request** to see if all fields are being sent
4. **I'll provide exact code fix** based on your configuration

---

**Created:** 2025-11-02
**Issue:** Omni Flow not recognizing email_custom when multiple fields sent
**Status:** 🔍 Investigating - need Salesforce configuration details
