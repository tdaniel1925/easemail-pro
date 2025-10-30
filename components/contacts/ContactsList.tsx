'use client';

import { useState } from 'react';
import { Search, Plus, Download, Upload, Grid, List, Mail, Phone, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getInitials, generateAvatarColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Mock contacts data
const mockContacts = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    company: 'TechCorp Inc.',
    jobTitle: 'Marketing Director',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    tags: ['VIP', 'Work'],
    emailCount: 47,
    lastEmailAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '2',
    name: 'Michael Kim',
    email: 'michael.kim@techcorp.com',
    company: 'TechCorp Inc.',
    jobTitle: 'Engineering Manager',
    phone: '+1 (555) 234-5678',
    location: 'Seattle, WA',
    tags: ['Work'],
    emailCount: 32,
    lastEmailAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: '3',
    name: 'Emily Chen',
    email: 'emily.chen@startup.io',
    company: 'Startup.io',
    jobTitle: 'CEO',
    phone: '+1 (555) 345-6789',
    location: 'Austin, TX',
    tags: ['VIP', 'Partner'],
    emailCount: 28,
    lastEmailAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
  {
    id: '4',
    name: 'David Martinez',
    email: 'david@freelance.com',
    company: 'Freelance',
    jobTitle: 'Design Consultant',
    phone: '+1 (555) 456-7890',
    location: 'New York, NY',
    tags: ['Freelancer'],
    emailCount: 15,
    lastEmailAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
  },
];

export default function ContactsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFilter, setSelectedFilter] = useState('all');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">{mockContacts.length} contacts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button>
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

          <select className="h-10 px-3 rounded-md border border-input bg-background">
            <option value="all">All Contacts</option>
            <option value="vip">VIP</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>

          <select className="h-10 px-3 rounded-md border border-input bg-background">
            <option>Sort by Name</option>
            <option>Sort by Recent</option>
            <option>Sort by Email Count</option>
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
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mockContacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {mockContacts.map((contact) => (
              <ContactListItem key={contact.id} contact={contact} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactCard({ contact }: { contact: any }) {
  const avatarColor = generateAvatarColor(contact.email);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium text-white mx-auto mb-4"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(contact.name)}
          </div>
          <h3 className="font-semibold text-lg mb-1">{contact.name}</h3>
          <p className="text-sm text-muted-foreground mb-1">{contact.jobTitle}</p>
          <p className="text-sm text-muted-foreground mb-3">{contact.email}</p>
          
          <div className="flex flex-wrap gap-1 justify-center mb-4">
            {contact.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div>
              <p className="font-bold text-lg">{contact.emailCount}</p>
              <p className="text-xs text-muted-foreground">Emails</p>
            </div>
            <div>
              <p className="font-bold text-lg">12</p>
              <p className="text-xs text-muted-foreground">Meetings</p>
            </div>
            <div>
              <p className="font-bold text-lg">5</p>
              <p className="text-xs text-muted-foreground">Files</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" size="sm">
              <Mail className="h-4 w-4 mr-1" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactListItem({ contact }: { contact: any }) {
  const avatarColor = generateAvatarColor(contact.email);

  return (
    <Card className="hover:bg-accent transition-colors cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(contact.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{contact.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {contact.jobTitle} at {contact.company}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{contact.emailCount} emails</p>
                  <p className="text-xs text-muted-foreground">{contact.location}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


