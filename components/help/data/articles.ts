// Help article data types and categories

export interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  featured?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  readTime?: string;
  lastUpdated?: string;
  views?: number;
  helpful?: number;
}

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  articleCount: number;
}

export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'New to EaseMail? Start here!',
    icon: 'PlayCircle',
    color: 'bg-blue-500',
    articleCount: 8
  },
  {
    id: 'email',
    name: 'Email Management',
    description: 'Compose, organize, and manage emails',
    icon: 'Mail',
    color: 'bg-purple-500',
    articleCount: 13
  },
  {
    id: 'ai-features',
    name: 'AI Features',
    description: 'AI-powered writing, dictation, and more',
    icon: 'Zap',
    color: 'bg-yellow-500',
    articleCount: 10
  },
  {
    id: 'contacts',
    name: 'Contacts',
    description: 'Manage and organize your contacts',
    icon: 'Users',
    color: 'bg-green-500',
    articleCount: 7
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Schedule events and meetings',
    icon: 'Calendar',
    color: 'bg-red-500',
    articleCount: 6
  },
  {
    id: 'sms',
    name: 'SMS & Messaging',
    description: 'Send SMS directly from contacts',
    icon: 'MessageSquare',
    color: 'bg-indigo-500',
    articleCount: 5
  },
  {
    id: 'settings',
    name: 'Settings & Preferences',
    description: 'Customize your experience',
    icon: 'Settings',
    color: 'bg-gray-500',
    articleCount: 11
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'Fix common issues',
    icon: 'HelpCircle',
    color: 'bg-orange-500',
    articleCount: 15
  }
];

export const helpArticles: HelpArticle[] = [
  {
    id: 'connect-email-account',
    title: 'How to Connect Your Email Account',
    description: 'Step-by-step guide to connecting Gmail, Outlook, or IMAP accounts',
    category: 'getting-started',
    tags: ['setup', 'gmail', 'outlook', 'beginner'],
    featured: true,
    difficulty: 'beginner',
    readTime: '3 min',
    lastUpdated: '2024-01-20',
    views: 1250,
    helpful: 98,
  },
  {
    id: 'organization-admin',
    title: 'Organization Administration Guide',
    description: 'Complete guide for IT managers managing EaseMail for their organization',
    category: 'settings',
    tags: ['admin', 'organization', 'management', 'enterprise', 'it-manager'],
    featured: true,
    difficulty: 'advanced',
    readTime: '45 min',
    lastUpdated: '2026-02-01',
    views: 456,
    helpful: 99,
  },
  {
    id: 'security-privacy',
    title: 'Security & Privacy Guide',
    description: 'Understanding 2FA, encryption, data privacy, and security best practices',
    category: 'settings',
    tags: ['security', '2fa', 'encryption', 'privacy', 'gdpr'],
    featured: true,
    difficulty: 'intermediate',
    readTime: '20 min',
    lastUpdated: '2026-02-01',
    views: 1876,
    helpful: 97,
  },
  {
    id: 'email-features',
    title: 'Complete Email Features Guide',
    description: 'Master composing, organizing, searching, and managing emails with advanced features',
    category: 'email',
    tags: ['email', 'compose', 'folders', 'labels', 'search', 'rules'],
    featured: true,
    difficulty: 'beginner',
    readTime: '30 min',
    lastUpdated: '2026-02-01',
    views: 3245,
    helpful: 98,
  },
  {
    id: 'ai-write-emails',
    title: 'Using AI to Write Emails 10x Faster',
    description: 'Learn how to use AI Write to compose professional emails in seconds',
    category: 'ai-features',
    tags: ['ai', 'compose', 'productivity'],
    featured: true,
    difficulty: 'beginner',
    readTime: '5 min',
    lastUpdated: '2024-01-20',
    views: 2100,
    helpful: 96,
  },
  {
    id: 'voice-dictation',
    title: 'Voice Dictation: Speak Your Emails',
    description: 'Use voice dictation to write emails hands-free',
    category: 'ai-features',
    tags: ['ai', 'dictation', 'voice', 'accessibility'],
    featured: true,
    difficulty: 'beginner',
    readTime: '4 min',
    lastUpdated: '2024-01-18',
    views: 890,
    helpful: 94,
  },
  {
    id: 'create-signature',
    title: 'Creating Professional Email Signatures',
    description: 'Design and manage email signatures for all your accounts',
    category: 'email',
    tags: ['signature', 'branding', 'settings'],
    difficulty: 'beginner',
    readTime: '3 min',
    lastUpdated: '2024-01-10',
    views: 756,
    helpful: 89,
  },
  {
    id: 'send-voice-message',
    title: 'Recording and Sending Voice Messages',
    description: 'Attach voice messages to your emails for a personal touch',
    category: 'ai-features',
    tags: ['voice', 'audio', 'attachments'],
    difficulty: 'beginner',
    readTime: '4 min',
    lastUpdated: '2024-01-12',
    views: 543,
    helpful: 91,
  },
  {
    id: 'send-sms-from-contacts',
    title: 'Sending SMS from Contacts',
    description: 'Send text messages directly from your contact list',
    category: 'sms',
    tags: ['sms', 'contacts', 'messaging'],
    difficulty: 'intermediate',
    readTime: '5 min',
    lastUpdated: '2024-01-08',
    views: 432,
    helpful: 87,
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts Reference',
    description: 'Master EaseMail with powerful keyboard shortcuts',
    category: 'getting-started',
    tags: ['shortcuts', 'productivity', 'advanced'],
    featured: true,
    difficulty: 'intermediate',
    readTime: '6 min',
    lastUpdated: '2024-01-15',
    views: 987,
    helpful: 95,
  },
  {
    id: 'manage-contacts',
    title: 'Managing Your Contacts',
    description: 'Add, organize, and import contacts efficiently',
    category: 'contacts',
    tags: ['contacts', 'organization', 'import'],
    difficulty: 'beginner',
    readTime: '7 min',
    lastUpdated: '2024-01-12',
    views: 678,
    helpful: 92,
  },
  {
    id: 'calendar-sync',
    title: 'Syncing Your Calendar',
    description: 'Connect external calendars and manage events',
    category: 'calendar',
    tags: ['calendar', 'sync', 'events'],
    difficulty: 'intermediate',
    readTime: '5 min',
    lastUpdated: '2024-01-14',
    views: 534,
    helpful: 88,
  },
  {
    id: 'troubleshoot-sync',
    title: 'Email Sync Issues',
    description: 'Fix common problems with email synchronization',
    category: 'troubleshooting',
    tags: ['sync', 'errors', 'fix'],
    difficulty: 'advanced',
    readTime: '8 min',
    lastUpdated: '2024-01-16',
    views: 892,
    helpful: 85,
  },
  {
    id: 'email-rules-guide',
    title: 'Master Email Rules & Automation',
    description: 'Complete guide to creating powerful email rules and automation workflows',
    category: 'ai-features',
    tags: ['rules', 'automation', 'productivity', 'filters'],
    featured: true,
    difficulty: 'intermediate',
    readTime: '15 min',
    lastUpdated: '2024-01-20',
    views: 1450,
    helpful: 97,
  },
  {
    id: 'troubleshooting-guide',
    title: 'Comprehensive Troubleshooting Guide',
    description: 'Solutions to common issues: sync problems, connection errors, AI features, and more',
    category: 'troubleshooting',
    tags: ['troubleshooting', 'errors', 'sync', 'connection', 'fix'],
    featured: true,
    difficulty: 'beginner',
    readTime: '12 min',
    lastUpdated: '2024-01-20',
    views: 2300,
    helpful: 93,
  },
  {
    id: 'quick-start',
    title: 'Quick Start Guide',
    description: 'Get up and running with EaseMail in under 30 minutes',
    category: 'getting-started',
    tags: ['setup', 'beginner', 'guide', 'tutorial'],
    featured: true,
    difficulty: 'beginner',
    readTime: '25 min',
    lastUpdated: '2024-01-20',
    views: 3200,
    helpful: 99,
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    description: 'Quick answers to the most common questions about EaseMail',
    category: 'getting-started',
    tags: ['faq', 'questions', 'help'],
    difficulty: 'beginner',
    readTime: '10 min',
    lastUpdated: '2024-01-20',
    views: 2850,
    helpful: 96,
  },
];

