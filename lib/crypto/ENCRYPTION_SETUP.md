# Email Encryption at Rest Setup Guide

This guide explains how to set up and use email encryption at rest in EaseMail.

## Overview

EaseMail uses **AES-256-GCM** encryption to protect sensitive email data at rest in the database. This provides an additional layer of security against data breaches.

**What is encrypted:**
- Email body (HTML and plain text)
- Email subject lines (optional)
- Attachment content (optional)

**What is NOT encrypted:**
- Email metadata (from, to, date, folder)
- Search indexes (for performance)
- Email headers

## Why AES-256-GCM?

- **AES-256**: Industry-standard encryption, approved by NSA for top-secret data
- **GCM Mode**: Provides both encryption AND authentication (detects tampering)
- **Fast**: Hardware-accelerated on modern CPUs
- **Secure**: Resistant to known cryptographic attacks

## Setup Instructions

### 1. Generate Encryption Key

Run this command to generate a new 256-bit encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output a 64-character hex string like:
```
a1b2c3d4e5f6...xyz
```

### 2. Store Key Securely

**IMPORTANT: Keep this key SECRET. Anyone with this key can decrypt all emails.**

Add the key to your `.env.local` file:

```env
EMAIL_ENCRYPTION_KEY=your_64_character_hex_key_here
```

**Security Best Practices:**
- ✅ **DO**: Store in environment variables (`.env.local` for local, platform secrets for production)
- ✅ **DO**: Use a key management service (AWS KMS, Google Cloud KMS, HashiCorp Vault) for production
- ✅ **DO**: Rotate keys periodically (see Key Rotation section)
- ✅ **DO**: Back up the key securely (encrypted backup)
- ❌ **DON'T**: Commit the key to Git
- ❌ **DON'T**: Share the key via insecure channels
- ❌ **DON'T**: Use the same key across multiple environments

### 3. Update .gitignore

Ensure `.env.local` is in `.gitignore` to prevent committing secrets:

```gitignore
.env.local
.env.production.local
```

### 4. Verify Configuration

Check if encryption is properly configured:

```typescript
import { isEncryptionConfigured } from '@/lib/crypto/encryption';

if (isEncryptionConfigured()) {
  console.log('✅ Encryption is configured');
} else {
  console.error('❌ Encryption key not found');
}
```

### 5. Production Deployment

For production, set the environment variable in your hosting platform:

**Vercel:**
```bash
vercel env add EMAIL_ENCRYPTION_KEY production
# Paste your key when prompted
```

**Railway:**
```bash
railway vars set EMAIL_ENCRYPTION_KEY=your_key_here
```

**Docker:**
```yaml
# docker-compose.yml
environment:
  - EMAIL_ENCRYPTION_KEY=${EMAIL_ENCRYPTION_KEY}
```

## Usage

### Encrypting Email Data

```typescript
import { encrypt, encryptEmailBody } from '@/lib/crypto/encryption';

// Encrypt a single field
const encryptedSubject = encrypt(email.subject);

// Encrypt email body
const encryptedBody = encryptEmailBody({
  html: email.bodyHtml,
  text: email.bodyText,
});

// Store in database
await db.insert(emails).values({
  subject: encryptedSubject,
  bodyHtml: encryptedBody.html,
  bodyText: encryptedBody.text,
  // ... other fields
});
```

### Decrypting Email Data

```typescript
import { decrypt, decryptEmailBody } from '@/lib/crypto/encryption';

// Decrypt a single field
const plainSubject = decrypt(email.subject);

// Decrypt email body
const plainBody = decryptEmailBody({
  html: email.bodyHtml,
  text: email.bodyText,
});

// Use decrypted data
console.log('Subject:', plainSubject);
console.log('Body:', plainBody.html);
```

### Bulk Operations

```typescript
import { encryptFields, decryptFields } from '@/lib/crypto/encryption';

// Encrypt multiple fields at once
const encryptedEmail = encryptFields(email, ['subject', 'bodyHtml', 'bodyText']);

// Decrypt multiple fields at once
const decryptedEmail = decryptFields(encryptedEmail, ['subject', 'bodyHtml', 'bodyText']);
```

## Migration

If you have existing unencrypted emails in your database, you need to migrate them:

### Migration Script

```typescript
// scripts/migrate-encrypt-emails.ts
import { db } from '@/lib/db/drizzle';
import { emails } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto/encryption';

async function migrateEmails() {
  const allEmails = await db.select().from(emails);

  for (const email of allEmails) {
    // Skip if already encrypted (check for base64 format)
    if (isEncrypted(email.bodyHtml)) continue;

    // Encrypt email body
    await db.update(emails)
      .set({
        bodyHtml: encrypt(email.bodyHtml),
        bodyText: encrypt(email.bodyText),
        subject: encrypt(email.subject), // Optional
      })
      .where(eq(emails.id, email.id));

    console.log(`Encrypted email ${email.id}`);
  }

  console.log(`✅ Migrated ${allEmails.length} emails`);
}

// Run migration
migrateEmails().catch(console.error);
```

## Key Rotation

Rotating encryption keys periodically is a security best practice.

### Step 1: Generate New Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Set Both Keys

Set both old and new keys temporarily:

```env
EMAIL_ENCRYPTION_KEY=new_key_here
EMAIL_ENCRYPTION_KEY_OLD=old_key_here
```

### Step 3: Re-encrypt Data

Run a migration script that:
1. Decrypts data with old key
2. Encrypts data with new key
3. Updates database

### Step 4: Remove Old Key

After all data is re-encrypted, remove `EMAIL_ENCRYPTION_KEY_OLD`.

## Performance Considerations

**Encryption overhead:**
- ~0.5ms per email encryption
- ~0.3ms per email decryption
- Hardware-accelerated (AES-NI on modern CPUs)

**Optimization strategies:**
- Only encrypt body, not metadata (for search performance)
- Cache decrypted emails in memory (with TTL)
- Use pagination to avoid decrypting large batches

## Security Considerations

### What Encryption Protects Against

✅ **Database breaches**: Stolen database dumps are unreadable
✅ **Insider threats**: DBAs cannot read email content
✅ **Backup leaks**: Backups remain encrypted

### What Encryption Does NOT Protect Against

❌ **Application-level attacks**: If attacker has app access, they can decrypt
❌ **Memory dumps**: Decrypted data exists in memory temporarily
❌ **Transport encryption**: Use TLS for data in transit

### Defense in Depth

Encryption at rest is ONE layer of security. Also implement:
1. Strong authentication (2FA)
2. Role-based access control (RBAC)
3. Audit logging
4. Network security (VPC, firewalls)
5. Regular security audits

## Compliance

Encryption at rest helps meet compliance requirements:

- **GDPR**: Data protection and privacy
- **HIPAA**: Protected Health Information (PHI)
- **PCI-DSS**: Cardholder data protection
- **SOC 2**: Information security management

## Troubleshooting

### Error: EMAIL_ENCRYPTION_KEY not configured

**Solution:** Generate and set the encryption key (see Setup Instructions)

### Error: EMAIL_ENCRYPTION_KEY must be 32 bytes

**Solution:** Key must be exactly 64 hex characters. Regenerate:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Error: Decryption failed

**Possible causes:**
1. Wrong encryption key (check environment variable)
2. Corrupted encrypted data
3. Data was not encrypted

**Solution:**
- Verify correct key is loaded
- Check database data integrity
- Ensure data was encrypted with same key

### Emails show as empty or garbled

**Cause:** Trying to display encrypted data without decrypting

**Solution:** Use `decrypt()` function before displaying:
```typescript
const decrypted = decrypt(email.bodyHtml);
```

## FAQs

**Q: Can I disable encryption after enabling it?**
A: Yes, but you'll need to decrypt all existing data first. Run a reverse migration.

**Q: What happens if I lose the encryption key?**
A: **Data is permanently lost.** There is no recovery. Back up your key securely.

**Q: Can I use different keys for different users?**
A: Yes, but requires custom implementation. Store key ID with each record and look up appropriate key for decryption.

**Q: Does encryption affect search?**
A: Yes. Encrypted fields cannot be searched directly. Consider:
  - Keeping metadata unencrypted (from, to, date)
  - Using a separate search index
  - Client-side search on decrypted data

**Q: Is the key stored in the database?**
A: **NO.** The key must NEVER be stored in the database. It's stored in environment variables or key management services.

## Support

For questions or issues with encryption:
1. Check this documentation
2. Review error logs
3. Contact your security team
4. Open an issue on GitHub (DO NOT include your encryption key)
