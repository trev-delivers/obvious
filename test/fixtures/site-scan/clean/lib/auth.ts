import { createServerClient } from "@supabase/ssr";
export async function requireUser() {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: {} });
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("signed out");
  return { supabase, user: data.user };
}
