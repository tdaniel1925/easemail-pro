// Diagnostic script for AI Learn Style
async function diagnoseLearnStyle() {
  console.log('ðŸ” Diagnosing Learn Style API...\n');
  
  // Get current account
  const accountResponse = await fetch('/api/nylas/accounts');
  const accountData = await accountResponse.json();
  console.log('1. Account data:', accountData);
  
  if (!accountData.success || !accountData.accounts || accountData.accounts.length === 0) {
    console.error('âŒ No accounts found');
    return;
  }
  
  const accountId = accountData.accounts[0].id;
  console.log('âœ… Using account ID:', accountId, '\n');
  
  // Try to learn style
  console.log('2. Calling /api/ai/learn-style...');
  const response = await fetch('/api/ai/learn-style', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId })
  });
  
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers));
  
  const data = await response.json();
  console.log('Response data:', data);
  
  if (!response.ok) {
    console.error('\nâŒ API Error Details:');
    console.error('Status:', response.status);
    console.error('Error:', data.error);
    console.error('Details:', data.details);
  } else {
    console.log('\nâœ… Success!');
    console.log('Emails analyzed:', data.emailsAnalyzed);
    console.log('Style profile preview:', data.styleProfile?.substring(0, 200) + '...');
  }
}

// Run it
diagnoseLearnStyle();
