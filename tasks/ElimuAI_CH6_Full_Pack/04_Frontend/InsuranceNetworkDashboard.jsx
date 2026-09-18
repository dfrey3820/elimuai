// ============================================================
// ElimuAI CH6 — Insurance Agent Network Dashboard
// src/components/admin/InsuranceNetworkDashboard.jsx
//
// Three views depending on logged-in partner's role:
//   - network_head: sees whole network, all managers, all agents
//   - manager: sees only their team of agents
//   - agent: sees only their own performance + referral link
// ============================================================
import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "https://api.elimuai.africa";
const BLUE = "#0056A2"; const GREEN = "#00A86B"; const GOLD = "#9A7400";
const PURPLE = "#6B3FA0";

function fmt(n) { return `KES ${Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`; }

function StatCard({ label, value, sub, color = BLUE }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", borderTop: `4px solid ${color}`, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#111" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Table({ headers, rows, onRowClick, emptyText = "No records" }) {
  return (
    <div style={{ overflowX: "auto", background: "#fff", borderRadius: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>{headers.map((h, i) => (
            <th key={i} style={{ padding: "10px 14px", textAlign: "left", background: BLUE, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{ padding: 24, textAlign: "center", color: "#aaa" }}>{emptyText}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} onClick={() => onRowClick && onRowClick(row._raw)} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fb", cursor: onRowClick ? "pointer" : "default" }}>
              {row.cells.map((c, j) => <td key={j} style={{ padding: "10px 14px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Breadcrumb({ items, onClick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 13, color: "#888" }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span>{'\u203A'}</span>}
          <span
            onClick={() => i < items.length - 1 && onClick && onClick(i)}
            style={{ color: i === items.length - 1 ? "#111" : BLUE, fontWeight: i === items.length - 1 ? 700 : 500, cursor: i < items.length - 1 ? "pointer" : "default" }}>
            {item}
          </span>
        </span>
      ))}
    </div>
  );
}

function ReferralBox({ code, link }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{ background: "linear-gradient(135deg,#0056A2,#4F46E5)", borderRadius: 12, padding: "20px 24px", color: "#fff", marginBottom: 20 }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, letterSpacing: 1 }}>YOUR REFERRAL CODE</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, fontFamily: "monospace" }}>{code}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 12px" }}>
        <div style={{ flex: 1, fontSize: 13, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{link}</div>
        <button onClick={copy} style={{ background: "#fff", color: BLUE, border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>Share this link with families. You earn 15% every month they stay subscribed.</div>
    </div>
  );
}

export default function InsuranceNetworkDashboard({ role = "network_head", partnerId, networkId }) {
  const [view, setView] = useState("network");
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState(networkId || null);
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState(null);
  const [agents, setAgents] = useState([]);
  const [agentDetail, setAgentDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchNetworks = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/admin/ch6/networks`);
    setNetworks(await res.json());
  }, []);

  const fetchManagers = useCallback(async (nid) => {
    const res = await fetch(`${API_BASE}/api/admin/ch6/networks/${nid}/managers`);
    setManagers(await res.json());
  }, []);

  const fetchAgents = useCallback(async (mgrId) => {
    const res = await fetch(`${API_BASE}/api/admin/ch6/managers/${mgrId}/agents`);
    setAgents(await res.json());
  }, []);

  const fetchAgentDetail = useCallback(async (id) => {
    const res = await fetch(`${API_BASE}/api/admin/ch6/agents/${id}`);
    setAgentDetail(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (role === "network_head") {
        await fetchNetworks();
        if (selectedNetwork) await fetchManagers(selectedNetwork);
      } else if (role === "manager" && partnerId) {
        await fetchAgents(partnerId);
        setView("manager");
      } else if (role === "agent" && partnerId) {
        await fetchAgentDetail(partnerId);
        setView("agent");
      }
      setLoading(false);
    })();
  }, [role, partnerId, selectedNetwork, fetchNetworks, fetchManagers, fetchAgents, fetchAgentDetail]);

  const openNetwork = async (nid) => {
    setSelectedNetwork(nid);
    setView("network");
    setLoading(true);
    await fetchManagers(nid);
    setLoading(false);
  };

  const openManager = async (mgr) => {
    setSelectedManager(mgr);
    setView("managerTeam");
    setLoading(true);
    await fetchAgents(mgr.manager_id);
    setLoading(false);
  };

  const openAgent = async (agt) => {
    setLoading(true);
    await fetchAgentDetail(agt.agent_id);
    setView("agentDetail");
    setLoading(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: BLUE, fontSize: 15 }}>Loading...</div>
  );

  const currentNetwork = networks.find(n => n.network_id === selectedNetwork);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f4f6fb", minHeight: "100vh", padding: "24px 28px" }}>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: BLUE }}>Insurance Agent Network</div>
        <div style={{ fontSize: 13, color: "#888" }}>CH6 - Continuous commission tracker</div>
      </div>

      {role === "agent" && agentDetail && (
        <>
          <ReferralBox code={agentDetail.referral_code} link={agentDetail.referral_link} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            <StatCard label="Families Enrolled" value={agentDetail.total_families_enrolled} color={GREEN} />
            <StatCard label="Total Conversions" value={agentDetail.total_conversions} color={PURPLE} />
            <StatCard label="Pending Commission" value={fmt(agentDetail.pending_kes)} sub="paid end of month" color={GOLD} />
            <StatCard label="Total Paid (All Time)" value={fmt(agentDetail.paid_kes)} color={BLUE} />
          </div>
          <div style={{ background: "#fff", borderRadius: 10, padding: 20, fontSize: 13, color: "#555", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
            <b>How this works:</b> You earn 15% of the monthly subscription for every family you refer - for as long as they remain subscribed. Your manager and network coordinator also earn from your referrals, but this does not reduce your share. Commissions are calculated monthly and paid via M-Pesa.
          </div>
        </>
      )}

      {role === "manager" && view === "manager" && (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            <StatCard label="Your Team Size" value={agents.length} color={PURPLE} />
            <StatCard label="Total Families (Team)" value={agents.reduce((s, a) => s + a.total_families_enrolled, 0)} color={GREEN} />
            <StatCard label="Team Pending Commission" value={fmt(agents.reduce((s, a) => s + a.pending_kes, 0))} color={GOLD} />
          </div>
          <Table
            headers={["Agent", "Employee #", "Referral Code", "Families", "Pending (KES)", "Paid (KES)", "Status"]}
            rows={agents.map(a => ({
              cells: [
                a.agent_name, a.employee_number,
                <code style={{ background: "#f0f4ff", padding: "2px 6px", borderRadius: 4 }}>{a.referral_code}</code>,
                a.total_families_enrolled, fmt(a.pending_kes), fmt(a.paid_kes),
                <span style={{ color: a.status === "active" ? GREEN : "#c00", fontWeight: 600 }}>{a.status}</span>
              ],
              _raw: a
            }))}
            onRowClick={openAgent}
          />
        </>
      )}

      {role === "network_head" && view === "network" && !selectedNetwork && (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            <StatCard label="Total Networks" value={networks.length} color={BLUE} />
            <StatCard label="Total Agents (All)" value={networks.reduce((s, n) => s + n.total_agents, 0)} color={GREEN} />
            <StatCard label="Total Subscribers" value={networks.reduce((s, n) => s + n.total_subscribers, 0)} color={PURPLE} />
            <StatCard label="Pending Commission (All)" value={fmt(networks.reduce((s, n) => s + n.pending_commission_kes, 0))} color={GOLD} />
          </div>
          <Table
            headers={["Network", "Head", "Insurance Co.", "Managers", "Agents", "Subscribers", "Pending (KES)"]}
            rows={networks.map(n => ({
              cells: [n.network_name, n.network_head_name, n.insurance_company || "-", n.total_managers, n.total_agents, n.total_subscribers, fmt(n.pending_commission_kes)],
              _raw: n
            }))}
            onRowClick={(n) => openNetwork(n.network_id)}
          />
        </>
      )}

      {role === "network_head" && view === "network" && selectedNetwork && (
        <>
          <Breadcrumb items={["All Networks", (currentNetwork && currentNetwork.network_name) || "Network"]} onClick={() => setSelectedNetwork(null)} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            <StatCard label="Managers" value={managers.length} color={PURPLE} />
            <StatCard label="Total Agents" value={managers.reduce((s, m) => s + m.team_size, 0)} color={GREEN} />
            <StatCard label="Total Subscribers" value={managers.reduce((s, m) => s + m.team_subscribers, 0)} color={BLUE} />
            <StatCard label="Pending - Your Override" value={fmt((currentNetwork && currentNetwork.pending_commission_kes) || 0)} sub="5% network-wide" color={GOLD} />
          </div>
          <Table
            headers={["Manager", "Team Code", "Region", "Team Size", "Subscribers", "Manager Pending (KES)", "Team Pending (KES)"]}
            rows={managers.map(m => ({
              cells: [m.manager_name, m.team_code, m.region || "-", m.team_size, m.team_subscribers, fmt(m.manager_pending_kes), fmt(m.team_agents_pending_kes)],
              _raw: m
            }))}
            onRowClick={openManager}
          />
        </>
      )}

      {role === "network_head" && view === "managerTeam" && (
        <>
          <Breadcrumb
            items={["All Networks", (currentNetwork && currentNetwork.network_name) || "Network", (selectedManager && selectedManager.manager_name) || "Manager"]}
            onClick={(i) => { if (i === 0) { setSelectedNetwork(null); } setView("network"); }}
          />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            <StatCard label="Team Size" value={agents.length} color={PURPLE} />
            <StatCard label="Total Families" value={agents.reduce((s, a) => s + a.total_families_enrolled, 0)} color={GREEN} />
            <StatCard label="Manager Override Pending" value={fmt((selectedManager && selectedManager.manager_pending_kes) || 0)} sub="8% on team" color={GOLD} />
          </div>
          <Table
            headers={["Agent", "Employee #", "Referral Code", "Families", "Pending (KES)", "Paid (KES)", "Status"]}
            rows={agents.map(a => ({
              cells: [
                a.agent_name, a.employee_number,
                <code style={{ background: "#f0f4ff", padding: "2px 6px", borderRadius: 4 }}>{a.referral_code}</code>,
                a.total_families_enrolled, fmt(a.pending_kes), fmt(a.paid_kes),
                <span style={{ color: a.status === "active" ? GREEN : "#c00", fontWeight: 600 }}>{a.status}</span>
              ],
              _raw: a
            }))}
            onRowClick={openAgent}
          />
        </>
      )}

      {view === "agentDetail" && agentDetail && (
        <>
          <Breadcrumb items={["...", agentDetail.agent_name]} onClick={() => setView(role === "network_head" ? "managerTeam" : "manager")} />
          <ReferralBox code={agentDetail.referral_code} link={agentDetail.referral_link} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <StatCard label="Families Enrolled" value={agentDetail.total_families_enrolled} color={GREEN} />
            <StatCard label="Total Conversions" value={agentDetail.total_conversions} color={PURPLE} />
            <StatCard label="Pending Commission" value={fmt(agentDetail.pending_kes)} color={GOLD} />
            <StatCard label="Total Paid" value={fmt(agentDetail.paid_kes)} color={BLUE} />
          </div>
        </>
      )}
    </div>
  );
}
