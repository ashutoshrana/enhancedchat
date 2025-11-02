# Salesforce Enhanced Web Chat - Complete Implementation Guide (2025)

**Last Updated:** November 1, 2025
**API Version:** 65.0 (Winter '26)
**Documentation Source:** Salesforce Developer Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Complete Event Reference](#complete-event-reference)
3. [utilAPI Methods Reference](#utilapi-methods-reference)
4. [Routing and Agent Availability Detection](#routing-and-agent-availability-detection)
5. [Implementation Best Practices](#implementation-best-practices)
6. [Web-to-Case Fallback Integration](#web-to-case-fallback-integration)
7. [Known Limitations and Considerations](#known-limitations-and-considerations)
8. [Your Current Implementation Analysis](#your-current-implementation-analysis)

---

## Overview

### What is Enhanced Web Chat?

Enhanced Web Chat (formerly Messaging for In-App & Web - MIAW) is Salesforce's modern asynchronous messaging platform that replaces Legacy Chat (scheduled for retirement on February 14, 2026).

### Key Features

- **Asynchronous Conversations**: Conversations can be picked up at any time
- **JavaScript APIs**: Extensive customization capabilities
- **Lightning Web Components**: Build custom UI components
- **User Verification**: Authenticated user support
- **Hidden Pre-Chat**: Send context data without user input
- **Server-Sent Events (SSE)**: Real-time event streaming

### Architecture

```
Browser Client
    ↓
Enhanced Web Chat Widget (embeddedservice_bootstrap)
    ↓
Salesforce Messaging Platform
    ↓
Omni-Channel Routing → Agents/Bots
```

---

## Complete Event Reference

### Event Listeners (27 Total)

All events are registered using `window.addEventListener('eventName', handler)`.

#### 1. Business Hours Events (3)

| Event | When Fired | Data Provided |
|-------|------------|---------------|
| `onEmbeddedMessagingBusinessHoursEnded` | Current time falls outside business hours | None |
| `onEmbeddedMessagingBusinessHoursStarted` | Page transitions into business hours | None |
| `onEmbeddedMessagingWithinBusinessHours` | Page loads during business hours | None |

**Example:**
```javascript
window.addEventListener('onEmbeddedMessagingBusinessHoursEnded', () => {
    console.log('Outside business hours - show fallback form');
    showWebToCaseForm();
});
```

#### 2. Button & Interaction Events (2)

| Event | When Fired | Data Provided |
|-------|------------|---------------|
| `onEmbeddedMessagingButtonCreated` | Chat button added to site | None |
| `onEmbeddedMessagingButtonClicked` | First user click of chat button | None |

**Example:**
```javascript
window.addEventListener('onEmbeddedMessagingButtonCreated', () => {
    console.log('Chat button ready');
    // Hide default button, show custom button
    embeddedservice_bootstrap.utilAPI.hideChatButton();
});
```

#### 3. Conversation Management Events (5)

| Event | When Fired | Data Provided |
|-------|------------|---------------|
| `onEmbeddedMessagingConversationStarted` | Conversation initiates | `{conversationId: "id"}` |
| `onEmbeddedMessagingConversationOpened` | Conversation loads in browser | SSE Payload |
| `onEmbeddedMessagingConversationClosed` | User closes conversation | SSE Payload |
| `onEmbeddedMessagingConversationRouted` | Routing/transfer events | **SSE Payload (see below)** |
| `onEmbeddedMessagingConversationParticipantChanged` | Internal users join/leave | SSE Payload |

**Critical: onEmbeddedMessagingConversationRouted Example:**
```javascript
window.addEventListener('onEmbeddedMessagingConversationRouted', (event) => {
    console.log('Routing event:', event.detail);

    const payload = event?.detail || {};

    // Check for routing failure
    const failed =
        payload?.success === false ||
        payload?.status === 'Failed' ||
        payload?.routingResult?.isSuccessful === false ||
        payload?.routingOutcome === 'UNSUCCESSFUL' ||
        payload?.error?.type === 'NO_AGENT_AVAILABLE' ||
        payload?.error?.message?.toLowerCase()?.includes('no agent');

    if (failed) {
        console.log('❌ Routing failed - no agents available');
        showWebToCaseForm();
    } else {
        console.log('✅ Routing successful - agent assigned');
    }
});
```

#### 4. Message Events (4)

| Event | When Fired | Data Provided |
|-------|------------|---------------|
| `onEmbeddedMessageSent` | Message submitted | SSE Payload |
| `onEmbeddedMessageDelivered` | Delivery receipt | SSE Payload |
| `onEmbeddedMessageRead` | Read receipt | SSE Payload |
| `onEmbeddedMessageLinkClicked` | User clicks conversation link | Link data |

#### 5. User Verification & Session Events (3)

| Event | When Fired | Data Provided |
|-------|------------|---------------|
| `onEmbeddedMessagingIdentityTokenExpired` | Authorization/identity tokens expire | None |
| `onEmbeddedMessagingReady` | API available for method calls | None |
| `onEmbeddedMessagingSessionStatusUpdate` | Status changes | SSE Payload: "Waiting", "Active", or "Ended" |

**Critical: onEmbeddedMessagingReady Example:**
```javascript
window.addEventListener('onEmbeddedMessagingReady', () => {
    console.log('API ready - can now call utilAPI methods');

    // Set hidden pre-chat data
    embeddedservice_bootstrap.utilAPI.setHiddenPrechatFields({
        'Contact.Email': 'user@example.com',
        'Contact.FirstName': 'John',
        'Case.Subject': 'Support Request'
    });
});
```

#### 6. Pre-Chat & Invitation Events (4)

| Event | When Fired | Data Provided |
|-------|------------|---------------|
| `onEmbeddedMessagingPreChatLoaded` | Pre-chat form loads | `{prechatDisplay: "Conversation"/"Session"}` |
| `onEmbeddedMessagingPreChatSubmitted` | Pre-chat form submitted | `{prechatDisplay: "Conversation"/"Session"}` |
| `onEmbeddedMessagingInvitationShown` | Invitation displays | None |
| `onEmbeddedMessagingInvitationAccepted` | Invitation accepted | None |
| `onEmbeddedMessagingInvitationRejected` | Invitation rejected | None |

#### 7. Transcript Events (3)

| Event | When Fired | Data Provided |
|-------|------------|---------------|
| `onEmbeddedMessagingTranscriptRequested` | User requests transcript | `{conversationId: "id"}` |
| `onEmbeddedMessagingTranscriptDownloadSuccessful` | Transcript downloaded | `{conversationId: "id"}` |
| `onEmbeddedMessagingTranscriptRequestFailed` | Transcript request failed | `{conversationId: "id"}` |

#### 8. Window State Events (3)

| Event | When Fired | Data Provided |
|-------|------------|---------------|
| `onEmbeddedMessagingWindowClosed` | Close button clicked or clearSession | None |
| `onEmbeddedMessagingWindowMinimized` | Conversation window minimized | None |
| `onEmbeddedMessagingWindowMaximized` | Conversation window maximized | None |

---

## utilAPI Methods Reference

### Complete API Methods List

All methods are called via `embeddedservice_bootstrap.utilAPI.methodName()`.

#### 1. launchChat()

**Description:** Launches the web chat client with messaging window maximized.

**Signature:**
```javascript
embeddedservice_bootstrap.utilAPI.launchChat(): Promise
```

**Returns:** Promise object with event handlers

**Example:**
```javascript
embeddedservice_bootstrap.utilAPI.launchChat()
    .then(() => {
        console.log('✅ Chat launched successfully');
    })
    .catch((error) => {
        console.error('❌ Launch failed:', error);
        showWebToCaseForm();
    })
    .finally(() => {
        console.log('Launch attempt completed');
    });
```

**Requirements:**
- Must be called AFTER `onEmbeddedMessagingButtonCreated` event fires
- Should be triggered by user action (not automatically on page load)

#### 2. showChat()

**Description:** Shows the chat button.

**Signature:**
```javascript
embeddedservice_bootstrap.utilAPI.showChat(): void
```

**Notes:**
- Changes don't persist after page refresh
- Overrides business hours settings temporarily

**Example:**
```javascript
embeddedservice_bootstrap.utilAPI.showChat();
```

#### 3. hideChat()

**Description:** Hides the chat button.

**Signature:**
```javascript
embeddedservice_bootstrap.utilAPI.hideChat(): void
```

**Constraints:**
- Cannot hide while chat window is open
- Changes don't persist after page refresh

**Example:**
```javascript
// Hide Salesforce's default button, show custom button
window.addEventListener('onEmbeddedMessagingButtonCreated', () => {
    embeddedservice_bootstrap.utilAPI.hideChat();
    document.getElementById('myCustomButton').style.display = 'block';
});
```

#### 4. setSessionContext()

**Description:** Pass contextual information to agents (e.g., current page, search terms).

**Signature:**
```javascript
embeddedservice_bootstrap.utilAPI.setSessionContext(
    name: string,
    value: object
): void
```

**Parameters:**
- `name` (String): Context variable identifier (supports `_AgentContext`)
- `value` (Object): Contains `valueType` and structured data

**Supported Context Fields:**
- `currentPage` - Current webpage URL
- `search` - Object with `result`, `filters`, `facets` fields

**Example:**
```javascript
embeddedservice_bootstrap.utilAPI.setSessionContext('_AgentContext', {
    valueType: 'Context',
    value: {
        currentPage: window.location.href,
        search: {
            result: 'Product inquiry',
            filters: ['Category: Electronics'],
            facets: []
        }
    }
});
```

#### 5. clearAllEmbeddedMessagingComponents()

**Description:** Removes all Enhanced Web Chat components from page.

**Signature:**
```javascript
embeddedservice_bootstrap.utilAPI.clearAllEmbeddedMessagingComponents(): void
```

**Usage Notes:**
- Call `clearSession()` first for complete cleanup
- Use when completely removing chat from page

**Example:**
```javascript
// Complete cleanup
embeddedservice_bootstrap.utilAPI.clearSession();
embeddedservice_bootstrap.utilAPI.clearAllEmbeddedMessagingComponents();
```

#### 6. setHiddenPrechatFields()

**Description:** Send hidden pre-chat data to Salesforce without user input.

**Signature:**
```javascript
embeddedservice_bootstrap.utilAPI.setHiddenPrechatFields(
    fields: object
): void
```

**Requirements:**
- Must be called AFTER `onEmbeddedMessagingReady` event

**Example:**
```javascript
window.addEventListener('onEmbeddedMessagingReady', () => {
    embeddedservice_bootstrap.utilAPI.setHiddenPrechatFields({
        'Contact.Email': 'user@example.com',
        'Contact.FirstName': 'John',
        'Contact.LastName': 'Doe',
        'Case.Subject': 'Support Request from Website',
        'Case.Priority': 'Medium'
    });
});
```

#### 7. clearSession()

**Description:** Clears current session (authenticated and unauthenticated conversations).

**Signature:**
```javascript
embeddedservice_bootstrap.utilAPI.clearSession(): void
```

**Use Cases:**
- User logs out
- Routing fails and you want to reset
- Session cleanup before showing fallback

**Example:**
```javascript
window.addEventListener('onEmbeddedMessagingConversationRouted', (event) => {
    if (routingFailed(event.detail)) {
        embeddedservice_bootstrap.utilAPI.clearSession();
        showWebToCaseForm();
    }
});
```

---

## Routing and Agent Availability Detection

### Server-Sent Event: CONVERSATION_ROUTING_RESULT

The `onEmbeddedMessagingConversationRouted` event fires when routing occurs and provides detailed payload information.

### Routing Event Payload Structure

```javascript
{
    success: boolean,                    // true = successful, false = failed
    status: string,                      // "Success" | "Failed"
    routingResult: {
        isSuccessful: boolean,
        routingOutcome: string          // "SUCCESSFUL" | "UNSUCCESSFUL"
    },
    error: {
        type: string,                   // "NO_AGENT_AVAILABLE" | etc.
        message: string
    },
    conversationId: string,
    channelType: string,
    conversationEntry: {
        entryType: "RoutingResult",
        entryPayload: { ... }
    }
}
```

### Detection Strategies

#### Strategy 1: Event-Based Detection (Recommended)

```javascript
window.addEventListener('onEmbeddedMessagingConversationRouted', (event) => {
    const payload = event?.detail || {};

    // Multiple failure indicators
    const failed =
        payload?.success === false ||
        payload?.status === 'Failed' ||
        payload?.routingResult?.isSuccessful === false ||
        payload?.routingOutcome === 'UNSUCCESSFUL' ||
        payload?.error?.type === 'NO_AGENT_AVAILABLE' ||
        (payload?.error?.message?.toLowerCase() || '').includes('no agent');

    if (failed) {
        console.log('❌ No agents available');
        handleNoAgentsAvailable();
    }
});

function handleNoAgentsAvailable() {
    // Clear session
    try {
        embeddedservice_bootstrap.utilAPI?.clearSession?.();
    } catch (e) {}

    // Hide chat components
    hideAllChatElements();

    // Show fallback
    showWebToCaseForm();
}
```

#### Strategy 2: DOM Content Detection (Fallback)

When event doesn't fire reliably, scan for offline messages in the DOM:

```javascript
function checkForOfflineMessage() {
    // Check iframe content
    const iframes = document.querySelectorAll('iframe[src*="salesforce"]');

    for (let iframe of iframes) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const text = iframeDoc.body?.innerText || '';

            if (text.includes('No Agents Online') ||
                text.includes('No agents are available') ||
                text.includes('currently unavailable')) {
                return true;
            }
        } catch (e) {
            // Cross-origin, continue
        }
    }

    // Check messaging containers
    const containers = document.querySelectorAll(
        '.embeddedMessaging, [class*="messaging"]'
    );

    for (let container of containers) {
        const text = container.innerText || '';
        if (text.toLowerCase().includes('no agent')) {
            return true;
        }
    }

    return false;
}

// Monitor with MutationObserver
const observer = new MutationObserver(() => {
    if (checkForOfflineMessage()) {
        handleNoAgentsAvailable();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
```

#### Strategy 3: Session Status Monitoring

```javascript
window.addEventListener('onEmbeddedMessagingSessionStatusUpdate', (event) => {
    const status = event?.detail?.status;

    console.log('Session status:', status);

    if (status === 'Ended') {
        // Session ended - might be due to no agents
        // Check if conversation never started
        if (!conversationStarted) {
            console.log('Session ended before conversation start');
            handleNoAgentsAvailable();
        }
    }
});
```

### Combined Detection Pattern (Best Practice)

```javascript
let detectionActive = false;
let fallbackTriggered = false;
let conversationStarted = false;

// Enable detection ONLY after chat launch
function enableOfflineDetection() {
    detectionActive = true;
    fallbackTriggered = false;

    // Strategy 1: Event-based
    window.addEventListener('onEmbeddedMessagingConversationRouted', handleRoutingEvent);

    // Strategy 2: DOM-based (backup)
    startDOMMonitoring();

    // Strategy 3: Timeout (last resort)
    setTimeout(() => {
        if (detectionActive && !conversationStarted) {
            console.log('⏰ Timeout - no conversation started');
            triggerFallback();
        }
    }, 30000); // 30 seconds
}

function handleRoutingEvent(event) {
    const payload = event?.detail || {};

    if (isRoutingFailure(payload)) {
        triggerFallback();
    } else {
        conversationStarted = true;
        detectionActive = false; // Stop monitoring
    }
}

function isRoutingFailure(payload) {
    return (
        payload?.success === false ||
        payload?.status === 'Failed' ||
        payload?.routingResult?.isSuccessful === false ||
        payload?.routingOutcome === 'UNSUCCESSFUL' ||
        payload?.error?.type === 'NO_AGENT_AVAILABLE' ||
        (payload?.error?.message?.toLowerCase() || '').includes('no agent')
    );
}

function triggerFallback() {
    if (fallbackTriggered) return;

    fallbackTriggered = true;
    detectionActive = false;

    console.log('🚨 Triggering fallback');

    try {
        embeddedservice_bootstrap.utilAPI?.clearSession?.();
    } catch (e) {}

    hideAllChatElements();
    showWebToCaseForm();
}

// Mark conversation as started
window.addEventListener('onEmbeddedMessagingConversationStarted', () => {
    conversationStarted = true;
    detectionActive = false;
    fallbackTriggered = false;
});
```

---

## Implementation Best Practices

### 1. Initialization Sequence

**Correct Order:**
```javascript
// 1. Load bootstrap script
<script src="[deployment-url]/assets/js/bootstrap.min.js"
        onload="initEmbeddedMessaging()"
        onerror="handleBootstrapError()">
</script>

// 2. Initialize after script loads
function initEmbeddedMessaging() {
    embeddedservice_bootstrap.settings.language = 'en_US';

    embeddedservice_bootstrap.init(
        'YOUR_ORG_ID',
        'DEPLOYMENT_NAME',
        'DEPLOYMENT_URL',
        { scrt2URL: 'SCRT2_URL' }
    );
}

// 3. Wait for button creation
window.addEventListener('onEmbeddedMessagingButtonCreated', () => {
    // Now safe to use utilAPI
    setupCustomButton();
});

// 4. Wait for API ready
window.addEventListener('onEmbeddedMessagingReady', () => {
    // Now safe to set pre-chat data
    setHiddenPrechatData();
});

// 5. Launch chat on user action
customButton.addEventListener('click', () => {
    embeddedservice_bootstrap.utilAPI.launchChat()
        .then(() => {
            // Enable offline detection ONLY after launch
            enableOfflineDetection();
        });
});
```

### 2. Custom Button Implementation

**Best Practice Pattern:**
```javascript
// Hide Salesforce button, show custom button
window.addEventListener('onEmbeddedMessagingButtonCreated', () => {
    embeddedservice_bootstrap.utilAPI.hideChat();

    const customBtn = document.getElementById('customChatButton');
    customBtn.style.display = 'block';

    customBtn.addEventListener('click', () => {
        embeddedservice_bootstrap.utilAPI.launchChat()
            .then(() => {
                customBtn.style.display = 'none';
            })
            .catch((error) => {
                console.error('Launch failed:', error);
                showWebToCaseForm();
            });
    });
});

// Show custom button on minimize
window.addEventListener('onEmbeddedMessagingWindowMinimized', () => {
    document.getElementById('customChatButton').style.display = 'block';
});

// Hide custom button on maximize
window.addEventListener('onEmbeddedMessagingWindowMaximized', () => {
    document.getElementById('customChatButton').style.display = 'none';
});
```

### 3. State Management

**Track key states:**
```javascript
const ChatState = {
    initialized: false,
    buttonCreated: false,
    apiReady: false,
    chatLaunched: false,
    conversationStarted: false,
    detectionActive: false,
    fallbackShown: false
};

window.addEventListener('onEmbeddedMessagingButtonCreated', () => {
    ChatState.buttonCreated = true;
});

window.addEventListener('onEmbeddedMessagingReady', () => {
    ChatState.apiReady = true;
});

window.addEventListener('onEmbeddedMessagingConversationStarted', () => {
    ChatState.conversationStarted = true;
    ChatState.detectionActive = false; // Stop monitoring
});
```

### 4. Error Handling

```javascript
// Global error handler
window.addEventListener('error', (event) => {
    if (event.filename?.includes('bootstrap')) {
        console.error('Chat bootstrap error');
        showWebToCaseForm();
    }
});

// Bootstrap load failure
function handleBootstrapError() {
    console.error('Failed to load bootstrap script');
    showWebToCaseForm();
}

// Timeout fallback
setTimeout(() => {
    if (!ChatState.buttonCreated) {
        console.warn('Chat initialization timeout');
        showWebToCaseForm();
    }
}, 45000); // 45 seconds
```

### 5. Business Hours Integration

```javascript
let outsideBusinessHours = false;

window.addEventListener('onEmbeddedMessagingBusinessHoursEnded', () => {
    outsideBusinessHours = true;
    showWebToCaseForm();
});

window.addEventListener('onEmbeddedMessagingWithinBusinessHours', () => {
    outsideBusinessHours = false;
    hideWebToCaseForm();
});
```

### 6. Mobile Responsiveness

```css
/* Mobile-first design */
@media (max-width: 768px) {
    .chat-button {
        right: 15px;
        bottom: 15px;
        width: 50px;
        height: 50px;
    }

    .fallback-form {
        right: 10px;
        left: 10px;
        width: auto;
        bottom: 80px;
    }
}
```

### 7. Performance Optimization

```javascript
// Lazy load chat script
function loadChatWhenNeeded() {
    if (document.getElementById('chat-script')) return;

    const script = document.createElement('script');
    script.id = 'chat-script';
    script.src = 'DEPLOYMENT_URL/assets/js/bootstrap.min.js';
    script.onload = initEmbeddedMessaging;
    script.onerror = handleBootstrapError;

    document.body.appendChild(script);
}

// Load on user interaction or scroll
document.addEventListener('scroll', loadChatWhenNeeded, { once: true });
document.addEventListener('mousemove', loadChatWhenNeeded, { once: true });
```

---

## Web-to-Case Fallback Integration

### Setup in Salesforce

1. **Enable Web-to-Case:**
   - Setup → Web-to-Case → Enable Web-to-Case
   - Generate Web-to-Case HTML form

2. **Configure Settings:**
   - Default Case Origin: "Web"
   - Enable Auto-Response Rules
   - Enable reCAPTCHA (spam protection)

3. **Field Mapping:**
   ```html
   <input type="hidden" name="orgid" value="YOUR_ORG_ID">
   <input type="hidden" name="retURL" value="THANK_YOU_PAGE_URL">
   <input type="text" name="name" required>
   <input type="email" name="email" required>
   <textarea name="description" required></textarea>
   ```

### Implementation Pattern

```javascript
function showWebToCaseForm() {
    console.log('🔄 Showing Web-to-Case fallback');

    // Hide all chat elements
    const chatElements = document.querySelectorAll(
        '.embeddedMessagingFrame, .embeddedMessagingLauncher, #customChatButton'
    );
    chatElements.forEach(el => el.style.display = 'none');

    // Show fallback form
    const form = document.getElementById('webToCaseForm');
    form.style.display = 'block';

    // Auto-focus first field
    setTimeout(() => {
        form.querySelector('input').focus();
    }, 300);
}

function hideWebToCaseForm() {
    document.getElementById('webToCaseForm').style.display = 'none';
    document.getElementById('customChatButton').style.display = 'block';
}
```

### Form Design Best Practices

```html
<form id="webToCaseForm"
      action="https://INSTANCE.salesforce.com/servlet/servlet.WebToCase"
      method="POST"
      onsubmit="return validateForm()">

    <input type="hidden" name="orgid" value="YOUR_ORG_ID">
    <input type="hidden" name="retURL" value="https://yoursite.com/thank-you">

    <!-- Required fields -->
    <label for="name">* Name</label>
    <input id="name" name="name" type="text" maxlength="80" required>

    <label for="email">* Email</label>
    <input id="email" name="email" type="email" maxlength="80" required>

    <label for="description">* How can we help?</label>
    <textarea id="description" name="description" required
              placeholder="Please describe your inquiry..."></textarea>

    <!-- Optional fields -->
    <input type="hidden" name="subject" value="Web Inquiry - Chat Unavailable">
    <input type="hidden" name="origin" value="Chat">
    <input type="hidden" name="priority" value="Medium">

    <button type="submit">Submit Request</button>
    <button type="button" onclick="hideWebToCaseForm()">Cancel</button>
</form>
```

### Validation

```javascript
function validateForm() {
    const form = document.getElementById('webToCaseForm');
    const requiredFields = form.querySelectorAll('[required]');

    for (let field of requiredFields) {
        if (!field.value.trim()) {
            field.focus();
            alert(`Please fill in: ${field.previousElementSibling.textContent}`);
            return false;
        }
    }

    // Email validation
    const email = document.getElementById('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value)) {
        email.focus();
        alert('Please enter a valid email address');
        return false;
    }

    console.log('✅ Form validated, submitting case');
    return true;
}
```

### Spam Protection

```html
<!-- reCAPTCHA v2 -->
<div class="g-recaptcha" data-sitekey="YOUR_SITE_KEY"></div>
<script src="https://www.google.com/recaptcha/api.js"></script>
```

### Tracking and Analytics

```javascript
function trackWebToCaseSubmission() {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'form_submit', {
            'event_category': 'Web-to-Case',
            'event_label': 'Chat Unavailable Fallback',
            'value': 1
        });
    }

    // Custom tracking
    console.log('Web-to-Case submitted at:', new Date().toISOString());
}

document.getElementById('webToCaseForm').addEventListener('submit', trackWebToCaseSubmission);
```

---

## Known Limitations and Considerations

### 1. Daily Limits

- **5,000 cases per 24 hours** via Web-to-Case
- Excess requests queued in pending request queue
- Monitor with reports and alerts

### 2. Field Limitations

- **No file attachments** in Web-to-Case forms
- **Rich Text Area fields** save as plain text
- **Maximum field lengths** apply (check field metadata)

### 3. Browser Compatibility

Enhanced Web Chat supports:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

### 4. Cross-Origin Restrictions

- Cannot access iframe content from different domains
- Use Server-Sent Events for data
- PostMessage API for cross-frame communication

### 5. Session Management

- Sessions persist across page refreshes
- Use `clearSession()` to reset
- Authenticated users maintain identity

### 6. Routing Considerations

- Omni-Channel configuration required
- Routing can take 10-30 seconds
- Failed routing doesn't auto-retry

### 7. Migration Timeline

- **Legacy Chat retirement:** February 14, 2026
- Migrate to Enhanced Chat before deadline
- Test thoroughly in sandbox first

---

## Your Current Implementation Analysis

### Configuration Detected

**Salesforce Org:**
- Org ID: `00DEc00000GfZ2M`
- Sandbox: `strategiced--qasf`
- Instance: `https://strategiced--qasf.sandbox.my.salesforce.com`

**Deployment:**
- Name: `Embedded_Deployment_admission_for_Github`
- Site: `https://strategiced--qasf.sandbox.my.site.com/ESWEmbeddedDeploymentad1761917017154`
- SCRT2: `https://strategiced--qasf.sandbox.my.salesforce-scrt.com`

**Web-to-Case:**
- Action: `https://strategiced--qasf.sandbox.my.salesforce.com/servlet/servlet.WebToCase`
- Return URL: `https://www.google.com/` (⚠️ Consider changing to thank-you page)

### Implementation Strengths

✅ **Comprehensive Event Handling:**
- 8 event listeners implemented
- Business hours detection
- Routing failure detection
- Session management

✅ **Multi-Strategy Offline Detection:**
- Event-based (primary)
- DOM scanning (fallback)
- MutationObserver monitoring
- Timeout protection (45s)

✅ **Dual Fallback System:**
- Simple fallback form
- Enhanced Web-to-Case form
- Smooth transitions with animations

✅ **User Experience:**
- Custom branded button
- Auto-focus on forms
- Clear error messaging
- Mobile responsive

### Recommendations for Improvement

#### 1. Update Return URL
```javascript
// Change this
<input type="hidden" name="retURL" value="https://www.google.com/">

// To this
<input type="hidden" name="retURL" value="https://yoursite.com/thank-you.html">
```

#### 2. Add reCAPTCHA
```html
<!-- Add to Web-to-Case form -->
<div class="g-recaptcha" data-sitekey="YOUR_SITE_KEY"></div>
```

#### 3. Remove Test Functions (Production)
```javascript
// Remove these before deploying to production
window.testShowCaseForm = function() { ... }
window.testHideCaseForm = function() { ... }
```

#### 4. Add Analytics Tracking
```javascript
// Track chat launches
embeddedservice_bootstrap.utilAPI.launchChat()
    .then(() => {
        gtag('event', 'chat_launched');
    });

// Track fallback triggers
function triggerOfflineFallback() {
    gtag('event', 'fallback_triggered', {
        'reason': 'no_agents_available'
    });
    showCaseForm();
}
```

#### 5. Optimize Detection Timing
```javascript
// Your current: 1.5s delay
setTimeout(() => {
    checkForOfflineMessage();
}, 1500);

// Recommended: 2s initial, then 3s intervals
setTimeout(() => {
    checkForOfflineMessage();
}, 2000);

// And reduce interval frequency
const checkInterval = setInterval(() => {
    checkForOfflineMessage();
}, 3000); // Instead of 2000
```

#### 6. Add Session Storage for Persistence
```javascript
// Store fallback state
function triggerOfflineFallback() {
    sessionStorage.setItem('chatFallbackShown', 'true');
    sessionStorage.setItem('chatFallbackReason', 'no_agents');
    showCaseForm();
}

// Check on page load
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('chatFallbackShown') === 'true') {
        showCaseForm();
    }
});
```

### Testing Checklist

- [ ] Agents online - verify chat connects
- [ ] All agents offline - verify Web-to-Case shows within 2-3s
- [ ] Business hours ended - verify fallback triggers
- [ ] Mobile devices - verify responsive layout
- [ ] Form validation - test required fields
- [ ] Form submission - verify case creates in Salesforce
- [ ] Return URL - verify redirect after submission
- [ ] Error handling - test bootstrap load failure
- [ ] Timeout - verify 45s fallback triggers
- [ ] Re-enable - verify chat re-activates after form cancel

---

## Additional Resources

### Official Salesforce Documentation

- [Enhanced Web Chat Developer Guide](https://developer.salesforce.com/docs/service/messaging-web/overview)
- [Event Listeners Reference](https://developer.salesforce.com/docs/service/messaging-web/guide/event-listeners.html)
- [Utilities API Reference](https://developer.salesforce.com/docs/service/messaging-web/references/m4w-reference/utilAPI.html)
- [Server-Sent Events Structure](https://developer.salesforce.com/docs/service/messaging-api/references/about/server-sent-events-structure.html)
- [Embedded Services PDF (Winter '26)](https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/embedded_services.pdf)

### Migration Resources

- [Migrate from Legacy Chat to Enhanced Chat](https://trailhead.salesforce.com/content/learn/modules/migrating-from-legacy-chat-to-enhanced-chat)
- [Enhanced Chat Rollout Strategies](https://trailhead.salesforce.com/content/learn/modules/migrating-from-legacy-chat-to-enhanced-chat/discover-rollout-strategies-and-best-practices)

### Community

- [Salesforce Developer Forums](https://developer.salesforce.com/forums)
- [Trailblazer Community](https://trailhead.salesforce.com/trailblazer-community)
- [Stack Exchange - Salesforce](https://salesforce.stackexchange.com/)

---

**Document Version:** 1.0
**Last Updated:** November 1, 2025
**Maintained By:** Claude Code Research
**Based On:** Salesforce Developer Documentation (Winter '26 - API v65.0)
