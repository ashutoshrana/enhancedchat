# Custom Client Implementation - Prechat Fields Fix

**Issue:** Unable to pass `email`, `email_custom`, and `chat_source__c` in custom implementation

---

## Solution

Add this JavaScript code to your HTML page **BEFORE** the Salesforce chat script loads:

```javascript
<script>
  // Wait for Salesforce Embedded Messaging to be ready
  window.addEventListener('onEmbeddedMessagingReady', () => {
    console.log('✅ Salesforce Embedded Messaging Ready');

    // Set hidden prechat fields
    try {
      // Get user email from your system
      // Replace this with your actual logic to get the user's email
      const userEmail = getUserEmail(); // Your function to get email

      const hiddenFields = {
        email: userEmail,
        email_custom: userEmail,
        chat_source__c: 'Website'  // Or your specific source
      };

      embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);

      console.log('✅ Prechat fields set:', hiddenFields);
    } catch (err) {
      console.error('❌ Error setting prechat fields:', err);
    }
  });

  // Helper function to get user email
  function getUserEmail() {
    // Option 1: From a cookie
    const userDetails = getCookie('userDetails');
    if (userDetails) {
      const parsed = JSON.parse(userDetails);
      return parsed.mail || parsed.email;
    }

    // Option 2: From window variable
    // return window.sei?.formApplication?.userEmail;

    // Option 3: From localStorage
    // return localStorage.getItem('userEmail');

    // Option 4: Hardcoded (for testing only)
    return 'test@example.com';
  }

  // Cookie helper function
  function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const c = cookies[i].replace(/^\s+/, '');
      if (c.indexOf(name + '=') == 0) {
        return decodeURIComponent(c.substring(name.length + 1).split('+').join(' '));
      }
    }
    return null;
  }
</script>

<!-- Your Salesforce Embedded Chat script here -->
<script type='text/javascript' src='https://service.force.com/embeddedservice/...'>
</script>
```

---

## Integration with Your Existing Code

Based on your code, you already have user details in cookies. Here's how to integrate:

```javascript
<script>
  window.addEventListener('onEmbeddedMessagingReady', () => {
    console.log('✅ Salesforce Embedded Messaging Ready');

    try {
      // Get email from your existing cookiesUtil function
      const userDetailsStr = cookiesUtil('userDetails');
      let userEmail = 'test@example.com'; // Default

      if (userDetailsStr) {
        const userDetails = JSON.parse(userDetailsStr);
        userEmail = userDetails.mail || userDetails.email || userEmail;
      }

      // Set hidden prechat fields
      const hiddenFields = {
        email: userEmail,
        email_custom: userEmail,
        chat_source__c: 'Application Portal'  // Or specific to your client
      };

      embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);

      console.log('✅ Prechat fields set successfully:', hiddenFields);
    } catch (err) {
      console.error('❌ Error setting prechat fields:', err);
    }
  });
</script>
```

---

## Common Issues and Fixes

### Issue 1: Event Not Firing

**Problem:** `onEmbeddedMessagingReady` event doesn't fire

**Solution:** Make sure the event listener is added BEFORE the Salesforce chat script loads:

```html
<!-- 1. Add event listener FIRST -->
<script>
  window.addEventListener('onEmbeddedMessagingReady', () => {
    // Set prechat fields here
  });
</script>

<!-- 2. Then load Salesforce chat script -->
<script type='text/javascript' src='https://service.force.com/...'>
</script>
```

---

### Issue 2: embeddedservice_bootstrap is Undefined

**Problem:** `embeddedservice_bootstrap` is not defined when trying to set fields

**Solution:** Always check if it exists:

```javascript
window.addEventListener('onEmbeddedMessagingReady', () => {
  if (typeof embeddedservice_bootstrap !== 'undefined' && embeddedservice_bootstrap.prechatAPI) {
    // Safe to set fields
    embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields({...});
  } else {
    console.error('embeddedservice_bootstrap.prechatAPI not available');
  }
});
```

---

### Issue 3: Fields Not Appearing in Salesforce

**Problem:** Fields are set but not appearing in Salesforce conversation

**Checklist:**
1. ✅ Field API names must match Salesforce configuration
2. ✅ Check Network tab - POST to `/conversation` endpoint
3. ✅ Verify payload contains `routingAttributes` with your fields
4. ✅ Ensure fields are configured in Salesforce Omni Flow routing

**Debug:**
```javascript
// Add this to see what's being sent
window.addEventListener('onEmbeddedMessagingReady', () => {
  const hiddenFields = {
    email: userEmail,
    email_custom: userEmail,
    chat_source__c: 'Application Portal'
  };

  embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);

  // Debug: Log the fields
  console.log('📋 Hidden fields set:', JSON.stringify(hiddenFields, null, 2));

  // Debug: Check network request
  console.log('🌐 Open Network tab and filter for "conversation" to see POST request');
});
```

---

## Full Working Example

```html
<!DOCTYPE HTML>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Chat Integration</title>

  <script>
    // Your existing cookiesUtil function
    const cookiesUtil = function (name, value) {
      if (arguments.length < 2) {
        // read cookie
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const c = cookies[i].replace(/^\s+/, '');
          if (c.indexOf(name + '=') == 0) {
            return decodeURIComponent(c.substring(name.length + 1).split('+').join(' '));
          }
        }
        return null;
      }
      // write cookie
      document.cookie = name + "=" + encodeURIComponent(value) + ";path=/"
    };

    // Salesforce Embedded Messaging Ready Event
    window.addEventListener('onEmbeddedMessagingReady', () => {
      console.log('========================================');
      console.log('✅ Salesforce Embedded Messaging Ready');
      console.log('========================================');

      try {
        // Get user email from cookies
        const userDetailsStr = cookiesUtil('userDetails');
        let userEmail = 'guest@example.com';

        if (userDetailsStr) {
          try {
            const userDetails = JSON.parse(userDetailsStr);
            userEmail = userDetails.mail || userDetails.email || userEmail;
            console.log('📧 User email retrieved:', userEmail);
          } catch (e) {
            console.warn('Could not parse userDetails:', e);
          }
        } else {
          console.warn('⚠️ No userDetails cookie found, using default email');
        }

        // Determine if user is authenticated
        const isLoggedIn = cookiesUtil('isLoggedIn') === 'true';
        console.log('🔐 User authenticated:', isLoggedIn);

        // Set hidden prechat fields
        const hiddenFields = {
          email: userEmail,
          email_custom: userEmail,
          chat_source__c: 'Application Portal'
        };

        embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);

        console.log('✅ Prechat fields set successfully:');
        console.log('   📧 email:', userEmail);
        console.log('   📧 email_custom:', userEmail);
        console.log('   🌐 chat_source__c: Application Portal');
        console.log('========================================');

      } catch (err) {
        console.error('========================================');
        console.error('❌ Error setting prechat fields:', err);
        console.error('========================================');
      }
    });
  </script>

  <!-- Salesforce Embedded Chat Script -->
  <script type='text/javascript' src='https://strategiced--qasf.sandbox.my.salesforce-scrt.com/content/g/js/67.0/embed.js'></script>
  <script type='text/javascript'>
    embeddedservice_bootstrap.settings.language = 'en_US';

    embeddedservice_bootstrap.init(
      '00DEc00000GfZ2M',
      'admission_github',
      'https://strategiced--qasf.sandbox.my.site.com/ESWadmissiongithub1762055730119',
      {
        scrt2URL: 'https://strategiced--qasf.sandbox.my.salesforce-scrt.com'
      }
    );
  </script>
</head>
<body>
  <h1>Application Page</h1>
  <!-- Your page content -->
</body>
</html>
```

---

## Testing

1. **Open browser DevTools (F12)**
2. **Go to Console tab**
3. **Look for logs:**
   ```
   ✅ Salesforce Embedded Messaging Ready
   📧 User email retrieved: john@example.com
   🔐 User authenticated: true
   ✅ Prechat fields set successfully:
      📧 email: john@example.com
      📧 email_custom: john@example.com
      🌐 chat_source__c: Application Portal
   ```
4. **Click chat button**
5. **Go to Network tab**
6. **Filter for: `conversation`**
7. **Find POST request**
8. **Click → Payload tab**
9. **Verify routingAttributes:**
   ```json
   {
     "routingAttributes": {
       "email": "john@example.com",
       "email_custom": "john@example.com",
       "chat_source__c": "Application Portal"
     }
   }
   ```

---

## Key Points

✅ **DO:**
- Add event listener BEFORE Salesforce chat script
- Get user email from your authentication system
- Use exact field API names from Salesforce
- Check console logs for debugging
- Verify network request payload

❌ **DON'T:**
- Add event listener AFTER Salesforce script loads
- Hardcode emails in production
- Use wrong field names (check Salesforce config)
- Set fields multiple times (causes conflicts)
- Call `setHiddenPrechatFields()` on button click (already set)

---

## Alternative: Set on Chat Button Click

If you need to set fields right before launching chat:

```javascript
// Custom chat button click handler
document.getElementById('myChatButton').addEventListener('click', () => {
  // Get fresh user email
  const userEmail = getUserEmail();

  // Set fields
  const hiddenFields = {
    email: userEmail,
    email_custom: userEmail,
    chat_source__c: 'Application Portal'
  };

  embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields(hiddenFields);

  console.log('✅ Fields set before launch:', hiddenFields);

  // Launch chat
  embeddedservice_bootstrap.utilAPI.launchChat();
});
```

---

**Created:** 2025-11-02
**Issue:** Unable to pass prechat fields in custom implementation
**Solution:** Use onEmbeddedMessagingReady event to set fields
**Status:** Ready for implementation
