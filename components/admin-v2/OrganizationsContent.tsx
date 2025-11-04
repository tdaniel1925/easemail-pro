'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Search,
  MoreVertical,
  UserPlus,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddUserModal } from '@/components/admin/AddUserModal';
import InlineMessage from '@/components/ui/inline-message';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Organization {
  id: string;
  name: string;
  slug: string;
  planType: string;
  billingEmail: string | null;
  maxSeats: number;
  currentSeats: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    members: number;
  };
}

interface OrganizationMember {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

export default function OrganizationsContent() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Confirmation dialog
  const { confirm, Dialog: ConfirmDialog } = useConfirm();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    planType: 'team',
    billingEmail: '',
    maxSeats: 10,
  });

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/admin/organizations');
      const data = await response.json();
      
      if (data.success) {
        setOrganizations(data.organizations);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      showMessage('error', 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!formData.name || !formData.slug) {
      showMessage('error', 'Name and slug are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchOrganizations();
        setCreateModalOpen(false);
        setFormData({ name: '', slug: '', planType: 'team', billingEmail: '', maxSeats: 10 });
        showMessage('success', 'Organization created successfully');
      } else {
        showMessage('error', data.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Failed to create organization:', error);
      showMessage('error', 'Failed to create organization');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOrg = async () => {
    if (!selectedOrg) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/organizations/${selectedOrg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchOrganizations();
        setEditModalOpen(false);
        setSelectedOrg(null);
        showMessage('success', 'Organization updated successfully');
      } else {
        showMessage('error', data.error || 'Failed to update organization');
      }
    } catch (error) {
      console.error('Failed to update organization:', error);
      showMessage('error', 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    const confirmed = await confirm({
      title: 'Delete Organization',
      message: 'Are you sure you want to delete this organization? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchOrganizations();
        showMessage('success', 'Organization deleted successfully');
      } else {
        showMessage('error', data.error || 'Failed to delete organization');
      }
    } catch (error) {
      console.error('Failed to delete organization:', error);
      showMessage('error', 'Failed to delete organization');
    }
  };

  const handleViewMembers = async (org: Organization) => {
    setSelectedOrg(org);
    setMembersModalOpen(true);
    
    try {
      const response = await fetch(`/api/admin/organizations/${org.id}/members`);
      const data = await response.json();
      
      if (data.success) {
        setOrgMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
      showMessage('error', 'Failed to load members');
    }
  };

  const openEditModal = (org: Organization) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      slug: org.slug,
      planType: org.planType,
      billingEmail: org.billingEmail || '',
      maxSeats: org.maxSeats,
    });
    setEditModalOpen(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team Organizations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage team accounts
            </p>
          </div>
          <Button onClick={() => router.push('/admin/organizations/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search organizations by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Inline Message */}
        {message && (
          <div className="mb-6">
            <InlineMessage type={message.type} message={message.text} />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Organizations</p>
                  <p className="text-2xl font-bold">{organizations.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Organizations</p>
                  <p className="text-2xl font-bold">
                    {organizations.filter(o => o.isActive).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold">
                    {organizations.reduce((sum, org) => sum + org.currentSeats, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organizations List */}
        <Card>
          <CardHeader>
            <CardTitle>All Organizations</CardTitle>
            <CardDescription>
              {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading organizations...</div>
            ) : filteredOrgs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No organizations found</div>
            ) : (
              <div className="space-y-4">
                {filteredOrgs.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{org.name}</div>
                            {!org.isActive && (
                              <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded">
                                Inactive
                              </span>
                            )}
                            <span className="text-xs bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded">
                              {org.planType}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {org.slug} • {org.currentSeats}/{org.maxSeats} seats
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        <div>Created: {formatDate(org.createdAt.toString())}</div>
                        <div>{org._count?.members || org.currentSeats} member(s)</div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Organization Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => openEditModal(org)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleViewMembers(org)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            View Members
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            onClick={() => handleDeleteOrg(org.id)}
                            className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Organization
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Organization Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Set up a new team account for your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (!formData.slug) {
                    setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                  }
                }}
                placeholder="Acme Corporation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL-friendly) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                placeholder="acme-corp"
              />
              <p className="text-xs text-muted-foreground">
                Will be used in URLs: /teams/{formData.slug || 'your-slug'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planType">Plan Type</Label>
              <Select
                value={formData.planType}
                onValueChange={(value) => setFormData({ ...formData, planType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team (Up to 20 users)</SelectItem>
                  <SelectItem value="business">Business (Up to 50 users)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (Unlimited)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the plan tier for this organization
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingEmail">Billing Email</Label>
              <Input
                id="billingEmail"
                type="email"
                value={formData.billingEmail}
                onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                placeholder="billing@acme.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxSeats">Maximum Seats</Label>
              <Input
                id="maxSeats"
                type="number"
                value={formData.maxSeats}
                onChange={(e) => setFormData({ ...formData, maxSeats: parseInt(e.target.value) || 10 })}
                min="1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                setFormData({ name: '', slug: '', planType: 'team', billingEmail: '', maxSeats: 10 });
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateOrg} disabled={saving}>
              {saving ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details and settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Organization Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-planType">Plan Type</Label>
              <Select
                value={formData.planType}
                onValueChange={(value) => setFormData({ ...formData, planType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team (Up to 20 users)</SelectItem>
                  <SelectItem value="business">Business (Up to 50 users)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (Unlimited)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Organization tier and user limits
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-billingEmail">Billing Email</Label>
              <Input
                id="edit-billingEmail"
                type="email"
                value={formData.billingEmail}
                onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-maxSeats">Maximum Seats</Label>
              <Input
                id="edit-maxSeats"
                type="number"
                value={formData.maxSeats}
                onChange={(e) => setFormData({ ...formData, maxSeats: parseInt(e.target.value) || 10 })}
                min="1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedOrg(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateOrg} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Members Modal */}
      <Dialog open={membersModalOpen} onOpenChange={setMembersModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{selectedOrg?.name} - Members</DialogTitle>
                <DialogDescription>
                  {orgMembers.length} member{orgMembers.length !== 1 ? 's' : ''} in this organization
                </DialogDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setMembersModalOpen(false);
                  setAddUserModalOpen(true);
                }}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {orgMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members in this organization
              </div>
            ) : (
              orgMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                      {(member.user.fullName || member.user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{member.user.fullName || 'No name'}</div>
                      <div className="text-xs text-muted-foreground">{member.user.email}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    member.role === 'owner' ? 'bg-purple-500/20 text-purple-500' :
                    member.role === 'admin' ? 'bg-blue-500/20 text-blue-500' :
                    'bg-gray-500/20 text-gray-500'
                  }`}>
                    {member.role}
                  </span>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setMembersModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      {selectedOrg && (
        <AddUserModal
          open={addUserModalOpen}
          onClose={() => setAddUserModalOpen(false)}
          organizationId={selectedOrg.id}
          organizationName={selectedOrg.name}
          onSuccess={() => {
            showMessage('success', 'User created and invitation email sent');
            if (selectedOrg) {
              handleViewMembers(selectedOrg);
            }
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog />
    </div>
  );
}

