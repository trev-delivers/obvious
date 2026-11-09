import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
export async function GET(request) {
  await requireUser();
  const { origin, searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${origin}${safe}`);
}
