import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { publicSupabaseConfig, requiredEnv } from './env';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = publicSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. Route Handlers and Server Actions can.
        }
      }
    }
  }) as any;
}

export function createServiceClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
  return createSupabaseClient(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false }
  });
}
