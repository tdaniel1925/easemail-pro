import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, emailId, url, method } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'Unsubscribe URL is required' },
        { status: 400 }
      );
    }

    if (method === 'oneclick') {
      // RFC 8058 One-Click Unsubscribe
      // Send POST request with List-Unsubscribe=One-Click body
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'List-Unsubscribe=One-Click',
        });

        if (!response.ok) {
          // Try without the body as some servers don't require it
          const retryResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          if (!retryResponse.ok) {
            throw new Error(`Unsubscribe request failed: ${retryResponse.status}`);
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Successfully unsubscribed',
        });
      } catch (error) {
        console.error('One-click unsubscribe error:', error);
        return NextResponse.json(
          { error: 'Failed to process one-click unsubscribe. Try using the manual link.' },
          { status: 500 }
        );
      }
    }

    // For mailto and http methods, we just acknowledge the request
    // The actual unsubscribe happens client-side
    return NextResponse.json({
      success: true,
      message: 'Unsubscribe initiated',
    });
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
