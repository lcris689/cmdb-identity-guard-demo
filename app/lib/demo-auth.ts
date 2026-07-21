const COOKIE_NAME = "data_sorters_demo_session";
const SESSION_SECONDS = 4 * 60 * 60;

type SessionPayload = {
  username: string;
  expiresAt: number;
};

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

function base64UrlEncode(value: string) {
  const encoded = btoa(String.fromCharCode(...bytes(value)));
  return encoded.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

async function signature(value: string) {
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("DEMO_SESSION_SECRET must contain at least 32 characters.");
  const key = await crypto.subtle.importKey("raw", bytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes(value)));
  return btoa(String.fromCharCode(...signed)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function constantTimeEqual(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", bytes(left)),
    crypto.subtle.digest("SHA-256", bytes(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < Math.max(leftBytes.length, rightBytes.length); index++)
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  return difference === 0;
}

function cookieValue(request: Request) {
  const cookies = request.headers.get("cookie") || "";
  for (const part of cookies.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return value.join("=");
  }
  return "";
}

export async function verifyDemoCredentials(username: string, password: string) {
  const configuredUsername = process.env.DEMO_ACCESS_USERNAME;
  const configuredPassword = process.env.DEMO_ACCESS_PASSWORD;
  if (!configuredUsername || !configuredPassword)
    throw new Error("Demo access credentials are not configured.");
  const [usernameMatches, passwordMatches] = await Promise.all([
    constantTimeEqual(username, configuredUsername),
    constantTimeEqual(password, configuredPassword),
  ]);
  return usernameMatches && passwordMatches;
}

export async function createDemoSession(username: string) {
  const payload: SessionPayload = {
    username,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${await signature(encoded)}`;
}

export async function getDemoSession(request: Request): Promise<SessionPayload | null> {
  const token = cookieValue(request);
  const [encoded, providedSignature, extra] = token.split(".");
  if (!encoded || !providedSignature || extra) return null;
  if (!(await constantTimeEqual(providedSignature, await signature(encoded)))) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload;
    if (!payload.username || payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function demoSessionCookie(token: string, secure: boolean) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearDemoSessionCookie(secure: boolean) {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}
