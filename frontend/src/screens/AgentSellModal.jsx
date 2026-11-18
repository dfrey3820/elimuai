"use client";
// ============================================================
// ElimuAI — Agent point-of-sale: Add New Customer
// Flow: pick type → KYC → plan/cycle → STK push → complete sale.
// Used by insurance managers & agents from their dashboard.
// Backend: POST /api/payments/agent/sell, GET /api/payments/agent/sale-status/:id
// ============================================================
import { useState, useEffect, useRef } from "react";
import { apiGet, apiPost } from "@/utils/api";
import {
  X, UserPlus, GraduationCap, BookOpen, Users, ArrowRight, ArrowLeft,
  Smartphone, CheckCircle, AlertTriangle, Loader, School as SchoolIcon,
} from "lucide-react";

const TYPES = [
  { k: "student", label: "Student", icon: GraduationCap },
  { k: "parent", label: "Parent", icon: Users },
  { k: "teacher", label: "Teacher", icon: BookOpen },
  { k: "school", label: "School", icon: SchoolIcon },
];
const CYCLES = [
  { k: "monthly", label: "Monthly" },
  { k: "quarterly", label: "Quarterly" },
  { k: "semi_annual", label: "Semi-Annual" },
  { k: "annual", label: "Annual" },
];

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-[13px] font-body outline-none focus:border-emerald-500 transition-colors";
const labelCls = "block text-slate-600 text-[11px] font-body font-bold uppercase tracking-wider mb-1.5";
const fmt = (n, c = "KES") => `${c} ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
const cycleTotal = (info) => (typeof info === "number" ? info : (info?.total ?? info?.price ?? info?.amount ?? 0));

export default function AgentSellModal({ onClose, onSold }) {
  const [step, setStep] = useState(1); // 1 type, 2 kyc, 3 plan, 4 result
  const [type, setType] = useState("student");
  const [kyc, setKyc] = useState({ name: "", email: "", phone: "", national_id: "", school_name: "", county: "", curriculum: "CBC" });
  const [cycle, setCycle] = useState("monthly");
  const [pricing, setPricing] = useState(null);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sale, setSale] = useState(null); // { payment_id, amount, currency }
  const [saleStatus, setSaleStatus] = useState("pending"); // pending | completed | failed
  const pollRef = useRef(null);

  // Load pricing for the chosen type when entering the plan step.
  useEffect(() => {
    if (step !== 3) return;
    setPricing(null);
    apiGet(`/api/payments/pricing/${type}`).then(setPricing).catch(() => setPricing(null));
  }, [step, type]);

  // Poll sale status on the result step.
  useEffect(() => {
    if (step !== 4 || !sale?.payment_id) return;
    const tick = async () => {
      try {
        const d = await apiGet(`/api/payments/agent/sale-status/${sale.payment_id}`);
        if (d?.status && d.status !== "pending") {
          setSaleStatus(d.status);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* keep polling */ }
    };
    pollRef.current = setInterval(tick, 3000);
    tick();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, sale?.payment_id]);

  const next = () => setError("") || setStep((s) => s + 1);
  const back = () => setError("") || setStep((s) => s - 1);

  const goKyc = () => setStep(2);
  const goPlan = () => {
    if (type === "school") {
      if (!kyc.school_name.trim()) return setError("School name is required.");
      if (!kyc.name.trim()) return setError("Admin name is required.");
      if (!kyc.email.trim()) return setError("Admin email is required (for their login).");
    } else {
      if (!kyc.name.trim()) return setError("Customer name is required.");
      if (!kyc.email.trim()) return setError("Customer email is required (for their login).");
    }
    setError("");
    setMpesaPhone(kyc.phone || "");
    setStep(3);
  };

  const sell = async () => {
    setError("");
    if (!mpesaPhone.trim()) return setError("Enter the M-Pesa phone to charge.");
    setBusy(true);
    try {
      const d = await apiPost("/api/payments/agent/sell", {
        customer_name: kyc.name.trim(),
        customer_email: kyc.email.trim(),
        customer_phone: kyc.phone.trim() || undefined,
        national_id: kyc.national_id.trim() || undefined,
        customer_type: type,
        billing_cycle: cycle,
        mpesa_phone: mpesaPhone.trim(),
        ...(type === "school" ? {
          school_name: kyc.school_name.trim(),
          county: kyc.county.trim() || undefined,
          curriculum: kyc.curriculum || "CBC",
        } : {}),
      });
      setSale(d);
      setSaleStatus("pending");
      setStep(4);
    } catch (e) {
      setError(e?.message || "Could not start the sale.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1); setType("student"); setKyc({ name: "", email: "", phone: "", national_id: "", school_name: "", county: "", curriculum: "CBC" });
    setCycle("monthly"); setPricing(null); setMpesaPhone(""); setSale(null); setSaleStatus("pending"); setError("");
  };

  const selectedPrice = pricing?.cycles ? cycleTotal(pricing.cycles[cycle]) : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-[480px] shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-slate-900 text-lg font-heading font-black m-0 flex items-center gap-2"><UserPlus size={18} className="text-emerald-600" /> Add New Customer</h3>
          <button onClick={onClose} className="p-1 border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="flex gap-1.5 mb-5 mt-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-emerald-500" : "bg-slate-200"}`} />
          ))}
        </div>

        {error && <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-[12px] font-body rounded-xl px-3.5 py-2.5 mb-4"><AlertTriangle size={14} /> {error}</div>}

        {step === 1 && (
          <div>
            <p className="text-slate-500 text-[13px] font-body mb-3">Who are you signing up?</p>
            <div className="grid grid-cols-1 gap-2.5">
              {TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.k} onClick={() => { setType(t.k); goKyc(); }}
                    className={`w-full py-3 px-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${type === t.k ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                    <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center"><Icon size={18} className="text-emerald-600" /></div>
                    <span className="flex-1 text-left text-slate-900 text-sm font-body font-bold">{t.label}</span>
                    <ArrowRight size={16} className="text-emerald-600" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {type === "school" ? (
              <>
                <div><label className={labelCls}>School name (KYC)</label><input className={inputCls} value={kyc.school_name} onChange={(e) => setKyc({ ...kyc, school_name: e.target.value })} placeholder="Nairobi Primary School" /></div>
                <div><label className={labelCls}>Admin name</label><input className={inputCls} value={kyc.name} onChange={(e) => setKyc({ ...kyc, name: e.target.value })} placeholder="Head teacher name" /></div>
                <div><label className={labelCls}>Admin email</label><input className={inputCls} type="email" value={kyc.email} onChange={(e) => setKyc({ ...kyc, email: e.target.value })} placeholder="admin@school.ac.ke" /></div>
                <div><label className={labelCls}>Admin phone</label><input className={inputCls} value={kyc.phone} onChange={(e) => setKyc({ ...kyc, phone: e.target.value })} placeholder="2547XXXXXXXX" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>County</label><input className={inputCls} value={kyc.county} onChange={(e) => setKyc({ ...kyc, county: e.target.value })} placeholder="Nairobi" /></div>
                  <div><label className={labelCls}>Curriculum</label>
                    <select className={inputCls} value={kyc.curriculum} onChange={(e) => setKyc({ ...kyc, curriculum: e.target.value })}>
                      <option value="CBC">CBC (Kenya)</option>
                      <option value="NECTA">NECTA (Tanzania)</option>
                      <option value="NCDC">NCDC (Uganda)</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div><label className={labelCls}>Full name (KYC)</label><input className={inputCls} value={kyc.name} onChange={(e) => setKyc({ ...kyc, name: e.target.value })} placeholder="Jane Wanjiku" /></div>
                <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={kyc.email} onChange={(e) => setKyc({ ...kyc, email: e.target.value })} placeholder="jane@example.com" /></div>
                <div><label className={labelCls}>Phone</label><input className={inputCls} value={kyc.phone} onChange={(e) => setKyc({ ...kyc, phone: e.target.value })} placeholder="2547XXXXXXXX" /></div>
                <div><label className={labelCls}>National ID (optional)</label><input className={inputCls} value={kyc.national_id} onChange={(e) => setKyc({ ...kyc, national_id: e.target.value })} placeholder="e.g. 12345678" /></div>
              </>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={back} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-body font-bold cursor-pointer flex items-center gap-1.5"><ArrowLeft size={14} /> Back</button>
              <button onClick={goPlan} className="flex-1 py-2.5 rounded-xl border-none cursor-pointer bg-emerald-600 text-white text-[13px] font-body font-black hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5">Continue <ArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Billing cycle</label>
              <div className="grid grid-cols-2 gap-2">
                {CYCLES.map((c) => {
                  const price = pricing?.cycles ? cycleTotal(pricing.cycles[c.k]) : null;
                  return (
                    <button key={c.k} onClick={() => setCycle(c.k)}
                      className={`py-2.5 px-3 rounded-xl border cursor-pointer text-left transition-colors ${cycle === c.k ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                      <div className="text-slate-900 text-[12px] font-body font-bold">{c.label}</div>
                      <div className="text-slate-500 text-[12px] font-body">{price != null ? fmt(price, pricing?.currency) : "—"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div><label className={labelCls}>M-Pesa phone to charge</label><input className={inputCls} value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="2547XXXXXXXX" /></div>
            <div className="bg-slate-50 rounded-xl p-3.5 text-[13px] font-body text-slate-600 flex items-center justify-between">
              <span>{TYPES.find((t) => t.k === type)?.label} · {CYCLES.find((c) => c.k === cycle)?.label}</span>
              <span className="text-slate-900 font-black">{selectedPrice != null ? fmt(selectedPrice, pricing?.currency) : "—"}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={back} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[13px] font-body font-bold cursor-pointer flex items-center gap-1.5"><ArrowLeft size={14} /> Back</button>
              <button disabled={busy} onClick={sell} className="flex-1 py-2.5 rounded-xl border-none cursor-pointer bg-emerald-600 text-white text-[13px] font-body font-black hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                <Smartphone size={15} /> {busy ? "Sending…" : "Send STK push"}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-6">
            {saleStatus === "pending" && (
              <>
                <Loader size={34} className="text-emerald-600 mx-auto mb-3 animate-spin" />
                <h4 className="text-slate-900 text-base font-heading font-black mb-1">Waiting for payment…</h4>
                <p className="text-slate-500 text-[13px] font-body">An M-Pesa prompt was sent to <b>{mpesaPhone}</b>. Ask the customer to enter their PIN to complete the sale.</p>
              </>
            )}
            {saleStatus === "completed" && (
              <>
                <CheckCircle size={38} className="text-emerald-600 mx-auto mb-3" />
                <h4 className="text-slate-900 text-base font-heading font-black mb-1">Sale complete!</h4>
                <p className="text-slate-500 text-[13px] font-body mb-5">{type === "school" ? `${kyc.school_name}'s school plan` : `${kyc.name}'s ${type} plan`} is active and credited to you.</p>
                <div className="flex gap-2">
                  <button onClick={() => { reset(); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-[13px] font-body font-bold cursor-pointer">New sale</button>
                  <button onClick={() => { onSold?.(); onClose(); }} className="flex-1 py-2.5 rounded-xl border-none bg-emerald-600 text-white text-[13px] font-body font-black cursor-pointer">Done</button>
                </div>
              </>
            )}
            {saleStatus === "failed" && (
              <>
                <AlertTriangle size={38} className="text-rose-500 mx-auto mb-3" />
                <h4 className="text-slate-900 text-base font-heading font-black mb-1">Payment not completed</h4>
                <p className="text-slate-500 text-[13px] font-body mb-5">The M-Pesa payment failed or was cancelled. You can try again.</p>
                <div className="flex gap-2">
                  <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-[13px] font-body font-bold cursor-pointer">Retry</button>
                  <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-none bg-slate-900 text-white text-[13px] font-body font-black cursor-pointer">Close</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
