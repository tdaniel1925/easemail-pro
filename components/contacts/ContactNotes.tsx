/**
 * Contact Notes Component
 * Display and manage timestamped notes for a contact
 */

'use client';

import React, { useState, useEffect } from 'react';
import { StickyNote, Plus, Trash2, Edit2, Save, X, Pin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Note {
  id: string;
  noteText: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ContactNotesProps {
  contactId: string;
}

export function ContactNotes({ contactId }: ContactNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [contactId]);

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/contacts/${contactId}/notes`);
      const data = await response.json();
      if (data.success) {
        setNotes(data.notes);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;

    try {
      const response = await fetch(`/api/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText: newNoteText }),
      });

      const data = await response.json();
      if (data.success) {
        setNotes([data.note, ...notes]);
        setNewNoteText('');
        setIsAdding(false);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editText.trim()) return;

    try {
      const response = await fetch(`/api/contacts/${contactId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, noteText: editText }),
      });

      const data = await response.json();
      if (data.success) {
        setNotes(notes.map(n => n.id === noteId ? data.note : n));
        setEditingNoteId(null);
        setEditText('');
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const response = await fetch(`/api/contacts/${contactId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: note.id, isPinned: !note.isPinned }),
      });

      const data = await response.json();
      if (data.success) {
        setNotes(notes.map(n => n.id === note.id ? data.note : n));
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      const response = await fetch(`/api/contacts/${contactId}/notes?noteId=${noteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setNotes(notes.filter(n => n.id !== noteId));
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Notes
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({notes.length})
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(!isAdding)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Note
        </Button>
      </div>

      {/* Add New Note */}
      {isAdding && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Type your note..."
            className="w-full h-20 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAdding(false);
                setNewNoteText('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNoteText.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-2">
        {sortedNotes.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            No notes yet. Click "Add Note" to create one.
          </div>
        ) : (
          sortedNotes.map(note => (
            <div
              key={note.id}
              className={`p-3 rounded-lg border ${
                note.isPinned
                  ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              } hover:shadow-sm transition-shadow`}
            >
              {editingNoteId === note.id ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-20 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingNoteId(null);
                        setEditText('');
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateNote(note.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-1 whitespace-pre-wrap">
                      {note.noteText}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(note)}
                        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          note.isPinned ? 'text-yellow-600 dark:text-yellow-500' : 'text-gray-400'
                        }`}
                        title={note.isPinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setEditText(note.noteText);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                    {note.updatedAt !== note.createdAt && (
                      <span className="text-gray-400">• edited</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

