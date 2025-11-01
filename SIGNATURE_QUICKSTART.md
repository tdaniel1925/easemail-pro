# 🚀 Email Signature Quick Start Guide

## For Users

### Creating Your First Signature

1. **Navigate to Settings**
   - Click your profile icon in the sidebar
   - Select "Settings"
   - Click "Signatures" in the left menu

2. **Click "New Signature"**
   - A modal editor will open

3. **Fill in Details**
   - **Name**: Give your signature a name (e.g., "Work Signature")
   - **Account**: Choose "All Accounts" or select a specific account
   
4. **Build Your Signature**
   - Click template variable buttons to insert:
     - `{{fullName}}` - Your full name
     - `{{email}}` - Your email address
     - `{{title}}` - Your job title
     - `{{company}}` - Your company
     - `{{phone}}` - Phone number
     - And more!
   
   - Use formatting toolbar:
     - **Bold**, *Italic*, <u>Underline</u>
     - Add links
   
   - Click "Preview" to see how it looks
   - Click "HTML" to edit source code

5. **Configure Settings**
   - ✅ **Active**: Enable this signature
   - ✅ **Set as default**: Make this your default signature
   - ✅ **Use for replies**: Include in reply emails
   - ✅ **Use for forwards**: Include in forwarded emails

6. **Save**
   - Click "Save Signature"

---

### Using Signatures in Email

#### Option 1: Automatic (Recommended)
Your signature is **automatically inserted** when you:
- Compose a new email
- Reply to an email (if "Use for replies" is enabled)
- Forward an email (if "Use for forwards" is enabled)

**No action needed!** Just start typing your message.

#### Option 2: Manual Control
In the email composer toolbar:
- **Pen Icon** (🖊️): Toggle signature on/off
  - Checkmark = signature is active
  - No checkmark = signature removed
  
- **Signature Dropdown**: Switch between signatures (if you have multiple)
  - Select a different signature from the list
  - Old signature is removed, new one inserted

---

### Managing Signatures

#### Edit a Signature
1. Go to Settings → Signatures
2. Find the signature card
3. Click "Edit" button
4. Make changes in the modal
5. Click "Save"

#### Delete a Signature
1. Go to Settings → Signatures
2. Find the signature card
3. Click "Delete" button
4. Confirm deletion

#### Toggle Active/Inactive
1. Go to Settings → Signatures
2. Find the signature card
3. Click the toggle switch
   - **Right (blue)** = Active
   - **Left (gray)** = Inactive

---

## For Developers

### API Endpoints

```typescript
// List all signatures
GET /api/signatures
Response: { signatures: EmailSignature[] }

// Create signature
POST /api/signatures
Body: CreateSignatureRequest
Response: { signature: EmailSignature }

// Get signature
GET /api/signatures/:id
Response: { signature: EmailSignature }

// Update signature
PUT /api/signatures/:id
Body: Partial<UpdateSignatureRequest>
Response: { signature: EmailSignature }

// Delete signature
DELETE /api/signatures/:id
Response: { success: true }
```

### Using in Components

```typescript
import { useSignatures } from '@/lib/hooks/useSignatures';

function MyComponent() {
  const {
    signatures,        // All user signatures
    loading,          // Loading state
    error,            // Error message
    getDefaultSignature,
    getSignatureForAccount,
    getApplicableSignature,
    renderSignature,
  } = useSignatures();

  // Get default signature
  const defaultSig = getDefaultSignature();

  // Get signature for specific account
  const accountSig = getSignatureForAccount('account-id');

  // Get signature based on email type
  const sig = getApplicableSignature('reply', 'account-id');

  // Render with template variables replaced
  const html = renderSignature(sig, userData, accountData);
}
```

### EmailCompose Integration

```typescript
<EmailCompose
  isOpen={true}
  onClose={() => {}}
  type="compose"           // or 'reply', 'reply-all', 'forward'
  accountId="account-123"  // Optional: for account-specific signatures
  replyTo={{
    to: "user@example.com",
    subject: "Re: Hello",
    messageId: "msg-123",
    body: "Original message..."  // For smart signature placement
  }}
/>
```

---

## Template Variables Reference

| Variable | Example Output |
|----------|---------------|
| `{{fullName}}` | John Doe |
| `{{firstName}}` | John |
| `{{lastName}}` | Doe |
| `{{email}}` | john@company.com |
| `{{title}}` | Product Manager |
| `{{company}}` | TechCorp Inc. |
| `{{phone}}` | +1 (555) 123-4567 |
| `{{mobile}}` | +1 (555) 987-6543 |
| `{{website}}` | www.techcorp.com |
| `{{linkedin}}` | linkedin.com/in/johndoe |
| `{{twitter}}` | @johndoe |
| `{{date}}` | 10/31/2025 |
| `{{time}}` | 2:30 PM |

---

## Example Signatures

### Professional
```html
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
  <p style="margin: 0 0 8px 0;"><strong>{{fullName}}</strong></p>
  <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">{{title}}</p>
  <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">{{company}}</p>
  <p style="margin: 0; font-size: 12px; color: #666;">
    📧 <a href="mailto:{{email}}" style="color: #0066cc;">{{email}}</a> | 📞 {{phone}}
  </p>
  <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">
    🌐 <a href="{{website}}" style="color: #0066cc;">{{website}}</a>
  </p>
</div>
```

### Minimal
```html
<div style="font-family: Arial, sans-serif; font-size: 14px;">
  <p>{{fullName}}</p>
  <p>{{email}}</p>
</div>
```

### With Social Links
```html
<div style="font-family: Arial, sans-serif; font-size: 14px;">
  <p><strong>{{fullName}}</strong> | {{title}}</p>
  <p>{{company}}</p>
  <p>
    <a href="mailto:{{email}}">{{email}}</a> | 
    <a href="{{linkedin}}">LinkedIn</a> | 
    <a href="https://twitter.com/{{twitter}}">Twitter</a>
  </p>
</div>
```

---

## FAQ

### Q: How do I disable signature for a specific email?
**A**: Click the pen icon (🖊️) in the composer toolbar to toggle it off.

### Q: Can I have different signatures for different email accounts?
**A**: Yes! When creating a signature, select a specific account instead of "All Accounts".

### Q: Will my signature appear in replies?
**A**: Only if you enabled "Use for replies" when creating/editing the signature.

### Q: How do I change which signature is used by default?
**A**: Edit a signature and check "Set as default". This will unset the default on other signatures.

### Q: Can I use HTML in my signature?
**A**: Yes! Click the "HTML" button in the editor to edit the source code directly.

### Q: Where is the signature placed in reply emails?
**A**: Automatically placed **before** the quoted content, so your signature appears above the original message.

### Q: How many signatures can I create?
**A**: Unlimited! Create as many as you need for different contexts.

---

## Troubleshooting

### Signature not appearing in composer
1. Check that signature is **Active** (Settings → Signatures)
2. For replies: Check that "Use for replies" is enabled
3. For forwards: Check that "Use for forwards" is enabled
4. Verify you have at least one active signature

### Template variables not replaced
- Variables are only replaced when signature is inserted
- Make sure variables use correct syntax: `{{variableName}}`
- User profile data must be populated for variables to work

### Can't delete signature
- Ensure you own the signature (signed in as correct user)
- Try refreshing the page and attempting again

---

## 🎉 You're All Set!

Your email signature system is ready to use. Create professional signatures in seconds and have them automatically appear in all your emails!

**Need help?** Check the full documentation: `SIGNATURE_SYSTEM_COMPLETE.md`

