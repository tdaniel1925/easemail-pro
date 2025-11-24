# EaseMail Calendar MVP - Product Requirements Document

**Version:** 2.0 MVP
**Target:** 10-12 week development cycle
**Focus:** Email-Calendar Fusion + Core AI Features
**Status:** Active Development

---

## Executive Summary

This MVP delivers a **best-in-class calendar experience** that is deeply integrated with EaseMail's email interface. We're building the **fastest** and **most intelligent** way to manage your calendar, with AI assistance built into every interaction.

**Core Differentiators:**
1. Seamless email-calendar integration (no context switching)
2. Natural language event creation with voice input
3. AI-powered scheduling assistance
4. Keyboard-first power user experience

**What We're NOT Building (Yet):**
- Personal booking pages (Calendly competitor) → v2.1
- Room/resource booking → Enterprise v3.0
- Mobile apps → Phase 2
- Team calendars → v2.2
- Year/Schedule views → Nice-to-have, deferred

---

## Success Metrics

**Adoption:**
- 70%+ of active users connect a calendar within 7 days
- 40%+ use AI features (natural language, Find Time) weekly
- 3+ calendar interactions per active user per day

**Performance:**
- Calendar view load: <500ms (P95)
- Event creation (manual): <200ms (P95)
- Event creation (AI-assisted): <1000ms (P95)
- External calendar sync: <60 seconds

**Quality:**
- NPS: >40 for calendar module
- Bug rate: <2% of calendar operations
- Natural language parsing accuracy: >85%

**Business:**
- Calendar users have 25%+ higher retention than email-only users
- Calendar feature mentioned in 50%+ of user testimonials

---

## Phase 1: Core Calendar (Weeks 1-4)

### 1.1 Calendar Views

**Day View** ✅ Already Built
- Timeline from 6 AM to 10 PM (configurable)
- Click time slots to create events
- Drag-and-drop to reschedule
- Resize events to change duration
- Current time indicator
- Keyboard: `0` or `D`

**Week View** ✅ Already Built
- Sunday-Monday 7-day grid (configurable start day in settings)
- Click time slots to create events
- Compact event display
- Today highlighting
- Keyboard: `2` or `W`

**Month View** ✅ Already Built
- Full calendar grid
- Click day to switch to day view
- Event count indicators
- Keyboard: `3` or `M`

### 1.2 Event Management

**Event Creation**
- Click-and-drag time selection ✅ Already Built
- QuickAdd modal with natural language input ✅ Already Built
- Voice input for dictation ✅ Already Built
- Keyboard shortcut: `N`

**Event Fields (MVP)**
- Title (required)
- Date & Time with timezone
- Duration / End time
- All-day toggle
- Location (text field)
- Description/Notes
- Calendar selection (if multiple calendars)
- Reminders (single, default to 15 min before)

**Event Actions**
- View details ✅ Already Built
- Edit event
- Delete event ✅ Already Built
- Drag to reschedule ✅ Already Built
- RSVP to invites (Accept/Decline/Tentative)

**NOT in MVP:**
- Recurrence rules → Phase 2
- Multiple reminders → Phase 2
- Attachments → Phase 2
- Custom colors → Phase 2
- Visibility settings → Phase 2

### 1.3 Calendar Sync

**Google Calendar Integration**
- OAuth2 authentication
- Read events (all calendars)
- Create/update/delete events
- Sync every 60 seconds
- Conflict detection and display

**NOT in MVP:**
- Microsoft Outlook → Phase 2 (Week 5-6)
- iCloud → Phase 3
- CalDAV → Phase 3
- Multiple account support → Phase 2

### 1.4 Basic Features

**Timezone Support**
- User's primary timezone (auto-detected)
- Event-specific timezones
- Display times in user's timezone

**Navigation**
- Today button
- Previous/Next day/week/month
- Jump to specific date
- Keyboard shortcuts: `T` (today), `J` (next), `K` (previous)

---

## Phase 2: Email Integration (Weeks 5-6)

### 2.1 Calendar Sidebar

**In Email View:**
- Toggle calendar sidebar (always accessible)
- Mini-calendar date picker
- Today's events list
- Quick create button
- Keyboard: `2` to switch to full calendar

**Smart Context:**
- When email mentions a date, highlight that day
- Show relevant day's schedule when reading meeting invites

### 2.2 Meeting Invites

**In Email:**
- Detect .ics attachments and meeting invites
- Rich preview of event details
- One-click RSVP buttons (Accept/Decline/Tentative)
- Add to calendar with custom reminder
- Join meeting button (for video call links)

**NOT in MVP:**
- Propose new time → Phase 3
- Inline availability checking → Phase 3

### 2.3 Create from Email

**"Add to Calendar" Button:**
- Appears when AI detects schedulable content in email
- Pre-fills event with AI-parsed details:
  - Title from email subject/content
  - Date/time from email text
  - Attendees from email participants
  - Location if mentioned
- Link event to email thread
- One-click to create or review/edit first

---

## Phase 3: AI Features (Weeks 7-10)

### 3.1 Natural Language Event Creation ✅ Already Built

**QuickAdd Enhancement:**
- Parse natural language input
- Examples that work:
  - "Lunch with John tomorrow at noon"
  - "Team standup every Monday 9am" (Phase 2 for recurrence)
  - "Doctor appointment next Tuesday 2pm for 30 minutes"
  - "Block 2 hours Friday morning for deep work"

**Parsing Capabilities (MVP):**
- Date: today, tomorrow, next [day], [specific date]
- Time: [hour] am/pm, noon, morning, afternoon, evening
- Duration: for [X] minutes/hours
- Title: everything else
- Location: at [place]

**NOT in MVP:**
- Complex recurrence parsing → Phase 2
- Relative dates ("in 3 days") → Phase 2
- Time ranges ("between 2-4pm") → Phase 2

### 3.2 Find Time Feature

**Mutual Availability Finder:**
- Input: List of attendee emails
- Output: Available time slots when everyone is free
- UI: Highlight free slots on calendar grid
- Click slot to create meeting invite
- Keyboard shortcut: `F` or `Cmd+Shift+F`

**Features:**
- Check availability across Google Calendars
- Configurable search window (next 7 days, 14 days, 30 days)
- Respect working hours (9am-5pm default, configurable)
- Show attendee names and conflicts
- Filter by: This week only, Next week, Custom range

**NOT in MVP:**
- Microsoft Calendar availability → Phase 2
- Suggest best time (AI ranking) → Phase 3
- Round-robin scheduling → v2.1

### 3.3 Smart Scheduling Suggestions

**AI Assistance:**
- Suggest optimal meeting times based on:
  - User's typical schedule patterns
  - Focus time blocks (no meetings during deep work hours)
  - Avoid back-to-back meetings (suggest buffer time)
  - Lunch hour protection (don't schedule 12-1pm)

**Implementation:**
- Analyze user's last 30 days of calendar data
- Build preference model (morning vs afternoon meetings, etc.)
- Surface suggestions when creating events
- "Smart suggestions" toggle in QuickAdd

**NOT in MVP:**
- Meeting fatigue detection → Phase 3
- Auto-reschedule suggestions → Phase 3
- Team-wide patterns → v2.2

### 3.4 Instant Event from Email ✅ Partially Built

**AI Email Analysis:**
- Scan incoming emails for schedulable content
- Show "Add to Calendar" badge on relevant emails
- Pre-populate event form with extracted details:
  - Meeting title
  - Proposed date/time
  - Attendee list
  - Location (physical or video link)
  - Agenda (from email body)

**Confidence Levels:**
- High confidence: Auto-suggest with 1-click add
- Medium: Show suggestion, require review
- Low: Don't suggest

---

## Phase 4: Polish & Performance (Weeks 11-12)

### 4.1 Performance Optimization

**Targets:**
- Calendar initial load: <500ms
- View switching: <200ms
- Event creation (local): <100ms
- Event sync: <60 seconds
- AI parsing: <800ms

**Techniques:**
- Optimistic UI updates
- Background sync with retry logic
- IndexedDB caching for offline view
- Virtual scrolling for large event lists
- Debounced API calls

### 4.2 Error Handling

**Sync Errors:**
- Retry with exponential backoff
- Show sync status indicator
- Manual refresh button
- Clear error messages (not "Error 500")

**Conflict Resolution:**
- Detect when external calendar changes conflict with local edits
- Show diff and let user choose
- Default to "Keep external" for safety

**Network Failures:**
- Queue operations for when connection returns
- Show offline indicator
- Allow view-only in offline mode

### 4.3 Notifications & Reminders

**Reminder System:**
- Browser push notifications (requires permission)
- In-app notifications
- Default: 15 minutes before event
- Configurable per event (5, 10, 15, 30 min, 1 hour)
- Snooze option (5, 10, 15 min)

**Notification Content:**
- Event title
- Start time
- Location (if set)
- Join meeting button (for video calls)

**NOT in MVP:**
- Email reminders → Phase 2
- SMS reminders → v2.1
- Multiple reminders per event → Phase 2

### 4.4 Settings

**Calendar Settings Page:**
- Default calendar for new events
- Primary timezone
- Working hours (per day)
- Week start day (Sunday/Monday)
- Default event duration (30/60 min)
- Default reminder timing
- Keyboard shortcuts reference

---

## Keyboard Shortcuts (Final)

| Key | Action |
|-----|--------|
| `1` | Back to Inbox |
| `2` or `W` | Week View |
| `3` or `M` | Month View |
| `0` or `D` | Day View |
| `T` | Today |
| `J` or `→` | Next period |
| `K` or `←` | Previous period |
| `N` | New Event (QuickAdd) |
| `F` | Find Time |
| `E` | Edit selected event |
| `Delete` | Delete selected event |
| `Y` | Accept meeting invite |
| `Cmd+K` | Command palette |
| `?` | Show shortcuts |

---

## Technical Architecture

### Frontend Stack
- React 18 with Next.js 14 ✅
- TypeScript ✅
- TailwindCSS + shadcn/ui ✅
- date-fns for date manipulation ✅
- React Context for state management ✅

### Backend/API
- Nylas v3 API for calendar operations ✅
- Google Calendar API (via Nylas)
- Microsoft Graph API (Phase 2)
- Edge Functions for AI parsing
- PostgreSQL for user preferences and cache

### AI/NLP
- OpenAI GPT-4o-mini for natural language parsing
- Custom prompts for event extraction
- Fallback to regex patterns if API fails

### Data Model

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: number; // Unix timestamp
  endTime: number;
  timezone: string;
  calendarId: string;
  calendarName: string;
  isAllDay: boolean;
  attendees?: Attendee[];
  conferenceLink?: string;
  reminder?: number; // minutes before
  status: 'confirmed' | 'tentative' | 'cancelled';
  userResponse?: 'accepted' | 'declined' | 'tentative';
  linkedEmailThreadId?: string;
}

interface Calendar {
  id: string;
  name: string;
  provider: 'google' | 'microsoft';
  email: string;
  hexColor: string;
  isPrimary: boolean;
  isReadOnly: boolean;
}
```

### Performance Budgets
- Bundle size: <150KB (gzipped) for calendar module
- Time to Interactive: <2s
- Largest Contentful Paint: <1.5s
- First Input Delay: <100ms

---

## What's EXCLUDED from MVP

**Explicitly Out of Scope:**

### Features → Later Phases
- ❌ Recurring events (Phase 2 - Week 13-14)
- ❌ Microsoft/Outlook Calendar sync (Phase 2 - Week 13-14)
- ❌ Share Availability / Booking links (Phase 3 - Week 15-16)
- ❌ AI Meeting Prep (Phase 3 - Week 17-18)
- ❌ Mobile apps (Phase 4 - Week 19-24)

### Features → v2.1+
- ❌ Personal booking pages (v2.1)
- ❌ Team calendars (v2.2)
- ❌ Room/resource booking (Enterprise v3.0)
- ❌ Year view (v2.1)
- ❌ Schedule/Agenda view (v2.1)
- ❌ Calendar attachments (v2.1)
- ❌ Custom event colors/categories (v2.1)

### Enterprise Features → v3.0
- ❌ SSO/SAML integration
- ❌ Admin console
- ❌ Audit logs
- ❌ Delegation/assistant access
- ❌ Company-wide calendars
- ❌ Meeting room displays

---

## Success Criteria for MVP Launch

**Must Have:**
✅ All Phase 1-4 features working
✅ <2% bug rate on core operations
✅ Performance targets met (P95)
✅ Google Calendar sync working reliably
✅ Natural language parsing >80% accuracy
✅ User testing with 20+ beta users
✅ Documentation complete

**Nice to Have:**
- Video demos for marketing
- Customer testimonials from beta
- Press coverage secured

**Launch Blockers:**
- Data loss bugs
- Sync corruption issues
- Performance regressions
- Security vulnerabilities
- Critical accessibility issues

---

## Post-MVP Roadmap

### Phase 2: Recurring Events + Microsoft (Weeks 13-14)
- Full recurrence rule support (daily, weekly, monthly, yearly)
- Microsoft/Outlook Calendar OAuth integration
- Multiple calendar account support
- Multi-reminder per event

### Phase 3: Advanced AI (Weeks 15-18)
- Share Availability / Scheduling links
- Propose new time for meetings
- AI Meeting Prep (attendee research, context)
- Smart conflict resolution
- Advanced NLP (relative dates, complex patterns)

### Phase 4: Mobile Apps (Weeks 19-24)
- iOS native app
- Android native app
- Mobile-optimized gestures
- Offline-first architecture
- Push notifications

### v2.1: Booking & Scheduling (8 weeks)
- Personal booking pages (Calendly alternative)
- Multiple event types
- Custom availability windows
- Booking forms and questions
- Payment integration (optional)

### v2.2: Team Features (6 weeks)
- Team calendars
- Shared availability
- Round-robin scheduling
- Colleague office hours
- Team analytics

---

## Development Timeline (12 Weeks)

```
Week 1-2:   Core calendar views + event CRUD ✅ (Already done!)
Week 3-4:   Google Calendar sync + event management
Week 5:     Email sidebar integration
Week 6:     Meeting invite detection + RSVP
Week 7-8:   Natural language parsing + AI integration
Week 9:     Find Time feature
Week 10:    Smart scheduling suggestions
Week 11:    Performance optimization + error handling
Week 12:    Polish, bug fixes, beta testing

Week 13:    Launch! 🚀
```

---

## Appendix: Lessons Learned from Analysis

**Why This MVP Scope Works:**

1. **Builds on existing work** - We already have Day/Week/Month views, QuickAdd with voice, click-to-create
2. **Focuses on differentiators** - Email integration and AI features are unique
3. **Defers complexity** - Booking pages, room booking, mobile apps come later
4. **Realistic timeline** - 12 weeks for core experience vs 30 weeks for everything
5. **Measurable value** - Users get immediate benefit from email-calendar fusion

**What We're Betting On:**

- Users care more about speed and AI than feature count
- Email-calendar integration is more valuable than booking pages
- 80% of users only need single-account, non-recurring events
- Natural language is the killer feature for event creation
- Keyboard shortcuts drive power user adoption

---

*Last Updated: November 23, 2025*
*Next Review: After Beta Testing (Week 12)*
