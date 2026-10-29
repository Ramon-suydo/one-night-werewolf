'use client';
import type { SupabaseClient } from '@supabase/supabase-js';
let client: Promise<SupabaseClient | null> | undefined;
export function realtimeClient() {
  return client ||= fetch('/api/config').then(r => { if (!r.ok) throw new Error('Connection settings are unavailable.'); return r.json(); }).then(async config => {
    if (!config.url || !config.key) return null;
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
  }).catch(error => { client = undefined; throw error; });
}
