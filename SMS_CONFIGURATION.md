# SMS System Configuration

Add these variables to your `.env.local` file:

```bash
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# SMS Pricing (in USD)
SMS_COST_PER_MESSAGE=0.0075
SMS_PRICE_PER_MESSAGE=0.05

# SMS Test Mode
SMS_TEST_MODE=true
SMS_TEST_NUMBERS=+15005550001,+15005550006
```

## Setup Instructions

1. Sign up for Twilio: https://www.twilio.com/try-twilio
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number capable of sending SMS
4. Add credentials to `.env.local`
5. Configure webhook: `https://yourdomain.com/api/webhooks/twilio`

## Test Mode

Set `SMS_TEST_MODE=true` to simulate SMS without actually sending. Use test numbers:
- `+15005550001` - Success
- `+15005550002` - Invalid number
- `+15005550009` - Missing number

