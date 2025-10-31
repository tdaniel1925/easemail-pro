'use client';

import { useState } from 'react';
import { Settings, Mail, PenTool, Sliders, Bell, Shield, Plug, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function SettingsContent() {
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', name: 'General', icon: User },
    { id: 'signatures', name: 'Signatures', icon: PenTool },
    { id: 'preferences', name: 'Preferences', icon: Sliders },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'privacy', name: 'Privacy & Security', icon: Shield },
    { id: 'integrations', name: 'Integrations', icon: Plug },
  ];

  return (
    <div className="flex h-full">
      {/* Settings Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4">
        <h2 className="text-xl font-bold mb-6">Settings</h2>
        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeSection === section.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{section.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeSection === 'general' && <GeneralSettings />}
        {activeSection === 'signatures' && <SignaturesSettings />}
        {activeSection === 'preferences' && <PreferencesSettings />}
        {activeSection === 'notifications' && <NotificationsSettings />}
        {activeSection === 'privacy' && <PrivacySettings />}
        {activeSection === 'integrations' && <IntegrationsSettings />}
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">General Settings</h1>
        <p className="text-muted-foreground">Manage your account information and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" defaultValue="John" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" defaultValue="Doe" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="john@example.com" disabled />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language & Region</CardTitle>
          <CardDescription>Set your language and regional preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background">
                <option>English (US)</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background">
                <option>Pacific Time (PT)</option>
                <option>Mountain Time (MT)</option>
                <option>Central Time (CT)</option>
                <option>Eastern Time (ET)</option>
              </select>
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SignaturesSettings() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Email Signatures</h1>
          <p className="text-muted-foreground">Create and manage email signatures</p>
        </div>
        <Button>
          <PenTool className="h-4 w-4 mr-2" />
          New Signature
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Work Signature</CardTitle>
              <CardDescription>Default for john@company.com</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active</span>
              <div className="w-10 h-6 bg-primary rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border border-border rounded-lg p-4 bg-muted/50">
            <p className="font-medium">John Doe</p>
            <p className="text-sm">Product Manager</p>
            <p className="text-sm">TechCorp Inc.</p>
            <p className="text-sm mt-2">📧 john@company.com | 📞 +1 (555) 123-4567</p>
            <p className="text-sm">🌐 www.techcorp.com</p>
          </div>
          <div className="flex gap-2">
            <Button>Edit</Button>
            <Button variant="outline">Preview</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferencesSettings() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Email Preferences</h1>
        <p className="text-muted-foreground">Customize your email experience</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reading & Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Conversation View</p>
              <p className="text-sm text-muted-foreground">Group related emails together</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-advance</p>
              <p className="text-sm text-muted-foreground">Move to next email after delete or archive</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show Images</p>
              <p className="text-sm text-muted-foreground">Always display external images</p>
            </div>
            <div className="w-10 h-6 bg-muted rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Composing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Reply Behavior</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background">
              <option>Reply</option>
              <option>Reply All</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Smart Compose</p>
              <p className="text-sm text-muted-foreground">AI-powered writing suggestions</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSettings() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-muted-foreground">Manage how you receive notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Desktop Notifications</p>
              <p className="text-sm text-muted-foreground">Show notifications on your desktop</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sound</p>
              <p className="text-sm text-muted-foreground">Play sound for new emails</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Privacy & Security</h1>
        <p className="text-muted-foreground">Control your privacy and security settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Tracking Protection</p>
              <p className="text-sm text-muted-foreground">Block email tracking pixels</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Block External Images</p>
              <p className="text-sm text-muted-foreground">Prevent automatic image loading</p>
            </div>
            <div className="w-10 h-6 bg-primary rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsSettings() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-muted-foreground">Connect third-party services</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold">Z</span>
              </div>
              <div>
                <h3 className="font-semibold">Zoom</h3>
                <p className="text-sm text-muted-foreground">Add Zoom meetings to emails</p>
              </div>
            </div>
            <Button variant="outline">Connect</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <div>
                <h3 className="font-semibold">Slack</h3>
                <p className="text-sm text-muted-foreground">Receive email notifications in Slack</p>
              </div>
            </div>
            <Button variant="outline">Connect</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

