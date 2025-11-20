'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, X, Check, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

interface Group {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  contactCount: number;
}

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#4ecdc4', // teal
  '#f59e0b', // amber
  '#ef4444', // red
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // cyan
  '#f97316', // orange
  '#06b6d4', // sky
];

interface GroupManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GroupManager({ isOpen, onClose }: GroupManagerProps) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366f1',
    icon: '',
    description: '',
  });

  // Fetch groups
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/contacts/groups');
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/contacts/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setGroups([...groups, data.group]);
        setShowCreateModal(false);
        resetForm();
        toast({
          title: 'Success',
          description: 'Group created successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create group',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive'
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingGroup) return;

    try {
      const res = await fetch(`/api/contacts/groups/${editingGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setGroups(groups.map((g) => (g.id === editingGroup.id ? data.group : g)));
        setEditingGroup(null);
        resetForm();
        toast({
          title: 'Success',
          description: 'Group updated successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update group',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to update group',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (groupId: string) => {
    try {
      const res = await fetch(`/api/contacts/groups/${groupId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setGroups(groups.filter((g) => g.id !== groupId));
        setDeleteConfirm(null);
        toast({
          title: 'Success',
          description: 'Group deleted successfully'
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete group',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      color: '#6366f1',
      icon: '',
      description: '',
    });
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      color: group.color,
      icon: group.icon || '',
      description: group.description || '',
    });
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingGroup(null);
    resetForm();
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="p-4 text-sm text-muted-foreground">Loading groups...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Groups</DialogTitle>
          <DialogDescription>
            Create and organize groups to categorize your contacts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Manage Groups</h3>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Group
        </Button>
      </div>

      {/* Groups List */}
      <div className="space-y-2">
        {groups.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No groups yet. Create one to get started!
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between p-3 bg-accent/30 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: group.color + '20' }}
                >
                  <Users className="h-4 w-4" style={{ color: group.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{group.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({group.contactCount} members)
                    </span>
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {group.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEditModal(group)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                {deleteConfirm === group.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(group.id)}
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
                    onClick={() => setDeleteConfirm(group.id)}
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
        open={showCreateModal || editingGroup !== null}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Group' : 'Create New Group'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup
                ? 'Update the group details below.'
                : 'Create a new group to organize your contacts.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Sales Team, Marketing, Vendors"
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
              <Label htmlFor="groupDescription">Description (Optional)</Label>
              <Textarea
                id="groupDescription"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="What is this group for?"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={editingGroup ? handleUpdate : handleCreate}
              disabled={!formData.name.trim()}
            >
              {editingGroup ? 'Update' : 'Create'} Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}

