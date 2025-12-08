# Chat Header Customization - Hide "Chat" Text & Fix Logo Size

## Issue
The Salesforce Embedded Messaging chat header shows:
1. ❌ "Chat" text next to the logo (unwanted)
2. ❌ Logo/image is too large or incorrectly sized

## Goal
- Remove/hide the "Chat" text from the header
- Fix the logo size to proper dimensions
- Center the logo in the header

## Solution Implemented

### Approach 1: CSS Customization (Parent Page)
**Location:** [index.html:697-743](index.html#L697-L743)

Added CSS targeting Salesforce chat iframe elements:

```css
/* Hide the "Chat" text in the header */
embeddedMessagingFrame::part(header-title-text),
.embeddedServiceSidebarHeader .headerText,
.slds-chat-header__title {
  display: none !important;
  visibility: hidden !important;
}

/* Fix logo/image size */
.slds-chat-header__logo img,
.embeddedServiceSidebarHeader img {
  max-width: 180px !important;
  max-height: 40px !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain !important;
}

/* Center logo in header */
.slds-chat-header,
.embeddedServiceSidebarHeader {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 12px !important;
}
```

**Limitation:** May not work if Salesforce uses Shadow DOM or cross-origin iframe restrictions.

---

### Approach 2: JavaScript Style Injection (Recommended)
**Location:** [index.html:1475-1521](index.html#L1475-L1521)

Injects custom styles directly into the chat iframe after it loads:

```javascript
window.addEventListener('onEmbeddedMessagingReady', () => {
  // ... existing prechat setup code ...

  // Customize chat header
  setTimeout(() => {
    try {
      // Find the chat iframe
      const chatFrame = document.querySelector('iframe[title*="chat" i], iframe[name*="messaging" i]');

      if (chatFrame && chatFrame.contentWindow) {
        const frameDoc = chatFrame.contentWindow.document;

        // Inject custom styles
        const style = frameDoc.createElement('style');
        style.textContent = `
          /* Hide "Chat" text */
          .slds-chat-header__title,
          .embeddedServiceSidebarHeader .headerText,
          [class*="headerText"],
          [class*="title-text"] {
            display: none !important;
            visibility: hidden !important;
          }

          /* Fix logo size */
          .slds-chat-header__logo img,
          .embeddedServiceSidebarHeader img,
          .branding-image {
            max-width: 180px !important;
            max-height: 40px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
          }

          /* Center logo */
          .slds-chat-header,
          .embeddedServiceSidebarHeader {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
        `;
        frameDoc.head.appendChild(style);
        console.log('✅ Chat header customization applied');
      }
    } catch (e) {
      console.warn('⚠️ Could not customize chat header:', e.message);
    }
  }, 1000);
});
```

**Benefits:**
- Works even with Shadow DOM
- Directly modifies iframe content
- More reliable than external CSS

**Limitation:** If Salesforce iframe is cross-origin, this may be blocked by browser security (CORS). In that case, you must use Salesforce's built-in customization options.

---

## Alternative: Salesforce Deployment Settings

If the JavaScript/CSS approaches don't work due to cross-origin restrictions, you need to configure this in **Salesforce**:

### Step 1: Edit Embedded Service Deployment
1. Go to **Salesforce Setup**
2. Search for **"Embedded Service Deployments"**
3. Click on your deployment (e.g., "admission_github")
4. Go to **"Chat Settings"** or **"Branding"** section

### Step 2: Configure Header
Look for these options:
- **Header Text/Title**: Leave empty or set to empty string
- **Show Header Text**: Disable/uncheck
- **Logo/Image**: Upload properly sized image (recommended: 180x40px or similar aspect ratio)
- **Logo Size**: Set max-width and max-height

### Step 3: Custom CSS in Salesforce
Some Salesforce deployments allow custom CSS. If available:

```css
/* In Salesforce Deployment → Custom CSS */
.slds-chat-header__title {
  display: none;
}

.slds-chat-header__logo img {
  max-width: 180px;
  max-height: 40px;
  object-fit: contain;
}
```

---

## Testing

### Test 1: Verify CSS Applied
1. Refresh the page
2. Open chat
3. Right-click on chat header → **Inspect Element**
4. Check if custom styles are present
5. Look for console log: `✅ Chat header customization applied`

### Test 2: Check Text Hidden
- Open chat
- Verify "Chat" text is not visible in header
- Only logo/image should be visible

### Test 3: Check Logo Size
- Open chat
- Verify logo is properly sized (not too large)
- Logo should be centered in header
- Logo should fit within 180px width x 40px height

### Test 4: Cross-Origin Check
If you see console warning:
```
⚠️ Could not customize chat header (cross-origin restriction)
```

This means Salesforce iframe is cross-origin and you MUST use Salesforce's built-in customization instead.

---

## Customization Options

### Adjust Logo Size
Change these values in both CSS and JavaScript:

```css
max-width: 180px !important;  /* Change to desired width */
max-height: 40px !important;  /* Change to desired height */
```

### Show Text Instead of Hiding
If you want to show different text:

```javascript
// Instead of hiding, replace text
const titleElement = frameDoc.querySelector('.slds-chat-header__title');
if (titleElement) {
  titleElement.textContent = 'Support';  // Your custom text
}
```

### Adjust Header Padding
```css
.slds-chat-header {
  padding: 12px !important;  /* Change padding */
}
```

---

## Expected Result

### Before Fix:
```
┌───────────────────────────────┐
│  [LOGO]  Chat         × ▼    │
│  (Logo too big, "Chat" text)  │
└───────────────────────────────┘
```

### After Fix:
```
┌───────────────────────────────┐
│        [LOGO]         × ▼    │
│  (Centered, proper size)      │
└───────────────────────────────┘
```

---

## Console Logs

**Success:**
```
✅ EVENT: onEmbeddedMessagingReady FIRED
✅ Chat header customization applied
```

**Cross-Origin Blocked:**
```
⚠️ Could not customize chat header (cross-origin restriction): SecurityError
```

---

## Troubleshooting

### Issue 1: Styles Not Applied
**Symptoms:** "Chat" text still visible, logo still wrong size

**Solutions:**
1. Check browser console for errors
2. Inspect chat iframe to see if styles are present
3. Try increasing `setTimeout` delay (change 1000 to 2000)
4. Check if iframe is cross-origin (use Salesforce settings instead)

### Issue 2: Cross-Origin Error
**Symptoms:** Console shows security error

**Solution:** You MUST configure this in Salesforce Deployment Settings. External JavaScript cannot modify cross-origin iframes due to browser security.

### Issue 3: Styles Reverted After Chat Opens
**Symptoms:** Customization works initially but resets when chat opens

**Solution:** Add the customization logic to `onEmbeddedMessagingConversationStarted` event as well:

```javascript
window.addEventListener('onEmbeddedMessagingConversationStarted', () => {
  // Apply same customization again
  setTimeout(() => {
    // ... same iframe style injection code ...
  }, 500);
});
```

---

## Important Notes

1. **Browser Security:** If Salesforce serves the chat iframe from a different origin (different domain), browsers will block JavaScript from accessing iframe content. This is a security feature and cannot be bypassed from the client side.

2. **Salesforce Updates:** When Salesforce updates their Embedded Messaging component, class names might change. You may need to update the selectors.

3. **Best Practice:** Always configure branding in Salesforce Deployment Settings when possible. Client-side customization should be a last resort.

4. **Testing:** Test in multiple browsers (Chrome, Firefox, Safari, Edge) as iframe security policies may differ.

---

## Related Files
- **CSS Customization:** [index.html:697-743](index.html#L697-L743)
- **JavaScript Injection:** [index.html:1475-1521](index.html#L1475-L1521)
- **onEmbeddedMessagingReady Event:** [index.html:1416](index.html#L1416)

---

## Status
✅ **IMPLEMENTED** - Both CSS and JavaScript approaches added for chat header customization

**Recommended:** If cross-origin issues occur, configure in Salesforce Deployment Settings instead.

---
**Date Implemented:** 2025-11-06
**Issue:** Remove "Chat" text and fix logo size in Salesforce chat header
**Solution:** Dual approach (CSS + JavaScript iframe injection)
