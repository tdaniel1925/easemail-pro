# 🚀 CALENDAR SYSTEM - QUICK START GUIDE

## ⚡ GET STARTED IN 5 MINUTES!

---

## 📋 **STEP 1: Run Database Migration** (2 min)

1. Go to **Supabase Dashboard**
2. Click **SQL Editor**
3. Click **New Query**
4. Copy & paste this file: `migrations/015_add_calendar_system.sql`
5. Click **Run** (Ctrl+Enter)
6. You should see: ✅ "Calendar system tables created successfully!"

---

## 🧪 **STEP 2: Test the Calendar** (3 min)

### **Test Event Creation:**
1. Go to `http://localhost:3001/calendar`
2. Click **"New Event"** button
3. Fill in:
   - Title: "Test Event"
   - Start Date: Today
   - Start Time: 2:00 PM
   - End Date: Today
   - End Time: 3:00 PM
4. Click **"Create Event"**
5. ✅ Event should appear on calendar!

### **Test Event Editing:**
1. Click the event you just created
2. Change title to "Updated Event"
3. Click **"Update Event"**
4. ✅ Event should update!

### **Test MiniCalendar:**
1. Look at right sidebar
2. ✅ Event should show in "Upcoming" section
3. ✅ Event dot should appear on today's date

---

## 🔄 **STEP 3: Test Sync** (Optional - 5 min)

### **Prerequisites:**
- Have a Google or Microsoft email account connected
- Account must have calendar permissions (reconnect if needed)

### **Sync Test:**
1. Go to `http://localhost:3001/calendar`
2. Click **"Sync"** button
3. Wait 2-5 seconds
4. ✅ External calendar events should appear!

### **Create Event & Sync:**
1. Create event in Google/Outlook Calendar
2. Come back to EaseMail
3. Click **"Sync"**
4. ✅ External event should appear!

---

## ✅ **SUCCESS CHECKLIST**

- [ ] Database migration ran successfully
- [ ] Can create events
- [ ] Can edit events
- [ ] Can delete events
- [ ] Events show in month view
- [ ] Events show in MiniCalendar sidebar
- [ ] Sync button works (if account has permissions)
- [ ] No console errors
- [ ] Email/contacts still work (no breakage)

**All checked?** 🎉 **You're ready to use your calendar!**

---

## 🎯 **WHAT TO TRY NEXT**

1. **Create multiple events** with different colors
2. **Create an all-day event** (toggle "All day")
3. **Set reminders** on events
4. **Add locations** to events
5. **Sync with external calendar**
6. **Navigate between months**
7. **Click "Today" to jump to current date**

---

## 🆘 **TROUBLESHOOTING**

### **"Sync button doesn't do anything"**
- Open browser console (F12)
- Check for errors
- May need to reconnect account with calendar permissions

### **"Events not showing"**
- Refresh the page
- Check you're looking at the right month
- Open browser console for errors

### **"Migration failed"**
- Check if tables already exist
- Try dropping tables first if needed
- Check Supabase logs for details

---

## 📚 **DOCUMENTATION**

For more details, see:
- **`CALENDAR_BUILD_SUMMARY.md`** - Complete overview
- **`CALENDAR_DEPLOYMENT_GUIDE.md`** - Full deployment steps
- **`CALENDAR_SYSTEM_COMPLETE.md`** - Technical documentation

---

## 🎊 **ENJOY YOUR NEW CALENDAR!**

You now have a fully functional calendar with:
- ✅ Event management
- ✅ Color coding
- ✅ External calendar sync
- ✅ Beautiful UI
- ✅ Sidebar integration

**Happy scheduling!** 📅

