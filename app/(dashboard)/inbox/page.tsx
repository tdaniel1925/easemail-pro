/**
 * Inbox v3 - Proper Nylas v3 Implementation
 * On-demand message fetching with infinite scroll
 */

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil, MessageSquare, Users, Calendar, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FolderSidebarV3 } from '@/components/nylas-v3/folder-sidebar-v3';
import { EmailListEnhancedV3 } from '@/components/nylas-v3/email-list-enhanced-v3';
import EmailCompose from '@/components/email/EmailCompose';
import { EmailViewerV3 } from '@/components/nylas-v3/email-viewer-v3';
import { SMSInboxV3 } from '@/components/nylas-v3/sms-inbox-v3';
import { ContactPanelV3 } from '@/components/nylas-v3/contact-panel-v3';
import { DraftsView } from '@/components/email/DraftsView';
import { useAccounts } from '@/lib/hooks/use-accounts';
import EaseMailLogoFull from '@/components/ui/EaseMailLogoFull';
import SettingsMenuNew from '@/components/layout/SettingsMenuNew';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function InboxV3Page() {
  const searchParams = useSearchParams();
  const folderParam = searchParams?.get('folder');
  const router = useRouter();
  const supabase = createClient();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null); // Nylas Grant ID (for API calls)
  const [selectedDbAccountId, setSelectedDbAccountId] = useState<string | null>(null); // Database UUID (for sending emails)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('inbox');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [composeReplyTo, setComposeReplyTo] = useState<any>(null);
  const [composeType, setComposeType] = useState<'compose' | 'reply' | 'reply-all' | 'forward'>('compose');
  const [rightPanelTab, setRightPanelTab] = useState<'contact' | 'calendar' | 'ai'>('calendar');
  const [aiReplyText, setAiReplyText] = useState<string | null>(null);
  const [composeDraft, setComposeDraft] = useState<any>(null);

  // Get accounts
  const { accounts, loading: accountsLoading } = useAccounts();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Auto-select first account if none selected
  if (!selectedAccountId && accounts.length > 0 && !accountsLoading) {
    // Use nylasGrantId (the Nylas grant ID) for folder/message API calls
    // AND store the database ID for sending emails
    const firstValidAccount = accounts.find(acc => acc.nylasGrantId);
    if (firstValidAccount) {
      setSelectedAccountId(firstValidAccount.nylasGrantId); // For Nylas API
      setSelectedDbAccountId(firstValidAccount.id); // For send email API
    } else {
      console.error('❌ No accounts with valid Nylas grant ID found.');
      console.error('Please reconnect your email account in Settings.');
      // Still set something to prevent infinite loop, but log the error
      setSelectedAccountId(accounts[0].id);
      setSelectedDbAccountId(accounts[0].id);
    }
  }

  const handleFolderSelect = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
    setSelectedMessageId(null); // Close email viewer when switching folders
  };

  const handleMessageSelect = (messageId: string) => {
    setSelectedMessageId(messageId);
  };

  const handleCompose = (type: 'reply' | 'reply-all' | 'forward', email: any, generatedReply?: string) => {
    const sender = email.from?.[0];
    const senderEmail = sender?.email || '';
    const senderName = sender?.name || senderEmail;

    // Store selected message for contact panel first
    setSelectedMessage(email);
    setRightPanelTab('contact'); // Auto-switch to contact tab

    // Store AI-generated reply if provided
    if (generatedReply) {
      setAiReplyText(generatedReply);
    } else {
      setAiReplyText(null);
    }

    if (type === 'reply') {
      setComposeReplyTo({
        to: senderEmail,
        subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
        messageId: email.id,
        body: email.body || email.snippet,
      });
      setComposeType('reply');
      setIsComposeOpen(true);
    } else if (type === 'reply-all') {
      // Extract all recipients (original TO + CC, excluding current user)
      const allToRecipients = email.to?.map((r: any) => r.email).filter((e: string) => e !== senderEmail) || [];
      const allCcRecipients = email.cc?.map((r: any) => r.email) || [];

      // Combine: Reply goes to sender + all original TO recipients (except sender) + all CC recipients
      const replyToEmails = [senderEmail, ...allToRecipients].filter((e: string, i: number, arr: string[]) => arr.indexOf(e) === i);

      setComposeReplyTo({
        to: replyToEmails.join(', '),
        cc: allCcRecipients.length > 0 ? allCcRecipients.join(', ') : undefined,
        subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
        messageId: email.id,
        body: email.body || email.snippet,
      });
      setComposeType('reply-all');
      setIsComposeOpen(true);
    } else if (type === 'forward') {
      setComposeReplyTo({
        subject: email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
        messageId: email.id,
        body: email.body || email.snippet,
      });
      setComposeType('forward');
      setIsComposeOpen(true);
    }
  };

  const handleReply = (messageId: string, from: string, subject: string, body: string) => {
    setComposeReplyTo({
      to: from,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      messageId,
      body,
    });
    setComposeType('reply');
    setIsComposeOpen(true);
  };

  return (
    <>
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Folder Sidebar - Fixed width with independent scroll */}
      <div className="w-64 border-r border-border flex flex-col overflow-hidden">
        {/* Sidebar Header - Fixed */}
        <div className="flex-shrink-0 h-14 px-5 flex items-center justify-center border-b border-border">
          <EaseMailLogoFull className="h-8" />
        </div>

        {/* Action Buttons - Fixed */}
        <div className="flex-shrink-0 p-3 border-b border-border space-y-2">
          <Button
            onClick={() => setIsComposeOpen(true)}
            className="w-full gap-2"
            disabled={!selectedAccountId}
          >
            <Pencil className="h-4 w-4" />
            Compose
          </Button>
        </div>

        {/* Account Selector - Fixed */}
        {accounts.length > 0 && (
          <div className="flex-shrink-0 p-3 border-b border-border">
            <select
              value={selectedAccountId || ''}
              onChange={(e) => {
                const selectedNylasGrantId = e.target.value;
                setSelectedAccountId(selectedNylasGrantId);

                // Also update the database account ID for sending emails and saving drafts
                const selectedAccount = accounts.find(
                  acc => acc.nylasGrantId === selectedNylasGrantId || acc.id === selectedNylasGrantId
                );
                if (selectedAccount) {
                  setSelectedDbAccountId(selectedAccount.id);
                  console.log('[Account Switch] Updated account IDs:', {
                    nylasGrantId: selectedNylasGrantId,
                    dbAccountId: selectedAccount.id
                  });
                }

                setSelectedFolderId(null);
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground [color-scheme:light] dark:[color-scheme:dark]"
            >
              {accounts.map((account: any) => (
                <option key={account.id} value={account.nylasGrantId || account.id} className="bg-background text-foreground">
                  {account.emailAddress}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Folders - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {selectedAccountId && (
            <FolderSidebarV3
              accountId={selectedAccountId}
              selectedFolderId={selectedFolderId}
              onFolderSelect={handleFolderSelect}
            />
          )}
        </div>

        {/* Quick Links - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-border">
          <div className="p-2 space-y-1">
            <a
              href="/contacts-v4"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-lg transition-colors"
            >
              <Users className="h-4 w-4" />
              Contacts
            </a>
            <a
              href="/calendar"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-lg transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </a>
            <a
              href="/attachments"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-lg transition-colors"
            >
              <Paperclip className="h-4 w-4" />
              Attachments
            </a>

            {/* Settings Menu */}
            <SettingsMenuNew
              onLogout={handleLogout}
              onNavigate={(path) => router.push(path)}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area - Email List/Viewer/SMS/Drafts */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFolderName === 'sms' ? (
          <SMSInboxV3 />
        ) : selectedFolderName?.toLowerCase() === 'drafts' && selectedAccountId ? (
          <DraftsView
            accountId={selectedAccountId}
            onResumeDraft={(draft) => {
              console.log('[inbox-v3] Resuming draft:', draft);
              setComposeDraft(draft);
              setIsComposeOpen(true);
            }}
          />
        ) : selectedAccountId && !selectedMessageId ? (
          <EmailListEnhancedV3
            accountId={selectedAccountId}
            folderId={selectedFolderId}
            folderName={selectedFolderName}
            onMessageSelect={handleMessageSelect}
            onEmailSelect={(email) => {
              setSelectedMessage(email);
              setRightPanelTab('contact'); // Auto-switch to contact tab when email is selected
            }}
            onCompose={handleCompose}
          />
        ) : selectedMessageId && selectedAccountId ? (
          <>
            {console.log('🎯 Page passing to EmailViewerV3:', { selectedMessageId, selectedAccountId })}
            <EmailViewerV3
              messageId={selectedMessageId}
              accountId={selectedAccountId}
              onClose={() => setSelectedMessageId(null)}
              onReply={handleReply}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No Account Selected</p>
              <p className="text-sm mt-2">
                Please connect an account to view your emails
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Panel */}
      <div className="w-80 border-l border-border flex flex-col overflow-hidden">
        <ContactPanelV3
          email={selectedMessage}
          activeTab={rightPanelTab}
          onTabChange={setRightPanelTab}
        />
      </div>
    </div>

    {/* Email Compose Modal */}
    <EmailCompose
      isOpen={isComposeOpen}
      onClose={() => {
        setIsComposeOpen(false);
        setComposeReplyTo(null);
        setComposeType('compose');
        setAiReplyText(null);
        setComposeDraft(null);
      }}
      type={composeType}
      replyTo={composeReplyTo}
      accountId={selectedDbAccountId || undefined}
      draft={composeDraft}
    />
    </>
  );
}
