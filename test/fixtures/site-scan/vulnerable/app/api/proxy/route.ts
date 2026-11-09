export async function GET(request) {
  const target = new URL(request.url).searchParams.get("url");
  const res = await fetch(target);
  return new Response(await res.text());
}
