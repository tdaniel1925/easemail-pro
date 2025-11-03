'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Upload, 
  Users, 
  Tag as TagIcon,
  FolderOpen,
  Star,
  Loader2,
  Grid,
  List,
  Settings,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getInitials, generateAvatarColor } from '@/lib/utils';
import ContactModal from './ContactModal';
import ContactDetailModal from './ContactDetailModal';
import ImportModal from './ImportModal';
import TagManager from './TagManager';
import GroupManager from './GroupManager';
import { SMSModal } from '@/components/sms/SMSModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Contact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  location?: string;
  tags?: string[];
  groups?: string[];
  emailCount?: number;
  lastEmailAt?: Date;
  createdAt?: Date;
  isFavorite?: boolean;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  contactCount: number;
}

interface Group {
  id: string;
  name: string;
  color: string;
  contactCount: number;
}

type ViewTab = 'all' | 'favorites' | 'tags' | 'groups';

export default function ContactsContent() {
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('name');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [smsContact, setSMSContact] = useState<{id: string; name: string; phoneNumber: string} | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);

  useEffect(() => {
    fetchContacts();
    fetchTags();
    fetchGroups();
  }, []);

  useEffect(() => {
    filterAndSortContacts();
  }, [contacts, searchQuery, activeTab, selectedTagId, selectedGroupId, sortBy]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contacts');
      const data = await response.json();
      
      if (data.success) {
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/contacts/tags');
      const data = await response.json();
      if (data.success) {
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/contacts/groups');
      const data = await response.json();
      if (data.success) {
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const filterAndSortContacts = () => {
    let filtered = [...contacts];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact => {
        const name = contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
        return (
          name.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query) ||
          contact.jobTitle?.toLowerCase().includes(query)
        );
      });
    }

    // Apply tab filter
    if (activeTab === 'favorites') {
      filtered = filtered.filter(contact => contact.isFavorite);
    } else if (activeTab === 'tags' && selectedTagId) {
      filtered = filtered.filter(contact => contact.tags?.includes(selectedTagId));
    } else if (activeTab === 'groups' && selectedGroupId) {
      filtered = filtered.filter(contact => contact.groups?.includes(selectedGroupId));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = a.fullName || `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email;
          const nameB = b.fullName || `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
          return nameA.localeCompare(nameB);
        
        case 'recent':
          const dateA = a.lastEmailAt ? new Date(a.lastEmailAt).getTime() : 0;
          const dateB = b.lastEmailAt ? new Date(b.lastEmailAt).getTime() : 0;
          return dateB - dateA;
        
        case 'emailCount':
          return (b.emailCount || 0) - (a.emailCount || 0);
        
        case 'company':
          return (a.company || '').localeCompare(b.company || '');
        
        default:
          return 0;
      }
    });

    setFilteredContacts(filtered);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setContacts(contacts.filter(c => c.id !== contactId));
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const handleExportContacts = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title', 'Location'];
    const csvData = [
      headers.join(','),
      ...filteredContacts.map(contact => [
        contact.firstName || '',
        contact.lastName || '',
        contact.email || '',
        contact.phone || '',
        contact.company || '',
        contact.jobTitle || '',
        contact.location || '',
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

  const handleComposeEmail = (email: string) => {
    const composeEvent = new CustomEvent('openCompose', {
      detail: {
        type: 'compose',
        email: { to: email, subject: '' }
      }
    });
    window.dispatchEvent(composeEvent);
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsAddModalOpen(true);
  };

  const handleSendSMS = (contact: Contact) => {
    if (!contact.phone) {
      alert('This contact does not have a phone number');
      return;
    }
    
    const name = contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email;
    setSMSContact({
      id: contact.id,
      name,
      phoneNumber: contact.phone
    });
    setIsSMSModalOpen(true);
  };

  const handleTagClick = (tagId: string) => {
    setActiveTab('tags');
    setSelectedTagId(selectedTagId === tagId ? null : tagId);
    setSelectedGroupId(null);
  };

  const handleGroupClick = (groupId: string) => {
    setActiveTab('groups');
    setSelectedGroupId(selectedGroupId === groupId ? null : groupId);
    setSelectedTagId(null);
  };

  const sections = [
    { id: 'all' as ViewTab, name: 'All Contacts', icon: Users, count: contacts.length },
    { id: 'favorites' as ViewTab, name: 'Favorites', icon: Star, count: contacts.filter(c => c.isFavorite).length },
  ];

  return (
    <div className="flex w-full h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4 overflow-y-auto flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 text-foreground">Contacts</h2>
          <a 
            href="/inbox"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Back to Inbox
          </a>
        </div>

        {/* Main Sections */}
        <nav className="space-y-1 mb-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveTab(section.id);
                  setSelectedTagId(null);
                  setSelectedGroupId(null);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === section.id && !selectedTagId && !selectedGroupId
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{section.name}</span>
                <span className="text-xs">{section.count}</span>
              </button>
            );
          })}
        </nav>

        {/* Tags Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
              Tags
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setShowTagManager(true)}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {tags.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">No tags yet</p>
            ) : (
              tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedTagId === tag.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-left truncate">{tag.name}</span>
                  <span className="text-xs">{tag.contactCount}</span>
                </button>
              ))
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => setShowTagManager(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Manage Tags
          </Button>
        </div>

        {/* Groups Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
              Groups
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setShowGroupManager(true)}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">No groups yet</p>
            ) : (
              groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleGroupClick(group.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedGroupId === group.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color: group.color }} />
                  <span className="flex-1 text-left truncate">{group.name}</span>
                  <span className="text-xs">{group.contactCount}</span>
                </button>
              ))
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => setShowGroupManager(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Manage Groups
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {selectedTagId
                  ? tags.find(t => t.id === selectedTagId)?.name
                  : selectedGroupId
                  ? groups.find(g => g.id === selectedGroupId)?.name
                  : activeTab === 'favorites'
                  ? 'Favorite Contacts'
                  : 'All Contacts'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" onClick={handleExportContacts}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-sm"
            >
              <option value="name">Sort by Name</option>
              <option value="recent">Recently Contacted</option>
              <option value="emailCount">Email Count</option>
              <option value="company">Company</option>
            </select>

            <div className="flex gap-1 border border-border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Contacts Grid/List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-20">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No contacts found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? 'Try a different search term' : 'Add your first contact to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredContacts.map((contact) => {
                const name = contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email;
                const avatarColor = generateAvatarColor(contact.email);
                
                return (
                  <Card key={contact.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4" onClick={() => handleContactClick(contact)}>
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {getInitials(name)}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleComposeEmail(contact.email); }}>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            {contact.phone && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendSMS(contact); }}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send SMS
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <h3 className="font-medium truncate mb-1">{name}</h3>
                      <p className="text-sm text-muted-foreground truncate mb-2">{contact.email}</p>
                      
                      {contact.company && (
                        <p className="text-xs text-muted-foreground truncate mb-2">{contact.company}</p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {contact.emailCount ? (
                          <span>{contact.emailCount} emails</span>
                        ) : null}
                        {contact.phone && <Phone className="h-3 w-3" />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact) => {
                const name = contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email;
                const avatarColor = generateAvatarColor(contact.email);
                
                return (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4" onClick={() => handleContactClick(contact)}>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {getInitials(name)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                        </div>
                        
                        {contact.company && (
                          <div className="hidden md:block text-sm text-muted-foreground">
                            {contact.company}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {contact.phone && <Phone className="h-4 w-4 text-muted-foreground" />}
                          {contact.emailCount && (
                            <span className="text-xs text-muted-foreground">
                              {contact.emailCount} emails
                            </span>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleComposeEmail(contact.email); }}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              {contact.phone && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendSMS(contact); }}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Send SMS
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact.id); }}
                                className="text-destructive"
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
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <ContactModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingContact(null);
        }}
        contact={editingContact || undefined}
        onContactSaved={() => {
          fetchContacts();
          setIsAddModalOpen(false);
          setEditingContact(null);
        }}
      />

      {selectedContact && (
        <ContactDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedContact(null);
          }}
          contact={selectedContact}
          onEdit={() => {
            setIsDetailModalOpen(false);
            handleEditContact(selectedContact);
          }}
          onDelete={() => {
            handleDeleteContact(selectedContact.id);
            setIsDetailModalOpen(false);
            setSelectedContact(null);
          }}
        />
      )}

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchContacts}
      />

      {smsContact && (
        <SMSModal
          isOpen={isSMSModalOpen}
          onClose={() => {
            setIsSMSModalOpen(false);
            setSMSContact(null);
          }}
          contact={smsContact}
        />
      )}

      {showTagManager && (
        <TagManager
          isOpen={showTagManager}
          onClose={() => {
            setShowTagManager(false);
            fetchTags();
            fetchContacts();
          }}
        />
      )}

      {showGroupManager && (
        <GroupManager
          isOpen={showGroupManager}
          onClose={() => {
            setShowGroupManager(false);
            fetchGroups();
            fetchContacts();
          }}
        />
      )}
    </div>
  );
}

