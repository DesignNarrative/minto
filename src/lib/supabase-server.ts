import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseServerClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use Service Role Key if available (for server operations), else fallback to Anon Key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// In-memory store fallback when running locally without Supabase configured yet
interface MockStore {
  meetings: Map<string, any>;
  transcriptChunks: Map<string, any[]>;
  moms: Map<string, any>;
}

declare global {
  var __mintoMockStore: MockStore | undefined;
}

if (!global.__mintoMockStore) {
  global.__mintoMockStore = {
    meetings: new Map(),
    transcriptChunks: new Map(),
    moms: new Map(),
  };
}

export const mockStore = global.__mintoMockStore;
