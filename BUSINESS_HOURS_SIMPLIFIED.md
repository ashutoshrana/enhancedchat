# Business Hours Logic Simplification

## Current Problem

The existing implementation has overly complex business hours detection:
- Multiple event listeners (3 different business hours events)
- API polling with 5 retry attempts over 15 seconds
- Complex fallback logic with manual state tracking
- Attempts to manually show/hide chat button

This complexity causes issues:
- Business hours detection unreliable
- Debugging information not matching actual state
- Manual overrides conflicting with Salesforce's automatic handling

## Salesforce Recommended Approach

According to [Salesforce Documentation](https://developer.salesforce.com/docs/service/messaging-web/guide/show-hide-chat.html):

### Key Points:
1. **Automatic Business Hours Handling**: "By default, the chat button is always shown if no business hours are specified. If business hours are specified, the chat button is shown during business hours and hidden outside of business hours."

2. **Salesforce Controls Visibility**: Salesforce automatically manages button visibility based on business hours configuration - we don't need to manually control it.

3. **Manual Control Limitations**:
   - "You can't hide the chat button if the chat window is already showing"
   - Methods "don't have session continuity"
   - "If business hours are specified, these calls only override the current visibility until the next business hours interval"

4. **Simple API**: Use `embeddedservice_bootstrap.settings.hideChatButtonOnLoad` to control initial state

## Simplified Implementation Plan

### Remove:
- ❌ Complex business hours event listeners
- ❌ API polling with multiple retries
- ❌ Manual `isWithinBusinessHours` state tracking
- ❌ Manual `showChatButton()` / `hideChatButton()` calls
- ❌ Business hours fallback logic

### Keep:
- ✅ Offline form for user convenience
- ✅ Session status monitoring (for "no agents available" detection)
- ✅ Simple button to manually trigger offline form
- ✅ Debugging console logs for troubleshooting

### New Approach:

```javascript
// 1. Let Salesforce handle business hours automatically
// No manual business hours detection needed!

// 2. Provide offline form as alternative option
// Show "Leave a Message" button regardless of business hours
// Users can choose offline form if they prefer

// 3. Monitor session for "no agents available"
// Only detect when user tries to chat but no agents respond
window.addEventListener('onEmbeddedMessagingSessionStatusUpdate', (event) => {
  if (event.detail.status === 'Ended' && event.detail.reason === 'NoAgentsAvailable') {
    // Show helpful message or auto-open offline form
    showOfflineForm();
  }
});
```

## Benefits of Simplified Approach:

1. **More Reliable**: Salesforce knows business hours better than we do
2. **Less Code**: Remove ~200 lines of complex logic
3. **Easier to Debug**: Fewer moving parts, clearer behavior
4. **Better UX**: Users can access offline form anytime they want
5. **Salesforce-Aligned**: Follows official documentation

## Implementation Steps:

1. Remove all business hours event listeners
2. Remove API polling logic
3. Remove `isWithinBusinessHours` variable
4. Keep offline form always accessible via button
5. Trust Salesforce to show/hide chat button based on business hours
6. Monitor session status only for "no agents" scenario

This aligns with Salesforce's design: **Let the platform handle what it's designed to handle**.
