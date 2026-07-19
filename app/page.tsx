"use client";

import { useMemo, useState } from "react";

type View = "overview" | "runs" | "review" | "guardrails";
type Group = {
  id: string;
  number: string;
  reason: string;
  confidence: number;
  label: string;
  candidates: number;
  status: string;
  oversized?: boolean;
  evidence: { name: string; source: string; serial: string; host: string; quality: number; master?: boolean }[];
};

const runs = [
  { number: "DAR0001004", name: "Morning identity scan", status: "Complete", records: 70, groups: 9, started: "Today, 09:14" },
  { number: "DAR0001003", name: "Guardrail verification", status: "Complete", records: 70, groups: 8, started: "Yesterday, 16:42" },
  { number: "DAR0001002", name: "Synthetic baseline", status: "Complete", records: 70, groups: 7, started: "Jul 17, 11:08" },
];

const groups: Group[] = [
  {
    id: "1", number: "DCG0001009", reason: "Serial Number = SN-AZ-44018", confidence: 94, label: "Very likely",
    candidates: 2, status: "New", evidence: [
      { name: "DATA_SORTERS-PHX-WEB-04", source: "ServiceNow Discovery", serial: "SN-AZ-44018", host: "phx-web-04", quality: 92, master: true },
      { name: "DATA_SORTERS-WEB04-OLD", source: "CSV Import", serial: "SN-AZ-44018", host: "web04", quality: 61 },
    ],
  },
  {
    id: "2", number: "DCG0001008", reason: "FQDN = db-02.datasorters.internal", confidence: 87, label: "Likely",
    candidates: 2, status: "AI reviewed", evidence: [
      { name: "DATA_SORTERS-DB-02", source: "ServiceNow Discovery", serial: "SN-DB-9021", host: "db-02", quality: 88, master: true },
      { name: "DATA_SORTERS-DATABASE-02", source: "Manual Entry", serial: "—", host: "db-02", quality: 52 },
    ],
  },
  {
    id: "3", number: "DCG0001007", reason: "Common bad identifier: Serial Number = unknown", confidence: 20, label: "Low",
    candidates: 12, status: "Needs review", oversized: true, evidence: [
      { name: "DATA_SORTERS-NET-01", source: "CSV Import", serial: "unknown", host: "net-01", quality: 43 },
      { name: "DATA_SORTERS-NET-02", source: "CSV Import", serial: "unknown", host: "net-02", quality: 41 },
      { name: "+10 additional records", source: "Data-quality cluster", serial: "unknown", host: "varied", quality: 31 },
    ],
  },
  {
    id: "4", number: "DCG0001006", reason: "Asset Tag = DS-8843", confidence: 76, label: "Likely",
    candidates: 3, status: "New", evidence: [
      { name: "DATA_SORTERS-LAPTOP-18", source: "Asset Import", serial: "LTP-22104", host: "ds-lt-18", quality: 84, master: true },
      { name: "DATA_SORTERS-LT-18", source: "Manual Entry", serial: "LTP-22104", host: "—", quality: 57 },
    ],
  },
];

const guardrails = [
  { number: "IRG0001002", identifier: "Serial Number = unknown", risk: "High", status: "Proposed", groups: 1, description: "Suppress or quarantine incoming records whose serial number contains a placeholder value." },
  { number: "IRG0001001", identifier: "Asset Tag = DATA_SORTERS", risk: "High", status: "Proposed", groups: 1, description: "Route common-value asset tags to steward review before accepting them as identity evidence." },
];

function Status({ children }: { children: string }) {
  return <span className={`status status-${children.toLowerCase().replaceAll(" ", "-")}`}>{children}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [selectedId, setSelectedId] = useState("1");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const selected = groups.find((group) => group.id === selectedId) || groups[0];
  const filtered = useMemo(() => groups.filter((group) => `${group.number} ${group.reason} ${group.status}`.toLowerCase().includes(query.toLowerCase())), [query]);

  function startAnalysis() {
    setNotice("Analysis request queued. The run will appear when the scanner begins processing.");
    window.setTimeout(() => setNotice(""), 5000);
  }

  function decide(decision: string) {
    setNotice(`${selected.number} marked “${decision}”. The API connection will persist this steward decision.`);
    window.setTimeout(() => setNotice(""), 5000);
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
        <div className="rail-foot"><span className="connection-dot" />ServiceNow connected<small>DATA_SORTERS scope</small></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">Data Sorters / CMDB Identity Guard</p><h1>{view === "review" ? "Duplicate review" : view[0].toUpperCase() + view.slice(1)}</h1></div>
          <button className="primary" onClick={startAnalysis}>Start analysis</button>
        </header>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

        {view === "overview" && <Overview setView={setView} />}
        {view === "runs" && <Runs />}
        {view === "guardrails" && <Guardrails />}
        {view === "review" && (
          <div className="review-layout">
            <section className="queue-panel">
              <div className="panel-head"><div><h2>Review queue</h2><p>{filtered.length} groups shown</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search groups" aria-label="Search groups" /></div>
              <div className="queue-list">
                {filtered.map((group) => (
                  <button key={group.id} className={`queue-item ${selected.id === group.id ? "selected" : ""}`} onClick={() => setSelectedId(group.id)}>
                    <div className="queue-line"><strong>{group.number}</strong><Status>{group.status}</Status></div>
                    <p>{group.reason}</p>
                    <div className="queue-meta"><span>{group.confidence}% confidence</span><span>{group.candidates} candidates</span>{group.oversized && <span className="warning">Oversized</span>}</div>
                  </button>
                ))}
              </div>
            </section>
            <GroupDetail group={selected} decide={decide} />
          </div>
        )}
      </section>
    </main>
  );
}

function Overview({ setView }: { setView: (view: View) => void }) {
  return <div className="stack">
    <section className="hero-band"><div><p className="eyebrow">LATEST RUN · DAR0001004</p><h2>Identity risk, made reviewable.</h2><p>70 scoped source records scanned. Nine groups require steward attention before their identity evidence can be trusted.</p></div><button onClick={() => setView("review")}>Open review queue →</button></section>
    <section className="metrics">
      {[ ["70", "Records scanned", "Scoped CI Source"], ["9", "Duplicate groups", "+1 from prior run"], ["2", "Guardrails", "Admin review required"], ["12", "Noisy identifiers", "Quarantined from matching"] ].map(([value, label, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}
    </section>
    <div className="two-col">
      <section className="panel"><div className="panel-head"><div><h2>Priority review</h2><p>Ranked by identity risk and confidence</p></div><button className="text-button" onClick={() => setView("review")}>View all</button></div>{groups.slice(0, 3).map(group => <div className="compact-row" key={group.id}><div><strong>{group.number}</strong><p>{group.reason}</p></div><div className="row-right"><span className="score">{group.confidence}</span><Status>{group.status}</Status></div></div>)}</section>
      <section className="panel"><div className="panel-head"><div><h2>Identity health</h2><p>Current deterministic scan</p></div></div><div className="health-row"><div className="health-score">81<small>/100</small></div><div><strong>Controlled</strong><p>Valid identifiers remain the primary match evidence. Placeholder clusters are isolated for review.</p></div></div><div className="bar-list"><div><span>Identifier completeness</span><i><b style={{width:"86%"}} /></i><em>86%</em></div><div><span>Source quality</span><i><b style={{width:"78%"}} /></i><em>78%</em></div><div><span>Owner coverage</span><i><b style={{width:"64%"}} /></i><em>64%</em></div></div></section>
    </div>
  </div>;
}

function Runs() {
  return <section className="panel full"><div className="panel-head"><div><h2>Analysis runs</h2><p>Immutable execution history</p></div></div><div className="table"><div className="table-row table-header"><span>Run</span><span>Name</span><span>Status</span><span>Records</span><span>Groups</span><span>Started</span></div>{runs.map(run => <div className="table-row" key={run.number}><strong>{run.number}</strong><span>{run.name}</span><span><Status>{run.status}</Status></span><span>{run.records}</span><span>{run.groups}</span><span>{run.started}</span></div>)}</div></section>;
}

function Guardrails() {
  return <section className="panel full"><div className="panel-head"><div><h2>IRE guardrails</h2><p>Prevent repeated identity failures at ingestion</p></div></div>{guardrails.map(item => <article className="guardrail" key={item.number}><div className="guardrail-code">{item.number}</div><div><div className="queue-line"><strong>{item.identifier}</strong><Status>{item.status}</Status></div><p>{item.description}</p><div className="queue-meta"><span>Risk: {item.risk}</span><span>{item.groups} related group</span><span>Admin review required</span></div></div><button className="secondary">Review proposal</button></article>)}</section>;
}

function GroupDetail({ group, decide }: { group: Group; decide: (decision: string) => void }) {
  return <section className="detail-panel">
    <div className="detail-title"><div><p className="eyebrow">DUPLICATE GROUP</p><h2>{group.number}</h2></div><Status>{group.status}</Status></div>
    <div className={`confidence ${group.oversized ? "confidence-warning" : ""}`}><div><span>Confidence</span><strong>{group.confidence}%</strong></div><div><span>Classification</span><strong>{group.label}</strong></div><div><span>Candidates</span><strong>{group.candidates}</strong></div></div>
    <section className="evidence-block"><h3>Top match reason</h3><p>{group.reason}</p>{group.oversized && <div className="warning-box"><strong>Data-quality cluster</strong><p>This common value is not reliable duplicate evidence. Do not merge automatically.</p></div>}</section>
    <section className="evidence-block"><h3>Candidate evidence</h3><div className="candidate-grid">{group.evidence.map((candidate, index) => <article className={candidate.master ? "candidate master" : "candidate"} key={`${candidate.name}-${index}`}><div className="candidate-head"><span>Candidate {index + 1}</span>{candidate.master && <b>Recommended master</b>}</div><h4>{candidate.name}</h4><dl><div><dt>Source</dt><dd>{candidate.source}</dd></div><div><dt>Serial</dt><dd>{candidate.serial}</dd></div><div><dt>Host</dt><dd>{candidate.host}</dd></div><div><dt>Quality</dt><dd>{candidate.quality}/100</dd></div></dl></article>)}</div></section>
    <section className="evidence-block"><h3>Recommended action</h3><p>{group.oversized ? "Quarantine the identifier value and route the records for data-quality remediation." : "Retain the recommended master and send the remaining candidate records for steward-approved remediation."}</p></section>
    <div className="decision-bar"><button className="primary" onClick={() => decide("Accepted")}>Accept</button><button className="secondary" onClick={() => decide("Rejected")}>Reject</button><button className="secondary" onClick={() => decide("Deferred")}>Defer</button></div>
  </section>;
}
