'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Download,
  Upload,
  Grid,
  List,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Loader2,
  ArrowLeft,
  CheckSquare,
  Square,
  RefreshCw,
  Star,
  Filter,
  Building2,
  Tag as TagIcon,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getInitials, generateAvatarColor, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAccount } from '@/contexts/AccountContext';
import type { ContactListItem, ContactSearchFilters, GetContactsResponse, ContactV4 } from '@/lib/types/contacts-v4';
import ContactDetailModal from './ContactDetailModal';
import ContactFormModal from './ContactFormModal';

export default function ContactsV4List() {
  const { accounts } = useAccount();
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Filters
  const [filters, setFilters] = useState<ContactSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    status: string;
    percentage: number;
    imported: number;
    updated: number;
  } | null>(null);

  // Detail modal
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactV4 | null>(null);

  // Fetch contacts
  const fetchContacts = useCallback(async (resetOffset = false) => {
    try {
      setLoading(true);

      const currentOffset = resetOffset ? 0 : offset;
      const params = new URLSearchParams();

      if (selectedAccountId !== 'all') {
        params.set('account_id', selectedAccountId);
      }
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      if (filters.is_favorite) {
        params.set('is_favorite', 'true');
      }
      if (filters.source) {
        params.set('source', filters.source);
      }

      params.set('limit', limit.toString());
      params.set('offset', currentOffset.toString());

      const response = await fetch(`/api/contacts-v4?${params.toString()}`);
      const data: GetContactsResponse = await response.json();

      if (data.success) {
        setContacts(data.contacts);
        setTotal(data.total);
        setHasMore(data.has_more);
        if (resetOffset) {
          setOffset(0);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch contacts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, searchQuery, filters, offset, limit, toast]);

  // Initial fetch and when filters change
  useEffect(() => {
    fetchContacts(true);
  }, [selectedAccountId, searchQuery, filters.is_favorite, filters.source]);

  // Sync contacts with real-time progress
  const handleSync = async () => {
    if (selectedAccountId === 'all') {
      toast({
        title: 'Select an account',
        description: 'Please select a specific account to sync contacts',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSyncing(true);
      setSyncProgress({ status: 'Starting sync...', percentage: 0, imported: 0, updated: 0 });

      // Use Server-Sent Events for real-time progress
      const eventSource = new EventSource(
        `/api/contacts-v4/sync/${selectedAccountId}?stream=true`
      );

      eventSource.onmessage = (event) => {
        const update = JSON.parse(event.data);

        switch (update.type) {
          case 'start':
            setSyncProgress({
              status: 'Connecting to provider...',
              percentage: 0,
              imported: 0,
              updated: 0
            });
            break;

          case 'fetching':
            setSyncProgress({
              status: `Fetching ${update.total} contacts...`,
              percentage: 10,
              imported: 0,
              updated: 0
            });
            break;

          case 'progress':
            setSyncProgress({
              status: update.status || 'Processing contacts...',
              percentage: update.percentage || 0,
              imported: update.imported || 0,
              updated: update.updated || 0
            });
            break;

          case 'complete':
            setSyncProgress({
              status: 'Sync complete!',
              percentage: 100,
              imported: update.imported || 0,
              updated: update.updated || 0
            });
            eventSource.close();

            toast({
              title: 'Sync complete',
              description: `Imported ${update.imported} contacts, updated ${update.updated}`,
            });

            // Refresh contacts list
            setTimeout(() => {
              fetchContacts(true);
              setSyncing(false);
              setSyncProgress(null);
            }, 2000);
            break;

          case 'error':
            setSyncProgress(null);
            eventSource.close();
            setSyncing(false);

            toast({
              title: 'Sync failed',
              description: update.error || 'An error occurred during sync',
              variant: 'destructive'
            });
            break;
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setSyncing(false);
        setSyncProgress(null);

        toast({
          title: 'Sync failed',
          description: 'Lost connection to sync service',
          variant: 'destructive'
        });
      };
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncing(false);
      setSyncProgress(null);

      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Failed to sync contacts',
        variant: 'destructive'
      });
    }
  };

  // Delete contact
  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      const response = await fetch(`/api/contacts-v4/${contactId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Contact deleted',
          description: 'Contact has been deleted successfully',
        });
        fetchContacts();
      } else {
        throw new Error(data.error || 'Failed to delete contact');
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete contact',
        variant: 'destructive'
      });
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (contactId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/contacts-v4/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: { is_favorite: !currentStatus },
          sync_immediately: false
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchContacts();
      } else {
        throw new Error(data.error || 'Failed to update contact');
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive'
      });
    }
  };

  // Bulk selection
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedContactIds(new Set());
      setIsAllSelected(false);
    } else {
      setSelectedContactIds(new Set(contacts.map(c => c.id)));
      setIsAllSelected(true);
    }
  };

  const toggleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContactIds);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContactIds(newSelected);
    setIsAllSelected(newSelected.size === contacts.length && contacts.length > 0);
  };

  // Export contacts
  const handleExport = () => {
    const contactsToExport = selectedContactIds.size > 0
      ? contacts.filter(c => selectedContactIds.has(c.id))
      : contacts;

    const headers = ['Display Name', 'Email', 'Phone', 'Job Title', 'Company', 'Tags'];
    const csvData = [
      headers.join(','),
      ...contactsToExport.map(contact => [
        contact.display_name || '',
        contact.primary_email || '',
        contact.primary_phone || '',
        contact.job_title || '',
        contact.company_name || '',
        contact.tags.join('; ') || '',
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Pagination
  const handleLoadMore = () => {
    setOffset(offset + limit);
    fetchContacts();
  };

  // Detail modal
  const handleOpenDetail = (contactId: string) => {
    setSelectedContactId(contactId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedContactId(null);
  };

  const handleContactDeleted = () => {
    fetchContacts(true);
  };

  // Form modal handlers
  const handleAddContact = () => {
    if (selectedAccountId === 'all') {
      toast({
        title: 'Select an account',
        description: 'Please select a specific account to add a contact',
        variant: 'destructive'
      });
      return;
    }
    setEditingContact(null);
    setIsFormModalOpen(true);
  };

  const handleEditContact = async (contactId: string) => {
    try {
      const response = await fetch(`/api/contacts-v4/${contactId}`);
      const data = await response.json();

      if (data.success) {
        setEditingContact(data.contact);
        setIsFormModalOpen(true);
      } else {
        throw new Error(data.error || 'Failed to fetch contact');
      }
    } catch (error) {
      console.error('Failed to fetch contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contact for editing',
        variant: 'destructive'
      });
    }
  };

  const handleFormClose = () => {
    setIsFormModalOpen(false);
    setEditingContact(null);
  };

  const handleContactSaved = () => {
    fetchContacts(true);
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        {/* Back Button */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/inbox')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inbox
          </Button>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedContactIds.size > 0 && (
          <div className="flex items-center justify-between p-3 mb-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="font-medium">{selectedContactIds.size} selected</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedContactIds(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Title and Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Contacts V4</h1>
              <p className="text-muted-foreground">{total} contacts</p>
            </div>

            {/* Account Filter */}
            <select
              className="h-10 px-3 rounded-md border border-input bg-background min-w-[200px]"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="all">All Accounts</option>
              {accounts.filter(acc => acc.isActive).map(account => (
                <option key={account.id} value={account.id}>
                  {account.emailAddress}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing || selectedAccountId === 'all'}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleAddContact}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Sync Progress */}
        {syncProgress && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{syncProgress.status}</span>
              <span className="text-sm text-muted-foreground">{syncProgress.percentage}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress.percentage}%` }}
              />
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Imported: {syncProgress.imported}</span>
              <span>Updated: {syncProgress.updated}</span>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search contacts by name, email, company..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <div className="flex border border-border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 border border-border rounded-lg bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Favorites</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={filters.is_favorite ? 'true' : 'false'}
                  onChange={(e) => setFilters({ ...filters, is_favorite: e.target.value === 'true' ? true : undefined })}
                >
                  <option value="false">All Contacts</option>
                  <option value="true">Favorites Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Source</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={filters.source || ''}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value as any || undefined })}
                >
                  <option value="">All Sources</option>
                  <option value="address_book">Address Book</option>
                  <option value="inbox">Inbox</option>
                  <option value="domain">Domain</option>
                  <option value="easemail">EaseMail</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({})}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-6">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-semibold mb-2">No contacts yet</h2>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filters.is_favorite
                ? 'No contacts match your search criteria'
                : selectedAccountId === 'all'
                ? 'Select an account and sync to see contacts'
                : 'Sync your account to import contacts'
              }
            </p>
            {selectedAccountId !== 'all' && !searchQuery && (
              <Button onClick={handleSync} disabled={syncing}>
                <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                Sync Contacts
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onEdit={handleEditContact}
                  isSelected={selectedContactIds.has(contact.id)}
                  onToggleSelect={toggleSelectContact}
                  onClick={handleOpenDetail}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-2">
              {contacts.map((contact) => (
                <ContactListItem
                  key={contact.id}
                  contact={contact}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onEdit={handleEditContact}
                  isSelected={selectedContactIds.has(contact.id)}
                  onToggleSelect={toggleSelectContact}
                  onClick={handleOpenDetail}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedContactId && (
        <ContactDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetail}
          contactId={selectedContactId}
          onEdit={handleEditContact}
          onDeleted={handleContactDeleted}
        />
      )}

      {/* Form Modal */}
      <ContactFormModal
        isOpen={isFormModalOpen}
        onClose={handleFormClose}
        contact={editingContact}
        accountId={selectedAccountId}
        onSaved={handleContactSaved}
      />
    </div>
  );
}

// ============================================
// CONTACT CARD (GRID VIEW)
// ============================================

interface ContactCardProps {
  contact: ContactListItem;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, currentStatus: boolean) => void;
  onEdit: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onClick?: (id: string) => void;
}

function ContactCard({ contact, onDelete, onToggleFavorite, onEdit, isSelected, onToggleSelect, onClick }: ContactCardProps) {
  const avatarColor = generateAvatarColor(contact.primary_email || contact.display_name);

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-shadow cursor-pointer relative",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={() => onClick?.(contact.id)}
    >
      <CardContent className="p-6">
        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(contact.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 cursor-pointer"
          />
        </div>

        {/* Favorite Star */}
        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(contact.id, contact.is_favorite);
            }}
          >
            <Star className={cn(
              "h-4 w-4",
              contact.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            )} />
          </Button>
        </div>

        <div className="text-center">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium text-white mx-auto mb-4"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(contact.display_name)}
          </div>

          {/* Name and Info */}
          <h3 className="font-semibold text-lg mb-1">{contact.display_name}</h3>
          {contact.job_title && (
            <p className="text-sm text-muted-foreground mb-1">{contact.job_title}</p>
          )}
          {contact.company_name && (
            <p className="text-sm text-muted-foreground mb-1">{contact.company_name}</p>
          )}
          <p className="text-sm text-muted-foreground mb-3">
            {contact.primary_email || contact.primary_phone || 'No contact info'}
          </p>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mb-4">
              {contact.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary"
                >
                  {tag}
                </span>
              ))}
              {contact.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                  +{contact.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Sync Status */}
          {contact.sync_status !== 'synced' && (
            <div className="mb-4 flex items-center justify-center gap-2 text-xs">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <span className="text-yellow-600">{contact.sync_status.replace('_', ' ')}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              disabled={!contact.primary_email}
              title={contact.primary_email ? "Send Email" : "No email available"}
            >
              <Mail className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!contact.primary_phone}
              title={contact.primary_phone ? "Call" : "No phone available"}
            >
              <Phone className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(contact.id);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(contact.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// CONTACT LIST ITEM (LIST VIEW)
// ============================================

interface ContactListItemProps {
  contact: ContactListItem;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, currentStatus: boolean) => void;
  onEdit: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onClick?: (id: string) => void;
}

function ContactListItem({ contact, onDelete, onToggleFavorite, onEdit, isSelected, onToggleSelect, onClick }: ContactListItemProps) {
  const avatarColor = generateAvatarColor(contact.primary_email || contact.display_name);

  return (
    <Card
      className={cn(
        "hover:bg-accent transition-colors cursor-pointer",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={() => onClick?.(contact.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(contact.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 cursor-pointer flex-shrink-0"
          />

          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(contact.display_name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{contact.display_name}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(contact.id, contact.is_favorite);
                }}
              >
                <Star className={cn(
                  "h-3 w-3",
                  contact.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                )} />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {contact.primary_email || contact.primary_phone || 'No contact info'}
            </p>
            {(contact.job_title || contact.company_name) && (
              <p className="text-xs text-muted-foreground truncate">
                {contact.job_title && contact.company_name
                  ? `${contact.job_title} at ${contact.company_name}`
                  : contact.job_title || contact.company_name
                }
              </p>
            )}
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex gap-1 flex-shrink-0">
              {contact.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              disabled={!contact.primary_email}
              title={contact.primary_email ? "Send Email" : "No email available"}
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!contact.primary_phone}
              title={contact.primary_phone ? "Call" : "No phone available"}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(contact.id);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(contact.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
