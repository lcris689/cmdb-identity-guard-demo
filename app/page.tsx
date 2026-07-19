"use client";

import { useEffect, useMemo, useState } from "react";
import { DuplicateGroup, IreGuardrail, AnalysisRun, IdentityGuardSummary, identityGuardApi } from "./lib/identity-guard-api";

type View = "overview" | "runs" | "review" | "guardrails";
type LoadState = "loading" | "success" | "error";

type AppData = {
  summary: IdentityGuardSummary;
  runs: AnalysisRun[];
  groups: DuplicateGroup[];
  guardrails: IreGuardrail[];
};

const mockRuns: AnalysisRun[] = [
  { sysId: "mock-run-4", number: "DAR0001004", name: "Morning identity scan", status: "Complete", recordsScanned: 70, groupsCreated: 9, started: "Today, 09:14" },
  { sysId: "mock-run-3", number: "DAR0001003", name: "Guardrail verification", status: "Complete", recordsScanned: 70, groupsCreated: 8, started: "Yesterday, 16:42" },
  { sysId: "mock-run-2", number: "DAR0001002", name: "Synthetic baseline", status: "Complete", recordsScanned: 70, groupsCreated: 7, started: "Jul 17, 11:08" },
];

const mockGroups: DuplicateGroup[] = [
  {
    id: "mock-1", number: "DCG0001009", reason: "Serial Number = SN-AZ-44018", confidence: 94, label: "Very likely",
    candidates: 2, status: "New", oversized: false, dataQualityWarning: "", aiSummary: "Two CI Source records share strong serial-number evidence and need steward review.", aiLimitations: "Mock data shown until ServiceNow API mode is enabled.", recommendedAction: "Steward should verify the recommended master before remediation.", recommendedMaster: "DATA_SORTERS-PHX-WEB-04", evidence: [
      { sysId: "mock-ci-1", name: "DATA_SORTERS-PHX-WEB-04", source: "ServiceNow Discovery", serial: "SN-AZ-44018", assetTag: "DS-AT-44018", host: "phx-web-04", fqdn: "phx-web-04.datasorters.example.com", quality: 92, completeness: 94, missingFields: "", master: true },
      { sysId: "mock-ci-2", name: "DATA_SORTERS-WEB04-OLD", source: "CSV Import", serial: "SN-AZ-44018", assetTag: "DS-AT-44018", host: "web04", fqdn: "", quality: 61, completeness: 68, missingFields: "FQDN", master: false },
    ],
  },
  {
    id: "mock-2", number: "DCG0001008", reason: "FQDN = db-02.datasorters.internal", confidence: 87, label: "Likely",
    candidates: 2, status: "AI Reviewed", oversized: false, dataQualityWarning: "", aiSummary: "The records share FQDN evidence but need steward approval before any remediation.", aiLimitations: "Mock data shown until ServiceNow API mode is enabled.", recommendedAction: "Review the master recommendation and confirm ownership before accepting.", recommendedMaster: "DATA_SORTERS-DB-02", evidence: [
      { sysId: "mock-ci-3", name: "DATA_SORTERS-DB-02", source: "ServiceNow Discovery", serial: "SN-DB-9021", assetTag: "DS-DB-02", host: "db-02", fqdn: "db-02.datasorters.internal", quality: 88, completeness: 91, missingFields: "", master: true },
      { sysId: "mock-ci-4", name: "DATA_SORTERS-DATABASE-02", source: "Manual Entry", serial: "—", assetTag: "DS-DB-02", host: "db-02", fqdn: "db-02.datasorters.internal", quality: 52, completeness: 59, missingFields: "Serial Number", master: false },
    ],
  },
  {
    id: "mock-3", number: "DCG0001007", reason: "Common bad identifier: Serial Number = unknown", confidence: 20, label: "Low",
    candidates: 12, status: "Needs Review", oversized: true, dataQualityWarning: "Serial Number = unknown is a common placeholder and not safe duplicate evidence.", aiSummary: "This is a data-quality cluster, not a safe duplicate group.", aiLimitations: "Mock data summarizes a noisy cluster with sample records only.", recommendedAction: "Quarantine this identifier and correct source records before CMDB identification.", recommendedMaster: "", evidence: [
      { sysId: "mock-ci-5", name: "DATA_SORTERS-NET-01", source: "CSV Import", serial: "unknown", assetTag: "DATA_SORTERS", host: "net-01", fqdn: "", quality: 43, completeness: 48, missingFields: "Serial Number", master: false },
      { sysId: "mock-ci-6", name: "DATA_SORTERS-NET-02", source: "CSV Import", serial: "unknown", assetTag: "DATA_SORTERS", host: "net-02", fqdn: "", quality: 41, completeness: 45, missingFields: "Serial Number", master: false },
      { sysId: "mock-ci-7", name: "+10 additional records", source: "Data-quality cluster", serial: "unknown", assetTag: "DATA_SORTERS", host: "varied", fqdn: "", quality: 31, completeness: 36, missingFields: "Reliable Identifier", master: false },
    ],
  },
  {
    id: "mock-4", number: "DCG0001006", reason: "Asset Tag = DS-8843", confidence: 76, label: "Likely",
    candidates: 3, status: "New", oversized: false, dataQualityWarning: "", aiSummary: "Asset-tag and serial-number evidence suggest a likely duplicate candidate group.", aiLimitations: "Mock data shown until ServiceNow API mode is enabled.", recommendedAction: "Steward should verify ownership before approving remediation.", recommendedMaster: "DATA_SORTERS-LAPTOP-18", evidence: [
      { sysId: "mock-ci-8", name: "DATA_SORTERS-LAPTOP-18", source: "Asset Import", serial: "LTP-22104", assetTag: "DS-8843", host: "ds-lt-18", fqdn: "", quality: 84, completeness: 88, missingFields: "", master: true },
      { sysId: "mock-ci-9", name: "DATA_SORTERS-LT-18", source: "Manual Entry", serial: "LTP-22104", assetTag: "DS-8843", host: "—", fqdn: "", quality: 57, completeness: 62, missingFields: "Host Name", master: false },
    ],
  },
];

const mockGuardrails: IreGuardrail[] = [
  { sysId: "mock-irg-2", number: "IRG0001002", duplicateGroup: "DCG0001007", identifier: "Serial Number = unknown", risk: "High", status: "Proposed", groups: 1, description: "Suppress or quarantine incoming records whose serial number contains a placeholder value.", requiresAdminReview: true },
  { sysId: "mock-irg-1", number: "IRG0001001", duplicateGroup: "DCG0001010", identifier: "Asset Tag = DATA_SORTERS", risk: "High", status: "Proposed", groups: 1, description: "Route common-value asset tags to steward review before accepting them as identity evidence.", requiresAdminReview: true },
];

const mockSummary: IdentityGuardSummary = {
  ciSourceRecords: 70,
  analysisRuns: mockRuns.length,
  duplicateGroups: 9,
  duplicateCandidates: 18,
  guardrails: mockGuardrails.length,
  pendingGroups: 4,
  aiReviewedGroups: 5,
  oversizedClusters: 12,
};

const mockData: AppData = { summary: mockSummary, runs: mockRuns, groups: mockGroups, guardrails: mockGuardrails };

function shouldUseMocks() {
  return process.env.NEXT_PUBLIC_IDENTITY_GUARD_USE_MOCKS === "true" || process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";
}

function mergeGuardrails(current: IreGuardrail[], incoming: IreGuardrail[]) {
  const merged = new Map<string, IreGuardrail>();
  for (const guardrail of current) merged.set(guardrail.sysId || guardrail.number, guardrail);
  for (const guardrail of incoming) merged.set(guardrail.sysId || guardrail.number, guardrail);
  return Array.from(merged.values());
}

function Status({ children }: { children: string }) {
  return <span className={`status status-${children.toLowerCase().replaceAll(" ", "-").replaceAll("_", "-")}`}>{children}</span>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="notice" role="status"><span><strong>{title}</strong> {detail}</span></div>;
}

export default function Home() {
  const useMocks = shouldUseMocks();
  const [view, setView] = useState<View>("overview");
  const [selectedId, setSelectedId] = useState(mockGroups[0]?.id || "");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [loadState, setLoadState] = useState<LoadState>(useMocks ? "success" : "loading");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<AppData>(mockData);

  useEffect(() => {
    if (useMocks) return;
    let cancelled = false;
    async function load() {
      setLoadState("loading");
      setError("");
      try {
        const [summary, runs, groups, guardrails] = await Promise.all([
          identityGuardApi.summary(),
          identityGuardApi.runs(),
          identityGuardApi.groups(),
          identityGuardApi.guardrails(),
        ]);
        if (cancelled) return;
        setData({ summary, runs, groups, guardrails });
        setSelectedId(groups[0]?.id || "");
        setLoadState("success");
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load ServiceNow data.");
        setLoadState("error");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [useMocks]);

  useEffect(() => {
    if (useMocks || !selectedId) return;
    let cancelled = false;
    async function loadSelectedDetail() {
      try {
        const detail = await identityGuardApi.group(selectedId);
        if (cancelled) return;
        setData((current) => ({
          ...current,
          groups: current.groups.map((group) => group.id === selectedId ? { ...detail.group, evidence: detail.candidates } : group),
          guardrails: mergeGuardrails(current.guardrails, detail.guardrails),
        }));
      } catch (detailError) {
        if (!cancelled) setNotice(detailError instanceof Error ? detailError.message : "Unable to load duplicate group detail.");
      }
    }
    loadSelectedDetail();
    return () => { cancelled = true; };
  }, [selectedId, useMocks]);

  const groups = data.groups;
  const runs = data.runs;
  const guardrails = data.guardrails;
  const summary = data.summary;
  const selected = groups.find((group) => group.id === selectedId) || groups[0];
  const filtered = useMemo(() => groups.filter((group) => `${group.number} ${group.reason} ${group.status} ${group.aiSummary}`.toLowerCase().includes(query.toLowerCase())), [groups, query]);
  const selectedGuardrails = guardrails.filter((guardrail) => guardrail.duplicateGroup === selected?.id || guardrail.duplicateGroup === selected?.number);

  async function refreshData() {
    if (useMocks) return;
    const [summary, runs, groups, guardrails] = await Promise.all([
      identityGuardApi.summary(),
      identityGuardApi.runs(),
      identityGuardApi.groups(),
      identityGuardApi.guardrails(),
    ]);
    setData({ summary, runs, groups, guardrails });
  }

  async function runStartAnalysis() {
    setSubmitting(true);
    try {
      if (useMocks) {
        setNotice("Mock analysis request queued. Disable mock mode to start the ServiceNow analyzer.");
      } else {
        await identityGuardApi.startAnalysis(`External UI scan ${new Date().toLocaleString()}`);
        await refreshData();
        setNotice("Analysis started in ServiceNow. Refreshing latest runs and duplicate groups.");
      }
    } catch (startError) {
      setNotice(startError instanceof Error ? startError.message : "Unable to start analysis.");
    } finally {
      setSubmitting(false);
      window.setTimeout(() => setNotice(""), 6000);
    }
  }

  async function submitDecision(decision: string) {
    if (!selected) return;
    setSubmitting(true);
    try {
      if (useMocks) {
        setNotice(`${selected.number} marked “${decision}” in mock mode. Disable mock mode to persist decisions.`);
      } else {
        await identityGuardApi.decide(selected.id, decision, `Steward selected ${decision} from Identity Guard UI.`);
        await refreshData();
        setNotice(`${selected.number} decision saved to ServiceNow.`);
      }
    } catch (decisionError) {
      setNotice(decisionError instanceof Error ? decisionError.message : "Unable to save steward decision.");
    } finally {
      setSubmitting(false);
      window.setTimeout(() => setNotice(""), 6000);
    }
  }

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand"><span className="brand-mark">DS</span><div><strong>Identity Guard</strong><small>CMDB governance</small></div></div>
        <nav aria-label="Primary navigation">
          {(["overview", "runs", "review", "guardrails"] as View[]).map((item) => (
            <button key={item} className={view === item ? "nav-active" : ""} onClick={() => setView(item)}>
              <span className="nav-index">0{["overview", "runs", "review", "guardrails"].indexOf(item) + 1}</span>
              {item === "review" ? "Review queue" : item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </nav>
        <div className="rail-foot"><span className="connection-dot" />{useMocks ? "Mock mode" : "ServiceNow connected"}<small>DATA_SORTERS scope</small></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">Data Sorters / CMDB Identity Guard</p><h1>{view === "review" ? "Duplicate review" : view[0].toUpperCase() + view.slice(1)}</h1></div>
          <button className="primary" onClick={runStartAnalysis} disabled={submitting}>{submitting ? "Working..." : "Start analysis"}</button>
        </header>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        {loadState === "loading" && <div className="notice" role="status">Loading ServiceNow data from Identity Guard API...</div>}
        {loadState === "error" && <div className="notice" role="alert">Unable to load ServiceNow data. {error}</div>}

        {view === "overview" && <Overview summary={summary} groups={groups} runs={runs} setView={setView} />}
        {view === "runs" && <Runs runs={runs} />}
        {view === "guardrails" && <Guardrails guardrails={guardrails} />}
        {view === "review" && (
          <div className="review-layout">
            <section className="queue-panel">
              <div className="panel-head"><div><h2>Review queue</h2><p>{filtered.length} groups shown</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search groups" aria-label="Search groups" /></div>
              <div className="queue-list">
                {filtered.length === 0 && <EmptyState title="No duplicate groups found." detail="Adjust your search or start a new analysis run." />}
                {filtered.map((group) => (
                  <button key={group.id || group.number} className={`queue-item ${selected?.id === group.id ? "selected" : ""}`} onClick={() => setSelectedId(group.id)}>
                    <div className="queue-line"><strong>{group.number}</strong><Status>{group.status}</Status></div>
                    <p>{group.reason}</p>
                    <div className="queue-meta"><span>{group.confidence}% confidence</span><span>{group.candidates} candidates</span>{group.oversized && <span className="warning">Oversized</span>}</div>
                  </button>
                ))}
              </div>
            </section>
            {selected ? <GroupDetail group={selected} guardrails={selectedGuardrails} decide={submitDecision} submitting={submitting} /> : <EmptyState title="No duplicate groups found." detail="Start an analysis run to populate the review queue." />}
          </div>
        )}
      </section>
    </main>
  );
}

function Overview({ summary, groups, runs, setView }: { summary: IdentityGuardSummary; groups: DuplicateGroup[]; runs: AnalysisRun[]; setView: (view: View) => void }) {
  const latestRun = runs[0];
  const health = Math.max(0, Math.min(100, 100 - summary.oversizedClusters - summary.pendingGroups));
  return <div className="stack">
    <section className="hero-band"><div><p className="eyebrow">LATEST RUN · {latestRun?.number || "No run yet"}</p><h2>Identity risk, made reviewable.</h2><p>{summary.ciSourceRecords} scoped source records scanned. {summary.duplicateGroups} groups require steward attention before identity evidence can be trusted.</p></div><button onClick={() => setView("review")}>Open review queue →</button></section>
    <section className="metrics">
      {[ [String(summary.ciSourceRecords), "Records scanned", "Scoped CI Source"], [String(summary.duplicateGroups), "Duplicate groups", `${summary.aiReviewedGroups} AI reviewed`], [String(summary.guardrails), "Guardrails", "Admin review required"], [String(summary.oversizedClusters), "Noisy identifiers", "Quarantined from matching"] ].map(([value, label, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}
    </section>
    <div className="two-col">
      <section className="panel"><div className="panel-head"><div><h2>Priority review</h2><p>Ranked by identity risk and confidence</p></div><button className="text-button" onClick={() => setView("review")}>View all</button></div>{groups.length === 0 ? <EmptyState title="No duplicate groups found." detail="Start an analysis to populate this queue." /> : groups.slice(0, 3).map(group => <div className="compact-row" key={group.id || group.number}><div><strong>{group.number}</strong><p>{group.reason}</p></div><div className="row-right"><span className="score">{group.confidence}</span><Status>{group.status}</Status></div></div>)}</section>
      <section className="panel"><div className="panel-head"><div><h2>Identity health</h2><p>Current deterministic scan</p></div></div><div className="health-row"><div className="health-score">{health}<small>/100</small></div><div><strong>{health >= 75 ? "Controlled" : "Needs review"}</strong><p>Valid identifiers remain the primary match evidence. Placeholder clusters are isolated for review.</p></div></div><div className="bar-list"><div><span>Identifier completeness</span><i><b style={{width:`${Math.max(0, 100 - summary.oversizedClusters)}%`}} /></i><em>{Math.max(0, 100 - summary.oversizedClusters)}%</em></div><div><span>AI reviewed</span><i><b style={{width:`${summary.duplicateGroups ? Math.round((summary.aiReviewedGroups / summary.duplicateGroups) * 100) : 0}%`}} /></i><em>{summary.duplicateGroups ? Math.round((summary.aiReviewedGroups / summary.duplicateGroups) * 100) : 0}%</em></div><div><span>Pending queue</span><i><b style={{width:`${summary.duplicateGroups ? Math.round((summary.pendingGroups / summary.duplicateGroups) * 100) : 0}%`}} /></i><em>{summary.pendingGroups}</em></div></div></section>
    </div>
  </div>;
}

function Runs({ runs }: { runs: AnalysisRun[] }) {
  return <section className="panel full"><div className="panel-head"><div><h2>Analysis runs</h2><p>Immutable execution history</p></div></div>{runs.length === 0 ? <EmptyState title="No analysis runs found." detail="Start analysis to create the first run." /> : <div className="table"><div className="table-row table-header"><span>Run</span><span>Name</span><span>Status</span><span>Records</span><span>Groups</span><span>Started</span></div>{runs.map(run => <div className="table-row" key={run.sysId || run.number}><strong>{run.number}</strong><span>{run.name}</span><span><Status>{run.status}</Status></span><span>{run.recordsScanned}</span><span>{run.groupsCreated}</span><span>{run.started}</span></div>)}</div>}</section>;
}

function Guardrails({ guardrails }: { guardrails: IreGuardrail[] }) {
  return <section className="panel full"><div className="panel-head"><div><h2>IRE guardrails</h2><p>Prevent repeated identity failures at ingestion</p></div></div>{guardrails.length === 0 ? <EmptyState title="No guardrails found." detail="Oversized data-quality clusters will create guardrail proposals." /> : guardrails.map(item => <article className="guardrail" key={item.sysId || item.number}><div className="guardrail-code">{item.number}</div><div><div className="queue-line"><strong>{item.identifier}</strong><Status>{item.status}</Status></div><p>{item.description}</p><div className="queue-meta"><span>Risk: {item.risk}</span><span>{item.groups} related group</span>{item.requiresAdminReview && <span>Admin review required</span>}</div></div><button className="secondary">Review proposal</button></article>)}</section>;
}

function GroupDetail({ group, guardrails, decide, submitting }: { group: DuplicateGroup; guardrails: IreGuardrail[]; decide: (decision: string) => void; submitting: boolean }) {
  return <section className="detail-panel">
    <div className="detail-title"><div><p className="eyebrow">DUPLICATE GROUP</p><h2>{group.number}</h2></div><Status>{group.status}</Status></div>
    <div className={`confidence ${group.oversized ? "confidence-warning" : ""}`}><div><span>Confidence</span><strong>{group.confidence}%</strong></div><div><span>Classification</span><strong>{group.label}</strong></div><div><span>Candidates</span><strong>{group.candidates}</strong></div></div>
    <section className="evidence-block"><h3>Top match reason</h3><p>{group.reason}</p>{group.oversized && <div className="warning-box"><strong>Data-quality cluster</strong><p>{group.dataQualityWarning || "This common value is not reliable duplicate evidence. Do not merge automatically."}</p></div>}</section>
    {group.aiSummary && <section className="evidence-block"><h3>AI summary</h3><p>{group.aiSummary}</p></section>}
    <section className="evidence-block"><h3>Candidate evidence</h3><div className="candidate-grid">{group.evidence.length === 0 ? <p>No candidate records returned for this group.</p> : group.evidence.map((candidate, index) => <article className={candidate.master ? "candidate master" : "candidate"} key={candidate.sysId || `${candidate.name}-${index}`}><div className="candidate-head"><span>Candidate {index + 1}</span>{candidate.master && <b>Recommended master</b>}</div><h4>{candidate.name}</h4><dl><div><dt>Source</dt><dd>{candidate.source}</dd></div><div><dt>Serial</dt><dd>{candidate.serial}</dd></div><div><dt>Asset</dt><dd>{candidate.assetTag}</dd></div><div><dt>Host</dt><dd>{candidate.host}</dd></div><div><dt>Quality</dt><dd>{candidate.quality}/100</dd></div></dl></article>)}</div></section>
    <section className="evidence-block"><h3>Recommended action</h3><p>{group.recommendedAction || (group.oversized ? "Quarantine the identifier value and route the records for data-quality remediation." : "Review the recommended master before steward-approved remediation.")}</p>{group.aiLimitations && <p><strong>Limitations:</strong> {group.aiLimitations}</p>}</section>
    {guardrails.length > 0 && <section className="evidence-block"><h3>Linked IRE guardrails</h3>{guardrails.map((guardrail) => <p key={guardrail.sysId || guardrail.number}><strong>{guardrail.number}</strong> · {guardrail.identifier}: {guardrail.description}</p>)}</section>}
    <div className="decision-bar"><button className="primary" disabled={submitting} onClick={() => decide("accept")}>Accept</button><button className="secondary" disabled={submitting} onClick={() => decide("reject")}>Reject</button><button className="secondary" disabled={submitting} onClick={() => decide("defer")}>Defer</button><button className="secondary" disabled={submitting} onClick={() => decide("needs_info")}>Needs info</button></div>
  </section>;
}
