/**
 * Organization User Management Page
 * Simplified version for token efficiency
 */

'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  orgRole: string;
  accountStatus: string;
  suspended: boolean;
}

export default function OrganizationUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    orgRole: 'member',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/organization/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/organization/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({ email: '', fullName: '', orgRole: 'member' });
        fetchUsers();
      } else {
        alert(data.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('An error occurred');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      const response = await fetch(`/api/organization/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('An error occurred');
    }
  };

  if (loading) {
    return <div className="p-8"><div className="animate-pulse">Loading...</div></div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground mt-1">Manage users in your organization</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {showAddModal && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Member</CardTitle>
            <CardDescription>Invite a new user to your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="orgRole">Role</Label>
                <Select value={formData.orgRole} onValueChange={(value) => setFormData({ ...formData, orgRole: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="user_admin">User Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Add User</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{user.fullName}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {user.orgRole} • {user.accountStatus}
                    {user.suspended && ' • Suspended'}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteUser(user.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No members yet. Add your first member to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
