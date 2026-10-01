import { createClient } from "@supabase/supabase-js";

import { estateSupabaseUrl as supabaseUrl, estateSupabasePublishableKey as supabasePublishableKey } from "./supabase-config";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const supabaseProjectRef = "xmkhdjjnxlpwqeatiwfx";
