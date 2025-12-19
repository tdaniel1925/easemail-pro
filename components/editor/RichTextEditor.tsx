/**
 * Rich Text Editor Component
 * 
 * Comprehensive email composer with full formatting toolbar
 * Built with TipTap editor
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Highlight } from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Minus,
  Table as TableIcon,
  Trash2,
  Plus,
  Palette,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  focusOnMount?: boolean;
}

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Comic Sans', value: '"Comic Sans MS", cursive' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

const TEXT_COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#888888', '#ff8800',
];

const HIGHLIGHT_COLORS = [
  '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff8800',
  '#88ff00', '#0088ff', '#ff0088', '#ffc0cb', '#add8e6',
];

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write your message...',
  className,
  focusOnMount = false,
}: RichTextEditorProps) {
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);

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
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          style: 'max-width: 100%; height: auto; display: block; margin: 10px 0;',
        },
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] px-4 pt-2 pb-2',
        spellcheck: 'true', // Enable browser spell check
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        // Check if pasted content contains an image
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            event.preventDefault();

            const blob = item.getAsFile();
            if (blob) {
              // Check file size (max 5MB for inline images)
              const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
              if (blob.size > MAX_IMAGE_SIZE) {
                alert('Image is too large to paste inline. Maximum size is 5MB. Please attach the image as a file instead.');
                return true;
              }

              // Convert blob to base64 data URL
              const reader = new FileReader();
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                // Insert image at current cursor position
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src: dataUrl })
                );
                // For TipTap, use the editor commands instead
                const { state } = view;
                const { $from } = state.selection;
                const pos = $from.pos;

                // Insert image using TipTap command
                if (editor) {
                  editor.chain().focus().setImage({ src: dataUrl }).run();
                }
              };
              reader.readAsDataURL(blob);
            }
            return true; // Prevent default paste behavior
          }
        }
        return false; // Allow default paste for non-images
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Focus editor and position cursor at start when focusOnMount is true
  useEffect(() => {
    if (editor && focusOnMount) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        editor.chain().focus().setTextSelection(0).run();
      }, 100);
    }
  }, [editor, focusOnMount]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border border-border rounded-lg', className)}>
      {/* Custom CSS for email formatting - consistent paragraph spacing */}
      <style jsx global>{`
        .ProseMirror p {
          margin: 0 !important;
          padding: 0 !important;
          min-height: 1.4em !important;
          line-height: 1.5 !important;
        }
        /* Space between consecutive paragraphs */
        .ProseMirror p + p {
          margin-top: 1em !important;
        }
        /* Empty paragraphs used as blank lines should render */
        .ProseMirror p:empty {
          min-height: 1.4em !important;
          display: block !important;
        }
        .ProseMirror p:has(> br:only-child) {
          min-height: 1.4em !important;
          display: block !important;
        }
      `}</style>
      {/* Toolbar */}
      <div className="border-b border-border bg-muted/30 p-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Text Formatting */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant={editor.isActive('bold') ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('italic') ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('underline') ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Font Family */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2"
              onClick={() => setShowFontMenu(!showFontMenu)}
              title="Font Family"
            >
              <Type className="h-4 w-4 mr-1" />
              Font
            </Button>
            {showFontMenu && (
              <div className="absolute z-50 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg">
                {FONT_FAMILIES.map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setFontFamily(font.value).run();
                      setShowFontMenu(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-accent',
                      editor.isActive('textStyle', { fontFamily: font.value }) && 'bg-accent'
                    )}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Color */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowTextColorPicker(!showTextColorPicker)}
              title="Text Color"
            >
              <Palette className="h-4 w-4" />
            </Button>
            {showTextColorPicker && (
              <div className="absolute z-50 top-full mt-1 p-2 bg-popover border border-border rounded-md shadow-lg">
                <div className="grid grid-cols-5 gap-1">
                  {TEXT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setColor(color).run();
                        setShowTextColorPicker(false);
                      }}
                      className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlight Color */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowHighlightPicker(!showHighlightPicker)}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
            {showHighlightPicker && (
              <div className="absolute z-50 top-full mt-1 p-2 bg-popover border border-border rounded-md shadow-lg">
                <div className="grid grid-cols-5 gap-1">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().toggleHighlight({ color }).run();
                        setShowHighlightPicker(false);
                      }}
                      className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Headings */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Alignment */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              title="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Lists */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Quote & Code & HR */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              title="Code Block"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Table */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title="Insert Table (3x3)"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            {editor.isActive('table') && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  title="Add Column"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  title="Delete Table"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}

