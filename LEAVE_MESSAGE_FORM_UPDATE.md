# Leave a Message Form - Web-to-Case Update

**Date:** 2025-11-02
**Commit:** df20256
**Purpose:** Update offline support form to match new Salesforce Web-to-Case configuration

---

## Changes Made

### Previous Configuration
The form had **4 visible fields**:
1. Name
2. Email
3. Subject
4. Message

### New Configuration
The form now has **3 visible fields** (matching old LiveMessage format):
1. **Name** - Contact name
2. **Web Email** - Email address
3. **Inquiry** - Description/message (textarea)

Plus **3 hidden fields**:
1. **subject** = "Chat Unavailable Form" (hardcoded)
2. **00NEc00000jTA0T** = "Admission Center" (Chat Source, hardcoded)
3. **external** = "1"

---

## Form HTML

### Hidden Fields
```html
<!-- Hidden fields -->
<input type="hidden" name="subject" value="Chat Unavailable Form">
<input type="hidden" name="00NEc00000jTA0T" value="Admission Center">
<input type="hidden" name="external" value="1">
```

### Visible Field 1: Name
```html
<div class="form-group">
  <label for="offline_name">Name<span class="required">*</span></label>
  <input
    type="text"
    id="offline_name"
    name="name"
    placeholder="Enter your full name"
    required
    aria-required="true"
  >
</div>
```

### Visible Field 2: Web Email
```html
<div class="form-group">
  <label for="offline_email">Web Email<span class="required">*</span></label>
  <input
    type="email"
    id="offline_email"
    name="email"
    placeholder="your.email@example.com"
    required
    aria-required="true"
  >
</div>
```

### Visible Field 3: Inquiry (Description)
```html
<div class="form-group">
  <label for="offline_message">Inquiry<span class="required">*</span></label>
  <textarea
    id="offline_message"
    name="description"
    placeholder="Please provide details about your inquiry..."
    required
    aria-required="true"
    rows="5"
  ></textarea>
</div>
```

### Submit Button
```html
<button type="submit" class="form-submit" id="offlineSubmitBtn">
  Submit
</button>
```

---

## JavaScript Changes

### Updated Web-to-Case Payload

**File:** `index.html` (lines 1130-1151)

```javascript
// Build Web-to-Case submission data matching new Salesforce configuration
// Hidden fields from form: subject="Chat Unavailable Form", 00NEc00000jTA0T="Admission Center"
const webToCaseData = new URLSearchParams({
  orgid: '00DEc00000GfZ2M',
  // retURL intentionally omitted - we handle UI in JavaScript
  name: formData.get('name'),
  email: formData.get('email'),
  subject: formData.get('subject'), // "Chat Unavailable Form" (hidden field)
  description: formData.get('description'),
  '00NEc00000jTA0T': formData.get('00NEc00000jTA0T'), // Chat Source: "Admission Center" (hidden field)
  external: formData.get('external') // "1" (hidden field)
});

console.log('📧 Submitting Web-to-Case (Leave a Message Form):', {
  name: formData.get('name'),
  email: formData.get('email'),
  subject: formData.get('subject'), // Will be "Chat Unavailable Form"
  description: formData.get('description'),
  chatSource: formData.get('00NEc00000jTA0T'), // Will be "Admission Center"
  external: formData.get('external'), // Will be "1"
  note: 'User will stay on current page after submission'
});
```

---

## Field Mapping

| Form Field | Salesforce Field | Value | Type |
|------------|------------------|-------|------|
| name | name | User input | Visible |
| email | email | User input | Visible |
| description | description | User input (Inquiry) | Visible |
| subject | subject | "Chat Unavailable Form" | Hidden |
| 00NEc00000jTA0T | Chat Source | "Admission Center" | Hidden |
| external | external | "1" | Hidden |

---

## Salesforce Web-to-Case Configuration Reference

Based on provided Web-to-Case HTML:

```html
<form action="https://strategiced--qasf.sandbox.my.salesforce.com/servlet/servlet.WebToCase?encoding=UTF-8&orgId=00DEc00000GfZ2M" method="POST">

<input type=hidden name="orgid" value="00DEc00000GfZ2M">
<input type=hidden name="retURL" value="http://google.com">

<label for="name">Contact Name</label>
<input id="name" maxlength="80" name="name" size="20" type="text" />

<label for="email">Email</label>
<input id="email" maxlength="80" name="email" size="20" type="text" />

<label for="subject">Subject</label>
<input id="subject" maxlength="80" name="subject" size="20" type="text" />

<label for="description">Description</label>
<textarea name="description"></textarea>

Chat Source:
<select id="00NEc00000jTA0T" name="00NEc00000jTA0T" title="Chat Source">
  <option value="">--None--</option>
  <option value="Admission Center">Admission Center</option>
  <option value="Advising">Advising</option>
  <option value="Visitor Center">Visitor Center</option>
</select>

<input type="hidden" id="external" name="external" value="1" />

<input type="submit" name="submit">
</form>
```

Our implementation:
- ✅ Uses same orgId: `00DEc00000GfZ2M`
- ✅ Sends same field names: `name`, `email`, `subject`, `description`
- ✅ Sends Chat Source field: `00NEc00000jTA0T`
- ✅ Sends external flag: `external = "1"`
- ✅ Hardcodes subject: "Chat Unavailable Form"
- ✅ Hardcodes Chat Source: "Admission Center"
- ❌ Omits retURL (we handle UI in JavaScript, no navigation)

---

## User Experience

### When Form Appears
The "Leave a Message" form appears when:
- Chat is outside business hours, OR
- No agents are available, OR
- Chat routing fails

### User Sees
1. Form title: **"Contact Us"**
2. Message: **"Our support team is currently unavailable. Please leave your message and we'll get back to you as soon as possible."**
3. **3 input fields:**
   - Name (text input)
   - Web Email (email input)
   - Inquiry (textarea)
4. **Submit button**

### User Does NOT See
- Subject field (hardcoded to "Chat Unavailable Form")
- Chat Source field (hardcoded to "Admission Center")
- External flag (hardcoded to "1")

### After Submission
1. Form shows success message: **"Thank you! We've received your message and will get back to you soon."**
2. User stays on the same page (no navigation)
3. After 5 seconds, form resets and can be used again

---

## Console Debugging

When form is submitted, console shows:

```
📧 Submitting Web-to-Case (Leave a Message Form): {
  name: "John Doe",
  email: "john.doe@example.com",
  subject: "Chat Unavailable Form",
  description: "I need help with my application.",
  chatSource: "Admission Center",
  external: "1",
  note: "User will stay on current page after submission"
}
```

```
✅ Web-to-Case submitted successfully
✅ User remains on current page - no navigation occurred
```

---

## Testing Instructions

### Test 1: Form Display
1. Open: https://ashutoshrana.github.io/enhancedchat/
2. Wait for page to load
3. If chat is unavailable, click "Leave a Message" button
4. Verify form shows **3 visible fields**:
   - Name
   - Web Email
   - Inquiry
5. Verify no Subject field is visible

### Test 2: Form Submission
1. Fill in all 3 fields:
   - Name: "Test User"
   - Web Email: "test@example.com"
   - Inquiry: "This is a test inquiry"
2. Click "Submit"
3. Open browser console (F12)
4. Verify console log shows:
   - subject: "Chat Unavailable Form"
   - chatSource: "Admission Center"
   - external: "1"
5. Verify success message appears
6. Verify user stays on same page (no navigation)

### Test 3: Salesforce Case Creation
1. Submit form as in Test 2
2. Log in to Salesforce
3. Go to Cases
4. Find the newly created case
5. Verify case fields:
   - **Contact Name**: "Test User"
   - **Email**: "test@example.com"
   - **Subject**: "Chat Unavailable Form" ✅
   - **Description**: "This is a test inquiry"
   - **Chat Source (00NEc00000jTA0T)**: "Admission Center" ✅
   - **External**: "1" ✅

---

## Differences from Previous Version

| Aspect | Before | After |
|--------|--------|-------|
| Visible fields | 4 (Name, Email, Subject, Message) | 3 (Name, Web Email, Inquiry) |
| Subject field | User input | Hardcoded: "Chat Unavailable Form" |
| Chat Source | Not included | Hardcoded: "Admission Center" |
| External flag | Not included | Hardcoded: "1" |
| Email label | "Email" | "Web Email" |
| Message label | "Message" | "Inquiry" |
| Button text | "Send Message" | "Submit" |

---

## Why These Changes?

### Business Requirement
Match the **old LiveMessage format** which had:
- 3 visible fields: Name, Email, Inquiry
- Subject hardcoded as "Chat Unavailable Form"
- Chat Source sent as hidden field: "Admission Center"

### Alignment with Web-to-Case
The new configuration matches the provided Salesforce Web-to-Case form structure:
- Uses correct field API names
- Sends Chat Source using correct field ID: `00NEc00000jTA0T`
- Includes external flag as required
- Uses "Admission Center" as the default Chat Source value

---

## Related Documentation

- **[SESSION_SUMMARY_2025-11-02.md](./SESSION_SUMMARY_2025-11-02.md)** - Full session summary
- **[NO_NAVIGATION_FORM_SUBMISSION.md](./NO_NAVIGATION_FORM_SUBMISSION.md)** - Form submission without navigation
- **[CAPELLA_FORM_STYLING.md](./CAPELLA_FORM_STYLING.md)** - Form styling guide
- **[LEAVE_MESSAGE_BUTTON_VALIDATION.md](./LEAVE_MESSAGE_BUTTON_VALIDATION.md)** - Button behavior validation

---

## Files Modified

### index.html

**Lines 799-847: Form HTML**
- Changed to 3 visible fields + 3 hidden fields
- Updated labels: "Email" → "Web Email", "Message" → "Inquiry"
- Removed visible Subject field
- Added hidden fields: subject, 00NEc00000jTA0T (Chat Source), external
- Changed button text: "Send Message" → "Submit"

**Lines 1130-1151: JavaScript submission**
- Updated Web-to-Case payload to include new fields
- Updated console logs to show hidden field values
- Removed old Business Unit and Record Type fields

**Lines 1177, 1196: Button text reset**
- Changed from "Send Message" to "Submit"

---

## Deployment Status

✅ **Deployed:** https://ashutoshrana.github.io/enhancedchat/

**Verification:**
```bash
curl -s https://ashutoshrana.github.io/enhancedchat/ | grep -A 2 "Chat Unavailable Form"
# Should show hidden field with hardcoded value

curl -s https://ashutoshrana.github.io/enhancedchat/ | grep -A 2 "Admission Center"
# Should show hidden Chat Source field
```

---

**Last Updated:** 2025-11-02
**Commit:** df20256
**Status:** ✅ Complete and Deployed
**Format:** Matches old LiveMessage (3 visible fields + hidden Chat Source)
