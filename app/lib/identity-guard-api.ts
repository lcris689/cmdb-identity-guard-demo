const API_BASE = process.env.NEXT_PUBLIC_IDENTITY_GUARD_API_BASE || "/api/identity-guard";

type Envelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.success || payload.data === null)
    throw new Error(payload.error?.message || "Identity Guard request failed.");
  return payload.data;
}

export const identityGuardApi = {
  summary: () => request("/summary"),
  runs: (page = 1) => request(`/analysis/runs?page=${page}&page_size=25`),
  groups: (page = 1) => request(`/duplicate-groups?page=${page}&page_size=25`),
  group: (sysId: string) => request(`/duplicate-groups/${encodeURIComponent(sysId)}`),
  guardrails: (page = 1) => request(`/guardrails?page=${page}&page_size=25`),
  startAnalysis: (name: string) => request("/analysis/start", { method: "POST", body: JSON.stringify({ name }) }),
  decide: (sysId: string, decision: string, notes: string) => request(
    `/duplicate-groups/${encodeURIComponent(sysId)}/decision`,
    { method: "POST", body: JSON.stringify({ decision, notes }) },
  ),
};
