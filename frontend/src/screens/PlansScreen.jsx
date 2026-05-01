"use client";
import { useState, useEffect } from "react";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost, apiGet } from "@/utils/api";
import { hasAuthToken } from "@/utils/auth";
import { PLANS } from "@/data/constants";
import { PLAN_ICONS, inputCls, btnAccent } from "@/shared/constants";
import { Spinner, Card, Badge } from "@/components/ui";
import {
  CreditCard, CheckCircle, Smartphone, Receipt, Download, Mail, X,
  GraduationCap,
} from "lucide-react";

function MpesaModal({ plan, onClose, onSuccess, lang }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [phone, setPhone] = useState("254");
  const [step, setStep] = useState("enter");
  const [err, setErr] = useState("");
  const initiate = () => { if (phone.length < 12) { setErr(lang === "sw" ? "Namba si sahihi" : "Invalid number"); return; } setErr(""); setStep("processing"); setTimeout(() => setStep("confirm"), 2500); };
  const confirm = () => { setStep("success"); setTimeout(() => { onSuccess(plan); onClose(); }, 2000); };
  return (
    <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-5">
      <div className="bg-white border border-slate-200 rounded-[20px] p-[22px] w-full max-w-[360px] shadow-xl">
        {step === "success" ? <div className="text-center py-[18px]"><CheckCircle size={52} className="text-emerald-500 mb-2.5" /><h3 className="text-emerald-500 font-heading font-black mb-1.5 mt-0">{t("payment_confirmed")}</h3><p className="text-slate-400 font-body text-xs">{t("activating")}</p></div>
        : step === "confirm" ? <div className="text-center"><Smartphone size={44} className="text-purple-600 mb-2.5" /><h3 className="text-slate-900 font-heading font-black mb-1.5 mt-0">{t("check_phone")}</h3><p className="text-slate-400 font-body text-xs mb-[18px]">{t("stk_sent")} <b className="text-purple-600">{phone}</b>. {t("enter_pin")} <b className="text-purple-600">KES {plan.price.toLocaleString()}</b>.</p><button onClick={confirm} className={`${btnAccent} mb-2`}>{t("pin_entered")}</button><button onClick={onClose} className="w-full py-2.5 rounded-[14px] border border-slate-200 cursor-pointer bg-transparent text-slate-400 text-xs font-body font-bold">{t("cancel")}</button></div>
        : step === "processing" ? <div className="text-center py-[18px]"><Spinner /><p className="text-slate-400 font-body text-xs mt-2.5">{lang === "sw" ? "Inatuma..." : "Sending STK push..."}</p></div>
        : <>
          <div className="flex justify-between items-center mb-4"><h3 className="text-slate-900 font-heading font-black m-0 text-lg">{t("mpesa_payment")}</h3><button onClick={onClose} className="bg-transparent border-none text-slate-400 cursor-pointer"><X size={22} /></button></div>
          <Card className="bg-emerald-50 border-emerald-500/20 mb-4"><p className="text-emerald-500 text-[11px] font-body font-extrabold mb-[3px] mt-0">{plan.name[lang] || plan.name.en}</p><p className="text-slate-900 text-[22px] font-body font-black m-0">KES {plan.price.toLocaleString()}<span className="text-xs text-slate-400"> / {plan.desc[lang] || plan.desc.en}</span></p></Card>
          <p className="text-slate-400 text-[11px] font-body mb-1.5 mt-0">{t("safaricom_number")}</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="254712345678" maxLength={12} className={`${inputCls} text-[15px] mb-1`} />
          {err && <p className="text-red-500 text-[11px] font-body mb-2">{err}</p>}
          <p className="text-slate-400 text-[10px] font-body mb-3.5 mt-0">{t("also_accepts")}</p>
          <button onClick={initiate} className={btnAccent}>{t("pay_mpesa")}</button>
        </>}
      </div>
    </div>
  );
}

export default function PlansScreen({ plan, setPlan, lang, user }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [mpesaTarget, setMpesaTarget] = useState(null);
  const [subInfo, setSubInfo] = useState(null);
  const [cycle, setCycle] = useState("monthly");
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const userRole = (user?.role === "admin" || user?.role === "super_admin") ? "school" : (user?.role || "student");
  useEffect(() => { apiGet("/api/payments/subscription-info").then((d) => setSubInfo(d)).catch(() => {}); if (hasAuthToken()) { apiGet("/api/payments/invoices").then((d) => setInvoices(d?.invoices || [])).catch(() => {}); apiGet("/api/payments/history").then((d) => setPayments(d?.payments || [])).catch(() => {}); } }, []);
  const CYCLE_LABELS = { monthly: { en: "Monthly", sw: "Kila Mwezi" }, quarterly: { en: "Quarterly", sw: "Robo Mwaka" }, semi_annual: { en: "Semi-Annual", sw: "Nusu Mwaka" }, annual: { en: "Annual", sw: "Kila Mwaka" } };
  return (
    <div className="px-[18px] pt-[22px] pb-[100px]">
      {mpesaTarget && <MpesaModal plan={mpesaTarget} onClose={() => setMpesaTarget(null)} onSuccess={(p) => setPlan(p.id)} lang={lang} />}
      <h2 className="text-slate-900 text-[22px] mb-1 mt-0 font-heading font-black flex items-center gap-2"><CreditCard size={22} className="text-purple-600" /> {t("plans_pricing")}</h2>
      <p className="text-slate-400 text-xs mb-3 mt-0 font-body">M-Pesa · Airtel Money · T-Kash</p>
      <div className="flex gap-1 mb-4 flex-wrap">
        {Object.entries(CYCLE_LABELS).map(([key, val]) => { const prc = subInfo?.pricing?.[userRole]?.[key]; return (
          <button key={key} onClick={() => setCycle(key)} className={`flex-1 min-w-[70px] py-1.5 px-1 rounded-[10px] cursor-pointer text-center border ${cycle === key ? "border-purple-600 bg-purple-50" : "border-slate-200 bg-transparent"}`}>
            <p className={`text-[10px] font-body font-extrabold m-0 ${cycle === key ? "text-purple-600" : "text-slate-400"}`}>{val[lang] || val.en}</p>
            {prc?.discount > 0 && <p className="text-emerald-500 text-[8px] font-body font-bold m-0">-{prc.discount}%</p>}
          </button>);
        })}
      </div>
      {PLANS.map((p) => {
        const prc = subInfo?.pricing?.[p.id === "family" ? "parent" : p.id]?.[cycle];
        const displayPrice = prc?.total || p.price * ({ monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 }[cycle] || 1);
        const PlanIcon = PLAN_ICONS[p.id] || GraduationCap;
        return (
          <Card key={p.id} className={`mb-3 relative overflow-hidden ${plan === p.id ? `border-[${p.color}]` : ""}`} hover style={plan === p.id ? { borderColor: p.color } : {}}>
            {p.popular && <div className="absolute top-3 right-3 bg-purple-600 rounded-[7px] px-2.5 py-[2px]"><span className="text-white text-[9px] font-body font-extrabold">{t("popular")}</span></div>}
            <div className="flex items-center gap-2 mb-1"><PlanIcon size={18} color={p.color} /><p className="text-[15px] m-0 font-body font-black" style={{ color: p.color }}>{p.name[lang] || p.name.en}</p></div>
            <p className="text-slate-900 text-xl mb-0.5 mt-0 font-body font-black">{p.price === 0 ? (lang === "sw" ? "Bure" : "Free") : `KES ${displayPrice.toLocaleString()}`}<span className="text-[11px] text-slate-400 font-semibold"> {p.price > 0 ? `/ ${CYCLE_LABELS[cycle]?.[lang] || cycle}` : ""}</span></p>
            {prc?.savings > 0 && <p className="text-emerald-500 text-[10px] font-body font-bold mb-2 mt-0">{lang === "sw" ? "Okoa" : "Save"} KES {prc.savings.toLocaleString()}</p>}
            <div className="mb-3">{(p.features[lang] || p.features.en).map((f) => (<p key={f} className="text-slate-500 text-[11px] font-body mb-[3px] mt-0 flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /> {f}</p>))}</div>
            {plan === p.id ? <div className="rounded-[10px] py-2 text-center" style={{ background: `${p.color}15` }}><span className="font-body font-extrabold text-xs" style={{ color: p.color }}>{t("current_plan")}</span></div>
            : <button onClick={() => p.price === 0 ? setPlan("free") : setMpesaTarget(p)} className={`w-full py-2.5 rounded-xl text-xs font-body font-extrabold cursor-pointer ${p.price === 0 ? "border border-slate-200 bg-transparent text-slate-900" : "border-none text-white"}`} style={p.price > 0 ? { background: p.color } : {}}>{p.price === 0 ? t("free_plan") : t("pay_mpesa")}</button>}
          </Card>
        );
      })}
      {invoices.length > 0 && <>
        <h3 className="text-slate-900 text-base font-heading font-black mt-5 mb-2.5 flex items-center gap-1.5"><Receipt size={18} /> {lang === "sw" ? "Ankara Zako" : "Your Invoices"}</h3>
        {invoices.map((inv) => (
          <Card key={inv.id} className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <div><p className="text-slate-900 text-xs font-body font-extrabold m-0">#{inv.invoice_number}</p><p className="text-slate-400 text-[10px] font-body m-0">{new Date(inv.created_at).toLocaleDateString()}</p></div>
              <div className="text-right"><p className="text-slate-900 text-[13px] font-body font-black m-0">KES {Number(inv.amount).toLocaleString()}</p><Badge color={inv.status === "paid" ? C.accent : C.gold}>{inv.status.toUpperCase()}</Badge></div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => window.open(`/api/payments/invoices/${inv.id}/pdf`, "_blank")} className="flex-1 py-[5px] rounded-lg border border-slate-200 bg-transparent text-purple-600 text-[10px] font-body font-bold cursor-pointer flex items-center justify-center gap-1"><Download size={12} /> PDF</button>
              <button onClick={async () => { try { const r = await apiPost(`/api/payments/invoices/${inv.id}/email`); alert(r?.message || "Sent!"); } catch (e) { alert(e?.message || "Failed"); } }} className="flex-1 py-[5px] rounded-lg border border-slate-200 bg-transparent text-teal-500 text-[10px] font-body font-bold cursor-pointer flex items-center justify-center gap-1"><Mail size={12} /> Email</button>
            </div>
          </Card>
        ))}
      </>}
      {payments.filter((p) => p.status === "completed").length > 0 && <>
        <h3 className="text-slate-900 text-base font-heading font-black mt-5 mb-2.5 flex items-center gap-1.5"><CreditCard size={18} className="text-emerald-500" /> {lang === "sw" ? "Risiti za Malipo" : "Payment Receipts"}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-slate-200">
              <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2 pr-3">{lang === "sw" ? "Tarehe" : "Date"}</th>
              <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2 pr-3">{lang === "sw" ? "Mpango" : "Plan"}</th>
              <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2 pr-3">{lang === "sw" ? "Kipindi" : "Cycle"}</th>
              <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2 pr-3">{lang === "sw" ? "Kiasi" : "Amount"}</th>
              <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2 pr-3">{lang === "sw" ? "Njia" : "Method"}</th>
              <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2">{lang === "sw" ? "Risiti" : "Receipt"}</th>
            </tr></thead>
            <tbody>
              {payments.filter((p) => p.status === "completed").map((p) => (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="py-2.5 pr-3 text-slate-600 text-[11px] font-body">{new Date(p.completed_at || p.created_at).toLocaleDateString()}</td>
                  <td className="py-2.5 pr-3 text-slate-900 text-[11px] font-body font-bold capitalize">{p.plan}</td>
                  <td className="py-2.5 pr-3 text-slate-500 text-[11px] font-body capitalize">{(p.billing_cycle || "monthly").replace("_", " ")}</td>
                  <td className="py-2.5 pr-3 text-slate-900 text-[11px] font-body font-bold">{p.currency || "KES"} {Number(p.amount).toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-slate-500 text-[11px] font-body uppercase">{p.method}</td>
                  <td className="py-2.5 text-purple-600 text-[11px] font-body font-bold">{p.mpesa_receipt || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
      {payments.filter((p) => p.status !== "completed").length > 0 && <>
        <h3 className="text-slate-500 text-sm font-heading font-bold mt-4 mb-2 flex items-center gap-1.5">{lang === "sw" ? "Malipo Mengine" : "Other Payments"}</h3>
        {payments.filter((p) => p.status !== "completed").map((p) => (
          <Card key={p.id} className="mb-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-900 text-xs font-body font-bold m-0 capitalize">{p.plan} — {(p.billing_cycle || "monthly").replace("_", " ")}</p>
                <p className="text-slate-400 text-[10px] font-body m-0">{new Date(p.created_at).toLocaleDateString()} · {p.method?.toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-900 text-xs font-body font-bold m-0">{p.currency || "KES"} {Number(p.amount).toLocaleString()}</p>
                <Badge color={p.status === "pending" ? C.gold : p.status === "failed" ? "#ef4444" : C.accent}>{p.status.toUpperCase()}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </>}
    </div>
  );
}
