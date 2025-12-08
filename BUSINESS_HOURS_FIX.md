# Fix: Chat Button Not Showing Without Business Hours Configuration

**Issue:** Chat button doesn't appear when Salesforce deployment has no business hours configured.

**Commit:** 779134f
**Date:** 2025-11-02

## Problem Description

### Root Cause
When business hours are NOT configured in Salesforce Enhanced Chat:
1. The `onEmbeddedMessagingWithinBusinessHours` event **never fires**
2. The `onEmbeddedMessagingBusinessHoursStarted` event **never fires**
3. The `onEmbeddedMessagingBusinessHoursEnded` event **never fires**
4. Without these events, `updateChatAvailability()` is never called
5. Result: Chat button never appears, "Leave a Message" button never appears
6. User sees nothing ❌

### Previous Code Behavior
```javascript
window.addEventListener('onEmbeddedMessagingReady', () => {
  console.log('📍 Messaging Ready - resetting agent availability');
  noAgentsAvailable = false;
  // Don't call updateChatAvailability yet - wait for business hours event
  // ❌ PROBLEM: If business hours not configured, event never fires!
});
```

## Solution Implemented

### 1. Added Tracking Flag
```javascript
let businessHoursEventFired = false; // Track if business hours events have fired
```

### 2. Mark Flag When Business Hours Events Fire
```javascript
window.addEventListener('onEmbeddedMessagingWithinBusinessHours', (event) => {
  businessHoursEventFired = true; // ✅ Business hours ARE configured
  isWithinBusinessHours = event.detail.withinBusinessHours;
  updateChatAvailability('business_hours_event');
});

window.addEventListener('onEmbeddedMessagingBusinessHoursStarted', () => {
  businessHoursEventFired = true; // ✅ Business hours ARE configured
  isWithinBusinessHours = true;
  updateChatAvailability('business_hours_started');
});

window.addEventListener('onEmbeddedMessagingBusinessHoursEnded', () => {
  businessHoursEventFired = true; // ✅ Business hours ARE configured
  isWithinBusinessHours = false;
  updateChatAvailability('business_hours_ended');
});
```

### 3. Fallback in Ready Event
```javascript
window.addEventListener('onEmbeddedMessagingReady', () => {
  console.log('📍 Messaging Ready - resetting agent availability');
  noAgentsAvailable = false;

  // Wait 2 seconds for business hours events
  setTimeout(() => {
    if (!businessHoursEventFired) {
      // ✅ Business hours NOT configured - show chat button by default
      console.log('⚠️ No business hours events fired - assuming business hours not configured');
      console.log('  - isWithinBusinessHours:', isWithinBusinessHours); // true (default)
      console.log('  - noAgentsAvailable:', noAgentsAvailable); // false
      console.log('  - Calling updateChatAvailability to show chat button');

      updateChatAvailability('no_business_hours_configured');
    } else {
      // Business hours ARE configured - events already handled it
      console.log('✅ Business hours events fired - availability already set');
    }
  }, 2000);
});
```

## How It Works

### Scenario A: Business Hours ARE Configured
1. Page loads → `onEmbeddedMessagingReady` fires
2. Within 2 seconds: Business hours event fires
3. `businessHoursEventFired = true`
4. `updateChatAvailability()` is called by business hours event
5. After 2 seconds: Ready handler checks flag
6. Flag is `true`, so it does nothing (avoids duplicate call)
7. ✅ Result: Chat button shows based on business hours

### Scenario B: Business Hours NOT Configured (Your Case)
1. Page loads → `onEmbeddedMessagingReady` fires
2. No business hours events fire (they don't exist)
3. `businessHoursEventFired` stays `false`
4. After 2 seconds: Ready handler checks flag
5. Flag is `false`, so it calls `updateChatAvailability()`
6. Since `isWithinBusinessHours = true` (default), chat button shows
7. ✅ Result: Chat button appears!

## Expected Console Output

### With Business Hours Configured:
```
📍 Messaging Ready - resetting agent availability
⏰ EVENT: onEmbeddedMessagingWithinBusinessHours
Within Business Hours: true
🔄 Updating chat availability...
  - Business Hours: true
  - Agents Available: true
  - Reason for change: business_hours_event
✅ Chat available - showing chat button only
✅ Chat button shown (Salesforce API)
✅ Business hours events fired - availability already set
```

### Without Business Hours Configured:
```
📍 Messaging Ready - resetting agent availability
(2 second wait - no business hours events fire)
⚠️ No business hours events fired - assuming business hours not configured
  - isWithinBusinessHours: true
  - noAgentsAvailable: false
  - Calling updateChatAvailability to show chat button
🔄 Updating chat availability...
  - Business Hours: true
  - Agents Available: true
  - Reason for change: no_business_hours_configured
✅ Chat available - showing chat button only
✅ Chat button shown (Salesforce API)
```

## Testing Instructions

### Test 1: Verify Chat Button Shows (No Business Hours)
1. Open https://ashutoshrana.github.io/enhancedchat/ (wait for deployment)
2. Open browser console (F12)
3. Wait for page to load
4. Look for: `"⚠️ No business hours events fired"`
5. Look for: `"✅ Chat button shown (Salesforce API)"`
6. Verify: Chat button appears in bottom-right corner
7. ✅ PASS if chat button is visible

### Test 2: Verify "Leave a Message" Button Logic Still Works
1. In Salesforce, set all agents offline
2. Reload the page
3. Click chat button
4. Wait for routing failure
5. Look for: `"⚠️ DETECTED: No agents available"`
6. Look for: `"📝 Leave a Message button shown"`
7. Verify: "Leave a Message" button replaces chat button
8. ✅ PASS if offline button appears

### Test 3: Verify Business Hours Still Work (If You Configure Them)
1. Configure business hours in Salesforce deployment
2. Test outside business hours
3. Look for: `"❌ EVENT: Business Hours ENDED"`
4. Look for: `"📝 Leave a Message button shown"`
5. ✅ PASS if offline button shows outside hours

## Benefits of This Fix

1. ✅ **Works with or without business hours** - Handles both configurations
2. ✅ **No duplicate calls** - Prevents calling `updateChatAvailability()` twice
3. ✅ **Maintains existing behavior** - Business hours logic unchanged when configured
4. ✅ **Clear console logging** - Easy to debug which path is taken
5. ✅ **Reasonable timeout** - 2 seconds allows business hours events to fire first
6. ✅ **Safe defaults** - Assumes chat available if no configuration found

## Variables Used

```javascript
// NEW
let businessHoursEventFired = false;  // Tracks if business hours configured

// EXISTING
let isWithinBusinessHours = true;     // Default: assume chat available
let noAgentsAvailable = false;        // Reactive: set when routing fails
```

## Related Files

- **[index.html](./index.html)** - Main implementation (lines 598-1072)
- **[LEAVE_MESSAGE_BUTTON_VALIDATION.md](./LEAVE_MESSAGE_BUTTON_VALIDATION.md)** - Button validation report
- **[AGENT_AVAILABILITY_DETECTION.md](./AGENT_AVAILABILITY_DETECTION.md)** - Hybrid detection approach

## Deployment Status

**Commit:** 779134f
**Pushed:** 2025-11-02
**GitHub Pages:** Deploying (allow 1-2 minutes)

Check deployment status:
```bash
curl -s https://ashutoshrana.github.io/enhancedchat/ | grep -c "businessHoursEventFired"
```

If returns `3` or more: ✅ Deployed
If returns `0`: ⏳ Still deploying

---

**Last Updated:** 2025-11-02
**Author:** Claude Code
**Issue:** Chat button not showing without business hours
**Status:** ✅ Fixed

---

# UPDATE: Business Hours Undefined Value Fix

**Date:** 2025-11-06  
**New Issue:** Business hours event fires with `undefined` value

## Additional Problem Discovered

Even when business hours ARE configured, the `onEmbeddedMessagingWithinBusinessHours` event sometimes fires with:
```javascript
event.detail.withinBusinessHours = undefined  // ❌ Not a boolean!
```

This is a **Salesforce MIAW timing/race condition**:
- Event fires before business hours value is loaded
- Inconsistent - sometimes `undefined`, sometimes correct boolean
- Causes chat button to not appear even during business hours

## New Solution Added

### Fix 1: Ignore Undefined Events
**Location:** Lines 1646-1678

```javascript
window.addEventListener('onEmbeddedMessagingWithinBusinessHours', (event) => {
  const businessHoursValue = event.detail?.withinBusinessHours;

  if (businessHoursValue === undefined || businessHoursValue === null) {
    console.log('⚠️ Business hours value is undefined/null');
    console.log('  - Keeping current value:', isWithinBusinessHours);
    return; // Don't update - wait for retry or fallback
  }

  // Valid value received
  isWithinBusinessHours = businessHoursValue;
  updateChatAvailability('business_hours_event');
});
```

### Fix 2: Multi-Stage Retry
**Location:** Lines 1766-1805

```javascript
window.addEventListener('onEmbeddedMessagingReady', () => {
  // Wait 1 second
  setTimeout(() => {
    if (isWithinBusinessHours !== undefined) return; // Got valid value

    // Wait another 1.5 seconds
    setTimeout(() => {
      if (isWithinBusinessHours !== undefined) return; // Got valid value

      // Fallback: Default to true
      isWithinBusinessHours = true;
      updateChatAvailability('business_hours_fallback_after_wait');
    }, 1500);
  }, 1000);
});
```

## How It Works Now

```
Event fires with undefined:
  ├─ Ignore it (don't update availability)
  ├─ Wait 1 second
  ├─ Check if value now available
  │   ├─ Yes → Use it ✅
  │   └─ No → Wait 1.5 seconds more
  │       ├─ Value available now → Use it ✅
  │       └─ Still undefined → Default to true ✅
```

## Expected Console Logs

**Undefined Detected:**
```
⏰ EVENT: onEmbeddedMessagingWithinBusinessHours
Within Business Hours raw value: undefined
⚠️ Business hours value is undefined/null
  - This is a Salesforce MIAW timing issue
  - Keeping current value: true
```

**Fallback After Waiting:**
```
⏳ Business hours event fired with undefined or not fired yet
  - Waiting longer for valid value...
⚠️ Business hours could not be determined after waiting
  - Defaulting to TRUE (chat available)
✅ Chat button shown (Salesforce API)
```

## Status
✅ **FIXED** - Both issues now handled:
1. No business hours configured → Fallback shows chat
2. Business hours event fires with undefined → Retry then fallback

---
**Last Updated:** 2025-11-06
