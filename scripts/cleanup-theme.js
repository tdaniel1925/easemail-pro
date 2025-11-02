/**
 * Theme Cleanup Script
 * Run this once in browser console to clear any invalid themes
 */

(function cleanupTheme() {
  const validThemes = ['light-grey', 'charcoal'];
  const currentTheme = localStorage.getItem('easemail-theme');
  
  if (currentTheme && !validThemes.includes(currentTheme)) {
    console.log(`🧹 Removing invalid theme: ${currentTheme}`);
    localStorage.removeItem('easemail-theme');
    console.log('✅ Theme cleaned! Refresh the page.');
  } else if (!currentTheme) {
    console.log('✅ No theme found in localStorage. Will default to Corporate Grey.');
  } else {
    console.log(`✅ Theme is valid: ${currentTheme}`);
  }
})();

