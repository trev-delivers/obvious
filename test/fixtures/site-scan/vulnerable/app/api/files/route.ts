import { readFile } from "node:fs/promises";
export async function GET(request) {
  const name = new URL(request.url).searchParams.get("name");
  return new Response(await readFile("uploads/" + name));
}
