# Calendar Pro Architecture

## Component Hierarchy

```
app/(dashboard)/calendar-pro/page.tsx
│
├── CalendarProvider (CalendarProContext)
│   │
│   └── CalendarProLayout
│       │
│       ├── Top Toolbar
│       │   ├── Navigation (Prev/Next/Today)
│       │   ├── Date Range Display
│       │   ├── View Switcher (Day/Week/Month)
│       │   ├── Refresh Button
│       │   ├── New Event Button
│       │   └── AccountSwitcher
│       │
│       ├── Main Content Area
│       │   │
│       │   ├── Mini Calendar Sidebar (Optional)
│       │   │   ├── Calendar List with Toggles
│       │   │   └── Keyboard Shortcuts Help
│       │   │
│       │   └── Calendar View (Dynamic)
│       │       │
│       │       ├── DayView
│       │       │   ├── Timeline (6am-10pm)
│       │       │   ├── 30-min Slots
│       │       │   ├── EventCard Components
│       │       │   └── Current Time Indicator
│       │       │
│       │       ├── WeekView
│       │       │   ├── 7-Day Grid
│       │       │   ├── Day Headers
│       │       │   ├── Time Slots
│       │       │   ├── EventCard Components (Compact)
│       │       │   └── Current Time Indicator
│       │       │
│       │       └── MonthView
│       │           ├── Month Grid
│       │           ├── Day Cells
│       │           ├── EventCard Components (Compact)
│       │           └── Overflow Indicators
│       │
│       └── Modals
│           ├── QuickAdd Modal
│           └── EventDetailModal
│
└── CommandPalette (Global)
```

## Data Flow

```
User Action
    ↓
CalendarProContext
    ↓
API Call (/api/nylas-v3/calendars/events)
    ↓
Nylas API
    ↓
Response Processing & Caching
    ↓
Context State Update
    ↓
Component Re-render
    ↓
UI Update
```

## State Management

### CalendarProContext State
```typescript
{
  // View State
  viewMode: 'day' | 'week' | 'month'
  selectedDate: Date

  // Event Data
  events: CalendarEvent[]
  isLoadingEvents: boolean
  eventsError: string | null

  // Calendar Data
  calendars: Calendar[]
  isLoadingCalendars: boolean
  selectedCalendarIds: string[]

  // Selected Event
  selectedEvent: CalendarEvent | null

  // Account
  accountId: string | null
  grantId: string | null
}
```

### Actions
```typescript
{
  setViewMode(mode: ViewMode): void
  setSelectedDate(date: Date): void
  refreshEvents(): Promise<void>
  toggleCalendar(calendarId: string): void
  setSelectedEvent(event: CalendarEvent | null): void
}
```

## API Endpoints Used

### Fetch Calendars
```
GET /api/nylas-v3/calendars?accountId={grantId}
Response: { success: true, calendars: Calendar[] }
```

### Fetch Events
```
GET /api/nylas-v3/calendars/events?accountId={grantId}&calendarIds={ids}&start={timestamp}&end={timestamp}
Response: { success: true, events: CalendarEvent[] }
```

### Create Event
```
POST /api/nylas-v3/calendars/events
Body: {
  accountId: string
  calendarId: string
  title: string
  when: { startTime: number, endTime: number }
}
Response: { success: true, event: CalendarEvent }
```

### Delete Event
```
DELETE /api/nylas-v3/calendars/events/{eventId}?accountId={grantId}&calendarId={calendarId}
Response: { success: true }
```

## Keyboard Shortcuts

### Navigation
- `j` - Next day (in day view)
- `k` - Previous day (in day view)
- `h` - Previous week (in week view)
- `l` - Next week (in week view)
- `t` - Go to today

### Views
- `d` - Switch to day view
- `w` - Switch to week view
- `m` - Switch to month view

### Actions
- `n` - New event (QuickAdd)
- `Cmd/Ctrl+K` - Command palette

## Color System

Events are color-coded based on their calendar's hex color:

```typescript
{
  '#3b82f6': 'blue',
  '#10b981': 'green',
  '#ef4444': 'red',
  '#8b5cf6': 'purple',
  '#f59e0b': 'orange',
  '#ec4899': 'pink',
  '#eab308': 'yellow',
  '#6b7280': 'gray',
}
```

Each color has corresponding Tailwind classes for background, border, and text.

## Event Time Parsing

Events can have time data in multiple formats (Nylas API variations):

```typescript
// Option 1: when.startTime (Unix timestamp)
event.when.startTime // number (seconds)

// Option 2: when.date (ISO date string)
event.when.date // string

// Option 3: startTime (ISO timestamp)
event.startTime // string

// Option 4: start_time (ISO timestamp)
event.start_time // string
```

The EventCard component handles all these formats gracefully.

## Responsive Breakpoints

```css
/* Mini Sidebar */
lg: 1024px+ /* Show sidebar */
<1024px    /* Hide sidebar */

/* Calendar Grid */
All views are responsive and adapt to container width
```

## Performance Optimizations

1. **API Caching** - 5-second cache on event fetches
2. **Lazy Event Loading** - Only fetch events for visible date range
3. **Memoized Calculations** - Date ranges, event positions
4. **Optimistic Updates** - Local state updates before API confirmation
5. **Efficient Re-renders** - Context selectors prevent unnecessary updates

## Error Handling

```typescript
try {
  // API call
} catch (error) {
  // Set error state
  setEventsError(error.message)
  // Show error in UI
  // Allow retry with refresh button
}
```

## Accessibility

- Keyboard navigation throughout
- ARIA labels on interactive elements
- Semantic HTML structure
- Focus management in modals
- Color contrast meets WCAG AA standards

## Testing Checklist

- [ ] Day view renders
- [ ] Week view renders
- [ ] Month view renders
- [ ] Events load from API
- [ ] Events display with correct times
- [ ] Event click opens details modal
- [ ] Quick add creates event
- [ ] Event deletion works
- [ ] Calendar filtering works
- [ ] Account switching works
- [ ] Keyboard shortcuts work
- [ ] Command palette opens
- [ ] Today button works
- [ ] Navigation arrows work
- [ ] View switcher works
- [ ] Refresh button works
- [ ] Responsive design works
- [ ] Dark mode works

## Future Enhancement Ideas

1. **Smart Scheduling** - Find available time slots
2. **Time Zone Support** - Display events in multiple time zones
3. **Agenda View** - List view of upcoming events
4. **Quick Reschedule** - Drag events to new times
5. **Event Templates** - Save common event patterns
6. **Meeting Polls** - Send scheduling polls
7. **Resource Booking** - Book rooms, equipment
8. **Analytics** - Time spent in meetings, calendar heatmap
9. **AI Suggestions** - Optimal meeting times
10. **Integrations** - Zoom, Teams, Meet auto-create
