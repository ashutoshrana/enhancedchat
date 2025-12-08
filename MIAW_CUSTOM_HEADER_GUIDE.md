# MIAW Custom Header - Complete Implementation Guide

## Overview
Salesforce MIAW (Messaging for In-App and Web) requires a **Custom Lightning Web Component** to fully customize the chat header (hide "Chat" text, fix logo size, etc.).

The CSS/JavaScript approaches in index.html **will NOT work** for MIAW because:
- MIAW uses Shadow DOM in iframe
- Cross-origin restrictions prevent external styling
- Salesforce's Branding section has limited options

## Solution: Create Custom LWC Header

### Option 1: Quick Fix - Branding Section (Limited)
**Location:** Salesforce Setup → Embedded Service Deployments → Your Deployment → Branding

**What you can do:**
- Upload a logo (Asset File)
- Set brand color
- Basic configuration only

**Limitations:**
- Cannot hide "Chat" text
- Cannot customize header layout
- Cannot control logo size precisely

---

### Option 2: Custom Lightning Web Component (Full Control) ⭐ RECOMMENDED

This gives you complete control over the header appearance.

## Step-by-Step Implementation

### Step 1: Create Lightning Web Component

Create a new LWC bundle named `capellaMessagingHeader` with 4 files:

#### File 1: `capellaMessagingHeader.html`
```html
<template>
  <header class="chat-header">
    <!-- Menu Button (Three Dots) -->
    <button
      class="menu-button"
      onclick={handleMenuClick}
      aria-label="Menu">
      <lightning-icon
        icon-name="utility:threedots_vertical"
        size="small"
        alternative-text="Menu">
      </lightning-icon>
    </button>

    <!-- Capella Logo (Centered, No Text) -->
    <div class="logo-container">
      <img
        src="https://your-salesforce-org.file.force.com/servlet/servlet.FileDownload?file=YOUR_FILE_ID"
        alt="Capella University"
        class="header-logo">
    </div>

    <!-- Minimize Button -->
    <button
      class="action-button"
      onclick={handleMinimize}
      aria-label="Minimize">
      <lightning-icon
        icon-name="utility:minimize_window"
        size="small"
        alternative-text="Minimize">
      </lightning-icon>
    </button>

    <!-- Close Button -->
    <button
      class="action-button"
      onclick={handleClose}
      aria-label="Close">
      <lightning-icon
        icon-name="utility:close"
        size="small"
        alternative-text="Close">
      </lightning-icon>
    </button>

    <!-- Dropdown Menu (Hidden by default) -->
    <div if:true={showMenu} class="dropdown-menu">
      <button
        class="menu-item"
        onclick={handleEndConversation}>
        End Conversation
      </button>
      <!-- Add more menu items as needed -->
    </div>
  </header>
</template>
```

**Important:** Replace `YOUR_FILE_ID` with your actual Capella logo file ID from Salesforce Files.

---

#### File 2: `capellaMessagingHeader.js`
```javascript
import { LightningElement, track } from 'lwc';
import {
  dispatchMessagingEvent,
  assignMessagingEventHandler,
  MESSAGING_EVENT
} from 'lightningsnapin/eventStore';

export default class CapellaMessagingHeader extends LightningElement {
  @track showMenu = false;

  // Handle menu button click
  handleMenuClick() {
    this.showMenu = !this.showMenu;
  }

  // Handle minimize button click
  handleMinimize() {
    // Dispatch minimize event to Salesforce
    dispatchMessagingEvent({
      eventType: MESSAGING_EVENT.MINIMIZE_CONVERSATION
    });
    this.showMenu = false;
  }

  // Handle close button click
  handleClose() {
    // Dispatch close event to Salesforce
    dispatchMessagingEvent({
      eventType: MESSAGING_EVENT.CLOSE_CONVERSATION
    });
    this.showMenu = false;
  }

  // Handle end conversation menu item
  handleEndConversation() {
    // Dispatch end conversation event
    dispatchMessagingEvent({
      eventType: MESSAGING_EVENT.END_CONVERSATION
    });
    this.showMenu = false;
  }

  // Listen for messaging events
  connectedCallback() {
    // Handle conversation updates
    assignMessagingEventHandler({
      eventType: MESSAGING_EVENT.CONVERSATION_UPDATED,
      handler: (event) => {
        console.log('Conversation updated:', event);
        // Add custom logic here if needed
      }
    });

    // Handle participant joined
    assignMessagingEventHandler({
      eventType: MESSAGING_EVENT.PARTICIPANT_JOINED,
      handler: (event) => {
        console.log('Participant joined:', event);
        // Add custom logic here if needed
      }
    });
  }
}
```

---

#### File 3: `capellaMessagingHeader.css`
```css
/* Chat Header Container */
.chat-header {
  background-color: #C10016; /* Capella Red */
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
}

/* Menu Button (Three Dots) */
.menu-button {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.menu-button:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

/* Logo Container - Centered */
.logo-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 16px;
}

/* Header Logo - Fixed Size */
.header-logo {
  max-width: 180px;
  max-height: 40px;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

/* Action Buttons (Minimize, Close) */
.action-button {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
  margin-left: 4px;
}

.action-button:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.action-button:active {
  background-color: rgba(255, 255, 255, 0.25);
}

/* Dropdown Menu */
.dropdown-menu {
  position: absolute;
  top: 60px;
  left: 0;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: white;
  color: #374151;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background-color: #F3F4F6;
}

.menu-item:active {
  background-color: #E5E7EB;
}

/* Lightning Icons Color Override */
:host lightning-icon {
  --slds-c-icon-color-foreground-default: white;
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .chat-header {
    padding: 10px 12px;
    height: 56px;
  }

  .header-logo {
    max-width: 140px;
    max-height: 32px;
  }

  .menu-button,
  .action-button {
    padding: 6px;
  }
}
```

---

#### File 4: `capellaMessagingHeader.js-meta.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>59.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightningSnapin__MessagingHeader</target>
    </targets>
    <masterLabel>Capella Messaging Header</masterLabel>
    <description>Custom header for Capella University MIAW chat with logo only, no text</description>
</LightningComponentBundle>
```

---

## Step 2: Upload Capella Logo to Salesforce

### Upload Logo as Static Resource:
1. Go to **Setup** → Search for **"Static Resources"**
2. Click **New**
3. Name: `CapellaLogo`
4. Choose File: Upload your Capella logo (PNG recommended, ~180x40px)
5. Cache Control: Public
6. Click **Save**

### Get the Resource URL:
Your logo URL will be:
```
{!$Resource.CapellaLogo}
```

Or use Files:
1. Go to **Files** tab
2. Upload logo
3. Click on file → Get Public Link
4. Copy the file ID from URL

Update `capellaMessagingHeader.html` line 16 with your logo URL.

---

## Step 3: Deploy the LWC

### Using VS Code with Salesforce Extensions:
1. Open your Salesforce project in VS Code
2. Create folder: `force-app/main/default/lwc/capellaMessagingHeader/`
3. Add all 4 files to this folder
4. Right-click folder → **SFDX: Deploy Source to Org**

### Using Developer Console (Alternative):
1. Developer Console → File → New → Lightning Component
2. Create the component with all files
3. Save each file

---

## Step 4: Configure Embedded Service Deployment

### Register Custom Header:
1. Go to **Setup** → Search for **"Embedded Service Deployments"**
2. Click on your deployment (e.g., "admission_github")
3. Go to **"Custom UI Components"** section
4. Under **"Messaging Conversation Window Header"**:
   - Select: **"Use custom component"**
   - Choose: **"c:capellaMessagingHeader"**
5. Click **Save**

### Test the Deployment:
1. Copy the updated deployment code snippet
2. Paste it into your `index.html` (replace existing chat script)
3. Test the chat
4. Verify header shows:
   - ✅ Only Capella logo (centered)
   - ✅ No "Chat" text
   - ✅ Logo is properly sized
   - ✅ Minimize and close buttons work

---

## Customization Options

### Change Logo Size:
Edit `capellaMessagingHeader.css` line 40-44:
```css
.header-logo {
  max-width: 200px;  /* Change to desired width */
  max-height: 50px;  /* Change to desired height */
}
```

### Change Header Color:
Edit `capellaMessagingHeader.css` line 2:
```css
.chat-header {
  background-color: #C10016;  /* Change to your color */
}
```

### Add Header Text (If Needed):
In `capellaMessagingHeader.html`, add after logo:
```html
<div class="header-title">
  <span>Support</span>
</div>
```

And style in CSS:
```css
.header-title {
  font-size: 18px;
  font-weight: 600;
  margin-left: 12px;
}
```

---

## Troubleshooting

### Issue 1: Component Not Appearing in Dropdown
**Cause:** Component not deployed or meta file incorrect

**Solution:**
- Verify `js-meta.xml` has `<target>lightningSnapin__MessagingHeader</target>`
- Redeploy the component
- Refresh Setup page

### Issue 2: Logo Not Displaying
**Cause:** Incorrect logo URL or file not accessible

**Solution:**
- Verify logo file is uploaded to Salesforce
- Check file permissions (should be publicly accessible)
- Use Static Resource instead of Files if issues persist
- Test logo URL directly in browser

### Issue 3: Buttons Not Working
**Cause:** Event handlers not properly configured

**Solution:**
- Check browser console for errors
- Verify `lightningsnapin/eventStore` imports
- Ensure `MESSAGING_EVENT` constants are correct
- Test with Salesforce's default events first

### Issue 4: Styling Not Applied
**Cause:** CSS specificity or Shadow DOM issues

**Solution:**
- Use `!important` for critical styles
- Check for CSS conflicts
- Test in different browsers
- Use browser DevTools to inspect applied styles

---

## Alternative: Simple Logo-Only Header

If you just want a logo with no buttons, use this simplified version:

### Simplified HTML:
```html
<template>
  <header class="chat-header">
    <div class="logo-container">
      <img
        src="{!$Resource.CapellaLogo}"
        alt="Capella University"
        class="header-logo">
    </div>
  </header>
</template>
```

### Simplified CSS:
```css
.chat-header {
  background-color: #C10016;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
}

.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.header-logo {
  max-width: 180px;
  max-height: 40px;
  object-fit: contain;
}
```

This removes all buttons and just shows a centered logo.

---

## Testing Checklist

- [ ] LWC deployed successfully
- [ ] Logo uploaded to Salesforce
- [ ] Logo URL updated in HTML
- [ ] Component registered in Embedded Service Deployment
- [ ] Header appears in chat window
- [ ] Logo displays correctly (no "Chat" text)
- [ ] Logo is properly sized
- [ ] Minimize button works
- [ ] Close button works
- [ ] Menu button works (if included)
- [ ] Header looks good on mobile
- [ ] No console errors

---

## Important Notes

1. **Cannot Use External CSS/JS:** MIAW rendering happens server-side in Salesforce. External styling from `index.html` will NOT work.

2. **Must Use LWC:** Custom header requires a Lightning Web Component targeting `lightningSnapin__MessagingHeader`.

3. **Logo Must Be in Salesforce:** Upload logo to Salesforce Files or Static Resources. Cannot use external URLs.

4. **Test in Sandbox First:** Always test custom components in sandbox before deploying to production.

5. **API Version:** Use API version 59.0 or higher for latest MIAW features.

---

## Expected Result

### Before (Default MIAW Header):
```
┌────────────────────────────────────┐
│  ⋮  [Logo]  Chat         ▼  ×     │
└────────────────────────────────────┘
```

### After (Custom Header):
```
┌────────────────────────────────────┐
│  ⋮      [Capella Logo]     ▼  ×   │
│        (Centered, No Text)          │
└────────────────────────────────────┘
```

---

## Resources

- **Salesforce Official Docs:** https://developer.salesforce.com/docs/service/messaging-web/guide/customize-header.html
- **LWC Documentation:** https://developer.salesforce.com/docs/component-library/overview/components
- **MIAW Developer Guide:** https://developer.salesforce.com/docs/service/messaging-web/overview
- **Trailhead Module:** Search for "Customize Messaging for In-App and Web"

---

## Status
📋 **DOCUMENTED** - Complete LWC implementation guide for custom MIAW header

**Next Step:** Create and deploy the Lightning Web Component in Salesforce

---
**Date:** 2025-11-06
**Solution:** Custom Lightning Web Component targeting lightningSnapin__MessagingHeader
**Files Needed:** 4 files (HTML, JS, CSS, meta.xml)
