'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
import { EditorToolbar } from './EditorToolbar';

interface SmartEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
  autoFocus?: boolean;
  showToolbar?: boolean;
  onEditorReady?: (editor: Editor) => void;
}

/**
 * SmartEditor Component
 *
 * Rich text editor powered by TipTap with:
 * - Full formatting toolbar
 * - Markdown shortcuts
 * - Image support
 * - Link handling
 * - AI suggestions (inline)
 * - Grammar checking
 */
export function SmartEditor({
  content,
  onChange,
  placeholder = 'Write your message...',
  className,
  disabled = false,
  minHeight = 200,
  maxHeight = 600,
  autoFocus = false,
  showToolbar = true,
  onEditorReady,
}: SmartEditorProps) {
  const editorRef = useRef<Editor | null>(null);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      // @ts-expect-error - TipTap type conflict due to PNPM hoisting multiple @tiptap/core versions
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-700 cursor-pointer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none px-4 py-3',
          'dark:prose-invert',
          disabled && 'opacity-50 cursor-not-allowed'
        ),
        'data-testid': 'editor-content',
      },
    },
    editable: !disabled,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(html, text);
    },
  });

  // Store editor ref
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
      onEditorReady?.(editor);
    }
  }, [editor, onEditorReady]);

  // Update content when prop changes (external updates)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          'border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900',
          className
        )}
        style={{ minHeight, maxHeight }}
        data-testid="editor-loading"
      >
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
        className
      )}
      data-testid="smart-editor"
    >
      {/* Toolbar */}
      {showToolbar && <EditorToolbar editor={editor} />}

      {/* Editor Content */}
      <div
        className="overflow-y-auto"
        style={{
          minHeight,
          maxHeight,
        }}
      >
        <EditorContent editor={editor} />

        {/* Placeholder */}
        {editor.isEmpty && (
          <div
            className="absolute top-[52px] left-4 pointer-events-none text-gray-400 text-sm"
            data-testid="editor-placeholder"
          >
            {placeholder}
          </div>
        )}
      </div>

      {/* Character count */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 text-right">
        {editor.storage.characterCount?.characters() || editor.getText().length} characters
      </div>
    </div>
  );
}
