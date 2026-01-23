/**
 * Composer V2 - Type Definitions
 * Centralized types for the new composer architecture
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  file?: File;
  filename: string;
  size: number;
  contentType: string;
  url?: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface Draft {
  id: string;
  accountId: string;
  toRecipients: EmailRecipient[];
  ccRecipients: EmailRecipient[];
  bccRecipients: EmailRecipient[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  attachments: EmailAttachment[];
  replyToEmailId?: string | null;
  replyType?: 'reply' | 'reply-all' | 'forward' | null;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
}

export type ComposeMode = 'compose' | 'reply' | 'reply-all' | 'forward';

export type WindowMode = 'normal' | 'minimized' | 'fullscreen';

export interface ReplyContext {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  messageId: string;
  body?: string;
  attachments?: EmailAttachment[];
}

export interface ComposerState {
  // Window state
  isOpen: boolean;
  windowMode: WindowMode;

  // Compose mode
  mode: ComposeMode;
  replyContext?: ReplyContext;

  // Account
  accountId?: string;

  // Recipients
  toRecipients: EmailRecipient[];
  ccRecipients: EmailRecipient[];
  bccRecipients: EmailRecipient[];
  showCc: boolean;
  showBcc: boolean;

  // Content
  subject: string;
  bodyHtml: string;
  bodyText: string;

  // Attachments
  attachments: EmailAttachment[];

  // Draft state
  currentDraftId?: string;
  isDirty: boolean;
  lastSaved?: Date;
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';

  // Sending state
  isSending: boolean;
  sendError?: string;

  // Validation
  validationErrors: Record<string, string>;

  // AI state
  aiSuggestion?: string;
  isGeneratingAI: boolean;

  // Signature
  selectedSignatureId?: string;
  useSignature: boolean;
}

export interface ComposerActions {
  // Window controls
  openComposer: (mode: ComposeMode, replyContext?: ReplyContext, accountId?: string) => void;
  closeComposer: () => void;
  setWindowMode: (mode: WindowMode) => void;

  // Recipients
  addRecipient: (field: 'to' | 'cc' | 'bcc', recipient: EmailRecipient) => void;
  removeRecipient: (field: 'to' | 'cc' | 'bcc', index: number) => void;
  updateRecipient: (field: 'to' | 'cc' | 'bcc', index: number, recipient: EmailRecipient) => void;
  toggleCc: () => void;
  toggleBcc: () => void;

  // Content
  setSubject: (subject: string) => void;
  setBody: (html: string, text: string) => void;

  // Attachments
  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (id: string) => void;
  updateAttachmentProgress: (id: string, progress: number) => void;

  // Draft management
  saveDraft: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;

  // Send
  sendEmail: () => Promise<void>;

  // Validation
  validateEmail: () => boolean;
  clearValidationError: (field: string) => void;

  // AI
  generateAISuggestion: () => Promise<void>;
  applyAISuggestion: () => void;
  rejectAISuggestion: () => void;

  // Signature
  setSignature: (signatureId?: string) => void;
  toggleSignature: () => void;

  // Reset
  resetComposer: () => void;
}

export type ComposerStore = ComposerState & ComposerActions;

// AI Feature Types
export interface AIRewriteOptions {
  tone: 'professional' | 'casual' | 'friendly' | 'formal';
  length: 'shorter' | 'longer' | 'same';
  action: 'improve' | 'simplify' | 'elaborate' | 'fix-grammar';
}

export interface AIDictationState {
  isRecording: boolean;
  isPaused: boolean;
  audioLevel: number;
  transcribedText: string;
  error?: string;
}

export interface AIVoiceMessageState {
  isRecording: boolean;
  audioBlob?: Blob;
  duration: number;
  waveformData: number[];
}

// Grammar checking
export interface GrammarIssue {
  id: string;
  type: 'grammar' | 'spelling' | 'style' | 'punctuation';
  message: string;
  suggestions: string[];
  offset: number;
  length: number;
  severity: 'error' | 'warning' | 'info';
}
