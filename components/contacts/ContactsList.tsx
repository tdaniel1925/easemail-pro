'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Download, Upload, Grid, List, Mail, Phone, MoreVertical, Edit, Trash2, X, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getInitials, generateAvatarColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import ContactModal from './ContactModal';
import ContactDetailModal from './ContactDetailModal';
import ImportModal from './ImportModal';
import { SMSModal } from '@/components/sms/SMSModal';
import InlineMessage from '@/components/ui/inline-message';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConfirm } from '@/components/ui/confirm-dialog';

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
  emailCount?: number;
  lastEmailAt?: Date;
  createdAt?: Date;
}

export default function ContactsList() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [smsContact, setSMSContact] = useState<{id: string; name: string; phoneNumber: string} | null>(null);
  const [enrichmentMessage, setEnrichmentMessage] = useState<{ type: 'info' | 'success'; text: string } | null>(null);
  
  // Confirmation dialog
  const { confirm, Dialog: ConfirmDialog } = useConfirm();

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    filterAndSortContacts();
  }, [contacts, searchQuery, selectedFilter, sortBy]);

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

    // Apply tag filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(contact => 
        contact.tags?.some(tag => tag.toLowerCase() === selectedFilter.toLowerCase())
      );
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
    const confirmed = await confirm({
      title: 'Delete Contact',
      message: 'Are you sure you want to delete this contact?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

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
    // Generate CSV
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

    // Download
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
    // Trigger compose modal via InboxLayout's event listener
    const composeEvent = new CustomEvent('openCompose', {
      detail: {
        type: 'compose',
        email: {
          to: email,
          subject: '',
        }
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

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditingContact(null);
    fetchContacts(); // Refresh the list
  };

  const handleContactSaved = (enriching: boolean) => {
    if (enriching) {
      setEnrichmentMessage({
        type: 'info',
        text: '✨ Contact saved! AI enrichment running in background...'
      });
      
      // Auto-hide after 8 seconds
      setTimeout(() => {
        setEnrichmentMessage(null);
      }, 8000);
    }
  };

  const handleDetailModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedContact(null);
    fetchContacts(); // Refresh in case of updates
  };

  const handleSMSClick = (contact: Contact) => {
    if (!contact.phone) {
      alert('SMS requires a phone number. Please edit this contact to add a phone number.');
      return;
    }
    
    const contactName = contact.displayName || contact.fullName || 
      `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 
      contact.email;
    
    setSMSContact({
      id: contact.id,
      name: contactName,
      phoneNumber: contact.phone,
    });
    setIsSMSModalOpen(true);
  };

  const handleSMSClose = () => {
    setIsSMSModalOpen(false);
    setSMSContact(null);
  };

  const handleSMSSuccess = () => {
    fetchContacts();
  };

  // Get unique tags from all contacts
  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags || [])));

  if (loading) {
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">{filteredContacts.length} contacts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" onClick={handleExportContacts} disabled={filteredContacts.length === 0}>
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
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search contacts..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select 
            className="h-10 px-3 rounded-md border border-input bg-background"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
          >
            <option value="all">All Contacts</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          <select 
            className="h-10 px-3 rounded-md border border-input bg-background"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="recent">Sort by Recent</option>
            <option value="emailCount">Sort by Email Count</option>
            <option value="company">Sort by Company</option>
          </select>

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
      </div>

      {/* Contacts Grid/List */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Inline Enrichment Message */}
        {enrichmentMessage && (
          <InlineMessage
            type={enrichmentMessage.type}
            message={enrichmentMessage.text}
            onClose={() => setEnrichmentMessage(null)}
            autoCloseDelay={8000}
          />
        )}
        
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-semibold mb-2">No contacts yet</h2>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedFilter !== 'all' 
                ? 'No contacts match your search criteria'
                : 'Add your first contact to get started'
              }
            </p>
            {!searchQuery && selectedFilter === 'all' && (
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredContacts.map((contact) => (
              <ContactCard 
                key={contact.id} 
                contact={contact}
                onDelete={handleDeleteContact}
                onEdit={handleEditContact}
                onEmail={handleComposeEmail}
                onSMS={handleSMSClick}
                onClick={handleContactClick}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact) => (
              <ContactListItem 
                key={contact.id} 
                contact={contact}
                onDelete={handleDeleteContact}
                onEdit={handleEditContact}
                onEmail={handleComposeEmail}
                onSMS={handleSMSClick}
                onClick={handleContactClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ContactModal 
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        contact={editingContact}
        onContactSaved={handleContactSaved}
      />

      {selectedContact && (
        <ContactDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleDetailModalClose}
          contact={selectedContact}
          onEdit={handleEditContact}
          onDelete={handleDeleteContact}
        />
      )}

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchContacts}
      />

      <SMSModal
        isOpen={isSMSModalOpen}
        onClose={handleSMSClose}
        contact={smsContact}
        onSuccess={handleSMSSuccess}
      />
    </div>
  );
}

interface ContactCardProps {
  contact: Contact;
  onDelete: (id: string) => void;
  onEdit: (contact: Contact) => void;
  onEmail: (email: string) => void;
  onSMS: (contact: Contact) => void;
  onClick: (contact: Contact) => void;
}

function ContactCard({ contact, onDelete, onEdit, onEmail, onSMS, onClick }: ContactCardProps) {
  // Build display name with proper fallbacks
  const displayName = contact.displayName || 
                      contact.fullName || 
                      `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 
                      contact.email || 
                      contact.phone || 
                      'Unknown Contact';
  
  // Use email or phone for avatar color generation
  const avatarSeed = contact.email || contact.phone || displayName;
  const avatarColor = generateAvatarColor(avatarSeed);

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium text-white mx-auto mb-4 cursor-pointer"
            style={{ backgroundColor: avatarColor }}
            onClick={() => onClick(contact)}
          >
            {getInitials(displayName)}
          </div>
          <h3 className="font-semibold text-lg mb-1 cursor-pointer hover:text-primary" onClick={() => onClick(contact)}>
            {displayName}
          </h3>
          {contact.jobTitle && (
            <p className="text-sm text-muted-foreground mb-1">{contact.jobTitle}</p>
          )}
          {contact.company && (
            <p className="text-sm text-muted-foreground mb-1">{contact.company}</p>
          )}
          <p className="text-sm text-muted-foreground mb-3">{contact.email}</p>
          
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mb-4">
              {contact.tags.slice(0, 3).map((tag: string) => (
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

          <div className="grid grid-cols-2 gap-2 mb-4 text-center">
            <div>
              <p className="font-bold text-lg">{contact.emailCount || 0}</p>
              <p className="text-xs text-muted-foreground">Emails</p>
            </div>
            <div>
              <p className="font-bold text-lg">{contact.phone ? '✓' : '—'}</p>
              <p className="text-xs text-muted-foreground">Phone</p>
            </div>
          </div>

          <div className="flex gap-2 justify-center items-center">
            <Button 
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEmail(contact.email);
              }}
              disabled={!contact.email}
              title={contact.email ? "Send Email" : "Add email to send"}
            >
              <Mail className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSMS(contact);
              }}
              disabled={!contact.phone}
              title={contact.phone ? "Send SMS" : "Add phone number to send SMS"}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onClick(contact);
                }}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(contact);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
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

interface ContactListItemProps {
  contact: Contact;
  onDelete: (id: string) => void;
  onEdit: (contact: Contact) => void;
  onEmail: (email: string) => void;
  onSMS: (contact: Contact) => void;
  onClick: (contact: Contact) => void;
}

function ContactListItem({ contact, onDelete, onEdit, onEmail, onSMS, onClick }: ContactListItemProps) {
  // Build display name with proper fallbacks
  const displayName = contact.displayName || 
                      contact.fullName || 
                      `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 
                      contact.email || 
                      contact.phone || 
                      'Unknown Contact';
  
  // Use email or phone for avatar color generation
  const avatarSeed = contact.email || contact.phone || displayName;
  const avatarColor = generateAvatarColor(avatarSeed);

  return (
    <Card className="hover:bg-accent transition-colors cursor-pointer" onClick={() => onClick(contact)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(displayName)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold hover:text-primary">{displayName}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {contact.jobTitle && contact.company 
                    ? `${contact.jobTitle} at ${contact.company}`
                    : contact.jobTitle || contact.company || contact.email
                  }
                </p>
              </div>
              <div className="flex items-center gap-4 ml-4">
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex gap-1">
                    {contact.tags.slice(0, 2).map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-medium">{contact.emailCount || 0} emails</p>
                  {contact.location && (
                    <p className="text-xs text-muted-foreground">{contact.location}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEmail(contact.email);
                    }}
                    disabled={!contact.email}
                    title={contact.email ? "Send Email" : "Add email to send"}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSMS(contact);
                    }}
                    disabled={!contact.phone}
                    title={contact.phone ? "Send SMS" : "Add phone number to send SMS"}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onEdit(contact);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
