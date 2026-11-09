import { requireUser } from "@/lib/auth";
export async function POST(request) {
  const { supabase } = await requireUser();
  const { body } = await request.json();
  await supabase.from("notes").insert({ body: String(body).slice(0, 2000) });
  return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}
