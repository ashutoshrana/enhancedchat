# Agent Availability Detection - Hybrid Approach

## Overview

This document explains the **hybrid proactive + reactive approach** used to detect agent availability in Salesforce Enhanced Chat (Embedded Messaging).

## The Challenge

Enhanced Chat (Embedded Messaging/MIAW) **does not provide a client-side API** to check agent availability before launching chat. Unlike Legacy LiveChat, there are no:
- ❌ `helpButtonEnabled`/`helpButtonDisabled` CSS classes
- ❌ Availability REST API endpoints for Enhanced Chat
- ❌ Proactive agent status events

## Our Solution: Hybrid Detection

We implement a **two-stage detection system** that combines proactive and reactive checks:

### Stage 1: Proactive (Business Hours) ✅

**What it does:**
- Uses Salesforce business hours events to determine baseline availability
- Shows chat button during business hours
- Shows offline form outside business hours

**Events used:**
```javascript
onEmbeddedMessagingWithinBusinessHours      // Page loads during business hours
onEmbeddedMessagingBusinessHoursStarted     // Time transitions into business hours
onEmbeddedMessagingBusinessHoursEnded       // Time goes outside business hours
```

**Pros:**
- ✅ Immediate feedback to users
- ✅ No user action required
- ✅ Reliable (Salesforce-provided events)

**Cons:**
- ⚠️ Can't detect if agents are actually online during business hours
- ⚠️ Can't detect if queue is full

---

### Stage 2: Reactive (Session Status Monitoring) 🔄

**What it does:**
- Monitors chat sessions after they're initiated
- Detects routing failures when no agents are available
- Switches from chat to offline form if routing fails
- Persists the "no agents" flag for the page session

**Event used:**
```javascript
onEmbeddedMessagingSessionStatusUpdate
```

**Detection Patterns (in order of specificity):**

#### Pattern 1: Explicit Reason Field
```javascript
if (event.detail.status === 'Ended' && event.detail.reason === 'NoAgentsAvailable') {
  // Salesforce explicitly tells us no agents were available
  noAgentsAvailable = true;
}
```

#### Pattern 2: Routing Result Check
```javascript
if (event.detail.status === 'Ended' && event.detail.routingResult) {
  if (event.detail.routingResult.agentsAvailable === false ||
      event.detail.routingResult.success === false) {
    // Omnichannel Flow reported routing failure
    noAgentsAvailable = true;
  }
}
```

#### Pattern 3: Waiting Timeout
```javascript
if (event.detail.status === 'Waiting') {
  const waitTime = Date.now() - sessionWaitingStartTime;
  if (waitTime > 60000) {
    // Waited more than 60 seconds = no agents available
    noAgentsAvailable = true;
  }
}
```

#### Pattern 4: Ended Without Agent
```javascript
if (event.detail.status === 'Ended' && !event.detail.agentInfo) {
  // Session ended but no agent was ever assigned
  noAgentsAvailable = true;
}
```

**Pros:**
- ✅ Detects actual agent unavailability (not just hours)
- ✅ Adapts to real-time conditions
- ✅ Prevents repeated failed chat attempts

**Cons:**
- ⚠️ Reactive (user must attempt chat first)
- ⚠️ Relies on undocumented event structure
- ⚠️ Requires testing to confirm patterns work

---

## How It Works Together

### Scenario 1: Outside Business Hours
```
1. Page loads
2. onEmbeddedMessagingBusinessHoursEnded fires
3. isWithinBusinessHours = false
4. Show offline form immediately
```
**User Experience:** Sees offline form right away ✅

---

### Scenario 2: During Business Hours, Agents Online
```
1. Page loads
2. onEmbeddedMessagingWithinBusinessHours fires
3. isWithinBusinessHours = true, noAgentsAvailable = false
4. Show chat button
5. User clicks chat → session starts → agent connects
6. onEmbeddedMessagingSessionStatusUpdate(status: 'Active')
```
**User Experience:** Chat works normally ✅

---

### Scenario 3: During Business Hours, No Agents Available
```
1. Page loads
2. onEmbeddedMessagingWithinBusinessHours fires
3. isWithinBusinessHours = true, noAgentsAvailable = false
4. Show chat button
5. User clicks chat → session starts → routing fails
6. onEmbeddedMessagingSessionStatusUpdate(status: 'Ended', reason: 'NoAgentsAvailable')
7. noAgentsAvailable = true
8. Switch to offline form
9. Next user sees offline form immediately (flag persists)
```
**User Experience:** First user sees chat attempt fail, subsequent users see offline form ✅

---

## Implementation Details

### Key Variables

```javascript
let isWithinBusinessHours = true;  // Proactive check via business hours events
let noAgentsAvailable = false;     // Reactive check via session status events
```

### Decision Logic

```javascript
function updateChatAvailability(reason = null) {
  if (isWithinBusinessHours && !noAgentsAvailable) {
    // Both checks pass: show chat
    showChatButton();
    hideOfflineForm();
  } else {
    // Either check fails: show offline form
    hideChatButton();
    showOfflineForm();

    // Update message if switching due to no agents
    if (noAgentsAvailable && reason) {
      updateOfflineFormMessage('All agents are currently assisting other customers.');
    }
  }
}
```

### Reset Behavior

```javascript
// Reset when messaging is ready (page load/refresh)
window.addEventListener('onEmbeddedMessagingReady', () => {
  noAgentsAvailable = false;
  // Wait for business hours event before updating UI
});

// Reset when session becomes active (agent connects)
if (event.detail.status === 'Active') {
  noAgentsAvailable = false;  // Agents are available!
}
```

---

## Testing the Implementation

### Test Cases

#### ✅ Test 1: Business Hours Ended
1. Wait until outside business hours OR configure test hours
2. Reload page
3. **Expected:** Offline form shows immediately

#### ✅ Test 2: Business Hours Active, Agents Online
1. During business hours with agents online
2. Reload page
3. **Expected:** Chat button shows
4. Click chat button
5. **Expected:** Chat connects to agent successfully

#### ✅ Test 3: Business Hours Active, No Agents Available
1. During business hours, set all agents offline
2. Reload page
3. **Expected:** Chat button shows initially
4. Click chat button
5. **Expected:** Session starts but routing fails
6. **Expected:** Console logs show detection pattern triggered
7. **Expected:** UI switches to offline form
8. Reload page
9. **Expected:** Offline form shows immediately (flag persists)

#### ✅ Test 4: Routing Timeout
1. During business hours, simulate slow routing
2. Click chat button
3. Wait 60+ seconds
4. **Expected:** Pattern 3 triggers, switches to offline form

### Debug Logging

Open browser console (F12) and look for:

```
📊 EVENT: Session Status Update
========================================
📋 Full event.detail structure: { ... }
📌 Status: Ended
📌 Reason: NoAgentsAvailable
📌 Routing Result: { ... }
📌 Agent Info: undefined
⚠️ DETECTED: No agents available (Pattern 1: reason field)
🔄 Updating chat availability...
  - Business Hours: true
  - Agents Available: false
  - Reason for change: session_ended_no_agents
```

### Monitoring Your Omnichannel Flow

Your Omnichannel Flow's "Check Availability for Routing" action returns:
- `OnlineAgentCount` - Number of available agents
- `reasonForNotRouting` - Why routing failed

**However:** These values exist **only server-side** in the Flow context. We cannot access them directly from JavaScript.

**What we CAN access:** The session status event that fires **after** routing completes (or fails).

---

## Event Structure Reference

### Expected Event Structure

```javascript
{
  "status": "Waiting" | "Active" | "Ended",
  "reason": "NoAgentsAvailable" | "UserEnded" | "AgentEnded" | ...,
  "routingResult": {
    "success": true | false,
    "agentsAvailable": true | false,
    // ... other properties
  },
  "agentInfo": {
    "name": "Agent Name",
    "id": "agentId",
    // ... other properties
  }
}
```

**Note:** The exact structure is **not fully documented** by Salesforce. Use comprehensive logging to understand what's actually returned in your environment.

---

## Comparison with Alternatives

| Approach | Proactive? | Reactive? | Accuracy | Complexity | Recommended? |
|----------|-----------|-----------|----------|------------|--------------|
| **Business Hours Only** | ✅ Yes | ❌ No | Medium | Low | ⚠️ Baseline |
| **Session Status Only** | ❌ No | ✅ Yes | High* | Low | ❌ Reactive only |
| **Hybrid (Our Approach)** | ✅ Yes | ✅ Yes | High* | Medium | ✅ **YES** |
| **Backend API Check** | ✅ Yes | ✅ Yes | Very High | High | ⚠️ If needed |
| **Omnichannel Presence API** | ✅ Yes | ✅ Yes | Very High | Very High | ⚠️ Enterprise |

*Accuracy depends on event structure being consistent in your Salesforce environment

---

## Known Limitations

### 1. First User Delay
- During business hours with no agents, the **first user** will see the chat button
- They must attempt to start chat before the system detects no agents
- **Subsequent users** will see the offline form immediately

### 2. Event Structure Uncertainty
- The `onEmbeddedMessagingSessionStatusUpdate` event structure is not fully documented
- Field names like `reason`, `routingResult`, `agentInfo` may vary
- **Solution:** Comprehensive logging to understand actual structure

### 3. Page Session Scope
- The `noAgentsAvailable` flag persists only for the current page session
- Reloading the page resets the flag
- **Implication:** First user after page load might still attempt chat

### 4. No Cross-Tab Synchronization
- If a user opens multiple tabs, each tab has independent state
- One tab detecting no agents doesn't affect other tabs
- **Possible Enhancement:** Use localStorage to share state

---

## Future Enhancements

### Option 1: Backend API Integration
Build a server-side endpoint to query Salesforce agent status:

```javascript
// Client-side
async function checkAgentAvailability() {
  const response = await fetch('/api/salesforce/agent-status');
  const data = await response.json();
  return data.agentsOnline > 0;
}

// Call on page load
const hasAgents = await checkAgentAvailability();
if (!hasAgents) {
  noAgentsAvailable = true;
  updateChatAvailability('server_check');
}
```

**Benefits:**
- ✅ Truly proactive detection
- ✅ No "first user" delay
- ✅ Can check before any chat attempt

### Option 2: LocalStorage Persistence
Share agent availability state across tabs/page reloads:

```javascript
// Set flag
localStorage.setItem('noAgentsAvailable', 'true');
localStorage.setItem('noAgentsDetectedAt', Date.now());

// Check flag on load
const storedFlag = localStorage.getItem('noAgentsAvailable');
const detectedAt = localStorage.getItem('noAgentsDetectedAt');
const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

if (storedFlag === 'true' && detectedAt > fiveMinutesAgo) {
  noAgentsAvailable = true;
}
```

**Benefits:**
- ✅ Persists across page reloads
- ✅ Shared across tabs
- ✅ Reduces repeated chat attempts

### Option 3: Polling Interval
Periodically re-check agent availability:

```javascript
setInterval(async () => {
  // Call backend API to check current status
  const hasAgents = await checkAgentAvailability();

  if (hasAgents && noAgentsAvailable) {
    // Agents came back online!
    noAgentsAvailable = false;
    updateChatAvailability('agents_back_online');
  }
}, 60000); // Check every minute
```

**Benefits:**
- ✅ Dynamic updates when agents come online
- ✅ Better UX during agent transitions

---

## Troubleshooting

### Issue: Chat button doesn't hide when no agents
**Check:**
1. Console logs show detection pattern triggered?
2. `noAgentsAvailable` flag set to `true`?
3. `updateChatAvailability()` called?
4. Business hours check also passing?

**Debug:**
```javascript
console.log('isWithinBusinessHours:', isWithinBusinessHours);
console.log('noAgentsAvailable:', noAgentsAvailable);
console.log('event.detail:', JSON.stringify(event.detail, null, 2));
```

### Issue: Offline form shows during business hours with agents
**Check:**
1. Business hours configured correctly in Salesforce?
2. `onEmbeddedMessagingWithinBusinessHours` event firing?
3. `noAgentsAvailable` flag incorrectly set to `true`?

**Debug:**
```javascript
window.addEventListener('onEmbeddedMessagingWithinBusinessHours', (event) => {
  console.log('Business Hours Event:', event.detail);
  console.log('withinBusinessHours:', event.detail.withinBusinessHours);
});
```

### Issue: Session status event not providing expected data
**Solution:**
1. Enable comprehensive logging
2. Test with actual Omnichannel Flow
3. Document the actual `event.detail` structure
4. Adjust detection patterns accordingly

---

## Related Documentation

- [SALESFORCE_ENHANCED_CHAT_COMPLETE_GUIDE.md](./SALESFORCE_ENHANCED_CHAT_COMPLETE_GUIDE.md) - Main implementation guide
- [Salesforce Developer Docs - Event Listeners](https://developer.salesforce.com/docs/service/messaging-web/guide/event-listeners.html)
- [Salesforce Developer Docs - Enhanced Web Chat APIs](https://developer.salesforce.com/docs/service/messaging-web/guide/api-overview.html)

---

## Summary

This hybrid approach provides the **best balance** between:
- ✅ **Proactive availability detection** (business hours)
- ✅ **Reactive failure handling** (session status)
- ✅ **Good user experience** (minimal failed attempts)
- ⚠️ **Reasonable complexity** (no backend required)

While not perfect (first-user delay), it's the **most practical solution** given Enhanced Chat's limitations.
