import { create } from 'zustand';
import { ComposerState, ComposerActions, EmailRecipient, EmailAttachment, ComposeMode, WindowMode, ReplyContext } from './types';

const initialState: ComposerState = {
  // Window state
  isOpen: false,
  windowMode: 'normal',

  // Compose mode
  mode: 'compose',

  // Account
  accountId: undefined,

  // Recipients
  toRecipients: [],
  ccRecipients: [],
  bccRecipients: [],
  showCc: false,
  showBcc: false,

  // Content
  subject: '',
  bodyHtml: '',
  bodyText: '',

  // Attachments
  attachments: [],

  // Draft state
  isDirty: false,
  savingStatus: 'idle',

  // Sending state
  isSending: false,

  // Validation
  validationErrors: {},

  // AI state
  isGeneratingAI: false,

  // Signature
  useSignature: true,
};

export const useComposerStore = create<ComposerState & ComposerActions>((set, get) => ({
  ...initialState,

  // Window controls
  openComposer: (mode: ComposeMode, replyContext?: ReplyContext, accountId?: string) => {
    set({
      isOpen: true,
      mode,
      replyContext,
      accountId,
      windowMode: 'normal',
      // Reset state when opening
      toRecipients: replyContext && mode === 'reply'
        ? [{ email: replyContext.to }]
        : [],
      ccRecipients: [],
      bccRecipients: [],
      subject: replyContext?.subject || '',
      bodyHtml: '',
      bodyText: '',
      attachments: [],
      isDirty: false,
      validationErrors: {},
    });
  },

  closeComposer: () => {
    set(initialState);
  },

  setWindowMode: (windowMode: WindowMode) => {
    set({ windowMode });
  },

  // Recipients
  addRecipient: (field: 'to' | 'cc' | 'bcc', recipient: EmailRecipient) => {
    const fieldName = `${field}Recipients` as 'toRecipients' | 'ccRecipients' | 'bccRecipients';
    const currentRecipients = get()[fieldName];

    set({
      [fieldName]: [...currentRecipients, recipient],
      isDirty: true,
    });

    // Auto-show CC/BCC fields when adding recipients
    if (field === 'cc' && !get().showCc) {
      set({ showCc: true });
    }
    if (field === 'bcc' && !get().showBcc) {
      set({ showBcc: true });
    }
  },

  removeRecipient: (field: 'to' | 'cc' | 'bcc', index: number) => {
    const fieldName = `${field}Recipients` as 'toRecipients' | 'ccRecipients' | 'bccRecipients';
    const currentRecipients = get()[fieldName];

    set({
      [fieldName]: currentRecipients.filter((_, i) => i !== index),
      isDirty: true,
    });
  },

  updateRecipient: (field: 'to' | 'cc' | 'bcc', index: number, recipient: EmailRecipient) => {
    const fieldName = `${field}Recipients` as 'toRecipients' | 'ccRecipients' | 'bccRecipients';
    const currentRecipients = get()[fieldName];

    set({
      [fieldName]: currentRecipients.map((r, i) => i === index ? recipient : r),
      isDirty: true,
    });
  },

  toggleCc: () => {
    set({ showCc: !get().showCc });
  },

  toggleBcc: () => {
    set({ showBcc: !get().showBcc });
  },

  // Content
  setSubject: (subject: string) => {
    set({ subject, isDirty: true });
  },

  setBody: (bodyHtml: string, bodyText: string) => {
    set({ bodyHtml, bodyText, isDirty: true });
  },

  // Attachments
  addAttachment: async (file: File) => {
    const attachment: EmailAttachment = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      filename: file.name,
      size: file.size,
      contentType: file.type,
      uploadStatus: 'pending',
    };

    set({
      attachments: [...get().attachments, attachment],
      isDirty: true,
    });

    // Simulate upload
    set({
      attachments: get().attachments.map(a =>
        a.id === attachment.id ? { ...a, uploadStatus: 'uploading' as const, uploadProgress: 0 } : a
      ),
    });

    // In real implementation, this would upload to server
    // For now, just simulate progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      set({
        attachments: get().attachments.map(a =>
          a.id === attachment.id ? { ...a, uploadProgress: progress } : a
        ),
      });
    }

    set({
      attachments: get().attachments.map(a =>
        a.id === attachment.id ? { ...a, uploadStatus: 'completed' as const, uploadProgress: 100 } : a
      ),
    });
  },

  removeAttachment: (id: string) => {
    set({
      attachments: get().attachments.filter(a => a.id !== id),
      isDirty: true,
    });
  },

  updateAttachmentProgress: (id: string, progress: number) => {
    set({
      attachments: get().attachments.map(a =>
        a.id === id ? { ...a, uploadProgress: progress } : a
      ),
    });
  },

  // Draft management
  saveDraft: async () => {
    set({ savingStatus: 'saving' });

    try {
      // In real implementation, this would save to server
      await new Promise(resolve => setTimeout(resolve, 500));

      set({
        savingStatus: 'saved',
        lastSaved: new Date(),
        isDirty: false,
      });

      // Reset status after 2 seconds
      setTimeout(() => {
        if (get().savingStatus === 'saved') {
          set({ savingStatus: 'idle' });
        }
      }, 2000);
    } catch (error) {
      set({ savingStatus: 'error' });
    }
  },

  loadDraft: async (draftId: string) => {
    // In real implementation, load from server
    set({ currentDraftId: draftId });
  },

  deleteDraft: async (draftId: string) => {
    // In real implementation, delete from server
    if (get().currentDraftId === draftId) {
      set({ currentDraftId: undefined });
    }
  },

  // Send
  sendEmail: async () => {
    const state = get();

    // Validate
    if (!state.validateEmail()) {
      return;
    }

    set({ isSending: true });

    try {
      // In real implementation, send via API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Delete draft if exists
      if (state.currentDraftId) {
        await state.deleteDraft(state.currentDraftId);
      }

      // Close composer
      state.closeComposer();
    } catch (error) {
      set({
        isSending: false,
        sendError: error instanceof Error ? error.message : 'Failed to send email',
      });
    }
  },

  // Validation
  validateEmail: () => {
    const state = get();
    const errors: Record<string, string> = {};

    if (state.toRecipients.length === 0) {
      errors.to = 'At least one recipient is required';
    }

    if (!state.subject.trim()) {
      errors.subject = 'Subject is required';
    }

    if (!state.bodyText.trim() && !state.bodyHtml.trim()) {
      errors.body = 'Message body is required';
    }

    set({ validationErrors: errors });

    return Object.keys(errors).length === 0;
  },

  clearValidationError: (field: string) => {
    const errors = { ...get().validationErrors };
    delete errors[field];
    set({ validationErrors: errors });
  },

  // AI
  generateAISuggestion: async () => {
    set({ isGeneratingAI: true });

    try {
      // In real implementation, call AI API
      await new Promise(resolve => setTimeout(resolve, 1000));

      set({
        aiSuggestion: 'AI generated suggestion...',
        isGeneratingAI: false,
      });
    } catch (error) {
      set({ isGeneratingAI: false });
    }
  },

  applyAISuggestion: () => {
    const suggestion = get().aiSuggestion;
    if (suggestion) {
      set({
        bodyHtml: suggestion,
        bodyText: suggestion,
        aiSuggestion: undefined,
        isDirty: true,
      });
    }
  },

  rejectAISuggestion: () => {
    set({ aiSuggestion: undefined });
  },

  // Signature
  setSignature: (signatureId?: string) => {
    set({ selectedSignatureId: signatureId });
  },

  toggleSignature: () => {
    set({ useSignature: !get().useSignature });
  },

  // Reset
  resetComposer: () => {
    set(initialState);
  },
}));
