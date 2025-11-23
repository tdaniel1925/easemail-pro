'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Mail, Shield, Trash2, ArrowLeft, Search, MoreVertical, Ban, Key, UserX, CheckCircle, Edit, X, Crown, Zap, Sparkles, UserCog, UserPlus, FileText, Loader2, CheckSquare, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  subscriptionTier?: string; // Subscription tier field
  createdAt: Date;
  updatedAt: Date;
  suspended?: boolean; // New field for user suspension
  // Invitation fields
  invitationToken?: string | null;
  invitationExpiresAt?: Date | null;
  invitationAcceptedAt?: Date | null;
  invitedBy?: string | null;
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
  const [impersonateConfirm, setImpersonateConfirm] = useState<{ userId: string; userEmail: string } | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Bulk actions state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'suspend' | 'delete' | 'tier' | null>(null);
  const [bulkTier, setBulkTier] = useState<string>('free');
  const [performingBulkAction, setPerformingBulkAction] = useState(false);
  
  // Activity log state
  const [activityLogModalOpen, setActivityLogModalOpen] = useState(false);
  const [viewingActivityUser, setViewingActivityUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    role: '',
    subscriptionTier: '',
    organizationId: '',
  });

  // Form state for adding new user
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'individual',
    subscriptionTier: 'free',
  });

  // Helper function to get subscription tier badge
  const getSubscriptionBadge = (tier?: string) => {
    switch(tier) {
      case 'beta':
        return { label: 'Beta', color: 'bg-accent text-accent-foreground border-accent-foreground/30', icon: Sparkles };
      case 'enterprise':
        return { label: 'Enterprise', color: 'bg-primary/30 text-primary border-primary/40', icon: Shield };
      case 'pro':
        return { label: 'Pro', color: 'bg-primary/20 text-primary border-primary/30', icon: Crown };
      case 'starter':
        return { label: 'Starter', color: 'bg-primary/10 text-primary border-primary/20', icon: Zap };
      case 'free':
      default:
        return { label: 'Free', color: 'bg-muted text-muted-foreground border-border', icon: Mail };
    }
  };

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

  const handleResendInvitation = async (userId: string, userEmail: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/resend-invitation`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', `Invitation email resent to ${userEmail}`);
      } else {
        showToast('error', data.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      showToast('error', 'Failed to resend invitation');
    }
  };

  const handleViewActivityLog = async (user: User) => {
    setViewingActivityUser(user);
    setActivityLogModalOpen(true);
    setLoadingActivities(true);
    
    try {
      const response = await fetch(`/api/admin/users/${user.id}/activity?limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setActivities(data.activities);
      } else {
        showToast('error', 'Failed to load activity log');
      }
    } catch (error) {
      console.error('Failed to load activity log:', error);
      showToast('error', 'Failed to load activity log');
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleImpersonateUser = async () => {
    if (!impersonateConfirm) return;

    const { userId, userEmail } = impersonateConfirm;
    setImpersonating(true);

    try {
      console.log(`[Impersonate] Starting impersonation for user ${userId} (${userEmail})`);

      const response = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: 'POST',
      });

      console.log(`[Impersonate] Response status: ${response.status}`);
      const data = await response.json();
      console.log(`[Impersonate] Response data:`, data);

      if (response.ok && data.success) {
        console.log(`[Impersonate] Success, setting session...`);

        // Store impersonation metadata in localStorage
        if (data.impersonation) {
          localStorage.setItem('impersonation_data', JSON.stringify(data.impersonation));
          console.log(`[Impersonate] Stored impersonation metadata:`, data.impersonation);
        }

        // Use Supabase client to set the session with the tokens
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        console.log(`[Impersonate] Session set result:`, { sessionData, sessionError });

        if (sessionError) {
          console.error('[Impersonate] Session error:', sessionError);
          showToast('error', 'Failed to set session: ' + sessionError.message);
          localStorage.removeItem('impersonation_data'); // Clean up on error
          setImpersonating(false);
          setImpersonateConfirm(null);
          return;
        }

        console.log(`[Impersonate] Session created successfully, redirecting...`);
        showToast('success', `Logging in as ${userEmail}...`);

        // Redirect to inbox after successful session creation
        // Use a full page reload to ensure all state is refreshed
        setTimeout(() => {
          window.location.href = '/inbox';
        }, 500);
      } else {
        console.error('[Impersonate] API error:', data);
        showToast('error', data.error || 'Failed to impersonate user');
        setImpersonating(false);
        setImpersonateConfirm(null);
      }
    } catch (error) {
      console.error('[Impersonate] Exception:', error);
      showToast('error', 'Failed to impersonate user');
      setImpersonating(false);
      setImpersonateConfirm(null);
    }
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || '',
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier || 'free',
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
          subscriptionTier: editForm.subscriptionTier,
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

  const handleCreateUser = async () => {
    // Validate form
    if (!newUserForm.email || !newUserForm.fullName || !newUserForm.password) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    setCreatingUser(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchUsers();
        setAddUserModalOpen(false);
        setNewUserForm({
          fullName: '',
          email: '',
          password: '',
          role: 'individual',
          subscriptionTier: 'free',
        });
        showToast('success', 'User created successfully');
      } else {
        showToast('error', data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      showToast('error', 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  // Bulk action handlers
  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleOpenBulkAction = (action: 'suspend' | 'delete' | 'tier') => {
    setBulkAction(action);
    setBulkActionModalOpen(true);
  };

  const handlePerformBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0) return;

    setPerformingBulkAction(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const userId of Array.from(selectedUsers)) {
        try {
          let response;

          if (bulkAction === 'suspend') {
            response = await fetch(`/api/admin/users/${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ suspended: true }),
            });
          } else if (bulkAction === 'delete') {
            response = await fetch(`/api/admin/users/${userId}`, {
              method: 'DELETE',
            });
          } else if (bulkAction === 'tier') {
            response = await fetch(`/api/admin/users/${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscriptionTier: bulkTier }),
            });
          }

          if (response?.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Failed to perform action on user ${userId}:`, error);
          errorCount++;
        }
      }

      await fetchUsers();
      setSelectedUsers(new Set());
      setBulkActionModalOpen(false);

      if (errorCount === 0) {
        showToast('success', `Successfully ${bulkAction === 'tier' ? 'changed tier for' : bulkAction === 'delete' ? 'deleted' : 'suspended'} ${successCount} user(s)`);
      } else {
        showToast('error', `Completed with ${successCount} success(es) and ${errorCount} error(s)`);
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      showToast('error', 'Bulk action failed');
    } finally {
      setPerformingBulkAction(false);
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
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <Button onClick={() => setAddUserModalOpen(true)} size="lg">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
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

        {/* Bulk Actions Toolbar */}
        {selectedUsers.size > 0 && (
          <Card className="mb-6 bg-primary/5 border-primary">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">{selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenBulkAction('suspend')}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenBulkAction('tier')}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Change Tier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenBulkAction('delete')}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUsers(new Set())}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 animate-in slide-in-from-top-2 ${
            toast.type === 'success' ? 'bg-primary/10 border-primary text-primary' :
            toast.type === 'error' ? 'bg-destructive/10 border-destructive text-destructive' :
            'bg-accent border-accent-foreground/20 text-accent-foreground'
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              {filteredUsers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedUsers.size === filteredUsers.length ? (
                    <><CheckSquare className="h-4 w-4 mr-2" />Deselect All</>
                  ) : (
                    <><Square className="h-4 w-4 mr-2" />Select All</>
                  )}
                </Button>
              )}
            </div>
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
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      selectedUsers.has(user.id) ? 'bg-primary/5 border-primary' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => handleSelectUser(user.id)}
                      />
                      <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                          {(user.fullName || user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium">{user.fullName || 'No name'}</div>
                            {user.suspended && (
                              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded border border-destructive/30">
                                Suspended
                              </span>
                            )}
                            {/* Invitation Status Badge */}
                            {!user.invitationAcceptedAt && user.invitationToken && (
                              <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded border border-accent-foreground/30 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                Pending Invitation
                              </span>
                            )}
                            {user.invitationAcceptedAt && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Accepted
                              </span>
                            )}
                            {(() => {
                              const badge = getSubscriptionBadge(user.subscriptionTier);
                              const BadgeIcon = badge.icon;
                              return (
                                <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${badge.color}`}>
                                  <BadgeIcon className="h-3 w-3" />
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
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

                            <DropdownMenuItem onClick={() => handleResendInvitation(user.id, user.email)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => setImpersonateConfirm({ userId: user.id, userEmail: user.email })}>
                              <UserCog className="h-4 w-4 mr-2 text-blue-500" />
                              <span className="text-blue-500">Impersonate User</span>
                            </DropdownMenuItem>

                            {/* Activity Log for Beta/Pro/Enterprise Users */}
                            {(user.subscriptionTier === 'beta' || user.subscriptionTier === 'pro' || user.subscriptionTier === 'enterprise') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleViewActivityLog(user)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Activity Log
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuSeparator />

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

      {/* Add User Modal */}
      <Dialog open={addUserModalOpen} onOpenChange={setAddUserModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with specific role and subscription tier
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="newFullName">Full Name *</Label>
              <Input
                id="newFullName"
                value={newUserForm.fullName}
                onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                placeholder="Enter full name"
                disabled={creatingUser}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email Address *</Label>
              <Input
                id="newEmail"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="user@example.com"
                disabled={creatingUser}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Temporary Password *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                placeholder="Minimum 8 characters"
                disabled={creatingUser}
              />
              <p className="text-xs text-muted-foreground">
                User will be required to change password on first login
              </p>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="newRole">User Role *</Label>
              <Select
                value={newUserForm.role}
                onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value })}
                disabled={creatingUser}
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

            {/* Subscription Tier */}
            <div className="space-y-2">
              <Label htmlFor="newSubscriptionTier">Subscription Plan *</Label>
              <Select
                value={newUserForm.subscriptionTier}
                onValueChange={(value) => setNewUserForm({ ...newUserForm, subscriptionTier: value })}
                disabled={creatingUser}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subscription tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>Free</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="starter">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span>Starter</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pro">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-purple-500" />
                      <span>Pro</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-orange-500" />
                      <span>Enterprise</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="beta">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      <span>Beta User (Unlimited)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newUserForm.subscriptionTier === 'beta' ? (
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    Beta users have unlimited access to all features
                  </span>
                ) : (
                  'Controls feature access and usage limits'
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddUserModalOpen(false)}
              disabled={creatingUser}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={creatingUser}
            >
              {creatingUser ? 'Creating User...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

            {/* Subscription Tier */}
            <div className="space-y-2">
              <Label htmlFor="subscriptionTier">Subscription Plan</Label>
              <Select
                value={editForm.subscriptionTier}
                onValueChange={(value) => setEditForm({ ...editForm, subscriptionTier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subscription tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>Free</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="starter">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span>Starter</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pro">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-purple-500" />
                      <span>Pro</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-orange-500" />
                      <span>Enterprise</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="beta">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      <span>Beta User (Unlimited)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editForm.subscriptionTier === 'beta' ? (
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    Beta users have unlimited access to all features
                  </span>
                ) : (
                  'Controls feature access and usage limits'
                )}
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

      {/* Impersonate User Confirmation Dialog */}
      <Dialog open={!!impersonateConfirm} onOpenChange={(open) => !open && setImpersonateConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-500" />
              Impersonate User
            </DialogTitle>
            <DialogDescription>
              You are about to log in as another user. This action will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>

          {impersonateConfirm && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-sm font-medium mb-1">Target User:</div>
                <div className="text-sm text-muted-foreground">{impersonateConfirm.userEmail}</div>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <strong>Important:</strong> All actions you perform while impersonating this user will be recorded in the audit log.
                    You will be logged out of your current session and logged in as this user.
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImpersonateConfirm(null)}
              disabled={impersonating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImpersonateUser}
              disabled={impersonating}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {impersonating ? 'Impersonating...' : 'Confirm Impersonation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Log Modal */}
      <Dialog open={activityLogModalOpen} onOpenChange={setActivityLogModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Log - {viewingActivityUser?.fullName || viewingActivityUser?.email}</DialogTitle>
            <DialogDescription>
              Recent activity for this {viewingActivityUser?.subscriptionTier === 'beta' ? 'beta' : ''} user
            </DialogDescription>
          </DialogHeader>

          {loadingActivities ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity logs found for this user
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-3 border rounded-lg ${
                    activity.status === 'error' ? 'border-red-200 bg-red-50/50' :
                    activity.status === 'warning' ? 'border-yellow-200 bg-yellow-50/50' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{activity.activityName}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted">
                          {activity.activityType}
                        </span>
                        {activity.status === 'error' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive">
                            Error
                          </span>
                        )}
                        {activity.isFlagged && (
                          <span className="text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground">
                            Flagged
                          </span>
                        )}
                      </div>
                      {activity.path && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {activity.method && <span className="font-mono">{activity.method}</span>} {activity.path}
                        </div>
                      )}
                      {activity.errorMessage && (
                        <div className="text-xs text-destructive mt-1">
                          {activity.errorMessage}
                        </div>
                      )}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <details className="text-xs text-muted-foreground mt-1">
                          <summary className="cursor-pointer hover:text-foreground">Metadata</summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(activity.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(activity.createdAt.toString())}
                    </div>
                  </div>
                  {activity.browser && (
                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-4">
                      <span>Browser: {activity.browser}</span>
                      {activity.os && <span>OS: {activity.os}</span>}
                      {activity.device && <span>Device: {activity.device}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Action Modal */}
      <Dialog open={bulkActionModalOpen} onOpenChange={setBulkActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'suspend' && 'Suspend Selected Users'}
              {bulkAction === 'delete' && 'Delete Selected Users'}
              {bulkAction === 'tier' && 'Change Subscription Tier'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'suspend' && `You are about to suspend ${selectedUsers.size} user(s). They will not be able to access their accounts.`}
              {bulkAction === 'delete' && `You are about to permanently delete ${selectedUsers.size} user(s). This action cannot be undone.`}
              {bulkAction === 'tier' && `You are about to change the subscription tier for ${selectedUsers.size} user(s).`}
            </DialogDescription>
          </DialogHeader>

          {bulkAction === 'tier' && (
            <div className="py-4">
              <Label htmlFor="bulkTier">Select New Tier</Label>
              <Select value={bulkTier} onValueChange={setBulkTier}>
                <SelectTrigger id="bulkTier" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkActionModalOpen(false)}
              disabled={performingBulkAction}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePerformBulkAction}
              disabled={performingBulkAction}
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
            >
              {performingBulkAction ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {bulkAction === 'suspend' && 'Suspend Users'}
                  {bulkAction === 'delete' && 'Delete Users'}
                  {bulkAction === 'tier' && 'Change Tier'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
