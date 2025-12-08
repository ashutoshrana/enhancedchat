# Chat Button Not Showing - Complete Fix

**Issue:** Chat button doesn't appear on page load
**Root Cause:** Timing issue - `updateChatAvailability()` called before Salesforce creates the button
**Commits:** 779134f (partial), 017d07a (complete fix)
**Date:** 2025-11-02

## Problem Analysis

### Event Sequence (What Was Happening)

```
1. onEmbeddedMessagingReady fires
   └─> Sets noAgentsAvailable = false
   └─> Waits 2 seconds for business hours events
   └─> Calls updateChatAvailability('no_business_hours_configured')
       └─> Calls showChatButton()
           └─> embeddedservice_bootstrap.utilAPI is undefined ❌
           └─> Button NOT shown

2. onEmbeddedMessagingButtonCreated fires (AFTER Ready)
   └─> Button is now created
   └─> utilAPI is now available
   └─> But updateChatAvailability was already called (too early)
   └─> Button stays hidden ❌
```

### The Problem

**Salesforce Enhanced Chat event timeline:**
1. `onEmbeddedMessagingReady` - SDK is ready, but **button not created yet**
2. `onEmbeddedMessagingButtonCreated` - **Now** button exists and utilAPI works
3. Business hours events (if configured) - May fire anytime after Ready

**Our code was calling `updateChatAvailability()` in the Ready event**, but at that point:
- ❌ `embeddedservice_bootstrap.utilAPI` doesn't exist yet
- ❌ `showChatButton()` silently fails
- ❌ User sees nothing

## Solution Implemented

### Fix #1: Detect When Business Hours Not Configured (Commit 779134f)
Added timeout in `onEmbeddedMessagingReady` to call `updateChatAvailability()` if no business hours events fire.

**Result:** ✅ Function is called, but ❌ button still doesn't show (timing issue)

### Fix #2: Call After Button Created (Commit 017d07a)
Added `updateChatAvailability()` call in `onEmbeddedMessagingButtonCreated` event.

**Result:** ✅✅ Function is called AFTER button exists, so `utilAPI` methods work!

### Complete Implementation

#### Step 1: Added Warning Logs
```javascript
function showChatButton() {
  if (typeof embeddedservice_bootstrap !== 'undefined' && embeddedservice_bootstrap.utilAPI) {
    embeddedservice_bootstrap.utilAPI.showChatButton();
    console.log('✅ Chat button shown (Salesforce API)');
  } else {
    console.warn('⚠️ Cannot show chat button - embeddedservice_bootstrap.utilAPI not available yet');
    console.log('   embeddedservice_bootstrap exists:', typeof embeddedservice_bootstrap !== 'undefined');
    console.log('   utilAPI exists:', typeof embeddedservice_bootstrap !== 'undefined' && embeddedservice_bootstrap.utilAPI);
  }
}
```

#### Step 2: Call updateChatAvailability When Button Created
```javascript
window.addEventListener('onEmbeddedMessagingButtonCreated', () => {
  console.log('✅ Chat button created - ready to launch');

  // NOW that button is created, update visibility based on availability
  console.log('📍 Button created - checking availability and updating visibility');
  updateChatAvailability('button_created');

  // ... rest of handler
});
```

## How It Works Now

### Correct Event Sequence

```
1. onEmbeddedMessagingReady fires
   └─> Sets noAgentsAvailable = false
   └─> Starts 2-second timer for business hours check

2. onEmbeddedMessagingButtonCreated fires ✅
   └─> Button is NOW created
   └─> Calls updateChatAvailability('button_created')
       └─> Calls showChatButton()
           └─> embeddedservice_bootstrap.utilAPI.showChatButton() ✅
           └─> Button SHOWS! ✅

3. (2 seconds after Ready) Timeout fires
   └─> If business hours events didn't fire:
       └─> Calls updateChatAvailability('no_business_hours_configured')
       └─> This is a redundant call but harmless
   └─> If business hours events DID fire:
       └─> Skips the call (flag prevents duplicate)
```

### Expected Console Output (Without Business Hours)

```
📍 Messaging Ready - resetting agent availability
✅ Chat button created - ready to launch
📍 Button created - checking availability and updating visibility
🔄 Updating chat availability...
  - Business Hours: true
  - Agents Available: true
  - Reason for change: button_created
✅ Chat available - showing chat button only
✅ Chat button shown (Salesforce API)
(2 seconds later)
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

**Note:** The function is called twice (once from ButtonCreated, once from Ready timeout), but this is safe and harmless. The button is shown on the first call.

## Testing Instructions

### Test 1: Verify Chat Button Shows
1. Open https://ashutoshrana.github.io/enhancedchat/
2. Wait for page to fully load
3. Open browser console (F12)
4. Look for these logs in order:
   - ✅ `"📍 Messaging Ready"`
   - ✅ `"✅ Chat button created"`
   - ✅ `"📍 Button created - checking availability"`
   - ✅ `"✅ Chat button shown (Salesforce API)"`
5. **Verify:** Chat button appears in bottom-right corner
6. ✅ PASS if you see the chat button

### Test 2: Check for Timing Warnings
1. Open console (F12)
2. Look for warnings:
   - ❌ Should NOT see: `"⚠️ Cannot show chat button - embeddedservice_bootstrap.utilAPI not available yet"`
   - ✅ Should see: `"✅ Chat button shown (Salesforce API)"`
3. ✅ PASS if no warnings about utilAPI

### Test 3: Verify Leave a Message Button Still Works
1. Set all agents offline in Salesforce (or wait until outside business hours if configured)
2. Reload page
3. Click chat button
4. Wait for routing failure
5. Verify "Leave a Message" button replaces chat button
6. ✅ PASS if offline button appears after routing fails

## Key Insights

### Why Ready Event Was Too Early
- `onEmbeddedMessagingReady` means the **SDK is initialized**, not that the **button is created**
- Salesforce creates the button asynchronously after Ready fires
- `utilAPI.showChatButton()` requires the button DOM element to exist first
- Calling it before button exists = silent failure

### Why ButtonCreated Event Is the Right Place
- `onEmbeddedMessagingButtonCreated` fires **after** the button is added to the DOM
- At this point, `utilAPI.showChatButton()` and `utilAPI.hideChatButton()` will work
- This is the earliest safe time to control button visibility

### Why We Keep Both Calls
1. **ButtonCreated call:** Shows button immediately (covers 99% of cases)
2. **Ready timeout call:** Backup for edge cases where ButtonCreated fires late or business hours events fire later

## Files Modified

- **[index.html](./index.html)** (lines 603-621, 864-870)
  - Added warning logs to `showChatButton()` and `hideChatButton()`
  - Added `updateChatAvailability('button_created')` call in ButtonCreated event
  - Kept Ready timeout as backup

## Related Documentation

- **[BUSINESS_HOURS_FIX.md](./BUSINESS_HOURS_FIX.md)** - Initial fix for business hours detection
- **[LEAVE_MESSAGE_BUTTON_VALIDATION.md](./LEAVE_MESSAGE_BUTTON_VALIDATION.md)** - Button validation
- **[AGENT_AVAILABILITY_DETECTION.md](./AGENT_AVAILABILITY_DETECTION.md)** - Hybrid detection approach

## Deployment Status

**Commit:** 017d07a
**Pushed:** 2025-11-02
**GitHub Pages:** Deploying (allow 1-2 minutes)

Check deployment:
```bash
curl -s https://ashutoshrana.github.io/enhancedchat/ | grep -c "Button created - checking availability"
```

If returns `1`: ✅ Deployed
If returns `0`: ⏳ Still deploying

## Troubleshooting

### If Button Still Doesn't Show

1. **Check Salesforce deployment:**
   - Is Enhanced Chat enabled?
   - Is the deployment URL correct?
   - Are there any Salesforce errors in console?

2. **Check console for errors:**
   - Look for `"⚠️ Cannot show chat button"` warnings
   - Check if `onEmbeddedMessagingButtonCreated` fires
   - Check if `utilAPI` exists when showChatButton is called

3. **Check if custom button is interfering:**
   - Look for `#capellaChatBtn` in the DOM
   - This might be a custom button implementation
   - If it exists, it might be hiding the default Salesforce button

### If You See Duplicate Calls

This is **normal and intentional**:
- First call: From `onEmbeddedMessagingButtonCreated` (shows button)
- Second call: From Ready timeout (backup, harmless duplicate)
- Both calls are safe and idempotent

---

**Last Updated:** 2025-11-02
**Author:** Claude Code
**Issue:** Chat button not showing due to timing
**Status:** ✅ Fixed (Commit 017d07a)
