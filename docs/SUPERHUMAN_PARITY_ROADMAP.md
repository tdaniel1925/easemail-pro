# 🎯 Superhuman/Outlook Parity Roadmap

**Goal:** Match the quality and UX of Superhuman and Outlook for folder management

---

## ✅ Phase 1: Critical Bugs (COMPLETE)

**Status:** ✅ 100% Complete  
**Duration:** 2 hours  
**Effort:** Low  

### Completed:
- [x] Fix AccountID not passed to EmailClient
- [x] Fix folder names (inbox vs Inbox)
- [x] Clear folders on account switch
- [x] Fix EmailClient using wrong accountId
- [x] Add account ownership validation (security)
- [x] Add active folder state tracking

**Impact:** 🔥 **MASSIVE** - Went from broken to functional

---

## 🟡 Phase 2: Core Features (Next Up)

**Status:** ⏳ Ready to start  
**Duration:** 3-5 days  
**Effort:** Medium  
**Priority:** HIGH

### Tasks:

#### 1. Real-Time Folder Counts ⭐⭐⭐
**Problem:** Counts only update when folders sync from Nylas (stale)  
**Solution:** Calculate counts from local database in real-time

```typescript
// Example: lib/email/folder-counts.ts
export async function getFolderCounts(accountId: string) {
  const counts = await db
    .select({
      folder: emails.folder,
      total: count(),
      unread: count().where(eq(emails.isRead, false))
    })
    .from(emails)
    .where(eq(emails.accountId, accountId))
    .groupBy(emails.folder);
    
  return counts;
}
```

**Benefit:** Live counts like Superhuman (updates when emails marked read/deleted)

---

#### 2. Folder Hierarchy/Nesting ⭐⭐⭐
**Problem:** Schema has `parentFolderId` and `fullPath` but UI doesn't render it  
**Solution:** Render nested folders with indentation

```typescript
// Example: components/layout/FolderTree.tsx
📁 Projects (12)
  📁 2024 (8)
    📁 Q1 (3)
    📁 Q2 (5)
  📁 Archive (4)
```

**Benefit:** Outlook-style folder organization

---

#### 3. Keyboard Shortcuts ⭐⭐
**Problem:** No keyboard navigation  
**Solution:** Implement shortcuts like Superhuman

| Shortcut | Action |
|----------|--------|
| `g + i` | Go to Inbox |
| `g + s` | Go to Sent |
| `g + d` | Go to Drafts |
| `g + t` | Go to Trash |
| `/` | Focus search |
| `c` | Compose new email |

```typescript
// Example: lib/hooks/useKeyboardShortcuts.ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'g') {
      setWaitingForSecondKey(true);
    } else if (waitingForSecondKey) {
      if (e.key === 'i') router.push('/inbox?folder=inbox');
      if (e.key === 's') router.push('/inbox?folder=sent');
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [waitingForSecondKey]);
```

**Benefit:** Power users can navigate without mouse

---

#### 4. Optimistic UI Updates ⭐⭐⭐
**Problem:** UI waits for server response (slow, janky)  
**Solution:** Update UI immediately, sync in background

```typescript
// Example: When moving email to folder
const moveEmail = async (emailId: string, toFolder: string) => {
  // 1. Update UI immediately (optimistic)
  setEmails(prev => prev.map(e => 
    e.id === emailId ? { ...e, folder: toFolder } : e
  ));
  
  try {
    // 2. Send request in background
    await fetch('/api/emails/move', { 
      method: 'POST', 
      body: JSON.stringify({ emailId, folder: toFolder })
    });
  } catch (error) {
    // 3. Rollback on error
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, folder: originalFolder } : e
    ));
    toast.error('Failed to move email');
  }
};
```

**Benefit:** Instant feedback like Superhuman

---

#### 5. Loading States & Skeletons ⭐
**Problem:** Folders just appear/disappear (jarring)  
**Solution:** Smooth skeleton loaders

```typescript
<div className="space-y-2">
  {loading ? (
    <>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </>
  ) : (
    folders.map(folder => <FolderItem {...folder} />)
  )}
</div>
```

**Benefit:** Professional polish

---

## 🟢 Phase 3: UX Polish (After Phase 2)

**Status:** 📅 Planned  
**Duration:** 2-3 days  
**Effort:** Low-Medium  
**Priority:** MEDIUM

### Tasks:

#### 6. Drag & Drop ⭐⭐
Drag email to folder to move it

#### 7. Folder Search/Quick Jump ⭐⭐
`Cmd+K` → Search folders

#### 8. Folder Customization ⭐
Custom colors, icons, sort order

#### 9. Recently Used Folders ⭐
Quick access dropdown

#### 10. Folder Tooltips ⭐
Hover to show full path for nested folders

---

## 🔵 Phase 4: Performance (After Phase 3)

**Status:** 📅 Planned  
**Duration:** 2-3 days  
**Effort:** Medium-High  
**Priority:** MEDIUM

### Tasks:

#### 11. Materialized View for Counts ⭐⭐⭐
Database-level optimization

```sql
CREATE MATERIALIZED VIEW folder_counts AS
SELECT 
  account_id,
  folder,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count
FROM emails
WHERE is_trashed = false
GROUP BY account_id, folder;

-- Refresh automatically
CREATE TRIGGER refresh_folder_counts
AFTER INSERT OR UPDATE OR DELETE ON emails
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_materialized_view('folder_counts');
```

#### 12. Folder Caching ⭐⭐
Cache folders in memory, background refresh

#### 13. Prefetching ⭐
Prefetch adjacent folders on hover

#### 14. Offline Support ⭐⭐
Service worker + IndexedDB cache

---

## 🟣 Phase 5: Advanced Features (Future)

**Status:** 💡 Ideas  
**Duration:** 5-7 days  
**Effort:** High  
**Priority:** LOW

### Tasks:

#### 15. Folder Rules Integration ⭐⭐
"Create rule from folder" button

#### 16. Smart Folder Suggestions ⭐⭐⭐
AI-powered: "15 emails from Boss → Archive?"

#### 17. Folder Analytics ⭐
"You spend 40% of time in this folder"

#### 18. Folder Conflict Resolution ⭐⭐
Handle folder renames/deletes from external clients

#### 19. Folder Reordering ⭐
Drag folders to reorder (custom sort)

#### 20. Webhook Integration ⭐⭐
Real-time folder updates when folders created/deleted externally

---

## 📊 Progress Tracker

| Phase | Tasks | Completed | Progress | ETA |
|-------|-------|-----------|----------|-----|
| Phase 1 | 6 | 6 | ✅ 100% | ✅ Done |
| Phase 2 | 5 | 0 | ⬜ 0% | 3-5 days |
| Phase 3 | 5 | 0 | ⬜ 0% | +2-3 days |
| Phase 4 | 4 | 0 | ⬜ 0% | +2-3 days |
| Phase 5 | 6 | 0 | ⬜ 0% | Future |
| **Total** | **26** | **6** | **23%** | **~10 days** |

---

## 🎯 Milestone Goals

### **Milestone 1: Functional** ✅
**Definition:** Folders work without bugs  
**Status:** ✅ ACHIEVED (Phase 1 complete)

### **Milestone 2: Competitive** ⏳
**Definition:** Match Gmail/Outlook basic features  
**Requirements:** Phase 2 complete  
**ETA:** 5 days

### **Milestone 3: Best-in-Class** 🎯
**Definition:** Match Superhuman quality  
**Requirements:** Phases 2-4 complete  
**ETA:** 10 days

### **Milestone 4: Industry-Leading** 🚀
**Definition:** Exceed Superhuman with AI features  
**Requirements:** Phase 5 complete  
**ETA:** Future

---

## 🚀 Quick Start: Build Phase 2

Ready to implement Phase 2? Here's the order:

1. **Start here:** Real-time folder counts (biggest impact)
2. **Then:** Optimistic UI updates (feels fastest)
3. **Then:** Loading states (polish)
4. **Then:** Keyboard shortcuts (power users)
5. **Finally:** Folder hierarchy (nice-to-have)

**Time estimate:** 1 day per feature = 5 days total

---

## 💡 Implementation Tips

### **For Real-Time Counts:**
- Create `lib/email/folder-counts.ts` utility
- Add to `InboxLayout` fetch (alongside folders)
- Update on email actions (mark read, delete, move)

### **For Optimistic Updates:**
- Use React's `useOptimistic` hook (React 19)
- Or manual state + rollback pattern
- Show toast notifications on errors

### **For Keyboard Shortcuts:**
- Use `react-hotkeys-hook` library
- Show keyboard shortcut hints in UI (tooltips)
- Make shortcuts customizable in settings

### **For Folder Hierarchy:**
- Recursive component: `<FolderTree folders={folders} />`
- Use `parentFolderId` to build tree structure
- Indent with `paddingLeft: ${depth * 16}px`

---

**Status:** Ready to build Phase 2! 🚀

