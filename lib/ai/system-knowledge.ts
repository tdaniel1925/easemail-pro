/**
 * EaseMail System Knowledge Base
 * Complete reference of all features, settings, and troubleshooting
 * Used by AI Assistant to provide accurate help
 */

export interface KnowledgeItem {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  steps: string[];
  links: string[];
  tags: string[];
  shortcuts?: string[];
  relatedFeatures?: string[];
}

export interface TroubleshootingItem {
  id: string;
  problem: string;
  category: string;
  solutions: string[];
  steps: string[];
  preventionTips?: string[];
}

// ============================================================================
// FEATURES KNOWLEDGE BASE
// ============================================================================

export const FEATURES: Record<string, KnowledgeItem> = {
  'ai-write': {
    id: 'ai-write',
    name: 'AI Write',
    category: 'AI Features',
    description: 'Generate professional emails from simple prompts using AI',
    location: 'Compose window → AI toolbar → AI Write button (sparkle icon)',
    steps: [
      'Click the Compose button in sidebar',
      'Look for the sparkle icon (⚡) in the toolbar',
      'Click "AI Write" button',
      'Type what you want to say (e.g., "Thank client for meeting and send proposal")',
      'Click "Generate"',
      'Review the generated email',
      'Edit if needed, then send',
    ],
    links: ['/inbox?compose=true'],
    tags: ['ai', 'compose', 'writing', 'email', 'generation'],
    shortcuts: ['Ctrl+Shift+W'],
    relatedFeatures: ['ai-remix', 'dictate', 'email-templates'],
  },

  'ai-remix': {
    id: 'ai-remix',
    name: 'AI Remix',
    category: 'AI Features',
    description: 'Transform existing email drafts - change tone, length, or style',
    location: 'Compose window → AI toolbar → AI Remix button',
    steps: [
      'Write or paste email content',
      'Click "AI Remix" button in toolbar',
      'Choose transformation: Change tone, Make it shorter, Make it longer, Fix grammar',
      'Select specific style if changing tone',
      'Click "Remix"',
      'Review and use the remixed version',
    ],
    links: ['/inbox?compose=true'],
    tags: ['ai', 'edit', 'transform', 'tone', 'style'],
    shortcuts: ['Ctrl+Shift+R'],
    relatedFeatures: ['ai-write', 'rich-text-editor'],
  },

  'voice-dictation': {
    id: 'voice-dictation',
    name: 'Voice Dictation',
    category: 'AI Features',
    description: 'Speak to write emails using real-time speech-to-text',
    location: 'Compose window → AI toolbar → Microphone button',
    steps: [
      'Click the Compose button',
      'Click the microphone icon in toolbar',
      'Allow microphone access if prompted',
      'Start speaking - your words appear in real-time',
      'Click "Stop" when done',
      'Choose: Use As-Is or AI Polish',
      'AI Polish transforms your speech into professional email',
    ],
    links: ['/inbox?compose=true'],
    tags: ['ai', 'voice', 'speech', 'dictation', 'microphone'],
    shortcuts: ['Ctrl+D'],
    relatedFeatures: ['ai-write', 'voice-message'],
  },

  'voice-message': {
    id: 'voice-message',
    name: 'Voice Message',
    category: 'AI Features',
    description: 'Record and attach audio messages to emails',
    location: 'Compose window → AI toolbar → Voice Message button',
    steps: [
      'Click Compose',
      'Click "Voice Message" button',
      'Click "Start Recording"',
      'Speak your message',
      'Click "Stop Recording"',
      'Listen to preview',
      'Click "Attach to Email" - MP3 file is attached',
      'Add subject and send',
    ],
    links: ['/inbox?compose=true'],
    tags: ['voice', 'audio', 'recording', 'attachment'],
    shortcuts: ['Ctrl+Shift+M'],
    relatedFeatures: ['voice-dictation', 'attachments'],
  },

  'connect-email': {
    id: 'connect-email',
    name: 'Connect Email Account',
    category: 'Setup',
    description: 'Add Gmail, Outlook, or IMAP accounts to EaseMail',
    location: 'Left Sidebar → "Add Account" button (blue button at bottom of accounts list)',
    steps: [
      'Look in the left sidebar for the accounts section',
      'Scroll to the bottom of your accounts list',
      'Click the blue "Add Account" button with the + icon',
      'Choose provider: Gmail, Outlook, or IMAP/SMTP',
      'For Gmail/Outlook: Click authorize and sign in',
      'For IMAP: Enter server details, username, password',
      'Wait for sync to complete',
      'Your account appears in the sidebar',
    ],
    links: ['/inbox-v3'],
    tags: ['setup', 'gmail', 'outlook', 'imap', 'account', 'sync'],
    relatedFeatures: ['account-switcher', 'multi-account'],
  },

  'signatures': {
    id: 'signatures',
    name: 'Email Signatures',
    category: 'Settings',
    description: 'Create professional email signatures with formatting',
    location: 'Settings → Signatures',
    steps: [
      'Click Settings (gear icon) in sidebar',
      'Select "Signatures" from left menu',
      'Click "New Signature"',
      'Give it a name (e.g., "Work Signature")',
      'Use template variables: {{fullName}}, {{email}}, {{title}}, {{company}}, {{phone}}',
      'Format with bold, italic, links',
      'Set as default if desired',
      'Enable "Use for replies" and "Use for forwards"',
      'Click "Save Signature"',
    ],
    links: ['/settings?section=signatures'],
    tags: ['signature', 'settings', 'branding', 'professional'],
    relatedFeatures: ['compose', 'formatting'],
  },

  'sms-sending': {
    id: 'sms-sending',
    name: 'Send SMS',
    category: 'Communication',
    description: 'Send text messages directly from contacts',
    location: 'Contacts → Select contact → SMS button',
    steps: [
      'Go to Contacts page',
      'Find and click the contact',
      'Click SMS button (💬 icon)',
      'Type your message',
      'Click "Send SMS"',
      'Message is sent via Twilio',
    ],
    links: ['/contacts'],
    tags: ['sms', 'text', 'messaging', 'contacts', 'twilio'],
    relatedFeatures: ['contacts', 'contact-enrichment'],
  },

  'rules-automation': {
    id: 'rules-automation',
    name: 'Email Rules & Automation',
    category: 'Productivity',
    description: 'Automatically organize emails with powerful rules',
    location: 'Sidebar → Rules (⚡ icon)',
    steps: [
      'Click Rules (⚡) in sidebar',
      'Click "Create Rule"',
      'Set conditions: From contains, Subject contains, etc.',
      'Choose logic: Match ALL or Match ANY',
      'Add actions: Move to folder, Add label, Mark as read, etc.',
      'Set priority (lower number = runs first)',
      'Enable "Stop processing" if you want to prevent other rules from running',
      'Click "Save Rule"',
      'Rule runs automatically on new emails',
    ],
    links: ['/rules'],
    tags: ['automation', 'rules', 'filters', 'organize', 'productivity'],
    relatedFeatures: ['folders', 'labels', 'snooze'],
  },

  'calendar': {
    id: 'calendar',
    name: 'Calendar & Events',
    category: 'Productivity',
    description: 'Manage events, meetings, and reminders',
    location: 'Sidebar → Calendar',
    steps: [
      'Click Calendar in sidebar',
      'Click "+" or empty time slot to create event',
      'Enter event details: title, time, location, description',
      'Set reminders: 15 min, 30 min, 1 hour before',
      'Create recurring events: daily, weekly, monthly',
      'Choose view: Month, Week, Day, Agenda',
      'Drag & drop to reschedule',
      'Use Quick Add: type "Meeting tomorrow at 2pm"',
    ],
    links: ['/calendar'],
    tags: ['calendar', 'events', 'meetings', 'reminders', 'scheduling'],
    relatedFeatures: ['email-to-calendar', 'reminders'],
  },

  'contacts': {
    id: 'contacts',
    name: 'Contact Management',
    category: 'Organization',
    description: 'Store and enrich contacts with AI',
    location: 'Sidebar → Contacts',
    steps: [
      'Click Contacts in sidebar',
      'Click "+ New Contact" or create from email',
      'From email: Click sender name → "Add to Contacts"',
      'Enter contact details',
      'Save - AI enrichment happens automatically in background',
      'View enriched data: job title, company, social profiles',
      'Organize with groups and tags',
      'Send email or SMS directly from contact card',
    ],
    links: ['/contacts'],
    tags: ['contacts', 'people', 'crm', 'organization', 'ai-enrichment'],
    relatedFeatures: ['sms-sending', 'ai-enrichment', 'contact-groups'],
  },

  'search': {
    id: 'search',
    name: 'Email Search',
    category: 'Navigation',
    description: 'Find emails quickly with full-text search',
    location: 'Top of email list',
    steps: [
      'Type in the search box at top of inbox',
      'Search works on: subject, body, sender, recipient',
      'Results filter in real-time',
      'Clear search to see all emails again',
    ],
    links: ['/inbox-v3'],
    tags: ['search', 'find', 'filter', 'lookup'],
    shortcuts: ['/'],
    relatedFeatures: ['folders', 'labels'],
  },

  'compose': {
    id: 'compose',
    name: 'Compose Email',
    category: 'Email',
    description: 'Write and send emails with advanced features',
    location: 'Sidebar → Compose button',
    steps: [
      'Click "Compose" in sidebar',
      'Enter recipient email (comma-separated for multiple)',
      'Add CC/BCC if needed',
      'Enter subject line',
      'Write email body using rich text editor',
      'Use formatting toolbar: bold, italic, colors, lists, links',
      'Add attachments by clicking 📎 icon',
      'Use AI features: AI Write, Remix, Dictate',
      'Click "Send" or Ctrl+Enter',
    ],
    links: ['/inbox?compose=true'],
    tags: ['compose', 'write', 'send', 'email', 'new'],
    shortcuts: ['C'],
    relatedFeatures: ['ai-write', 'attachments', 'signatures', 'formatting'],
  },

  'attachments': {
    id: 'attachments',
    name: 'Email Attachments',
    category: 'Email',
    description: 'View, download, and manage email attachments',
    location: 'Attachments page or email view',
    steps: [
      'In email: See attachments at bottom of message',
      'Click attachment to preview',
      'Click download icon to save',
      'Go to Attachments page to see all attachments',
      'Filter by account or search by filename',
    ],
    links: ['/attachments'],
    tags: ['attachments', 'files', 'documents', 'download'],
    relatedFeatures: ['compose', 'voice-message'],
  },
};

// ============================================================================
// TROUBLESHOOTING KNOWLEDGE BASE
// ============================================================================

export const TROUBLESHOOTING: Record<string, TroubleshootingItem> = {
  'emails-not-syncing': {
    id: 'emails-not-syncing',
    problem: 'My emails are not syncing',
    category: 'Sync Issues',
    solutions: [
      'Check your connection status in Accounts',
      'Look for error icons next to your account',
      'Reconnect your account if needed',
      'Check your internet connection',
      'Refresh the page',
    ],
    steps: [
      'Go to Inbox',
      'Check account status in sidebar (look for ❌ or ⚠️)',
      'If error shown: Click account name',
      'Click "Reconnect" button',
      'Sign in to your email provider again',
      'Wait for sync to complete',
      'If still not working: Check Settings → Accounts for more details',
    ],
    preventionTips: [
      'Keep your browser updated',
      'Don\'t change your email password without reconnecting',
      'Allow EaseMail in your email provider\'s security settings',
    ],
  },

  'ai-not-working': {
    id: 'ai-not-working',
    problem: 'AI features are not working',
    category: 'AI Issues',
    solutions: [
      'Check your subscription tier (AI requires paid plan)',
      'Verify you have AI usage remaining',
      'Check your internet connection',
      'Try refreshing the page',
      'Check if OpenAI services are up',
    ],
    steps: [
      'Go to Settings → Billing',
      'Check your plan and usage',
      'If over limit: Upgrade or wait for reset',
      'If on free plan: Upgrade to use AI features',
      'Try the feature again',
    ],
  },

  'cant-send-email': {
    id: 'cant-send-email',
    problem: 'Cannot send emails',
    category: 'Email Issues',
    solutions: [
      'Make sure recipient email is valid',
      'Check that account is connected',
      'Verify you have send permissions',
      'Check for error messages',
    ],
    steps: [
      'Check recipient email format (should be user@domain.com)',
      'For multiple recipients: separate with commas',
      'Verify account status in sidebar',
      'Try sending a test email to yourself first',
      'Check Sent folder to confirm',
    ],
  },

  'microphone-not-working': {
    id: 'microphone-not-working',
    problem: 'Microphone not working for dictation',
    category: 'AI Issues',
    solutions: [
      'Grant microphone permission to browser',
      'Check system microphone settings',
      'Try a different browser',
      'Check microphone is not muted',
    ],
    steps: [
      'Click microphone icon in compose',
      'When browser asks for permission: Click "Allow"',
      'Check browser address bar for microphone icon',
      'Click it and ensure microphone is allowed',
      'On Mac: System Preferences → Security → Microphone',
      'On Windows: Settings → Privacy → Microphone',
      'Ensure browser has access',
    ],
  },

  'attachments-not-showing': {
    id: 'attachments-not-showing',
    problem: 'Attachments not showing',
    category: 'Email Issues',
    solutions: [
      'Make sure account is connected',
      'Refresh the page',
      'Check if email actually has attachments',
      'Try opening in different browser',
    ],
    steps: [
      'Open the email',
      'Scroll to bottom of message',
      'Look for "Attachments" section',
      'If not there: Check original email in Gmail/Outlook',
      'If still missing: Reconnect account',
    ],
  },
};

// ============================================================================
// SETTINGS REFERENCE
// ============================================================================

export const SETTINGS = {
  account: {
    name: 'Account Settings',
    location: 'Settings → Account',
    items: [
      'Update profile information',
      'Change password',
      'Update email address',
      'Delete account',
    ],
  },
  appearance: {
    name: 'Appearance',
    location: 'Settings → Appearance',
    items: [
      'Choose theme: Light, Dark, Corporate Grey, Sunset Vibes',
      'Adjust font size',
      'Toggle compact mode',
      'Customize colors',
    ],
  },
  notifications: {
    name: 'Notifications',
    location: 'Settings → Notifications',
    items: [
      'Enable desktop notifications',
      'Configure sound alerts',
      'Set notification rules',
      'Choose which emails trigger notifications',
    ],
  },
  signatures: {
    name: 'Signatures',
    location: 'Settings → Signatures',
    items: [
      'Create multiple signatures',
      'Set default signature',
      'Configure per-account signatures',
      'Use template variables',
    ],
  },
};

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export const SHORTCUTS = {
  compose: { keys: 'C', description: 'Compose new email' },
  search: { keys: '/', description: 'Focus search' },
  archive: { keys: 'E', description: 'Archive email' },
  delete: { keys: '#', description: 'Delete email' },
  reply: { keys: 'R', description: 'Reply to email' },
  send: { keys: 'Ctrl+Enter', description: 'Send email' },
  aiWrite: { keys: 'Ctrl+Shift+W', description: 'AI Write' },
  aiRemix: { keys: 'Ctrl+Shift+R', description: 'AI Remix' },
  dictate: { keys: 'Ctrl+D', description: 'Voice Dictation' },
  voiceMessage: { keys: 'Ctrl+Shift+M', description: 'Voice Message' },
  escape: { keys: 'Esc', description: 'Close/Cancel' },
};

// ============================================================================
// QUICK ACTIONS MAP
// ============================================================================

export const QUICK_ACTIONS: Record<string, { action: string; path?: string }> = {
  'compose': { action: 'navigate', path: '/inbox?compose=true' },
  'compose email': { action: 'navigate', path: '/inbox?compose=true' },
  'new email': { action: 'navigate', path: '/inbox?compose=true' },
  'write email': { action: 'navigate', path: '/inbox?compose=true' },
  
  'contacts': { action: 'navigate', path: '/contacts' },
  'view contacts': { action: 'navigate', path: '/contacts' },
  'open contacts': { action: 'navigate', path: '/contacts' },
  
  'calendar': { action: 'navigate', path: '/calendar' },
  'view calendar': { action: 'navigate', path: '/calendar' },
  'open calendar': { action: 'navigate', path: '/calendar' },
  
  'settings': { action: 'navigate', path: '/settings' },
  'open settings': { action: 'navigate', path: '/settings' },
  
  'rules': { action: 'navigate', path: '/rules' },
  'automation': { action: 'navigate', path: '/rules' },
  
  'inbox': { action: 'navigate', path: '/inbox-v3' },
  'go to inbox': { action: 'navigate', path: '/inbox-v3' },
  
  'attachments': { action: 'navigate', path: '/attachments' },
  'view attachments': { action: 'navigate', path: '/attachments' },
};

// ============================================================================
// SYSTEM CONTEXT BUILDER
// ============================================================================

export function buildSystemContext(currentPage: string = '/'): string {
  const featuresList = Object.values(FEATURES).map(f => 
    `- ${f.name}: ${f.description} (Location: ${f.location})`
  ).join('\n');

  const troubleshootingList = Object.values(TROUBLESHOOTING).map(t =>
    `- ${t.problem}: ${t.solutions.join(', ')}`
  ).join('\n');

  const shortcutsList = Object.entries(SHORTCUTS).map(([key, val]) =>
    `- ${val.keys}: ${val.description}`
  ).join('\n');

  return `
You are an AI assistant for EaseMail, an enterprise email management platform.

CURRENT PAGE: ${currentPage}

YOUR KNOWLEDGE:

AVAILABLE FEATURES:
${featuresList}

COMMON ISSUES & SOLUTIONS:
${troubleshootingList}

KEYBOARD SHORTCUTS:
${shortcutsList}

HOW TO RESPOND:
1. Be conversational, friendly, and helpful
2. Provide STEP-BY-STEP instructions clearly labeled (STEP 1, STEP 2, etc.)
3. NO MARKDOWN - use plain text with emojis for visual clarity
4. Include clickable action buttons using [Button Text]
5. Offer follow-up actions
6. Keep responses concise but complete
7. Always provide the exact location where to find features

EXAMPLE RESPONSE FORMAT:
"I'll help you with that! Here's how:

STEP 1: Description of first step
→ Click here to do it: [Action Button]

STEP 2: Next step with details

💡 Pro Tip: Additional helpful information

Would you like me to help with anything else?
[Suggested Action 1] [Suggested Action 2]"

IMPORTANT:
- When user asks how to do something, provide exact steps
- When user reports a problem, troubleshoot systematically
- Suggest related features they might find useful
- Keep track of context in the conversation
`.trim();
}

