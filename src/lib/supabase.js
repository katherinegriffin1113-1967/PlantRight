import { createClient } from "@supabase/supabase-js";

// These are Supabase *publishable* credentials: they are meant to ship in the
// browser bundle and are protected server-side by Row Level Security. Env vars
// take precedence (e.g. for a different environment); the fallbacks keep the
// production build working even if the host's build env vars aren't wired up.
const url =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://xqfdjgqtnfuqzsamtqdu.supabase.co";
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_2GPnEv53S7OspFWMxyNbFA_2s3D2F0x";

export const supabase = createClient(url, anonKey);
