'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  contactCount: number;
}

const PRESET_COLORS = [
  '#4ecdc4', // teal
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ef4444', // red
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // cyan
  '#f97316', // orange
  '#06b6d4', // sky
];

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TagManager({ isOpen, onClose }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    color: '#4ecdc4',
    icon: '',
    description: '',
  });

  // Fetch tags
  const fetchTags = async () => {
    try {
      const res = await fetch('/api/contacts/tags');
      const data = await res.json();
      if (data.success) {
        setTags(data.tags);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/contacts/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setTags([...tags, data.tag]);
        setShowCreateModal(false);
        resetForm();
      } else {
        alert(data.error || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Failed to create tag');
    }
  };

  const handleUpdate = async () => {
    if (!editingTag) return;

    try {
      const res = await fetch(`/api/contacts/tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setTags(tags.map((t) => (t.id === editingTag.id ? data.tag : t)));
        setEditingTag(null);
        resetForm();
      } else {
        alert(data.error || 'Failed to update tag');
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      alert('Failed to update tag');
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      const res = await fetch(`/api/contacts/tags/${tagId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setTags(tags.filter((t) => t.id !== tagId));
        setDeleteConfirm(null);
      } else {
        alert(data.error || 'Failed to delete tag');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('Failed to delete tag');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#4ecdc4',
      icon: '',
      description: '',
    });
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      icon: tag.icon || '',
      description: tag.description || '',
    });
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingTag(null);
    resetForm();
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="p-4 text-sm text-muted-foreground">Loading tags...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Create and organize tags to categorize your contacts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Your Tags</h3>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Tag
        </Button>
      </div>

      {/* Tags List */}
      <div className="space-y-2">
        {tags.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No tags yet. Create one to get started!
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-3 bg-accent/30 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{tag.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({tag.contactCount} contacts)
                    </span>
                  </div>
                  {tag.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tag.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEditModal(tag)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                {deleteConfirm === tag.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(tag.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteConfirm(tag.id)}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreateModal || editingTag !== null}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'Edit Tag' : 'Create New Tag'}
            </DialogTitle>
            <DialogDescription>
              {editingTag
                ? 'Update the tag details below.'
                : 'Create a new tag to organize your contacts.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="tagName">Tag Name *</Label>
              <Input
                id="tagName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., VIP, Customer, Partner"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-12 h-8 cursor-pointer"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="tagDescription">Description (Optional)</Label>
              <Textarea
                id="tagDescription"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What is this tag for?"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={editingTag ? handleUpdate : handleCreate}
              disabled={!formData.name.trim()}
            >
              {editingTag ? 'Update' : 'Create'} Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}

