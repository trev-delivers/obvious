import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
export async function POST(request) {
  const body = await request.json();
  await resend.emails.send({ from: "site@example.com", to: "me@example.com", subject: "Hello", text: body.message });
  return Response.json({ ok: true });
}
