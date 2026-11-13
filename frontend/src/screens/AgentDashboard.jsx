"use client";
// ============================================================
// ElimuAI — Network Agent / Manager self-service dashboard
// Role: marketing_agent (tier = 'agent' | 'manager')
//   - Referral code + shareable link
//   - Track referrals and commission earnings (incl. manager overrides)
//   - Onboard customers (student / teacher / parent) or a whole school
//   - Managers: view their team of agents
// Backend: /api/agents/me*  (billing-service/app/routers/agents.py)
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "@/utils/api";
import {
  Briefcase, Users, Wallet, Clock, CheckCircle, Copy, Check,
  UserPlus, School as SchoolIcon, LogOut, RefreshCw, AlertTriangle, UsersRound,
} from "lucide-react";

const fmtMoney = (n, cur = "KES") =>
  `${cur} ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

const COUNTRIES = [
  { code: "KE", label: "Kenya" },
  { code: "TZ", label: "Tanzania" },
  { code: "UG", label: "Uganda" },
];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex-1 min-w-[150px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-slate-400 text-[11px] font-body font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-slate-900 text-2xl font-heading font-black">{value}</div>
    </div>
  );
}

function ReferralBox({ code }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${code}` : `/register?ref=${code}`;
  const copy = () => {
    try { navigator.clipboard?.writeText(link); } catch { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-2xl p-6 text-white mb-6 bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg">
      <div className="text-[11px] opacity-70 tracking-widest mb-1.5 font-body">YOUR REFERRAL CODE</div>
      <div className="text-3xl font-black font-mono mb-3">{code}</div>
      <div className="flex items-center gap-2.5 bg-white/15 rounded-lg px-3 py-2">
        <div className="flex-1 text-[13px] font-mono truncate">{link}</div>
        <button onClick={copy} className="bg-white text-purple-700 rounded-md px-3.5 py-1.5 font-bold text-xs cursor-pointer border-none flex items-center gap-1.5">
          {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
        </button>
      </div>
      <div className="text-[12px] opacity-70 mt-2.5 font-body">
        Share this link. Anyone who signs up and subscribes through it is credited to you.
      </div>
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-[13px] font-body outline-none focus:border-purple-500 transition-colors";
const labelCls = "block text-slate-600 text-[11px] font-body font-bold uppercase tracking-wider mb-1.5";

function OnboardForms({ onDone }) {
  const [mode, setMode] = useState("individual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [cust, setCust] = useState({ name: "", email: "", phone: "", role: "student", country: "KE" });
  const [school, setSchool] = useState({ school_name: "", admin_name: "", admin_email: "", admin_phone: "", county: "", country: "KE", curriculum: "CBC" });

  const submitCustomer = async () => {
    setError(""); setSuccess("");
    if (!cust.name.trim() || !cust.email.trim()) { setError("Name and email are required."); return; }
    setBusy(true);
    try {
      await apiPost("/api/agents/me/customers", cust);
      setSuccess(`${cust.name} onboarded. They were credited to you.`);
      setCust({ name: "", email: "", phone: "", role: "student", country: "KE" });
      onDone?.();
    } catch (e) { setError(e?.message || "Could not onboard customer."); }
    finally { setBusy(false); }
  };

  const submitSchool = async () => {
    setError(""); setSuccess("");
    if (!school.school_name.trim() || !school.admin_name.trim() || !school.admin_email.trim()) {
      setError("School name, admin name and admin email are required."); return;
    }
    setBusy(true);
    try {
      await apiPost("/api/agents/me/schools", school);
      setSuccess(`${school.school_name} onboarded. The admin was credited to you.`);
      setSchool({ school_name: "", admin_name: "", admin_email: "", admin_phone: "", county: "", country: "KE", curriculum: "CBC" });
      onDone?.();
    } catch (e) { setError(e?.message || "Could not onboard school."); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex gap-2 mb-5">
        {[{ k: "individual", l: "Individual", icon: UserPlus }, { k: "school", l: "School", icon: SchoolIcon }].map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.k} onClick={() => { setMode(m.k); setError(""); setSuccess(""); }}
              className={`px-4 py-2 rounded-xl border cursor-pointer text-[12px] font-body font-bold flex items-center gap-1.5 transition-colors ${mode === m.k ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"}`}>
              <Icon size={14} /> {m.l}
            </button>
          );
        })}
      </div>

      {error && <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-[12px] font-body rounded-xl px-3.5 py-2.5 mb-4"><AlertTriangle size={14} /> {error}</div>}
      {success && <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-[12px] font-body rounded-xl px-3.5 py-2.5 mb-4"><CheckCircle size={14} /> {success}</div>}

      {mode === "individual" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className={labelCls}>Full name</label><input className={inputCls} value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} placeholder="Jane Wanjiku" /></div>
          <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} placeholder="jane@example.com" /></div>
          <div><label className={labelCls}>Phone</label><input className={inputCls} value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} placeholder="2547XXXXXXXX" /></div>
          <div><label className={labelCls}>Customer type</label>
            <select className={inputCls} value={cust.role} onChange={(e) => setCust({ ...cust, role: e.target.value })}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
            </select>
          </div>
          <div><label className={labelCls}>Country</label>
            <select className={inputCls} value={cust.country} onChange={(e) => setCust({ ...cust, country: e.target.value })}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <button disabled={busy} onClick={submitCustomer} className="w-full py-3 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[14px] font-body font-black shadow-lg shadow-purple-600/25 hover:bg-purple-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              <UserPlus size={16} /> {busy ? "Onboarding…" : "Onboard customer"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className={labelCls}>School name</label><input className={inputCls} value={school.school_name} onChange={(e) => setSchool({ ...school, school_name: e.target.value })} placeholder="Nairobi Primary School" /></div>
          <div><label className={labelCls}>Admin name</label><input className={inputCls} value={school.admin_name} onChange={(e) => setSchool({ ...school, admin_name: e.target.value })} placeholder="Head teacher name" /></div>
          <div><label className={labelCls}>Admin email</label><input className={inputCls} type="email" value={school.admin_email} onChange={(e) => setSchool({ ...school, admin_email: e.target.value })} placeholder="admin@school.ac.ke" /></div>
          <div><label className={labelCls}>Admin phone</label><input className={inputCls} value={school.admin_phone} onChange={(e) => setSchool({ ...school, admin_phone: e.target.value })} placeholder="2547XXXXXXXX" /></div>
          <div><label className={labelCls}>County</label><input className={inputCls} value={school.county} onChange={(e) => setSchool({ ...school, county: e.target.value })} placeholder="Nairobi" /></div>
          <div><label className={labelCls}>Country</label>
            <select className={inputCls} value={school.country} onChange={(e) => setSchool({ ...school, country: e.target.value })}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Curriculum</label>
            <select className={inputCls} value={school.curriculum} onChange={(e) => setSchool({ ...school, curriculum: e.target.value })}>
              <option value="CBC">CBC (Kenya)</option>
              <option value="NECTA">NECTA (Tanzania)</option>
              <option value="NCDC">NCDC (Uganda)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button disabled={busy} onClick={submitSchool} className="w-full py-3 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[14px] font-body font-black shadow-lg shadow-purple-600/25 hover:bg-purple-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              <SchoolIcon size={16} /> {busy ? "Onboarding…" : "Onboard school"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const thCls = "text-slate-500 text-[10px] font-body font-bold uppercase tracking-wider px-4 py-3 border-b border-slate-200 text-left whitespace-nowrap";
const tdCls = "px-4 py-3 border-b border-slate-100 text-[13px] text-slate-700 font-body whitespace-nowrap";

function statusBadge(st) {
  const map = { paid: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-700", void: "bg-slate-100 text-slate-500" };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[st] || "bg-slate-100 text-slate-500"}`}>{st || "—"}</span>;
}

export default function AgentDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [notAgent, setNotAgent] = useState(false);
  const [agent, setAgent] = useState(null);
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [team, setTeam] = useState([]);

  const isManager = agent?.tier === "manager";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await apiGet("/api/agents/me");
      const ag = me?.agent || null;
      setAgent(ag);
      setStats(me?.stats || null);
      setNotAgent(false);
      const reqs = [
        apiGet("/api/agents/me/referrals").catch(() => ({ referrals: [] })),
        apiGet("/api/agents/me/commissions").catch(() => ({ commissions: [] })),
      ];
      if (ag?.tier === "manager") reqs.push(apiGet("/api/agents/me/team").catch(() => ({ team: [] })));
      const [r, c, t] = await Promise.all(reqs);
      setReferrals(r?.referrals || []);
      setCommissions(c?.commissions || []);
      setTeam(t?.team || []);
    } catch (e) {
      if (e?.status === 404) setNotAgent(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs = isManager ? ["Overview", "My Team", "Earnings", "Onboard"] : ["Overview", "Earnings", "Onboard"];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-5 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center"><Briefcase size={18} color="#fff" /></div>
          <div>
            <div className="text-slate-900 text-[15px] font-heading font-black leading-tight">{isManager ? "Network Manager" : "Network Agent"}</div>
            <div className="text-slate-400 text-[11px] font-body">{user?.name || user?.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 cursor-pointer hover:bg-slate-50" title="Refresh"><RefreshCw size={15} /></button>
          <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-[12px] font-body font-bold cursor-pointer hover:bg-slate-50"><LogOut size={14} /> Logout</button>
        </div>
      </header>

      <main className="max-w-[980px] mx-auto px-5 md:px-8 py-6">
        {loading ? (
          <div className="text-slate-400 text-sm font-body py-20 text-center">Loading…</div>
        ) : notAgent ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center">
            <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
            <h2 className="text-slate-900 text-lg font-heading font-black mb-1">Not an active agent</h2>
            <p className="text-slate-500 text-[13px] font-body">Your account isn't registered as a network agent yet. Contact an administrator.</p>
          </div>
        ) : (
          <>
            <ReferralBox code={agent?.agent_code} />

            <div className="flex gap-3 flex-wrap mb-6">
              <StatCard icon={Users} label="Referrals" value={stats?.referrals ?? 0} color="#6B3FA0" />
              <StatCard icon={Wallet} label="Paid out" value={fmtMoney(stats?.paid_amount)} color="#00A86B" />
              <StatCard icon={Clock} label="Pending" value={fmtMoney(stats?.pending_amount)} color="#D97706" />
              {isManager
                ? <StatCard icon={UsersRound} label="Team size" value={team.length} color="#4F46E5" />
                : <StatCard icon={CheckCircle} label="Commission rate" value={`${Math.round((agent?.commission_rate || 0) * 100)}%`} color="#0056A2" />}
            </div>

            <div className="flex gap-2 mb-5 flex-wrap">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-xl border cursor-pointer text-[12px] font-body font-bold transition-colors ${tab === t ? "bg-purple-600 text-white border-purple-600 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                  {t}
                </button>
              ))}
            </div>

            {tab === "Overview" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 text-slate-900 text-[14px] font-heading font-black">Your referrals</div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead><tr><th className={thCls}>Name</th><th className={thCls}>Email</th><th className={thCls}>Plan</th><th className={thCls}>Source</th><th className={thCls}>Commission</th><th className={thCls}>Status</th></tr></thead>
                    <tbody>
                      {referrals.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-[13px] font-body">No referrals yet. Share your link or onboard a customer.</td></tr>
                      ) : referrals.map((r) => (
                        <tr key={r.id}>
                          <td className={tdCls}>{r.name}</td>
                          <td className={tdCls}>{r.email}</td>
                          <td className={tdCls}>{r.plan || "free"}</td>
                          <td className={tdCls}>{r.source}</td>
                          <td className={tdCls}>{r.commission_amount != null ? fmtMoney(r.commission_amount) : "—"}</td>
                          <td className={tdCls}>{statusBadge(r.commission_status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "My Team" && isManager && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 text-slate-900 text-[14px] font-heading font-black">Agents reporting to you</div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead><tr><th className={thCls}>Agent</th><th className={thCls}>Code</th><th className={thCls}>Referrals</th><th className={thCls}>Pending</th><th className={thCls}>Paid</th><th className={thCls}>Status</th></tr></thead>
                    <tbody>
                      {team.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-[13px] font-body">No agents assigned to you yet.</td></tr>
                      ) : team.map((a) => (
                        <tr key={a.id}>
                          <td className={tdCls}>{a.user_name}<div className="text-slate-400 text-[11px]">{a.user_email}</div></td>
                          <td className={tdCls}><span className="font-mono text-purple-600">{a.agent_code}</span></td>
                          <td className={tdCls}>{a.referral_count ?? 0}</td>
                          <td className={tdCls}>{fmtMoney(a.pending_amount)}</td>
                          <td className={tdCls}>{fmtMoney(a.paid_amount)}</td>
                          <td className={tdCls}>{a.is_active ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">active</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">inactive</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "Earnings" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 text-slate-900 text-[14px] font-heading font-black">Commissions</div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead><tr><th className={thCls}>Customer</th><th className={thCls}>Kind</th><th className={thCls}>Base</th><th className={thCls}>Rate</th><th className={thCls}>Commission</th><th className={thCls}>Status</th><th className={thCls}>Date</th></tr></thead>
                    <tbody>
                      {commissions.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-[13px] font-body">No commissions yet. You earn when a referral makes their first payment.</td></tr>
                      ) : commissions.map((c) => (
                        <tr key={c.id}>
                          <td className={tdCls}>{c.user_name || c.user_email}</td>
                          <td className={tdCls}>{c.kind === "override" ? <span className="text-indigo-600 text-[11px] font-bold">override</span> : <span className="text-slate-400 text-[11px]">direct</span>}</td>
                          <td className={tdCls}>{fmtMoney(c.base_amount, c.currency)}</td>
                          <td className={tdCls}>{Math.round((c.commission_rate || 0) * 100)}%</td>
                          <td className={tdCls}>{fmtMoney(c.commission_amount, c.currency)}</td>
                          <td className={tdCls}>{statusBadge(c.status)}</td>
                          <td className={tdCls}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "Onboard" && <OnboardForms onDone={load} />}
          </>
        )}
      </main>
    </div>
  );
}
