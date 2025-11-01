'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Mail, Shield, Trash2, ArrowLeft, Search, MoreVertical, Ban, Key, UserX, CheckCircle, Edit, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  fullName: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  suspended?: boolean; // New field for user suspension
  _count?: {
    emailAccounts: number;
  };
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    role: '',
    organizationId: '',
  });

  // Show toast notification
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000); // Auto-hide after 5 seconds
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: suspend }),
      });

      if (response.ok) {
        await fetchUsers();
        showToast('success', `User ${suspend ? 'suspended' : 'activated'} successfully`);
      } else {
        showToast('error', `Failed to ${suspend ? 'suspend' : 'activate'} user`);
      }
    } catch (error) {
      console.error('Failed to suspend user:', error);
      showToast('error', `Failed to ${suspend ? 'suspend' : 'activate'} user`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUsers();
        showToast('success', 'User deleted successfully');
      } else {
        const data = await response.json();
        showToast('error', data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast('error', 'Failed to delete user');
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      });

      if (response.ok) {
        showToast('success', `Password reset email sent to ${userEmail}`);
      } else {
        showToast('error', 'Failed to send password reset email');
      }
    } catch (error) {
      console.error('Failed to send reset email:', error);
      showToast('error', 'Failed to send password reset email');
    }
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || '',
      email: user.email,
      role: user.role,
      organizationId: '', // We'll add org selection later if needed
    });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingUser(null);
    setSaving(false);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editForm.fullName,
          email: editForm.email,
          role: editForm.role,
        }),
      });

      if (response.ok) {
        await fetchUsers();
        handleCloseEditModal();
        showToast('success', 'User updated successfully');
      } else {
        const data = await response.json();
        showToast('error', data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      showToast('error', 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.fullName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts, roles, and permissions
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 animate-in slide-in-from-top-2 ${
            toast.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' :
            toast.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' :
            'bg-blue-500/10 border-blue-500 text-blue-500'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {toast.type === 'error' && <Ban className="h-5 w-5" />}
              {toast.type === 'info' && <Mail className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Platform Admins</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.role === 'platform_admin').length}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Individual Users</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.role === 'individual').length}
                  </p>
                </div>
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                          {(user.fullName || user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{user.fullName || 'No name'}</div>
                            {user.suspended && (
                              <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded">
                                Suspended
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        <div>Joined: {formatDate(user.createdAt.toString())}</div>
                        {user._count && (
                          <div>{user._count.emailAccounts} email account(s)</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {user.role === 'platform_admin' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(user.id, 'individual')}
                            className="bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            <Shield className="h-3.5 w-3.5 mr-1.5" />
                            Platform Admin
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(user.id, 'platform_admin')}
                          >
                            <Shield className="h-3.5 w-3.5 mr-1.5" />
                            {user.role === 'org_admin' ? 'Org Admin' : user.role === 'org_user' ? 'Org User' : 'Individual'}
                          </Button>
                        )}

                        {/* Action Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem onClick={() => handleOpenEditModal(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User Details
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => handleResetPassword(user.id, user.email)}>
                              <Key className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>

                            {user.suspended ? (
                              <DropdownMenuItem onClick={() => handleSuspendUser(user.id, false)}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                <span className="text-green-500">Activate User</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleSuspendUser(user.id, true)}>
                                <Ban className="h-4 w-4 mr-2 text-orange-500" />
                                <span className="text-orange-500">Suspend User</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription>
              Update user information and permissions. Changes will take effect immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                placeholder="Enter full name"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@example.com"
              />
              <p className="text-xs text-muted-foreground">
                ⚠️ Changing email may require the user to re-verify their account
              </p>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">User Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform_admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span>Platform Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="org_admin">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span>Organization Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="org_user">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Organization User</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="individual">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>Individual User</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Defines user permissions and access level
              </p>
            </div>

            {/* User Info Display */}
            {editingUser && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono text-xs">{editingUser.id.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Account Created:</span>
                  <span>{formatDate(editingUser.createdAt.toString())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email Accounts:</span>
                  <span>{editingUser._count?.emailAccounts || 0}</span>
                </div>
                {editingUser.suspended && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <Ban className="h-4 w-4" />
                    <span>This user is currently suspended</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseEditModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

