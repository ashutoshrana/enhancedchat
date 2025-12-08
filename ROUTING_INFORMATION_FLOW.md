# How Routing Information is Sent - Complete Flow

## Overview
Routing information (prechat fields) are sent to Salesforce when a conversation is created. Here's the complete sequence of events and API calls.

## The Flow - Step by Step

### Step 1: Setting Hidden Prechat Fields
**API Method:** `embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields()`

This method stores the routing attributes in Salesforce's client-side SDK. It does NOT send data to the server yet.

**When it's called:**
1. **On chat ready:** [index.html:1387](index.html#L1387) - `onEmbeddedMessagingReady` event
2. **On mode toggle:** [index.html:1240](index.html#L1240) - When user changes auth mode
3. **After edit:** [index.html:1321](index.html#L1321) - When user edits prechat fields
4. **Before launch:** [index.html:1451](index.html#L1451) - Right before `launchChat()` is called

```javascript
// Example from button click handler
const prechatFields = getHiddenFieldsForMode();
embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(prechatFields);
```

**Important:** This is a **client-side only** operation. The fields are stored in memory/local storage but not sent to Salesforce yet.

---

### Step 2: Launching the Chat
**API Method:** `embeddedservice_bootstrap.utilAPI.launchChat()`

This opens the chat window but still doesn't send routing data yet.

**Location:** [index.html:1486](index.html#L1486)

```javascript
embeddedservice_bootstrap.utilAPI
  .launchChat()
  .then(() => {
    console.log('✅ Chat launched successfully');
  })
  .catch((e) => {
    console.error('❌ Launch Chat failed:', e);
  });
```

**What happens:**
- Chat iframe opens
- Salesforce Embedded Messaging client initializes
- User sees the chat interface
- **But no server request yet**

---

### Step 3: Conversation Creation - THE CRITICAL MOMENT
**HTTP Request:** `POST /conversation`

This is when routing attributes are actually sent to Salesforce!

**Triggered by:** User's first message OR automatic conversation start

**When:** After chat opens, when conversation needs to be created with Salesforce servers

**Request Payload:**
```json
{
  "routingAttributes": {
    "_email": "dogz@mailinator.com",
    "email_custom": "dogz@mailinator.com",
    "_firstName": "Chat",
    "_lastName": "TestUser",
    "subject": "Chat Inquiry from Website",
    "chat_source__c": "Website"
  },
  "conversationId": "c505908f-a708-4659-b873-57c5addad87c",
  "language": "en_US",
  "capabilitiesVersion": "1"
}
```

**Destination:** `https://[salesforce-domain]/embeddedservice/conversation`

**Method:** POST

**Headers:**
- `Content-Type: application/json`
- `X-LIVEAGENT-API-VERSION: 48`
- Various Salesforce authentication headers

---

### Step 4: Event Fired - onEmbeddedMessagingConversationStarted
**Event:** `onEmbeddedMessagingConversationStarted`

**Location:** [index.html:1500](index.html#L1500)

**When:** After the `/conversation` POST succeeds and conversation is created

```javascript
window.addEventListener('onEmbeddedMessagingConversationStarted', (event) => {
  console.log('💬 EVENT: onEmbeddedMessagingConversationStarted');
  console.log('Event details:', event.detail);

  // At this point, routing attributes have been sent!
  // Omni Flow has received them and is processing routing
});
```

**Event Details:**
```javascript
{
  conversationId: "c505908f-a708-4659-b873-57c5addad87c",
  conversationButtonId: "...",
  // Other metadata
}
```

**Important:** By the time this event fires, the routing attributes have ALREADY been sent to Salesforce in the `/conversation` POST request.

---

## Complete Timeline Visualization

```
[1] User clicks "Chat Now" button
        ↓
[2] setHiddenPrechatFields() called
    - Fields stored in SDK memory
    - No server request yet
        ↓
[3] launchChat() called
    - Chat window opens
    - Salesforce client initializes
    - No server request yet
        ↓
[4] User types first message OR auto-start
        ↓
[5] ⭐ POST /conversation HTTP REQUEST ⭐
    - routingAttributes sent in payload
    - Conversation created on Salesforce server
    - Omni Flow receives routing attributes
    - Routing logic executes
        ↓
[6] ✅ Server responds: Conversation created
        ↓
[7] 🔔 onEmbeddedMessagingConversationStarted EVENT FIRES
    - Conversation is now active
    - Agent can be assigned
    - Chat messages can flow
```

---

## The Critical POST /conversation Request

### Intercepted in Code
**Location:** [index.html:958](index.html#L958)

We intercept this request to log the routing attributes:

```javascript
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const url = args[0];
  const options = args[1];

  if (url && url.includes('/conversation') && options && options.body) {
    try {
      const body = JSON.parse(options.body);
      console.log('🌐 NETWORK: POST /conversation');
      console.log('📤 Payload:', JSON.stringify(body, null, 2));

      if (body.routingAttributes && Object.keys(body.routingAttributes).length > 0) {
        console.log('✅ routingAttributes FOUND:', body.routingAttributes);
      } else if (body.conversationId) {
        console.log('❌ routingAttributes EMPTY in conversation creation request');
      }
    } catch (e) {}
  }

  return originalFetch.apply(this, args);
};
```

### What Gets Logged in Console

**Successful routing attributes:**
```
🌐 NETWORK: POST /conversation
📤 Payload: {
  "routingAttributes": {
    "_email": "dogz@mailinator.com",
    "email_custom": "dogz@mailinator.com",
    "_firstName": "Chat",
    "_lastName": "TestUser",
    "subject": "Chat Inquiry from Website",
    "chat_source__c": "Website"
  },
  "conversationId": "c505908f-a708-4659-b873-57c5addad87c",
  "language": "en_US"
}
✅ routingAttributes FOUND: {...}
```

**Empty routing attributes (problem):**
```
🌐 NETWORK: POST /conversation
📤 Payload: {
  "routingAttributes": {},
  "conversationId": "c505908f-a708-4659-b873-57c5addad87c",
  "language": "en_US"
}
❌ routingAttributes EMPTY in conversation creation request
```

---

## Events Timeline

### 1. onEmbeddedMessagingReady
**When:** Salesforce chat SDK is loaded and ready
**Purpose:** Set initial prechat fields
**Location:** [index.html:1362](index.html#L1362)

```javascript
window.addEventListener('onEmbeddedMessagingReady', () => {
  console.log('🚀 Salesforce Embedded Messaging SDK is ready!');

  const hiddenFields = getHiddenFieldsForMode();
  embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);

  console.log('✅ Initial prechat fields set');
});
```

**Status:** Routing attributes stored in client, NOT sent to server yet.

---

### 2. onEmbeddedMessagingButtonCreated
**When:** Chat button is created in DOM
**Purpose:** Set up custom button click handler
**Location:** [index.html:1425](index.html#L1425)

```javascript
window.addEventListener('onEmbeddedMessagingButtonCreated', () => {
  console.log('✅ Chat button created - ready to launch');

  // Custom button click handler added here
});
```

**Status:** Button ready, but no chat started yet.

---

### 3. [User Action] Button Click
**When:** User clicks "Chat Now" button
**Purpose:** Set prechat fields one final time before launch
**Location:** [index.html:1436](index.html#L1436)

```javascript
customBtn.addEventListener('click', () => {
  console.log('🖱️ CHAT BUTTON CLICKED');

  // Set fields RIGHT BEFORE launch (ensures latest values)
  const prechatFields = getHiddenFieldsForMode();
  embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(prechatFields);

  // Small delay, then launch
  setTimeout(() => {
    embeddedservice_bootstrap.utilAPI.launchChat();
  }, 100);
});
```

**Status:** Routing attributes refreshed, launching chat...

---

### 4. [Salesforce Internal] POST /conversation
**When:** Conversation needs to be created (after launchChat, when user sends message or auto-starts)
**Purpose:** Create conversation on Salesforce server with routing attributes
**Triggered by:** Salesforce SDK internally

**This is when routing attributes are SENT!**

Request:
```http
POST https://strategiced--qasf.sandbox.my.salesforce.com/embeddedservice/conversation
Content-Type: application/json

{
  "routingAttributes": {
    "_email": "dogz@mailinator.com",
    "email_custom": "dogz@mailinator.com",
    "_firstName": "Chat",
    "_lastName": "TestUser",
    "subject": "Chat Inquiry from Website",
    "chat_source__c": "Website"
  },
  "conversationId": "c505908f-a708-4659-b873-57c5addad87c",
  "language": "en_US"
}
```

Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "conversationId": "c505908f-a708-4659-b873-57c5addad87c",
  "status": "CREATED",
  ...
}
```

**Status:** Routing attributes sent to server! Omni Flow receives them!

---

### 5. onEmbeddedMessagingConversationStarted
**When:** After `/conversation` POST succeeds
**Purpose:** Notify that conversation is active
**Location:** [index.html:1500](index.html#L1500)

```javascript
window.addEventListener('onEmbeddedMessagingConversationStarted', (event) => {
  console.log('💬 EVENT: onEmbeddedMessagingConversationStarted');
  console.log('Event details:', event.detail);

  // Conversation is now live
  // Routing has been processed by Omni Flow
  // Agent may be assigned or queued
});
```

**Status:** Conversation active, routing complete!

---

## Key Points

### ✅ When Routing Attributes Are Sent:
**During the `POST /conversation` HTTP request** - This happens internally by Salesforce SDK after `launchChat()` is called.

### ❌ When They Are NOT Sent:
- During `setHiddenPrechatFields()` - just stores in memory
- During `launchChat()` - just opens the chat window
- During `onEmbeddedMessagingReady` - SDK initialization only

### 🔑 The Critical API Call:
```javascript
embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(fields);
```

**Must be called BEFORE** the `/conversation` POST request happens!

That's why we call it:
1. On ready (initial setup)
2. Before `launchChat()` (ensure latest values)

### 📍 Where to Debug:

**Check Browser Network Tab:**
1. Open DevTools → Network tab
2. Filter: `conversation`
3. Click "Chat Now"
4. Look for `POST /conversation`
5. Check "Payload" or "Request" tab
6. Verify `routingAttributes` object has your fields

**Check Console Logs:**
Look for:
```
🌐 NETWORK: POST /conversation
✅ routingAttributes FOUND: {...}
```

---

## Omni Flow Processing

After routing attributes are received by Salesforce:

1. **Omni Flow evaluates routing rules** based on the attributes
2. **Queue assignment** happens (if configured)
3. **Agent selection** begins
4. **Work item created** with routing attributes as fields
5. **Agent receives chat** with customer context from routing attributes

### Fields Appear in Agent Console:
- First Name: from `_firstName`
- Last Name: from `_lastName`
- Email: from `_email`
- Subject: from `subject`
- Custom fields: from `chat_source__c`, etc.

---

## Common Issues

### Issue 1: Empty routingAttributes
**Symptom:** `POST /conversation` has empty `routingAttributes: {}`

**Causes:**
- `setHiddenPrechatFields()` not called before conversation starts
- Field names don't match Salesforce Channel Variable Names
- `setHiddenPrechatFields()` called with empty object

**Fix:** Ensure fields are set before `launchChat()` and names match Salesforce exactly

### Issue 2: Fields Don't Match Salesforce
**Symptom:** Fields sent but Omni Flow doesn't receive them

**Causes:**
- Channel Variable Names don't match
- Case sensitivity issues (`FirstName` vs `_firstName`)
- Fields not configured in Salesforce Parameter Mappings

**Fix:** Match field names exactly to Salesforce configuration

### Issue 3: Timing Issues
**Symptom:** Intermittent - sometimes works, sometimes doesn't

**Causes:**
- Race condition between `setHiddenPrechatFields()` and conversation creation
- Rapid clicking causing multiple requests

**Fix:** Add delay between `setHiddenPrechatFields()` and `launchChat()` (we use 100ms)

---

## Testing Checklist

- [ ] Open Browser Network tab before clicking chat
- [ ] Click "Chat Now"
- [ ] Verify `POST /conversation` appears in Network tab
- [ ] Check request payload has `routingAttributes`
- [ ] Verify field count matches expected (6 for auth, 2 for unauth)
- [ ] Verify field names match Salesforce exactly
- [ ] Check console for `✅ routingAttributes FOUND`
- [ ] Verify `onEmbeddedMessagingConversationStarted` event fires
- [ ] Check Salesforce agent console shows customer info

---

## Summary

**The Answer to Your Question:**

**Event invoked:** No specific custom event triggers sending routing info

**When it's sent:** During the internal `POST /conversation` HTTP request made by Salesforce SDK

**How to detect:** Listen to the network request (we intercept `fetch`) or check the Network tab

**Event AFTER sending:** `onEmbeddedMessagingConversationStarted` fires after routing info is sent and conversation is created

**Key API method:** `setHiddenPrechatFields()` must be called BEFORE conversation creation to ensure fields are included in the `/conversation` POST request

---

## Related Files
- **Fetch Interception:** [index.html:958](index.html#L958)
- **Set Fields Before Launch:** [index.html:1451](index.html#L1451)
- **Launch Chat:** [index.html:1486](index.html#L1486)
- **Conversation Started Event:** [index.html:1500](index.html#L1500)

---
**Date:** 2025-11-05
**HTTP Endpoint:** `POST /embeddedservice/conversation`
**Critical API:** `embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields()`
**Detection:** Intercept `fetch()` or check Network tab for `/conversation` POST
