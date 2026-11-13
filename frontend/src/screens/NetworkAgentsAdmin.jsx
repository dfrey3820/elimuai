"use client";
// ============================================================
// ElimuAI — Network Agents admin (super_admin)
// Create & manage network managers + agents, review referrals, pay/void
// commissions. Creating by email auto-provisions the account and emails
// temporary credentials (the user must reset their password on first login).
// Backend: /api/agents/*  (billing-service/app/routers/agents.py)
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPatch } from "@/utils/api";
import {
  Briefcase, Plus, Search, RefreshCw, AlertTriangle,
  X, Wallet, Ban, ArrowLeft, Users,
} from "lucide-react";

const fmtMoney = (n, cur = "KES") =>
  `${cur} ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-[13px] font-body outline-none focus:border-purple-500 transition-colors";
const labelCls = "block text-slate-600 text-[11px] font-body font-bold uppercase tracking-wider mb-1.5";
const thCls = "text-slate-500 text-[10px] font-body font-bold uppercase tracking-wider px-4 py-3 border-b border-slate-200 text-left whitespace-nowrap";
const tdCls = "px-4 py-3 border-b border-slate-100 text-[13px] text-slate-700 font-body whitespace-nowrap";

function statusBadge(st) {
  const map = { paid: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-700", void: "bg-slate-100 text-slate-500" };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[st] || "bg-slate-100 text-slate-500"}`}>{st || "—"}</span>;
}

function tierBadge(tier) {
  return tier === "manager"
    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">manager</span>
    : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">agent</span>;
}

function CreateAgentModal({ onClose, onCreated, managers }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", tier: "agent", manager_id: "",
    commission_rate: 0.15, override_rate: 0.05, agent_code: "", payout_method: "mpesa", notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!form.email.trim()) { setError("Enter the person's email."); return; }
    if (!form.name.trim()) { setError("Enter the person's full name."); return; }
    setBusy(true);
    try {
      await apiPost("/api/agents/", {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        tier: form.tier,
        manager_id: form.tier === "agent" && form.manager_id ? form.manager_id : undefined,
        commission_rate: Number(form.commission_rate),
        override_rate: form.tier === "manager" ? Number(form.override_rate) : undefined,
        agent_code: form.agent_code.trim() || undefined,
        payout_method: form.payout_method,
        notes: form.notes.trim() || undefined,
      });
      onCreated?.();
      onClose();
    } catch (e) { setError(e?.message || "Could not create."); }
    finally { setBusy(false); }
  };

  const isManager = form.tier === "manager";
  return (
    <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-[480px] shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-slate-900 text-lg font-heading font-black m-0 flex items-center gap-2"><Briefcase size={18} className="text-purple-600" /> New {isManager ? "manager" : "agent"}</h3>
          <button onClick={onClose} className="p-1 border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {error && <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-[12px] font-body rounded-xl px-3.5 py-2.5 mb-4"><AlertTriangle size={14} /> {error}</div>}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Role in network</label>
            <div className="flex gap-2">
              {[{ k: "agent", l: "Agent" }, { k: "manager", l: "Manager" }].map((o) => (
                <button key={o.k} onClick={() => setForm({ ...form, tier: o.k })}
                  className={`flex-1 px-4 py-2 rounded-xl border cursor-pointer text-[12px] font-body font-bold transition-colors ${form.tier === o.k ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Full name</label><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Wanjiku" /></div>
            <div><label className={labelCls}>Phone</label><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="2547XXXXXXXX" /></div>
          </div>
          <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="person@example.com" />
            <p className="text-slate-400 text-[11px] font-body mt-1">If no account exists, we create one and email temporary login credentials. They must reset their password on first login.</p>
          </div>
          {!isManager && (
            <div><label className={labelCls}>Reports to (manager)</label>
              <select className={inputCls} value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                <option value="">— None —</option>
                {(managers || []).map((m) => <option key={m.id} value={m.id}>{m.user_name} ({m.agent_code})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Commission rate</label>
              <input className={inputCls} type="number" step="0.01" min="0" max="1" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
              <p className="text-slate-400 text-[11px] font-body mt-1">{Math.round((Number(form.commission_rate) || 0) * 100)}% of first payment</p>
            </div>
            {isManager && (
              <div><label className={labelCls}>Override rate</label>
                <input className={inputCls} type="number" step="0.01" min="0" max="1" value={form.override_rate} onChange={(e) => setForm({ ...form, override_rate: e.target.value })} />
                <p className="text-slate-400 text-[11px] font-body mt-1">{Math.round((Number(form.override_rate) || 0) * 100)}% on agents' sales</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Payout method</label>
              <select className={inputCls} value={form.payout_method} onChange={(e) => setForm({ ...form, payout_method: e.target.value })}>
                <option value="mpesa">M-Pesa</option>
                <option value="bank">Bank</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div><label className={labelCls}>Code (optional)</label><input className={inputCls} value={form.agent_code} onChange={(e) => setForm({ ...form, agent_code: e.target.value.toUpperCase() })} placeholder="Auto" /></div>
          </div>
          <div><label className={labelCls}>Notes</label><textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <button disabled={busy} onClick={submit} className="w-full py-3 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[14px] font-body font-black shadow-lg shadow-purple-600/25 hover:bg-purple-700 transition-colors disabled:opacity-60">
            {busy ? "Creating…" : `Create ${isManager ? "manager" : "agent"} & send credentials`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommissionsTable({ agentId, onPaid }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const params = {};
    if (filter) params.status = filter;
    if (agentId) params.agent_id = agentId;
    const d = await apiGet("/api/agents/commissions/all", params).catch(() => ({ commissions: [] }));
    setRows(d?.commissions || []);
  }, [filter, agentId]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, kind) => {
    setBusyId(id);
    try {
      if (kind === "pay") {
        const ref = typeof window !== "undefined" ? window.prompt("Payout reference (optional):") : "";
        await apiPost(`/api/agents/commissions/${id}/pay`, { payout_reference: ref || undefined });
      } else {
        await apiPost(`/api/agents/commissions/${id}/void`, {});
      }
      await load();
      onPaid?.();
    } catch (e) {
      if (typeof window !== "undefined") window.alert(e?.message || "Action failed");
    } finally { setBusyId(null); }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
        <span className="text-slate-900 text-[14px] font-heading font-black">Commissions</span>
        <div className="flex gap-1.5">
          {["", "pending", "paid", "void"].map((f) => (
            <button key={f || "all"} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full border-none cursor-pointer text-[10px] font-body font-extrabold ${filter === f ? "bg-purple-600 text-white" : "bg-slate-50 text-slate-400"}`}>{f || "all"}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr><th className={thCls}>Agent</th><th className={thCls}>Customer</th><th className={thCls}>Kind</th><th className={thCls}>Commission</th><th className={thCls}>Status</th><th className={thCls}>Date</th><th className={thCls}>Actions</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-[13px] font-body">No commissions.</td></tr>
            ) : rows.map((c) => (
              <tr key={c.id}>
                <td className={tdCls}>{c.agent_name || c.agent_email}<div className="text-slate-400 text-[11px]">{c.agent_code}</div></td>
                <td className={tdCls}>{c.user_name || c.user_email}</td>
                <td className={tdCls}>{c.kind === "override" ? <span className="text-indigo-600 text-[11px] font-bold">override</span> : <span className="text-slate-400 text-[11px]">direct</span>}</td>
                <td className={tdCls}>{fmtMoney(c.commission_amount, c.currency)}</td>
                <td className={tdCls}>{statusBadge(c.status)}</td>
                <td className={tdCls}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                <td className={tdCls}>
                  {c.status === "pending" ? (
                    <div className="flex gap-1.5">
                      <button disabled={busyId === c.id} onClick={() => act(c.id, "pay")} className="px-2.5 py-1 rounded-lg border-none cursor-pointer bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"><Wallet size={12} /> Pay</button>
                      <button disabled={busyId === c.id} onClick={() => act(c.id, "void")} className="px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer bg-white text-slate-500 text-[11px] font-bold flex items-center gap-1 disabled:opacity-50"><Ban size={12} /> Void</button>
                    </div>
                  ) : <span className="text-slate-300 text-[12px]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function NetworkAgentsAdmin() {
  const [view, setView] = useState("list"); // list | detail
  const [agents, setAgents] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState(""); // "" | manager | agent
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (tierFilter) params.tier = tierFilter;
      const d = await apiGet("/api/agents/", params);
      setAgents(d?.agents || []);
    } catch { setAgents([]); }
    finally { setLoading(false); }
  }, [search, tierFilter]);

  const loadManagers = useCallback(async () => {
    const d = await apiGet("/api/agents/", { tier: "manager" }).catch(() => ({ agents: [] }));
    setManagers(d?.agents || []);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadManagers(); }, [loadManagers]);

  const openDetail = (a) => { setDetail(a); setView("detail"); };

  const toggleActive = async (a) => {
    try { await apiPatch(`/api/agents/${a.id}`, { is_active: !a.is_active }); await load(); }
    catch (e) { if (typeof window !== "undefined") window.alert(e?.message || "Update failed"); }
  };

  if (view === "detail" && detail) {
    return (
      <div className="space-y-5">
        <button onClick={() => { setView("list"); setDetail(null); }} className="flex items-center gap-1.5 text-purple-600 text-[12px] font-body font-bold bg-transparent border-none cursor-pointer hover:text-purple-800 p-0"><ArrowLeft size={16} /> Back to network</button>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-slate-900 text-xl font-heading font-black m-0 flex items-center gap-2">{detail.user_name} {tierBadge(detail.tier)}</h2>
              <p className="text-slate-400 text-[13px] font-body m-0">{detail.user_email} · code <b className="font-mono text-purple-600">{detail.agent_code}</b>{detail.manager_name ? <> · manager <b>{detail.manager_name}</b></> : null}</p>
            </div>
            <div className="flex gap-4">
              {detail.tier === "manager" && <div className="text-center"><div className="text-indigo-600 text-xl font-black">{detail.team_size ?? 0}</div><div className="text-slate-400 text-[10px] uppercase tracking-wider">Team</div></div>}
              <div className="text-center"><div className="text-slate-900 text-xl font-black">{detail.referral_count ?? 0}</div><div className="text-slate-400 text-[10px] uppercase tracking-wider">Referrals</div></div>
              <div className="text-center"><div className="text-emerald-600 text-xl font-black">{fmtMoney(detail.paid_amount)}</div><div className="text-slate-400 text-[10px] uppercase tracking-wider">Paid</div></div>
              <div className="text-center"><div className="text-amber-600 text-xl font-black">{fmtMoney(detail.pending_amount)}</div><div className="text-slate-400 text-[10px] uppercase tracking-wider">Pending</div></div>
            </div>
          </div>
        </div>
        <CommissionsTable agentId={detail.id} onPaid={load} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {showCreate && <CreateAgentModal onClose={() => setShowCreate(false)} onCreated={() => { load(); loadManagers(); }} managers={managers} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-slate-900 text-xl font-heading font-black m-0 flex items-center gap-2"><Briefcase size={20} className="text-purple-600" /> Network Agents</h2>
          <p className="text-slate-400 text-[13px] font-body m-0">Create managers & agents who onboard schools, parents, teachers & students and earn commissions.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="py-2.5 px-5 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[13px] font-body font-black shadow-lg shadow-purple-600/25 hover:bg-purple-700 transition-colors flex items-center gap-2"><Plus size={16} /> Add person</button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-[320px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or code" />
        </div>
        <div className="flex gap-1.5">
          {[{ k: "", l: "All" }, { k: "manager", l: "Managers" }, { k: "agent", l: "Agents" }].map((f) => (
            <button key={f.k || "all"} onClick={() => setTierFilter(f.k)} className={`px-3 py-1.5 rounded-full border-none cursor-pointer text-[11px] font-body font-extrabold ${tierFilter === f.k ? "bg-purple-600 text-white" : "bg-slate-50 text-slate-400"}`}>{f.l}</button>
          ))}
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 cursor-pointer hover:bg-slate-50"><RefreshCw size={15} /></button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className={thCls}>Name</th><th className={thCls}>Tier</th><th className={thCls}>Code</th><th className={thCls}>Manager</th><th className={thCls}>Rate</th><th className={thCls}>Referrals</th><th className={thCls}>Pending</th><th className={thCls}>Paid</th><th className={thCls}>Status</th><th className={thCls}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400 text-[13px] font-body">Loading…</td></tr>
              ) : agents.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400 text-[13px] font-body">No one yet. Add a manager or agent to get started.</td></tr>
              ) : agents.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className={`${tdCls} cursor-pointer`} onClick={() => openDetail(a)}>
                    <div className="font-bold text-slate-900">{a.user_name}</div>
                    <div className="text-slate-400 text-[11px]">{a.user_email}</div>
                  </td>
                  <td className={tdCls}>{tierBadge(a.tier)}{a.tier === "manager" && a.team_size ? <span className="ml-1 text-slate-400 text-[11px]">· {a.team_size}</span> : null}</td>
                  <td className={tdCls}><span className="font-mono text-purple-600">{a.agent_code}</span></td>
                  <td className={tdCls}>{a.manager_name || <span className="text-slate-300">—</span>}</td>
                  <td className={tdCls}>{Math.round((a.commission_rate || 0) * 100)}%{a.tier === "manager" ? <span className="text-indigo-500"> / {Math.round((a.override_rate || 0) * 100)}%</span> : null}</td>
                  <td className={tdCls}>{a.referral_count ?? 0}</td>
                  <td className={tdCls}>{fmtMoney(a.pending_amount)}</td>
                  <td className={tdCls}>{fmtMoney(a.paid_amount)}</td>
                  <td className={tdCls}>{a.is_active ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">active</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">inactive</span>}</td>
                  <td className={tdCls}>
                    <div className="flex gap-1.5">
                      <button onClick={() => openDetail(a)} className="px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer bg-white text-slate-600 text-[11px] font-bold flex items-center gap-1"><Users size={12} /> View</button>
                      <button onClick={() => toggleActive(a)} className="px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer bg-white text-slate-600 text-[11px] font-bold">{a.is_active ? "Deactivate" : "Activate"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CommissionsTable onPaid={load} />
    </div>
  );
}
