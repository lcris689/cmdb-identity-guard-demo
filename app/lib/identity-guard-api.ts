const API_BASE = process.env.NEXT_PUBLIC_IDENTITY_GUARD_API_BASE || "/api/identity-guard";

type Envelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
};

type ServiceNowEnvelope<T> = Envelope<T> | { result: Envelope<T> };

type UnknownRecord = Record<string, unknown>;

export type IdentityGuardSummary = {
  ciSourceRecords: number;
  analysisRuns: number;
  duplicateGroups: number;
  duplicateCandidates: number;
  guardrails: number;
  pendingGroups: number;
  aiReviewedGroups: number;
  oversizedClusters: number;
  generatedAt?: string;
};

export type AnalysisRun = {
  sysId: string;
  number: string;
  name: string;
  status: string;
  recordsScanned: number;
  groupsCreated: number;
  started: string;
  completed?: string;
};

export type CandidateEvidence = {
  sysId: string;
  name: string;
  source: string;
  serial: string;
  assetTag: string;
  host: string;
  fqdn: string;
  quality: number;
  completeness: number;
  missingFields: string;
  master: boolean;
};

export type DuplicateGroup = {
  id: string;
  number: string;
  reason: string;
  confidence: number;
  label: string;
  candidates: number;
  status: string;
  oversized: boolean;
  dataQualityWarning: string;
  aiSummary: string;
  aiLimitations: string;
  recommendedAction: string;
  recommendedMaster: string;
  evidence: CandidateEvidence[];
};

export type IreGuardrail = {
  sysId: string;
  number: string;
  duplicateGroup: string;
  identifier: string;
  risk: string;
  status: string;
  groups: number;
  description: string;
  requiresAdminReview: boolean;
};

export type DuplicateGroupDetail = {
  group: DuplicateGroup;
  candidates: CandidateEvidence[];
  guardrails: IreGuardrail[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function field(source: unknown, ...names: string[]): unknown {
  if (!isRecord(source)) return undefined;
  for (const name of names) {
    if (source[name] !== undefined && source[name] !== null && source[name] !== "") return source[name];
  }
  return undefined;
}

function display(value: unknown, fallback = "—"): string {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (isRecord(value)) {
    const nested = field(value, "display_value", "displayValue", "display", "label", "name", "number", "value", "sys_id");
    return display(nested, fallback);
  }
  return fallback;
}

function sysId(value: unknown): string {
  if (isRecord(value)) return display(field(value, "value", "sys_id", "sysId"), "");
  return display(value, "");
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(display(value, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const text = display(value, "").toLowerCase();
  return text === "true" || text === "1" || text === "yes";
}

function listFrom<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (isRecord(value)) {
    const nested = field(value, "items", "records", "results", "data");
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

function recordFromJson(value: unknown): UnknownRecord {
  if (isRecord(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function normalizeSummary(raw: unknown): IdentityGuardSummary {
  return {
    ciSourceRecords: numberValue(field(raw, "ci_source_records", "ciSourceRecords", "records_scanned", "recordsScanned")),
    analysisRuns: numberValue(field(raw, "analysis_runs", "analysisRuns")),
    duplicateGroups: numberValue(field(raw, "duplicate_groups", "duplicateGroups", "groups_created", "groupsCreated")),
    duplicateCandidates: numberValue(field(raw, "duplicate_ci_candidates", "duplicateCandidates", "duplicate_cis")),
    guardrails: numberValue(field(raw, "ire_guardrails", "guardrails")),
    pendingGroups: numberValue(field(raw, "pending_groups", "pendingGroups", "new_groups")),
    aiReviewedGroups: numberValue(field(raw, "ai_reviewed_groups", "aiReviewedGroups")),
    oversizedClusters: numberValue(field(raw, "oversized_clusters", "oversizedClusters", "noisy_identifiers")),
    generatedAt: display(field(raw, "generated_at", "generatedAt"), ""),
  };
}

export function normalizeRun(raw: unknown): AnalysisRun {
  return {
    sysId: sysId(field(raw, "sys_id", "sysId")),
    number: display(field(raw, "number"), "DAR—"),
    name: display(field(raw, "name"), "Analysis run"),
    status: display(field(raw, "status_display", "status"), "Unknown"),
    recordsScanned: numberValue(field(raw, "records_scanned", "recordsScanned", "records")),
    groupsCreated: numberValue(field(raw, "groups_created", "groupsCreated", "groups")),
    started: display(field(raw, "started", "started_on", "startedAt"), "—"),
    completed: display(field(raw, "completed", "completed_on", "completedAt"), ""),
  };
}

export function normalizeCandidate(raw: unknown): CandidateEvidence {
  const reference = field(raw, "ci_source_record", "ciSourceRecord", "ci", "source_record") || raw;
  const evidence = recordFromJson(field(raw, "match_evidence", "matchEvidence"));
  const source = { ...recordFromJson(reference), ...evidence };
  return {
    sysId: sysId(field(raw, "sys_id", "sysId", "ci_source_record", "ciSourceRecord")),
    name: display(field(raw, "ci_name_snapshot", "ci_name", "ciName", "name", "source_name") || field(source, "name")),
    source: display(field(raw, "discovery_source", "source", "source_name") || field(source, "discovery_source", "source")),
    serial: display(field(raw, "serial_number", "serial", "serialNumber") || field(source, "serial_number", "serialNumber", "serial")),
    assetTag: display(field(raw, "asset_tag", "assetTag") || field(source, "asset_tag", "assetTag")),
    host: display(field(raw, "host_name", "host", "hostname") || field(source, "host_name", "host", "hostname")),
    fqdn: display(field(raw, "fqdn") || field(source, "fqdn")),
    quality: numberValue(field(raw, "source_quality_score", "sourceQualityScore", "quality")),
    completeness: numberValue(field(raw, "completeness_score", "completenessScore")),
    missingFields: display(field(raw, "missing_fields", "missingFields"), ""),
    master: boolValue(field(raw, "is_recommended_master", "isRecommendedMaster", "master")),
  };
}

export function normalizeGroup(raw: unknown): DuplicateGroup {
  const evidence = listFrom(field(raw, "candidates", "candidate_records", "duplicate_cis", "evidence")).map(normalizeCandidate);
  return {
    id: sysId(field(raw, "sys_id", "sysId", "id")),
    number: display(field(raw, "number"), "DCG—"),
    reason: display(field(raw, "top_match_reason", "topMatchReason", "reason"), "Identity evidence requires review"),
    confidence: numberValue(field(raw, "confidence_score", "confidenceScore", "confidence")),
    label: display(field(raw, "confidence_label", "confidenceLabel", "label"), "Possible"),
    candidates: numberValue(field(raw, "candidate_count", "candidateCount", "candidates"), evidence.length),
    status: display(field(raw, "status_display", "status"), "New"),
    oversized: boolValue(field(raw, "oversized_group", "oversizedGroup", "oversized")),
    dataQualityWarning: display(field(raw, "data_quality_warning", "dataQualityWarning"), ""),
    aiSummary: display(field(raw, "ai_summary", "aiSummary"), ""),
    aiLimitations: display(field(raw, "ai_limitations", "aiLimitations"), ""),
    recommendedAction: display(field(raw, "recommended_action", "recommendedAction"), ""),
    recommendedMaster: display(field(raw, "recommended_master_ci_source_record", "recommendedMasterCiSourceRecord", "recommended_master", "recommendedMaster"), ""),
    evidence,
  };
}

export function normalizeGuardrail(raw: unknown): IreGuardrail {
  return {
    sysId: sysId(field(raw, "sys_id", "sysId")),
    number: display(field(raw, "number"), "IRG—"),
    duplicateGroup: display(field(raw, "duplicate_group", "duplicateGroup"), ""),
    identifier: display(field(raw, "problem_identifier", "problemIdentifier", "identifier"), "Identifier guardrail"),
    risk: display(field(raw, "risk_level_display", "risk_level", "riskLevel", "risk"), "Medium"),
    status: display(field(raw, "status_display", "status"), "Proposed"),
    groups: field(raw, "duplicate_group", "duplicateGroup") ? 1 : numberValue(field(raw, "groups", "related_groups")),
    description: display(field(raw, "proposed_improvement", "proposed_ire_identifier_improvement", "proposedIreIdentifierImprovement", "description", "recommendation")),
    requiresAdminReview: boolValue(field(raw, "requires_admin_review", "requiresAdminReview")),
  };
}

export function normalizeGroupDetail(raw: unknown): DuplicateGroupDetail {
  const groupRaw = field(raw, "group") || raw;
  const candidates = listFrom(field(raw, "candidates", "candidate_records", "duplicate_cis")).map(normalizeCandidate);
  const guardrails = listFrom(field(raw, "guardrails", "ire_guardrails")).map(normalizeGuardrail);
  return {
    group: { ...normalizeGroup(groupRaw), evidence: candidates },
    candidates,
    guardrails,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const rawPayload = (await response.json()) as ServiceNowEnvelope<T>;
  const payload = "result" in rawPayload ? rawPayload.result : rawPayload;
  if (!response.ok || !payload.success || payload.data === null)
    throw new Error(payload.error?.message || "Identity Guard request failed.");
  return payload.data;
}

export const identityGuardApi = {
  summary: async () => normalizeSummary(await request("/summary")),
  runs: async (page = 1) => listFrom(await request(`/analysis/runs?page=${page}&page_size=25`)).map(normalizeRun),
  groups: async (page = 1, analysisRunSysId = "") => {
    const params = new URLSearchParams({ page: String(page), page_size: "25" });
    if (analysisRunSysId) params.set("analysis_run", analysisRunSysId);
    return listFrom(await request(`/duplicate-groups?${params.toString()}`)).map(normalizeGroup);
  },
  group: async (sysId: string) => normalizeGroupDetail(await request(`/duplicate-groups/${encodeURIComponent(sysId)}`)),
  guardrails: async (page = 1) => listFrom(await request(`/guardrails?page=${page}&page_size=25`)).map(normalizeGuardrail),
  startAnalysis: async (name: string) => request("/analysis/start", { method: "POST", body: JSON.stringify({ name }) }),
  decide: async (sysId: string, decision: string, notes: string) => request(
    `/duplicate-groups/${encodeURIComponent(sysId)}/decision`,
    { method: "POST", body: JSON.stringify({ decision, notes }) },
  ),
};
