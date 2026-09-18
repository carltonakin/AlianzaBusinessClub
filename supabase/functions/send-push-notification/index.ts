import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload?.record;
    if (!record) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), { status: 400 });
    }

    const { title, body, target_tier } = record;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let query = supabase
      .from('profiles')
      .select('push_token')
      .not('push_token', 'is', null);

    if (target_tier === 'paid') {
      query = query.eq('membership_tier', 'paid');
    } else if (target_tier === 'free') {
      query = query.eq('membership_tier', 'free');
    }

    const { data: profiles, error } = await query;
    if (error) {
      console.error('Error fetching profiles:', error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const tokens = (profiles ?? [])
      .map((p: any) => p.push_token)
      .filter((t: string) => t && t.startsWith('ExponentPushToken'));

    if (tokens.length === 0) {
      console.log('No push tokens found for tier:', target_tier);
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += 100) {
      chunks.push(tokens.slice(i, i + 100));
    }

    let totalSent = 0;
    for (const chunk of chunks) {
      const messages = chunk.map((token) => ({
        to: token,
        title,
        body,
        sound: 'default',
        priority: 'high',
      }));

      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await res.json();
      console.log('Expo push response:', JSON.stringify(result));
      totalSent += chunk.length;
    }

    return new Response(JSON.stringify({ sent: totalSent }), { status: 200 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
