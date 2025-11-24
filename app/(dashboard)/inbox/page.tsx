/**
 * Inbox v3 - Proper Nylas v3 Implementation
 * On-demand message fetching with infinite scroll
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil, MessageSquare, Users, Calendar, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FolderSidebarV3 } from '@/components/nylas-v3/folder-sidebar-v3';
import { EmailListEnhancedV3 } from '@/components/nylas-v3/email-list-enhanced-v3';
import EmailCompose from '@/components/email/EmailCompose';
import { EmailViewerV3 } from '@/components/nylas-v3/email-viewer-v3';
import { SMSInboxV3 } from '@/components/nylas-v3/sms-inbox-v3';
import { ContactPanelV3 } from '@/components/nylas-v3/contact-panel-v3';
import { DraftsView } from '@/components/email/DraftsView';
import { useAccount } from '@/contexts/AccountContext';
import EaseMailLogoFull from '@/components/ui/EaseMailLogoFull';
import SettingsMenuNew from '@/components/layout/SettingsMenuNew';
import AccountSwitcher from '@/components/account/AccountSwitcher';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import EventDetailsModal from '@/components/calendar/EventDetailsModal';

function InboxV3Content() {
  const searchParams = useSearchParams();
  const folderParam = searchParams?.get('folder');
  const router = useRouter();
  const supabase = createClient();

  // ✅ FIX: Use AccountContext instead of local state for account selection
  // This ensures AccountSwitcher and inbox page stay in sync
  const { selectedAccount, accounts, isLoading: accountsLoading } = useAccount();

  // Derive accountIds from selectedAccount (updates automatically when account changes)
  const selectedAccountId = selectedAccount?.nylasGrantId || null; // Nylas Grant ID (for API calls)
  const selectedDbAccountId = selectedAccount?.id || null; // Database UUID (for sending emails)

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('inbox');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [composeReplyTo, setComposeReplyTo] = useState<any>(null);
  const [composeType, setComposeType] = useState<'compose' | 'reply' | 'reply-all' | 'forward'>('compose');
  const [rightPanelTab, setRightPanelTab] = useState<'agenda' | 'contact' | 'calendar'>('agenda');
  const [aiReplyText, setAiReplyText] = useState<string | null>(null);
  const [composeDraft, setComposeDraft] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);

  // ✅ REMOVED: Account selection/persistence logic (now handled by AccountContext)
  // AccountContext automatically:
  // - Loads selected account from localStorage on mount
  // - Persists selection changes to localStorage
  // - Auto-selects first/default account if none selected

  // ✅ FIX: Reset folder and messages when account changes
  useEffect(() => {
    if (selectedAccountId) {
      console.log('[Inbox] Account changed:', selectedAccount?.emailAddress);
      // Reset to inbox when switching accounts
      setSelectedFolderId(null);
      setSelectedFolderName('inbox');
      setSelectedMessageId(null);
      setSelectedMessage(null);
    }
  }, [selectedAccountId]); // Only trigger when the accountId changes

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleFolderSelect = (folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
    setSelectedMessageId(null); // Close email viewer when switching folders
  };

  const handleMessageSelect = (messageId: string) => {
    setSelectedMessageId(messageId);
  };

  const handleCompose = async (type: 'reply' | 'reply-all' | 'forward', email: any, generatedReply?: string) => {
    console.log('[Reply Debug] Initial email object from list:', {
      type,
      id: email.id,
      from: email.from,
      to: email.to,
      cc: email.cc,
      subject: email.subject,
      hasToField: !!email.to,
      hasCcField: !!email.cc,
    });

    // Fetch full message details if we don't have recipient info
    let fullEmail = email;
    if (!email.to || !email.cc) {
      console.log('[Reply Debug] Fetching full message details for:', email.id);
      try {
        const response = await fetch(`/api/nylas-v3/messages/${email.id}?accountId=${selectedAccountId}`);
        const data = await response.json();
        if (data.success && data.message) {
          fullEmail = data.message;
          console.log('[Reply Debug] Full message fetched:', {
            from: fullEmail.from,
            to: fullEmail.to,
            cc: fullEmail.cc,
          });
        }
      } catch (error) {
        console.error('[Reply Debug] Failed to fetch full message:', error);
      }
    }

    const sender = fullEmail.from?.[0];
    const senderEmail = sender?.email || '';
    const senderName = sender?.name || senderEmail;

    // Store selected message for contact panel first
    setSelectedMessage(fullEmail);
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
        subject: fullEmail.subject?.startsWith('Re:') ? fullEmail.subject : `Re: ${fullEmail.subject}`,
        messageId: fullEmail.id,
        body: fullEmail.body || fullEmail.snippet,
      });
      setComposeType('reply');
      setIsComposeOpen(true);
    } else if (type === 'reply-all') {
      // Extract all recipients (original TO + CC, excluding current user)
      const allToRecipients = fullEmail.to?.map((r: any) => r.email).filter((e: string) => e !== senderEmail) || [];
      const allCcRecipients = fullEmail.cc?.map((r: any) => r.email) || [];

      console.log('[Reply-All Debug] Recipients:', {
        senderEmail,
        allToRecipients,
        allCcRecipients
      });

      // Combine: Reply goes to sender + all original TO recipients (except sender) + all CC recipients
      const replyToEmails = [senderEmail, ...allToRecipients].filter((e: string, i: number, arr: string[]) => arr.indexOf(e) === i);

      setComposeReplyTo({
        to: replyToEmails.join(', '),
        cc: allCcRecipients.length > 0 ? allCcRecipients.join(', ') : undefined,
        subject: fullEmail.subject?.startsWith('Re:') ? fullEmail.subject : `Re: ${fullEmail.subject}`,
        messageId: fullEmail.id,
        body: fullEmail.body || fullEmail.snippet,
      });
      setComposeType('reply-all');
      setIsComposeOpen(true);
    } else if (type === 'forward') {
      setComposeReplyTo({
        subject: fullEmail.subject?.startsWith('Fwd:') ? fullEmail.subject : `Fwd: ${fullEmail.subject}`,
        messageId: fullEmail.id,
        body: fullEmail.body || fullEmail.snippet,
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

  // Handle AI-generated email composition
  const handleAICompose = (emailData: { to: string; subject: string; body: string }) => {
    setComposeReplyTo({
      to: emailData.to,
      subject: emailData.subject,
      body: '',
    });
    setAiReplyText(emailData.body);
    setComposeType('compose');
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
            onClick={() => {
              console.log('[Inbox] Compose clicked. selectedDbAccountId:', selectedDbAccountId);
              setIsComposeOpen(true);
            }}
            className="w-full gap-2"
            disabled={!selectedAccountId}
          >
            <Pencil className="h-4 w-4" />
            Compose
          </Button>
        </div>

        {/* Account Selector - Fixed */}
        <div className="flex-shrink-0 p-3 border-b border-border">
          <AccountSwitcher />
        </div>

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
        ) : (selectedFolderName?.toLowerCase() === 'drafts' || selectedFolderName?.toLowerCase() === 'draft') && selectedDbAccountId ? (
          <>
            {console.log('[Inbox] Rendering DraftsView with accountId:', selectedDbAccountId)}
            <DraftsView
              accountId={selectedDbAccountId}
              onResumeDraft={(draft) => {
                console.log('[inbox-v3] Resuming draft:', draft);
                setComposeDraft(draft);
                setIsComposeOpen(true);
              }}
            />
          </>
        ) : (selectedFolderName?.toLowerCase() === 'drafts' || selectedFolderName?.toLowerCase() === 'draft') && !selectedDbAccountId ? (
          <>
            {console.error('[Inbox] ❌ Drafts folder selected but no selectedDbAccountId!')}
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <p className="text-red-600">No account selected</p>
              </div>
            </div>
          </>
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
        ) : accountsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading account...</p>
            </div>
          </div>
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
      <div className="hidden lg:flex w-80 border-l border-border flex-col overflow-hidden">
        <ContactPanelV3
          email={selectedMessage}
          activeTab={rightPanelTab}
          onTabChange={setRightPanelTab}
          onComposeEmail={handleAICompose}
          onEventClick={(event) => {
            setSelectedEvent(event);
            setIsEventDetailsOpen(true);
          }}
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

    {/* Event Details Modal */}
    {selectedEvent && (
      <EventDetailsModal
        isOpen={isEventDetailsOpen}
        onClose={() => {
          setIsEventDetailsOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
      />
    )}
    </>
  );
}

export default function InboxV3Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading inbox...</p>
        </div>
      </div>
    }>
      <InboxV3Content />
    </Suspense>
  );
}
