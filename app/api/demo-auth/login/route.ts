import { createDemoSession, demoSessionCookie, verifyDemoCredentials } from "../../../lib/demo-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password || !(await verifyDemoCredentials(username, password)))
      return Response.json({ success: false, error: "The demo username or password is incorrect." }, { status: 401 });

    const token = await createDemoSession(username);
    const response = Response.json({ success: true, username });
    response.headers.set("Set-Cookie", demoSessionCookie(token, new URL(request.url).protocol === "https:"));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start a demo session.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
