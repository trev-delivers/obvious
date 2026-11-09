export async function POST(request) {
  const { email, password } = await request.json();
  if (password !== process.env.ADMIN_PASSWORD) return Response.json({ error: "User not found" }, { status: 401 });
  const res = Response.json({ ok: true });
  return res;
}
