import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const DEFAULT_SUPABASE_URL = "https://alsfucmtgoxpbtkanhqo.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsc2Z1Y210Z294cGJ0a2FuaHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0Mzk2NDksImV4cCI6MjEwMTAxNTY0OX0.elVCZ_Bzi0nu45BF9gSmYaC1mIFigts-welKx2silYs";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY).trim();

function isNewSupabaseApiKey(value?: string): boolean {
  if (!value) return false;
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function sanitizeHeaderValue(value?: string): string {
  if (!value) return "";
  return String(value).replace(/[^\x00-\xFF]/g, (ch) => encodeURIComponent(ch));
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    try {
      const headers = new Headers(
        typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
      );

      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => {
          try {
            headers.set(key, sanitizeHeaderValue(value));
          } catch {
            // Fallback
          }
        });
      }

      if (supabaseKey && isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
        headers.delete('Authorization');
      }

      if (supabaseKey) {
        headers.set('apikey', sanitizeHeaderValue(supabaseKey));
      }
      return fetch(input, { ...init, headers });
    } catch (e) {
      return fetch(input, init);
    }
  };
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
  },
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
