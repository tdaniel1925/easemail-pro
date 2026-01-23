'use client';

import React from 'react';
import { type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Image as ImageIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EditorToolbarProps {
  editor: Editor;
  className?: string;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ToolbarButton({ icon, label, isActive, onClick, disabled }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-8 w-8 p-0',
        isActive && 'bg-gray-200 dark:bg-gray-700'
      )}
      title={label}
      data-testid={`toolbar-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {icon}
    </Button>
  );
}

/**
 * EditorToolbar Component
 *
 * Formatting toolbar for the SmartEditor:
 * - Text formatting (bold, italic, underline)
 * - Lists (bullet, numbered)
 * - Alignment
 * - Links and images
 * - Undo/redo
 */
export function EditorToolbar({ editor, className }: EditorToolbarProps) {
  const handleAddLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleAddImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700',
        className
      )}
      data-testid="editor-toolbar"
    >
      {/* Text Formatting */}
      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        <ToolbarButton
          icon={<Bold className="w-4 h-4" />}
          label="Bold"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={<Italic className="w-4 h-4" />}
          label="Italic"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={<UnderlineIcon className="w-4 h-4" />}
          label="Underline"
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
      </div>

      {/* Lists */}
      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        <ToolbarButton
          icon={<List className="w-4 h-4" />}
          label="Bullet List"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={<ListOrdered className="w-4 h-4" />}
          label="Numbered List"
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        <ToolbarButton
          icon={<AlignLeft className="w-4 h-4" />}
          label="Align Left"
          isActive={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          icon={<AlignCenter className="w-4 h-4" />}
          label="Align Center"
          isActive={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          icon={<AlignRight className="w-4 h-4" />}
          label="Align Right"
          isActive={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />
      </div>

      {/* Links & Images */}
      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        <ToolbarButton
          icon={<Link2 className="w-4 h-4" />}
          label="Insert Link"
          isActive={editor.isActive('link')}
          onClick={handleAddLink}
        />
        <ToolbarButton
          icon={<ImageIcon className="w-4 h-4" />}
          label="Insert Image"
          onClick={handleAddImage}
        />
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={<Undo className="w-4 h-4" />}
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          icon={<Redo className="w-4 h-4" />}
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
      </div>
    </div>
  );
}
