import { clearDemoSessionCookie } from "../../../lib/demo-auth";

export async function POST(request: Request) {
  const response = Response.json({ success: true });
  response.headers.set("Set-Cookie", clearDemoSessionCookie(new URL(request.url).protocol === "https:"));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
