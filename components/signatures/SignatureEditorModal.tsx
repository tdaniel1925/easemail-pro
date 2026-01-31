/**
 * Signature Editor Modal
 * Rich text editor for creating/editing email signatures
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, Eye, Code, Type, Bold, Italic, Underline, Link as LinkIcon, Palette, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailSignature } from '@/lib/signatures/types';
import { URLInputDialog } from '@/components/ui/url-input-dialog';
import { useToast, ToastContainer } from '@/components/ui/toast';
import { sanitizeEmailHTML } from '@/lib/utils/email-html';

interface SignatureEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SignatureFormData) => Promise<void>;
  signature?: EmailSignature | null;
  accounts?: Array<{ id: string; emailAddress: string }>;
}

export interface SignatureFormData {
  name: string;
  contentHtml: string;
  accountId?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
  useForReplies?: boolean;
  useForForwards?: boolean;
}

export function SignatureEditorModal({
  isOpen,
  onClose,
  onSave,
  signature,
  accounts = [],
}: SignatureEditorModalProps) {
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState<string>('all');
  const [contentHtml, setContentHtml] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [useForReplies, setUseForReplies] = useState(true);
  const [useForForwards, setUseForForwards] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [showURLDialog, setShowURLDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Initialize form with signature data
  useEffect(() => {
    if (signature) {
      setName(signature.name);
      setAccountId(signature.accountId || 'all');
      setContentHtml(signature.contentHtml);
      setIsDefault(signature.isDefault ?? false);
      setIsActive(signature.isActive ?? true);
      setUseForReplies(signature.useForReplies ?? true);
      setUseForForwards(signature.useForForwards ?? true);
    } else {
      // Reset for new signature
      setName('');
      setAccountId('all');
      setContentHtml(getDefaultSignatureHtml());
      setIsDefault(false);
      setIsActive(true);
      setUseForReplies(true);
      setUseForForwards(true);
    }
    setShowPreview(false);
    setShowHtml(false);
  }, [signature, isOpen]);

  // Sync editor content when contentHtml changes externally (not from typing)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== contentHtml) {
      // Only update if the content is different and the editor is not focused
      const isEditorFocused = document.activeElement === editorRef.current;
      if (!isEditorFocused) {
        editorRef.current.innerHTML = contentHtml;
      }
    }
  }, [contentHtml]);

  const handleSave = async () => {
    if (!name.trim() || !contentHtml.trim()) {
      toast.error('Please provide a name and content for the signature');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        contentHtml: contentHtml.trim(),
        accountId: accountId === 'all' ? null : accountId,
        isDefault,
        isActive,
        useForReplies,
        useForForwards,
      });
      toast.success('Signature saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('Failed to save signature. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyFormatting = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const handleURLSubmit = (url: string) => {
    applyFormatting('createLink', url);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      // Upload image
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const imageUrl = data.attachment.storageUrl;

      // Insert image into editor
      if (editorRef.current) {
        editorRef.current.focus();
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.maxWidth = '200px';
        img.style.height = 'auto';
        img.alt = file.name;

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);
          range.collapse(false);
        } else {
          editorRef.current.appendChild(img);
        }

        setContentHtml(editorRef.current.innerHTML);
      }

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      // Reset input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {signature ? 'Edit Signature' : 'Create New Signature'}
          </DialogTitle>
          <DialogDescription>
            Create a professional email signature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Signature Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Work Signature, Personal"
              className="mt-1.5"
            />
          </div>

          {/* Account Selection */}
          <div>
            <Label htmlFor="account">Apply to Account</Label>
            <select
              id="account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
            >
              <option value="all">All Accounts</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.emailAddress}
                </option>
              ))}
            </select>
          </div>


          {/* Editor Toolbar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Signature Content</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={showPreview ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  Preview
                </Button>
                <Button
                  type="button"
                  variant={showHtml ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowHtml(!showHtml)}
                >
                  <Code className="h-4 w-4 mr-1.5" />
                  HTML
                </Button>
              </div>
            </div>

            {!showPreview && !showHtml && (
              <div className="border border-input rounded-md">
                {/* Formatting Toolbar */}
                <div className="flex gap-1 p-2 border-b border-border bg-muted/30">
                  <button
                    type="button"
                    onClick={() => applyFormatting('bold')}
                    className="p-2 hover:bg-accent rounded"
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('italic')}
                    className="p-2 hover:bg-accent rounded"
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('underline')}
                    className="p-2 hover:bg-accent rounded"
                    title="Underline"
                  >
                    <Underline className="h-4 w-4" />
                  </button>
                  <div className="w-px bg-border mx-1" />
                  <button
                    type="button"
                    onClick={() => setShowURLDialog(true)}
                    className="p-2 hover:bg-accent rounded"
                    title="Insert Link"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2 hover:bg-accent rounded"
                    title="Insert Image"
                    disabled={isUploadingImage}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Editor */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={(e) => setContentHtml(e.currentTarget.innerHTML)}
                  className="min-h-[200px] p-4 focus:outline-none text-foreground"
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px' }}
                  suppressContentEditableWarning
                />
              </div>
            )}

            {showPreview && (
              <div className="border border-input rounded-md p-4 min-h-[200px] bg-muted/30">
                <div dangerouslySetInnerHTML={{ __html: sanitizeEmailHTML(contentHtml, true) }} />
              </div>
            )}

            {showHtml && (
              <textarea
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                className="w-full min-h-[200px] p-3 font-mono text-sm bg-background border border-input rounded-md"
              />
            )}
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-4 border-t border-border">
            <Label>Signature Settings</Label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Active (use in new emails)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Set as default signature</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useForReplies}
                onChange={(e) => setUseForReplies(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Use for replies and reply all</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useForForwards}
                onChange={(e) => setUseForForwards(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Use for forwards</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Signature'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* URL Input Dialog */}
    <URLInputDialog
      isOpen={showURLDialog}
      onClose={() => setShowURLDialog(false)}
      onSubmit={handleURLSubmit}
      title="Insert Link"
      placeholder="https://example.com"
    />

    {/* Toast notifications */}
    <ToastContainer toasts={toast.toasts} onClose={toast.closeToast} />
    </>
  );
}

function getDefaultSignatureHtml(): string {
  return `<div style="font-family: Arial, sans-serif; font-size: 14px;">
  <p style="margin: 0 0 8px 0;"><strong>Your Name</strong></p>
  <p style="margin: 0 0 4px 0; font-size: 13px; opacity: 0.8;">Title</p>
  <p style="margin: 0 0 12px 0; font-size: 13px; opacity: 0.8;">Company Name</p>
  <p style="margin: 0; font-size: 12px; opacity: 0.8;">
    📧 <a href="mailto:email@example.com" style="color: #0066cc; text-decoration: none;">email@example.com</a> | 📞 (123) 456-7890
  </p>
  <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.8;">🌐 <a href="https://example.com" style="color: #0066cc; text-decoration: none;">example.com</a></p>
</div>`;
}

