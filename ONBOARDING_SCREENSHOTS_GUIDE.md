# Onboarding Screenshots Guide

This guide will help you create professional screenshots for the onboarding tour.

## Required Screenshots

Place all screenshots in: `public/onboarding/`

### 1. `welcome-hero.png`
**What to capture:** Full dashboard overview  
**Recommended size:** 800x450px  
**Tips:** 
- Show the main inbox with some sample emails
- Include sidebar, email list, and preview pane
- Clean, professional looking inbox state

### 2. `connect-account.png`
**What to capture:** Sidebar with "Add Account" button highlighted  
**Recommended size:** 400x600px  
**Tips:**
- Zoom in on the sidebar
- Make sure "Add Account" button at bottom is clearly visible
- Can add a red circle or arrow annotation

### 3. `signature-settings.png`
**What to capture:** Settings page showing email signatures  
**Recommended size:** 700x500px  
**Tips:**
- Navigate to Settings → Signatures
- Show at least one example signature
- Include the "Add Signature" button

### 4. `ai-compose.png`
**What to capture:** Compose window with AI features  
**Recommended size:** 700x500px  
**Tips:**
- Open compose modal
- Show AI assistant panel or AI buttons
- Include sample text being composed

### 5. `voice-message.png`
**What to capture:** Voice recording interface  
**Recommended size:** 600x400px  
**Tips:**
- Show voice recorder UI
- Include microphone icon and waveform if possible
- Show attachment area

### 6. `sms-contacts.png`
**What to capture:** Contacts page with SMS feature  
**Recommended size:** 700x500px  
**Tips:**
- Open contacts page
- Show SMS button or feature
- Include sample contact cards

### 7. `navigation-sidebar.png`
**What to capture:** Full sidebar with all navigation items  
**Recommended size:** 300x700px  
**Tips:**
- Zoom in on the sidebar
- Show: Inbox, Sent, Drafts, folders
- Show bottom: Calendar, Contacts, Settings

## Screenshot Best Practices

### Tools Recommended:
- **Windows:** Snipping Tool or Snip & Sketch (Win + Shift + S)
- **Mac:** Screenshot (Cmd + Shift + 4)
- **Browser:** Built-in DevTools screenshot

### Quality Guidelines:
- ✅ Use high resolution (at least 2x for retina)
- ✅ Clean UI state (no weird loading states)
- ✅ Use sample/demo data (not real customer data)
- ✅ Consistent theme/appearance across all screenshots
- ✅ Professional looking content

### Editing Tips:
- Use tools like Paint, Preview, or online editors
- Add subtle borders if needed
- Can add arrows/circles to highlight specific UI elements
- Keep file sizes reasonable (compress if > 500KB)

## Quick Screenshot Workflow

1. **Prepare your app:**
   - Log in with a demo account
   - Populate with sample data
   - Set to a clean, professional state

2. **Take screenshots:**
   - Use the list above as a checklist
   - Take multiple shots and pick the best
   - Maintain consistent zoom levels

3. **Save files:**
   ```
   public/
     onboarding/
       welcome-hero.png
       connect-account.png
       signature-settings.png
       ai-compose.png
       voice-message.png
       sms-contacts.png
       navigation-sidebar.png
   ```

4. **Test in tour:**
   - Start the onboarding tour
   - Verify images load correctly
   - Check captions match the screenshots

## Fallback Behavior

If a screenshot is missing, the tour will display a placeholder with "Screenshot Preview" text. This allows you to:
- Add screenshots incrementally
- Test the tour before all images are ready
- Replace placeholders as you capture screenshots

## Need Help?

If you need annotations (arrows, circles, highlights), consider:
- **Snagit** - Professional screenshot tool
- **Greenshot** - Free, open-source
- **Figma** - For adding annotations
- **Canva** - Easy online editor

