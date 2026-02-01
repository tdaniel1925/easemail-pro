# EaseMail Documentation

Complete documentation for users, administrators, and IT managers.

## For Users

### Getting Started
- **[Help Center](../app/(dashboard)/help/page.tsx)** - Interactive help within the app
- **[Quick Start Guide](../components/help/QuickStartGuide.tsx)** - Get up and running in 30 minutes
- **[FAQ](../components/help/FAQSection.tsx)** - Frequently asked questions

### Feature Guides
- **[Complete Email Features Guide](../components/help/articles/EmailFeaturesArticle.tsx)** - Master all email features
  - Composing emails with rich text and AI
  - Organizing with folders, labels, and rules
  - Advanced search and filters
  - Email templates and signatures
  - Scheduling and automation
  - Keyboard shortcuts

- **[Connect Email Account](../components/help/articles/ConnectEmailArticle.tsx)** - Setup Gmail, Outlook, IMAP
- **[AI Writing Assistant](../components/help/articles/AIWriteArticle.tsx)** - Use AI to write emails 10x faster
- **[Voice Dictation](../components/help/articles/VoiceDictationArticle.tsx)** - Speak your emails
- **[Email Rules & Automation](../components/help/articles/EmailRulesArticle.tsx)** - Automate email management
- **[Security & Privacy](../components/help/articles/SecurityPrivacyArticle.tsx)** - 2FA, encryption, data protection

### Technical Documentation
- **[Inbox V4 Documentation](../INBOX_V4_DOCUMENTATION.md)** - Technical details of the inbox implementation

## For IT Managers & Administrators

### Quick Reference
- **[IT Manager's Quick Reference Manual](./IT-MANAGER-QUICK-REFERENCE.md)** ⭐
  - Complete 100+ page guide for managing organization accounts
  - User management and roles
  - Security configuration (2FA, passwords, sessions)
  - Usage analytics and monitoring
  - Billing and subscriptions
  - Common tasks and troubleshooting
  - API integration examples

### Administrative Guides
- **[Organization Administration Guide](../components/help/articles/OrganizationAdminArticle.tsx)**
  - Organization setup
  - User management
  - Team configuration
  - Security policies
  - Compliance (GDPR, HIPAA)

### Database & Migrations
- **[Migration Guide](../MIGRATION_GUIDE.md)** - Database migration instructions
- **[Migration 041](../migrations/041_add_two_factor_auth.sql)** - Two-Factor Authentication
- **[Migration 042](../migrations/042_add_performance_indexes.sql)** - Performance Indexes
- **[Migration 043](../migrations/043_create_email_labels_junction.sql)** - Email Labels

## For Developers

### Setup & Installation
- **[README](../README.md)** - Project setup and installation
- **[Environment Setup](../.env.example)** - Required environment variables

### Architecture
- **[Project Structure](../README.md#-project-structure)** - Codebase organization
- **[Tech Stack](../README.md#-tech-stack)** - Technologies used

### Security
- **[CSRF Protection](../lib/security/csrf.ts)** - Cross-Site Request Forgery prevention
- **[Email Encryption](../lib/encryption/email.ts)** - AES-256-GCM encryption at rest
- **[Logging System](../lib/logger/index.ts)** - Centralized logging
- **[Error Handling](../lib/errors/api-error.ts)** - Consistent error management

### Testing
- **[Test Suite](../__tests__)** - Comprehensive test coverage
- **[Migration Script](../scripts/run-migrations.ts)** - Automated migrations

## Quick Links

| Audience | Primary Resource | Time to Read |
|----------|-----------------|--------------|
| **New Users** | [Quick Start Guide](../components/help/QuickStartGuide.tsx) | 25 min |
| **IT Managers** | [IT Manager's Quick Reference](./IT-MANAGER-QUICK-REFERENCE.md) | 2 hours |
| **Administrators** | [Organization Admin Guide](../components/help/articles/OrganizationAdminArticle.tsx) | 45 min |
| **Developers** | [README](../README.md) + [Inbox V4 Docs](../INBOX_V4_DOCUMENTATION.md) | 1 hour |

## Documentation Updates

### Recent Additions (February 2026)
- ✅ IT Manager's Quick Reference Manual (100+ pages)
- ✅ Complete Email Features Guide
- ✅ Security & Privacy Guide
- ✅ Organization Administration Guide
- ✅ Database migration documentation
- ✅ CSRF Edge Runtime compatibility fix

### Upcoming
- [ ] Mobile app user guide
- [ ] API documentation
- [ ] Video tutorial series
- [ ] Webhook integration guide
- [ ] SSO configuration examples

## Getting Help

### Users
- **In-App Help**: Click "?" icon or press `?`
- **Help Center**: `/help` within the application
- **Support**: support@easemail.com
- **Community**: community.easemail.com

### Enterprise Customers
- **Phone Support**: +1 (555) 123-4567 (24/7)
- **Email**: enterprise@easemail.com
- **Account Manager**: Contact your dedicated account manager
- **Status Page**: status.easemail.com

### Developers
- **GitHub Issues**: github.com/easemail/issues
- **API Docs**: api.easemail.com/docs
- **Developer Portal**: developers.easemail.com

## Contributing to Documentation

Found an error or want to improve the docs?

1. Fork the repository
2. Update the documentation
3. Submit a pull request
4. Our team will review and merge

Documentation follows Markdown format with GitHub-flavored enhancements.

---

**Last Updated:** February 1, 2026
**Documentation Version:** 2.0

© 2026 EaseMail. All rights reserved.
