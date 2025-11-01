/**
 * Signature System - Type Definitions
 */

export interface EmailSignature {
  id: string;
  userId: string;
  accountId: string | null; // null = applies to all accounts
  name: string;
  contentHtml: string;
  contentText: string | null;
  isDefault: boolean | null;
  isActive: boolean | null;
  useForReplies: boolean | null;
  useForForwards: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSignatureRequest {
  name: string;
  contentHtml: string;
  contentText?: string;
  accountId?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  useForReplies?: boolean;
  useForForwards?: boolean;
}

export interface UpdateSignatureRequest extends Partial<CreateSignatureRequest> {
  id: string;
}

export interface SignatureContext {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  title?: string;
  company?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  accountEmail?: string;
}

export interface SignatureInsertOptions {
  type: 'compose' | 'reply' | 'reply-all' | 'forward';
  accountId?: string;
  accountEmail?: string;
  quotedContent?: string;
}

export type TemplateVariable = 
  | '{{firstName}}'
  | '{{lastName}}'
  | '{{fullName}}'
  | '{{email}}'
  | '{{phone}}'
  | '{{mobile}}'
  | '{{title}}'
  | '{{company}}'
  | '{{website}}'
  | '{{linkedin}}'
  | '{{twitter}}'
  | '{{date}}'
  | '{{time}}';

