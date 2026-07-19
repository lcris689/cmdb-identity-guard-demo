const DEFAULT_SERVICENOW_PATH = "/api/x_kest_data_sort/data_sorters_identity_guard_api";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type RouteContext = {
  params?: Promise<{ path?: string[] }> | { path?: string[] };
};

function cleanBasePath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return DEFAULT_SERVICENOW_PATH;
  return trimmed.startsWith("/") ? trimmed.replace(/\/$/, "") : `/${trimmed.replace(/\/$/, "")}`;
}

function getServiceNowConfig() {
  const instanceUrl = process.env.SERVICENOW_INSTANCE_URL?.replace(/\/$/, "");
  const basePath = cleanBasePath(process.env.SERVICENOW_IDENTITY_GUARD_PATH || DEFAULT_SERVICENOW_PATH);
  const bearerToken = process.env.SERVICENOW_BEARER_TOKEN;
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;

  if (!instanceUrl) throw new Error("SERVICENOW_INSTANCE_URL is not configured.");
  if (!bearerToken && (!username || !password)) {
    throw new Error("Configure SERVICENOW_BEARER_TOKEN or SERVICENOW_USERNAME plus SERVICENOW_PASSWORD.");
  }

  return { instanceUrl, basePath, bearerToken, username, password };
}

function authHeader(config: ReturnType<typeof getServiceNowConfig>) {
  if (config.bearerToken) return `Bearer ${config.bearerToken}`;
  return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
}

async function routePath(context: RouteContext) {
  const params = await context.params;
  return (params?.path || []).map(encodeURIComponent).join("/");
}

function responseHeaders(source: Headers) {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}

async function proxy(request: Request, context: RouteContext) {
  try {
    const config = getServiceNowConfig();
    const sourceUrl = new URL(request.url);
    const relativePath = await routePath(context);
    const targetUrl = new URL(`${config.basePath}${relativePath ? `/${relativePath}` : ""}${sourceUrl.search}`, config.instanceUrl);
    const headers = new Headers();
    headers.set("Accept", "application/json");
    headers.set("Authorization", authHeader(config));
    if (request.method !== "GET" && request.method !== "HEAD") headers.set("Content-Type", "application/json");

    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    const serviceNowResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body || undefined,
      cache: "no-store",
    });

    const responseBody = await serviceNowResponse.text();
    return new Response(responseBody, {
      status: serviceNowResponse.status,
      statusText: serviceNowResponse.statusText,
      headers: responseHeaders(serviceNowResponse.headers),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Identity Guard proxy failed.";
    return Response.json(
      { success: false, data: null, error: { code: "PROXY_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxy(request, context);
}
