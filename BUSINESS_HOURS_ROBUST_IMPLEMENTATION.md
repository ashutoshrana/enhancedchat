# Business Hours - Salesforce-Aligned Implementation

## Core Principle (from Salesforce Documentation)

> "By default, the chat button is always shown if no business hours are specified. If business hours are specified, the chat button is shown during business hours and hidden outside of business hours."

**Translation**: Salesforce automatically manages chat button visibility based on business hours configuration. We don't need to (and shouldn't) manually control it.

## What We Should Remove

The current implementation tries to manually detect and control business hours, which conflicts with Salesforce's automatic handling. This causes unreliable behavior and debugging issues.

### Remove These (~200 lines):
- Business hours event listeners (3 different events)
- API polling with retries
- Manual `isWithinBusinessHours` state tracking
- `showChatButton()` / `hideChatButton()` based on business hours
- Complex `updateChatAvailability()` function

### Keep Only:
- Offline form as user choice (always available)
- Session status monitoring for "no agents available"
- Simple, reactive detection

## Recommended Simplification

Let Salesforce handle business hours automatically. We only provide offline form as an alternative option and detect "no agents" reactively.

This aligns with Salesforce's documented design and removes ~200 lines of complex, unreliable logic.
