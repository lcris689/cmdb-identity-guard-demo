import { getDemoSession } from "../../../lib/demo-auth";

export async function GET(request: Request) {
  try {
    const session = await getDemoSession(request);
    if (!session)
      return Response.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
    return Response.json({ authenticated: true, username: session.username }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}
