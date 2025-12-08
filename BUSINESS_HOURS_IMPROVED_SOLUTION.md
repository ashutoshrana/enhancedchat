# Improved Business Hours Detection - Salesforce Best Practices

## Issue Summary
`onEmbeddedMessagingWithinBusinessHours` is unreliable and often returns `undefined`. This is a known Salesforce MIAW limitation.

## Root Cause Analysis

### Why the Event is Unreliable:
1. **Race Condition**: Event fires before Salesforce fully initializes business hours data
2. **No Guaranteed Order**: Sometimes fires before `onEmbeddedMessagingReady`, sometimes after
3. **Multiple Fires**: Can fire multiple times with different values
4. **Undefined is Valid**: Salesforce considers `undefined` a valid state (= unknown)

## Salesforce Recommended Approach

### Option 1: Don't Rely on Business Hours Events (RECOMMENDED)

**Best Practice**: Show chat button by default, let Salesforce handle availability internally.

```javascript
// Simplified approach - no business hours detection
window.addEventListener('onEmbeddedMessagingReady', () => {
  // Just show the chat button - Salesforce will handle offline state internally
  console.log('Chat ready - showing button');

  // Salesforce will automatically show "No agents available" if offline
  // No need to manually detect business hours
});
```

**Benefits:**
- No timing issues
- No undefined handling needed
- Salesforce shows built-in offline message
- Simpler code

**When to Use:** If you're okay with Salesforce's default offline handling

---

### Option 2: Use embeddedservice_bootstrap.utilAPI Directly

Instead of events, query the API directly:

```javascript
window.addEventListener('onEmbeddedMessagingReady', () => {
  // Give Salesforce time to initialize (important!)
  setTimeout(() => {
    try {
      const isAvailable = embeddedservice_bootstrap.utilAPI.isWithinBusinessHours?.();

      if (typeof isAvailable === 'boolean') {
        console.log('Business hours from API:', isAvailable);
        isWithinBusinessHours = isAvailable;
        updateChatAvailability('api_check');
      } else {
        console.log('API returned non-boolean, defaulting to true');
        isWithinBusinessHours = true;
        updateChatAvailability('api_fallback');
      }
    } catch (e) {
      console.warn('Could not check business hours API:', e);
      // Default to available
      isWithinBusinessHours = true;
      updateChatAvailability('api_error_fallback');
    }
  }, 2000); // Wait 2 seconds for full initialization
});
```

**Benefits:**
- Synchronous check (no event waiting)
- Direct API call
- Can retry if needed

**Drawbacks:**
- API might not exist on all MIAW versions
- Still needs delay for initialization

---

### Option 3: Combined Approach (Most Robust)

Use events as primary, API as fallback:

```javascript
let businessHoursChecked = false;

// Try event first
window.addEventListener('onEmbeddedMessagingWithinBusinessHours', (event) => {
  const value = event.detail?.withinBusinessHours;

  if (typeof value === 'boolean') {
    console.log('✅ Valid business hours from event:', value);
    isWithinBusinessHours = value;
    businessHoursChecked = true;
    updateChatAvailability('event');
  } else {
    console.log('⚠️ Event returned undefined, will try API fallback');
  }
});

// Fallback to API after delay
window.addEventListener('onEmbeddedMessagingReady', () => {
  setTimeout(() => {
    if (businessHoursChecked) {
      console.log('✅ Business hours already checked via event');
      return;
    }

    // Try API
    try {
      const apiValue = embeddedservice_bootstrap.utilAPI.isWithinBusinessHours?.();

      if (typeof apiValue === 'boolean') {
        console.log('✅ Business hours from API:', apiValue);
        isWithinBusinessHours = apiValue;
        businessHoursChecked = true;
        updateChatAvailability('api');
        return;
      }
    } catch (e) {
      console.warn('API check failed:', e);
    }

    // Final fallback: default to true
    console.log('⚠️ Using default: business hours = true');
    isWithinBusinessHours = true;
    businessHoursChecked = true;
    updateChatAvailability('default');
  }, 2500);
});
```

---

## Alternative: Server-Side Business Hours Check

**Most Reliable**: Check business hours on your server, not in JavaScript.

### Implementation:
1. Create a backend endpoint that checks Salesforce business hours via API
2. Call this endpoint on page load
3. Show/hide chat button based on server response

```javascript
// Fetch business hours from your backend
fetch('/api/check-business-hours')
  .then(res => res.json())
  .then(data => {
    isWithinBusinessHours = data.isAvailable;
    updateChatAvailability('server_check');
  })
  .catch(err => {
    console.error('Server check failed:', err);
    isWithinBusinessHours = true; // Default to available
    updateChatAvailability('server_error_fallback');
  });
```

**Backend (Node.js example):**
```javascript
app.get('/api/check-business-hours', async (req, res) => {
  try {
    // Call Salesforce API to check business hours
    const sfResponse = await salesforceApi.checkBusinessHours();
    res.json({ isAvailable: sfResponse.isWithinBusinessHours });
  } catch (error) {
    // Default to available on error
    res.json({ isAvailable: true });
  }
});
```

**Benefits:**
- No client-side timing issues
- Consistent results
- Can cache the result
- More control

---

## Recommended Solution for Your Case

Based on your requirements (showing "Leave a Message" button when offline), I recommend **Option 3 (Combined Approach)** with these modifications:

```javascript
// State tracking
let businessHoursValue = null;
let businessHoursSource = null;

// Helper: Update from any source
function setBusinessHours(value, source) {
  if (typeof value !== 'boolean') {
    console.log(`⚠️ Invalid business hours value from ${source}:`, value);
    return false;
  }

  console.log(`✅ Business hours set from ${source}:`, value);
  businessHoursValue = value;
  businessHoursSource = source;
  isWithinBusinessHours = value;
  updateChatAvailability(source);
  return true;
}

// Attempt 1: Business hours event
window.addEventListener('onEmbeddedMessagingWithinBusinessHours', (event) => {
  setBusinessHours(event.detail?.withinBusinessHours, 'event');
});

// Attempt 2: Business hours started/ended events (more reliable)
window.addEventListener('onEmbeddedMessagingBusinessHoursStarted', () => {
  setBusinessHours(true, 'hours_started_event');
});

window.addEventListener('onEmbeddedMessagingBusinessHoursEnded', () => {
  setBusinessHours(false, 'hours_ended_event');
});

// Attempt 3: API check after initialization
window.addEventListener('onEmbeddedMessagingReady', () => {
  // If we already got a valid value, we're done
  if (businessHoursValue !== null) {
    console.log('✅ Business hours already determined:', businessHoursValue);
    return;
  }

  // Try API after delay
  setTimeout(() => {
    if (businessHoursValue !== null) {
      console.log('✅ Business hours determined during wait:', businessHoursValue);
      return;
    }

    // Check API
    try {
      const apiValue = embeddedservice_bootstrap.utilAPI?.isWithinBusinessHours?.();
      if (setBusinessHours(apiValue, 'api')) {
        return;
      }
    } catch (e) {
      console.warn('⚠️ API check error:', e);
    }

    // Final fallback
    console.log('⚠️ Could not determine business hours, defaulting to TRUE');
    setBusinessHours(true, 'default_fallback');
  }, 2500);
});
```

---

## Testing Your Implementation

### Test Checklist:
- [ ] Chat loads during business hours → Chat button appears
- [ ] Chat loads outside business hours → "Leave a Message" appears
- [ ] Business hours event fires with valid value → Uses it
- [ ] Business hours event fires with undefined → Falls back to API
- [ ] API also returns undefined → Defaults to available
- [ ] Console shows clear source of business hours value

### Debug Commands:
```javascript
// Check current state
console.log('Business Hours:', businessHoursValue);
console.log('Source:', businessHoursSource);

// Force check
embeddedservice_bootstrap.utilAPI.isWithinBusinessHours();

// Force update
setBusinessHours(true, 'manual_test');
```

---

## Key Takeaways

1. **Don't Trust Events Alone**: `onEmbeddedMessagingWithinBusinessHours` is unreliable
2. **Use Multiple Methods**: Events + API + Fallback
3. **Wait for Initialization**: Always delay API checks by 2-3 seconds
4. **Default to Available**: Better to show chat than hide it incorrectly
5. **Consider Server-Side**: Most reliable but requires backend

---

**Status**: Recommended solution provided
**Date**: 2025-11-06
**Best Practice**: Combined approach with multiple fallbacks
