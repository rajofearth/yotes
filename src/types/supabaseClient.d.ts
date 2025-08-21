declare module "@/utils/supabaseClient" {
  import type { SupabaseClient } from "@supabase/supabase-js";
  export const supabase: SupabaseClient<any, any, any>;
}


