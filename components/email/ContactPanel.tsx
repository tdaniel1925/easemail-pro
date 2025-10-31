'use client';

import { useState } from 'react';
import { User, MessageCircle, Mail, Phone, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInitials, generateAvatarColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import ContactModal from '@/components/contacts/ContactModal';

interface Email {
  id: string;
  fromEmail?: string;
  fromName?: string;
  subject: string;
  receivedAt: Date;
  bodyText?: string;
  bodyHtml?: string;
}

interface ContactPanelProps {
  email: Email | undefined;
  onClose: () => void;
  activeTab: 'contact' | 'ai';
  onTabChange: (tab: 'contact' | 'ai') => void;
}

export function ContactPanel({ email, onClose, activeTab, onTabChange }: ContactPanelProps) {
  const [aiMessage, setAiMessage] = useState('');
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  if (!email) {
    return (
      <div className="flex flex-col h-full bg-card items-center justify-center px-4">
        <p className="text-sm text-muted-foreground text-center">
          Select an email<br />to view contact information
        </p>
      </div>
    );
  }

  const avatarColor = generateAvatarColor(email?.fromEmail || 'unknown@example.com');

  const handleSendMessage = () => {
    if (!aiMessage.trim()) return;

    // Add user message
    const newMessages = [
      ...aiMessages,
      { role: 'user' as const, content: aiMessage },
      {
        role: 'assistant' as const,
        content: 'This is a demo AI response. In production, this would connect to OpenAI or Claude API to provide intelligent insights about your emails and contacts.',
      },
    ];
    
    setAiMessages(newMessages);
    setAiMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Tab Content - No header, tabs are in main layout */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'contact' ? (
          <ContactInfoTab email={email} avatarColor={avatarColor} />
        ) : (
          <AIChatTab
            messages={aiMessages}
            message={aiMessage}
            onMessageChange={setAiMessage}
            onSendMessage={handleSendMessage}
          />
        )}
      </div>
    </div>
  );
}

function ContactInfoTab({ email, avatarColor }: { email: Email; avatarColor: string }) {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  
  return (
    <>
      <div className="p-4 space-y-6">
        {/* Contact Header */}
        <div className="text-center pb-4 border-b border-border">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium text-white mx-auto mb-3"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(email.fromName || email.fromEmail || 'Unknown')}
          </div>
          <h3 className="font-semibold text-lg break-words px-2">{email.fromName || email.fromEmail || 'Unknown'}</h3>
          <p className="text-sm text-muted-foreground break-all px-2">{email.fromEmail}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setIsContactModalOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add to Contacts
          </Button>
          <Button variant="outline" className="flex-1">
            <Phone className="h-4 w-4 mr-2" />
            SMS
          </Button>
        </div>

      {/* Contact Details - Only Email */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase">Contact Information</h4>
        
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <a href={`mailto:${email.fromEmail || 'unknown@example.com'}`} className="text-sm hover:underline">
              {email.fromEmail || 'Unknown'}
            </a>
          </div>
        </div>
      </div>

      {/* Recent Activity - Just this email */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase">Recent Activity</h4>

        <div className="p-3 rounded-lg border border-border">
          <div className="flex items-start gap-2 mb-1">
            <Mail className="h-3 w-3 text-muted-foreground mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium">Email Received</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{email.subject}</p>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        email={email}
      />
    </>
  );
}

function AIChatTab({
  messages,
  message,
  onMessageChange,
  onSendMessage,
}: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  message: string;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">EaseMail AI</p>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Online
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center space-y-4 pt-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto">
              <MessageCircle className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <p className="font-medium mb-2">AI Email Assistant</p>
              <p className="text-sm text-muted-foreground mb-4">I can help you:</p>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Summarize this email
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Draft a reply
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Suggest next action
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Find related emails
                </Button>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-2',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div
                className={cn(
                  'px-4 py-2 rounded-lg max-w-[80%]',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything..."
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
          />
          <Button onClick={onSendMessage}>
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

