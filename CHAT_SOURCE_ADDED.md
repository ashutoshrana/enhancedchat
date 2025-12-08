# chat_source__c Field Added to Both Modes

## Change Summary
Added `chat_source__c` field to both **Authenticated** and **Unauthenticated** modes so chat source tracking is always included.

## Changes Made

### 1. Updated getHiddenFieldsForMode() Function
**Location:** [index.html:1250-1269](index.html#L1250-L1269)

#### Authenticated Mode (6 fields now):
```javascript
if (isAuthenticatedMode) {
  return {
    _email: prechatData.email,
    email_custom: prechatData.email,
    _firstName: prechatData.firstName,
    _lastName: prechatData.lastName,
    subject: prechatData.subject,
    chat_source__c: prechatData.chat_source__c  // ✅ ADDED
  };
}
```

#### Unauthenticated Mode (2 fields now):
```javascript
else {
  return {
    email_custom: prechatData.email,
    chat_source__c: prechatData.chat_source__c  // ✅ ADDED
  };
}
```

### 2. Updated UI Descriptions

**Initial Page Load:** [index.html:739](index.html#L739)
```html
<small id="authModeDescription">
  Sending all fields (_email, email_custom, _firstName, _lastName, subject, chat_source__c)
</small>
```

**Toggle Function:** [index.html:1228, 1233](index.html#L1228)
- **Authenticated:** "Sending all fields (..., chat_source__c)"
- **Unauthenticated:** "Sending email_custom and chat_source__c (guest user)"

### 3. Updated Console Logs

**onEmbeddedMessagingReady Event:** [index.html:1390-1403](index.html#L1390-L1403)
```javascript
// Authenticated mode logs:
console.log('   🌐 chat_source__c:', prechatData.chat_source__c);

// Unauthenticated mode logs:
console.log('   📧 email_custom:', prechatData.email);
console.log('   🌐 chat_source__c:', prechatData.chat_source__c);
```

**Button Click Handler:** [index.html:1454](index.html#L1454)
```javascript
console.log('🔐 Mode:', isAuthenticatedMode ?
  'Authenticated (all fields)' :
  'Unauthenticated (email_custom + chat_source__c)');
```

## Expected Payloads

### Authenticated Mode (Default):
```json
{
  "routingAttributes": {
    "_email": "dogz@mailinator.com",
    "email_custom": "dogz@mailinator.com",
    "_firstName": "Chat",
    "_lastName": "TestUser",
    "subject": "Chat Inquiry from Website",
    "chat_source__c": "Website"
  }
}
```
**Field Count:** 6 fields

### Unauthenticated Mode:
```json
{
  "routingAttributes": {
    "email_custom": "dogz@mailinator.com",
    "chat_source__c": "Website"
  }
}
```
**Field Count:** 2 fields

## Benefits

✅ **Chat source always tracked** - Can route/report by source in both modes
✅ **Better analytics** - Know where all chats originate from
✅ **Consistent tracking** - No gaps in source attribution
✅ **Omni Flow routing** - Can route by chat source for all users

## Salesforce Configuration Note

⚠️ **Important:** For `chat_source__c` to work in Salesforce Omni Flow routing, you need to add it to your Parameter Mappings:

1. Go to **Setup** → **Embedded Service Deployments**
2. Edit your chat deployment
3. Under **Parameter Mappings** → Click **New**
4. Add these details:
   - **Parameter Name:** Chat Source
   - **Parameter API Name:** `chat_source` or `_ChatSource`
   - **Channel Variable Name:** `chat_source__c` (must match exactly!)
   - **Data Type:** String
   - **Flow Variable Name:** ChatSource

**Without this configuration:** The field will be sent but Salesforce will ignore it for routing.

**With this configuration:** You can route chats based on source (e.g., "Website" vs "Application Portal" vs "Admission Center")

## Testing

### Test 1: Authenticated Mode (Default)
1. Refresh page (checkbox should be checked)
2. Click "Chat Now"
3. Check console logs:
   ```
   🔍 DEBUG: Number of fields = 6
   🌐 chat_source__c: Website
   ```
4. Check Network tab `/conversation` POST:
   - Should see `chat_source__c: "Website"` in routingAttributes

### Test 2: Unauthenticated Mode
1. Uncheck authentication toggle
2. Verify description shows: "Sending email_custom and chat_source__c"
3. Click "Chat Now"
4. Check console logs:
   ```
   🔍 DEBUG: Number of fields = 2
   📧 email_custom: dogz@mailinator.com
   🌐 chat_source__c: Website
   ```
5. Check Network tab:
   - Should see both `email_custom` and `chat_source__c`

### Test 3: Edit Chat Source
1. Click "Edit" button to open prechat editor
2. Change "Chat Source (chat_source__c)" from "Website" to something else (e.g., "Portal")
3. Click "Save"
4. Click "Chat Now"
5. Verify `chat_source__c: "Portal"` is sent in payload

## Use Cases

### Use Case 1: Route by Source
Omni Flow can now route based on chat source:
- **Website** chats → General support queue
- **Application Portal** chats → Admissions team
- **Admission Center** chats → Enrollment advisors

### Use Case 2: Reporting
Track which sources generate the most chats:
- Create Salesforce reports on chat volume by source
- Identify high-value traffic sources
- Optimize marketing spend based on chat conversions

### Use Case 3: Guest User Tracking
Even for unauthenticated/guest users, you can:
- Know where they came from (`chat_source__c`)
- Have their email for follow-up (`email_custom`)
- Route appropriately without full user details

## Console Logs Summary

**Authenticated Mode:**
```
✅ setHiddenPrechatFields() called:
   🔐 Mode: Authenticated (all fields)
   📋 Fields sent: {...}
   📧 _email: dogz@mailinator.com
   📧 email_custom: dogz@mailinator.com
   👤 _firstName: Chat
   👤 _lastName: TestUser
   📝 subject: Chat Inquiry from Website
   🌐 chat_source__c: Website
```

**Unauthenticated Mode:**
```
✅ setHiddenPrechatFields() called:
   🔐 Mode: Unauthenticated (email_custom + chat_source__c)
   📋 Fields sent: {...}
   📧 email_custom: dogz@mailinator.com
   🌐 chat_source__c: Website
```

## Related Files
- **Main Implementation:** [index.html](index.html)
- **Function:** `getHiddenFieldsForMode()` (line 1250)
- **Field Definition:** `chat_source__c` in `prechatData` (line 1211)

## Field Count Changes

| Mode | Before | After | Change |
|------|--------|-------|--------|
| **Authenticated** | 5 fields | 6 fields | Added chat_source__c |
| **Unauthenticated** | 1 field | 2 fields | Added chat_source__c |

## Status
✅ **IMPLEMENTED** - chat_source__c now sent in both authenticated and unauthenticated modes

---
**Date Implemented:** 2025-11-05
**Field Added:** `chat_source__c` (case-sensitive, with double underscore and c suffix)
**Modes:** Both authenticated and unauthenticated
**Default Value:** "Website" (editable via prechat editor)
