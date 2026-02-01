export default function EmailFeaturesArticle() {
  return (
    <div>
      <h2>Complete Email Features Guide</h2>
      <p className="lead">
        Master all of EaseMail's powerful email features to boost your productivity.
      </p>

      <h3>Composing Emails</h3>

      <h4>Creating a New Email</h4>
      <ol>
        <li>Click the <strong>"Compose"</strong> button (or press <kbd>C</kbd>)</li>
        <li>Enter recipient(s) in the <strong>"To"</strong> field</li>
        <li>Optionally add Cc and Bcc recipients</li>
        <li>Enter a subject line</li>
        <li>Compose your message</li>
        <li>Click <strong>"Send"</strong> (or press <kbd>Ctrl+Enter</kbd>)</li>
      </ol>

      <h4>Rich Text Formatting</h4>
      <p>Format your emails with the toolbar:</p>
      <ul>
        <li><strong>Bold</strong> (<kbd>Ctrl+B</kbd>): Make text stand out</li>
        <li><em>Italic</em> (<kbd>Ctrl+I</kbd>): Emphasize words</li>
        <li><u>Underline</u> (<kbd>Ctrl+U</kbd>): Underline text</li>
        <li><del>Strikethrough</del>: Cross out text</li>
        <li>Font size and color</li>
        <li>Bulleted and numbered lists</li>
        <li>Text alignment (left, center, right, justify)</li>
        <li>Block quotes</li>
        <li>Code blocks</li>
      </ul>

      <h4>Adding Links</h4>
      <ol>
        <li>Select the text to link</li>
        <li>Click the link icon or press <kbd>Ctrl+K</kbd></li>
        <li>Enter the URL</li>
        <li>Optionally add link text</li>
        <li>Click <strong>"Insert"</strong></li>
      </ol>

      <h4>Adding Attachments</h4>
      <p><strong>Method 1: Click to Upload</strong></p>
      <ol>
        <li>Click the attachment icon</li>
        <li>Select files from your computer</li>
        <li>Wait for upload to complete</li>
      </ol>

      <p><strong>Method 2: Drag & Drop</strong></p>
      <ol>
        <li>Drag files from your computer</li>
        <li>Drop them into the compose window</li>
        <li>Files automatically attach</li>
      </ol>

      <p><strong>Supported File Types:</strong></p>
      <ul>
        <li>Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX</li>
        <li>Images: JPG, PNG, GIF, SVG</li>
        <li>Archives: ZIP, RAR, 7Z</li>
        <li>Maximum size: 25MB per file (combine limit: 100MB)</li>
      </ul>

      <h4>Email Templates</h4>
      <p>Save time with reusable email templates:</p>

      <h5>Creating a Template</h5>
      <ol>
        <li>Compose an email with your template content</li>
        <li>Click <strong>"Save as Template"</strong></li>
        <li>Name your template</li>
        <li>Optionally add tags</li>
        <li>Click <strong>"Save"</strong></li>
      </ol>

      <h5>Using a Template</h5>
      <ol>
        <li>Click <strong>"Templates"</strong> in compose window</li>
        <li>Select template from list</li>
        <li>Content loads automatically</li>
        <li>Customize as needed</li>
        <li>Send</li>
      </ol>

      <h5>Managing Templates</h5>
      <ul>
        <li>View all: <strong>Settings → Templates</strong></li>
        <li>Edit, duplicate, or delete templates</li>
        <li>Share templates with team (Enterprise)</li>
        <li>Use variables: <code>{"{{name}}"}</code>, <code>{"{{company}}"}</code></li>
      </ul>

      <h4>Scheduling Emails</h4>
      <p>Send emails at the perfect time:</p>
      <ol>
        <li>Compose your email</li>
        <li>Click the dropdown next to <strong>"Send"</strong></li>
        <li>Select <strong>"Schedule Send"</strong></li>
        <li>Choose:
          <ul>
            <li>Tomorrow morning (8 AM)</li>
            <li>Tomorrow afternoon (1 PM)</li>
            <li>Monday morning (8 AM)</li>
            <li>Custom date & time</li>
          </ul>
        </li>
        <li>Click <strong>"Schedule"</strong></li>
      </ol>

      <p><strong>Managing Scheduled Emails:</strong></p>
      <ul>
        <li>View scheduled: <strong>Drafts folder → Scheduled tab</strong></li>
        <li>Edit scheduled email</li>
        <li>Reschedule to different time</li>
        <li>Send immediately</li>
        <li>Cancel scheduled send</li>
      </ul>

      <h4>AI-Powered Writing</h4>
      <p>Let AI help you write emails faster:</p>

      <h5>AI Compose</h5>
      <ol>
        <li>Click <strong>"AI Write"</strong> in compose window</li>
        <li>Describe what you want to say:
          <ul>
            <li>"Ask John about the Q4 budget report"</li>
            <li>"Thank the client for their business"</li>
            <li>"Decline the meeting politely"</li>
          </ul>
        </li>
        <li>AI generates a complete email</li>
        <li>Review and edit as needed</li>
        <li>Click <strong>"Insert"</strong> to add to your email</li>
      </ol>

      <h5>AI Improve</h5>
      <ul>
        <li>Select text in your email</li>
        <li>Click <strong>"AI Improve"</strong></li>
        <li>Choose:
          <ul>
            <li><strong>Make Professional</strong>: Formal business tone</li>
            <li><strong>Make Friendly</strong>: Warm, casual tone</li>
            <li><strong>Make Concise</strong>: Shorter, to the point</li>
            <li><strong>Fix Grammar</strong>: Correct errors</li>
            <li><strong>Expand</strong>: Add more detail</li>
          </ul>
        </li>
        <li>Review changes</li>
        <li>Accept or try again</li>
      </ul>

      <h5>AI Summarize (Reading Emails)</h5>
      <ul>
        <li>Long email thread? Click <strong>"AI Summarize"</strong></li>
        <li>Get key points and action items</li>
        <li>Understand context quickly</li>
      </ul>

      <h3>Managing Emails</h3>

      <h4>Organizing with Folders</h4>
      <p><strong>Default Folders:</strong></p>
      <ul>
        <li><strong>Inbox</strong>: New incoming emails</li>
        <li><strong>Sent</strong>: Emails you've sent</li>
        <li><strong>Drafts</strong>: Unfinished emails</li>
        <li><strong>Starred</strong>: Important emails marked with star</li>
        <li><strong>Archive</strong>: Old emails removed from inbox</li>
        <li><strong>Trash</strong>: Deleted emails (30-day retention)</li>
      </ul>

      <p><strong>Creating Custom Folders:</strong></p>
      <ol>
        <li>Click <strong>"+ New Folder"</strong> in sidebar</li>
        <li>Name your folder (e.g., "Projects", "Clients")</li>
        <li>Choose color (optional)</li>
        <li>Click <strong>"Create"</strong></li>
      </ol>

      <p><strong>Moving Emails:</strong></p>
      <ul>
        <li>Drag and drop emails to folders</li>
        <li>Select emails → Click <strong>"Move to"</strong> → Choose folder</li>
        <li>Right-click email → <strong>"Move to"</strong></li>
        <li>Keyboard shortcut: <kbd>V</kbd> then choose folder</li>
      </ul>

      <h4>Labels & Tags</h4>
      <p>Labels help categorize emails without moving them from inbox:</p>

      <h5>Creating Labels</h5>
      <ol>
        <li>Go to <strong>Settings → Labels</strong></li>
        <li>Click <strong>"Create Label"</strong></li>
        <li>Name: "Important", "Follow Up", "Waiting", etc.</li>
        <li>Choose color</li>
        <li>Add icon (optional)</li>
        <li>Save</li>
      </ol>

      <h5>Applying Labels</h5>
      <ul>
        <li>Select email(s)</li>
        <li>Click <strong>"Labels"</strong> icon</li>
        <li>Check labels to apply</li>
        <li>One email can have multiple labels</li>
      </ul>

      <h5>Filtering by Label</h5>
      <ul>
        <li>Click label in sidebar to view all emails with that label</li>
        <li>Labels span all folders</li>
        <li>Remove label: Click label icon → uncheck</li>
      </ul>

      <h4>Search & Filters</h4>

      <h5>Basic Search</h5>
      <ul>
        <li>Click search bar or press <kbd>/</kbd></li>
        <li>Enter search terms</li>
        <li>Results update as you type</li>
        <li>Searches: Subject, from, to, body</li>
      </ul>

      <h5>Advanced Search</h5>
      <p>Click <strong>"Advanced"</strong> in search bar:</p>
      <ul>
        <li><strong>From</strong>: Sender email or name</li>
        <li><strong>To</strong>: Recipient email or name</li>
        <li><strong>Subject</strong>: Subject line keywords</li>
        <li><strong>Has words</strong>: Must include these words</li>
        <li><strong>Doesn't have</strong>: Must exclude these words</li>
        <li><strong>Date range</strong>: Last day/week/month or custom</li>
        <li><strong>Has attachment</strong>: Only emails with files</li>
        <li><strong>Size</strong>: Larger than X MB</li>
        <li><strong>Is starred</strong>: Only starred emails</li>
        <li><strong>Is unread</strong>: Only unread emails</li>
      </ul>

      <h5>Search Operators</h5>
      <p>Power users can use operators directly:</p>
      <ul>
        <li><code>from:john@example.com</code> - From specific sender</li>
        <li><code>to:jane@example.com</code> - To specific recipient</li>
        <li><code>subject:invoice</code> - Subject contains "invoice"</li>
        <li><code>has:attachment</code> - Has attachments</li>
        <li><code>is:unread</code> - Unread emails</li>
        <li><code>is:starred</code> - Starred emails</li>
        <li><code>after:2024/01/01</code> - After date</li>
        <li><code>before:2024/12/31</code> - Before date</li>
        <li><code>larger:5MB</code> - Larger than 5MB</li>
        <li><code>label:important</code> - Has label "important"</li>
      </ul>

      <h5>Saving Searches</h5>
      <ol>
        <li>Perform a search</li>
        <li>Click <strong>"Save Search"</strong></li>
        <li>Name it (e.g., "Unread from clients")</li>
        <li>Saved searches appear in sidebar</li>
        <li>Click to run saved search</li>
      </ol>

      <h4>Email Rules & Automation</h4>
      <p>Automate email organization with rules:</p>

      <h5>Creating a Rule</h5>
      <ol>
        <li>Go to <strong>Settings → Rules</strong></li>
        <li>Click <strong>"Create Rule"</strong></li>
        <li>Name your rule</li>
        <li>Set conditions (must match ALL or ANY):
          <ul>
            <li>From contains "support@"</li>
            <li>Subject contains "invoice"</li>
            <li>To contains specific email</li>
            <li>Has attachment</li>
            <li>Body contains keywords</li>
          </ul>
        </li>
        <li>Set actions (can have multiple):
          <ul>
            <li>Move to folder</li>
            <li>Apply label</li>
            <li>Mark as read/starred</li>
            <li>Forward to someone</li>
            <li>Delete</li>
            <li>Auto-reply</li>
          </ul>
        </li>
        <li>Save and enable rule</li>
      </ol>

      <h5>Rule Examples</h5>
      <ul>
        <li><strong>Auto-file client emails</strong>:
          <ul>
            <li>If from contains "@client.com"</li>
            <li>Then move to "Clients" folder</li>
            <li>And apply label "Client"</li>
          </ul>
        </li>
        <li><strong>Mark newsletters as read</strong>:
          <ul>
            <li>If from contains "newsletter" OR "noreply"</li>
            <li>Then mark as read</li>
            <li>And move to "Newsletters" folder</li>
          </ul>
        </li>
        <li><strong>Forward urgent emails</strong>:
          <li>If subject contains "URGENT" or "ASAP"</li>
          <li>Then forward to manager@company.com</li>
          <li>And mark as starred</li>
        </li>
      </ul>

      <h3>Reading Emails</h3>

      <h4>Email View Options</h4>
      <ul>
        <li><strong>Compact View</strong>: More emails on screen</li>
        <li><strong>Comfortable View</strong>: Easier to read (default)</li>
        <li><strong>Spacious View</strong>: Maximum readability</li>
        <li>Change in: <strong>Settings → Appearance</strong></li>
      </ul>

      <h4>Thread Conversations</h4>
      <p>Related emails grouped into conversations:</p>
      <ul>
        <li>Click email to view full thread</li>
        <li>Expand/collapse individual messages</li>
        <li>Reply in context</li>
        <li>See full conversation history</li>
      </ul>

      <p><strong>Disable threading:</strong> Settings → Email → Conversation View → Off</p>

      <h4>External Images</h4>
      <p>For privacy and security, external images blocked by default:</p>
      <ul>
        <li>Click <strong>"Show Images"</strong> to load</li>
        <li>Click <strong>"Always show from sender"</strong> to whitelist</li>
        <li>Change default: <strong>Settings → Privacy</strong></li>
      </ul>

      <h4>Printing Emails</h4>
      <ol>
        <li>Open email</li>
        <li>Click menu (⋮) → <strong>"Print"</strong></li>
        <li>Or press <kbd>Ctrl+P</kbd></li>
        <li>Choose printer or save as PDF</li>
      </ol>

      <h3>Quick Actions</h3>

      <h4>Keyboard Shortcuts</h4>
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Shortcut</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Compose new email</td><td><kbd>C</kbd></td></tr>
          <tr><td>Reply</td><td><kbd>R</kbd></td></tr>
          <tr><td>Reply all</td><td><kbd>A</kbd></td></tr>
          <tr><td>Forward</td><td><kbd>F</kbd></td></tr>
          <tr><td>Archive</td><td><kbd>E</kbd></td></tr>
          <tr><td>Delete</td><td><kbd>Delete</kbd> or <kbd>#</kbd></td></tr>
          <tr><td>Star/unstar</td><td><kbd>S</kbd></td></tr>
          <tr><td>Mark read/unread</td><td><kbd>U</kbd></td></tr>
          <tr><td>Move to folder</td><td><kbd>V</kbd></td></tr>
          <tr><td>Search</td><td><kbd>/</kbd></td></tr>
          <tr><td>Go to Inbox</td><td><kbd>G</kbd> then <kbd>I</kbd></td></tr>
          <tr><td>Go to Sent</td><td><kbd>G</kbd> then <kbd>S</kbd></td></tr>
          <tr><td>Go to Drafts</td><td><kbd>G</kbd> then <kbd>D</kbd></td></tr>
          <tr><td>Select all</td><td><kbd>Ctrl+A</kbd></td></tr>
          <tr><td>Next email</td><td><kbd>J</kbd> or <kbd>↓</kbd></td></tr>
          <tr><td>Previous email</td><td><kbd>K</kbd> or <kbd>↑</kbd></td></tr>
          <tr><td>Open email</td><td><kbd>Enter</kbd></td></tr>
          <tr><td>Close email</td><td><kbd>Esc</kbd></td></tr>
          <tr><td>Send email</td><td><kbd>Ctrl+Enter</kbd></td></tr>
        </tbody>
      </table>

      <p>Press <kbd>?</kbd> to see all shortcuts</p>

      <h4>Bulk Actions</h4>
      <p>Select multiple emails for batch operations:</p>
      <ol>
        <li>Click checkboxes next to emails</li>
        <li>Or: Select one, then <kbd>Shift+Click</kbd> to select range</li>
        <li>Or: <kbd>Ctrl+A</kbd> to select all visible</li>
        <li>Choose action:
          <ul>
            <li>Mark as read/unread</li>
            <li>Star/unstar</li>
            <li>Move to folder</li>
            <li>Apply label</li>
            <li>Delete</li>
            <li>Archive</li>
          </ul>
        </li>
      </ol>

      <h3>Advanced Features</h3>

      <h4>Snooze Emails</h4>
      <p>Temporarily hide emails and bring them back later:</p>
      <ol>
        <li>Hover over email → Click snooze icon</li>
        <li>Choose when to resurface:
          <ul>
            <li>Later today (6 PM)</li>
            <li>Tomorrow (8 AM)</li>
            <li>This weekend (Saturday 8 AM)</li>
            <li>Next week (Monday 8 AM)</li>
            <li>Custom date & time</li>
          </ul>
        </li>
        <li>Email hidden from inbox</li>
        <li>Returns at scheduled time</li>
      </ol>

      <p>View snoozed: <strong>Sidebar → Snoozed</strong></p>

      <h4>Undo Send</h4>
      <p>Accidentally sent an email? Recall it:</p>
      <ul>
        <li>After clicking send, you have 5-30 seconds (configurable)</li>
        <li>Click <strong>"Undo"</strong> in the notification</li>
        <li>Email returns to compose window</li>
        <li>Edit and send again</li>
        <li>Configure delay: <strong>Settings → Email → Undo Send</strong></li>
      </ul>

      <h4>Email Signatures</h4>
      <p>Create professional email signatures:</p>
      <ol>
        <li>Go to <strong>Settings → Signatures</strong></li>
        <li>Click <strong>"Add Signature"</strong></li>
        <li>Create signature with:
          <ul>
            <li>Name and title</li>
            <li>Company name</li>
            <li>Phone and email</li>
            <li>Company logo</li>
            <li>Social media links</li>
          </ul>
        </li>
        <li>Choose when to use:
          <ul>
            <li>For new emails</li>
            <li>For replies/forwards</li>
            <li>Never (manual insertion)</li>
          </ul>
        </li>
        <li>Assign to email accounts</li>
      </ol>

      <h4>Out of Office</h4>
      <p>Set automatic replies when you're away:</p>
      <ol>
        <li>Go to <strong>Settings → Out of Office</strong></li>
        <li>Enable auto-reply</li>
        <li>Set dates:
          <ul>
            <li>Start date & time</li>
            <li>End date & time</li>
            <li>Or: Indefinite (manual disable)</li>
          </ul>
        </li>
        <li>Write auto-reply message</li>
        <li>Options:
          <ul>
            <li>Reply only to contacts</li>
            <li>Reply only to people in organization</li>
            <li>Reply to anyone</li>
            <li>Send one reply per sender (recommended)</li>
          </ul>
        </li>
        <li>Save</li>
      </ol>

      <h4>Email Tracking (Enterprise)</h4>
      <p>See when recipients open your emails:</p>
      <ul>
        <li>Enable for email: Click tracking icon when composing</li>
        <li>View tracking: Sent folder → Email → View tracking</li>
        <li>See: Opens, clicks, location, device</li>
        <li>Respects recipient's privacy settings</li>
      </ul>

      <h3>Tips & Tricks</h3>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 my-4">
        <h4 className="text-lg font-semibold mb-2">Pro Tips</h4>
        <ul className="space-y-2">
          <li><strong>Search from:me</strong> - Find emails you sent</li>
          <li><strong>Star important emails</strong> - Quick access to key messages</li>
          <li><strong>Use templates</strong> - Save time on repetitive emails</li>
          <li><strong>Learn keyboard shortcuts</strong> - 10x faster email management</li>
          <li><strong>Set up rules</strong> - Automate repetitive tasks</li>
          <li><strong>Use AI Write</strong> - Never start from blank page</li>
          <li><strong>Schedule sends</strong> - Send at optimal times</li>
          <li><strong>Snooze newsletters</strong> - Read them later</li>
          <li><strong>Archive, don't delete</strong> - Keep records, clean inbox</li>
          <li><strong>Unsubscribe from spam</strong> - Click unsubscribe link</li>
        </ul>
      </div>

      <h3>Mobile App Features</h3>
      <p>EaseMail mobile apps (iOS & Android) support all major features:</p>
      <ul>
        <li>Full email composition with attachments</li>
        <li>AI writing assistance</li>
        <li>Voice dictation</li>
        <li>Push notifications</li>
        <li>Offline access</li>
        <li>Biometric authentication</li>
        <li>Swipe gestures (archive, delete, snooze)</li>
      </ul>

      <p>Download: <a href="/mobile">easemail.com/mobile</a></p>

      <h3>Getting Help</h3>
      <ul>
        <li><strong>Help Center</strong>: <a href="/help">app.easemail.com/help</a></li>
        <li><strong>Video Tutorials</strong>: <a href="https://youtube.com/easemail">youtube.com/easemail</a></li>
        <li><strong>Support</strong>: support@easemail.com</li>
        <li><strong>Community</strong>: community.easemail.com</li>
      </ul>

      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="text-lg font-semibold mb-2">Master Your Inbox</h4>
        <p>
          With these features at your fingertips, you're ready to manage email like a pro.
          Start with the basics and gradually adopt more advanced features as needed.
        </p>
      </div>
    </div>
  );
}
