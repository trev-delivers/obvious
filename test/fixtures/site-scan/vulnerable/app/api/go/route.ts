import { NextResponse } from "next/server";
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next");
  return NextResponse.redirect(next);
}
