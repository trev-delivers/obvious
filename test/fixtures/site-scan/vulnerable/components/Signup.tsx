"use client";
import { supabase } from "../lib/client";
export function Signup({ email, password }) {
  return <button onClick={() => supabase.auth.signUp({ email, password })}>Sign up</button>;
}
