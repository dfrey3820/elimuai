"use client";
import { useState, useEffect, useRef } from "react";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost, apiGet } from "@/utils/api";
import { hasAuthToken, getAuthToken } from "@/utils/auth";
import { inputCls, btnAccent } from "@/shared/constants";
import { Spinner, Card, Badge, SecTitle } from "@/components/ui";
import {
  CreditCard, CheckCircle, Smartphone, Receipt, Tag,
  Mail, Download, AlertTriangle,
} from "lucide-react";

export default function BillingScreen({ user, lang, onPaid }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [subInfo, setSubInfo] = useState(null);
  const [phone, setPhone] = useState(user?.phone || "254");
  const [step, setStep] = useState("choose");
  const [err, setErr] = useState("");
  const [paymentId, setPaymentId] = useState(null);
  const [cycle, setCycle] = useState("monthly");
  const [invoices, setInvoices] = useState([]);
  const [showInvoices, setShowInvoices] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponErr, setCouponErr] = useState("");
  const pollRef = useRef(null);
  const userRole = (user?.role === "admin" || user?.role === "super_admin") ? "school" : (user?.role || "student");
  useEffect(() => { apiGet("/api/payments/subscription-info").then((d) => setSubInfo(d)).catch(() => setSubInfo(null)); if (hasAuthToken()) apiGet("/api/payments/invoices").then((d) => setInvoices(d?.invoices || [])).catch(() => {}); }, []);
  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);
  const pricing = subInfo?.pricing?.[userRole];
  const selected = pricing?.[cycle];
  const baseAmount = selected?.total || subInfo?.plans?.[userRole]?.amount || 299;
  const couponDiscount = couponResult?.discount || 0;
  const amount = couponResult?.finalAmount != null ? couponResult.finalAmount : baseAmount;
  const savings = selected?.savings || 0;
  const discount = selected?.discount || 0;
  const validateCoupon = async () => {
    if (!couponCode.trim()) { setCouponErr(lang === "sw" ? "Ingiza msimbo" : "Enter code"); return; }
    setCouponLoading(true); setCouponErr(""); setCouponResult(null);
    try { const data = await apiPost("/api/coupons/validate", { code: couponCode.trim(), plan: userRole, billing_cycle: cycle, amount: baseAmount }); setCouponResult(data); }
    catch (e) { setCouponErr(e?.message || "Invalid"); setCouponResult(null); }
    finally { setCouponLoading(false); }
  };
  useEffect(() => { if (couponResult && couponCode) validateCoupon(); }, [cycle]);
  const CYCLE_LABELS = { monthly: { en: "Monthly", sw: "Kila Mwezi", months: 1 }, quarterly: { en: "Quarterly", sw: "Robo Mwaka", months: 3 }, semi_annual: { en: "Semi-Annual", sw: "Nusu Mwaka", months: 6 }, annual: { en: "Annual", sw: "Kila Mwaka", months: 12 } };
  const initiatePay = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!/^254\d{9}$/.test(cleanPhone)) { setErr(lang === "sw" ? "Namba si sahihi" : "Invalid number"); return; }
    setErr(""); setStep("processing");
    try {
      const payload = { plan: userRole, phone: cleanPhone, billing_cycle: cycle };
      if (couponCode.trim()) payload.coupon_code = couponCode.trim();
      const data = await apiPost("/api/payments/mpesa/initiate", payload);
      if (data?.paymentId) {
        setPaymentId(data.paymentId); setStep("polling");
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const st = await apiGet(`/api/payments/status/${data.paymentId}`);
            if (st?.payment?.status === "completed") { clearInterval(pollRef.current); pollRef.current = null; setStep("success"); apiGet("/api/payments/invoices").then((d) => setInvoices(d?.invoices || [])).catch(() => {}); setTimeout(() => onPaid(), 2500); }
            else if (st?.payment?.status === "failed") { clearInterval(pollRef.current); pollRef.current = null; setStep("error"); setErr(lang === "sw" ? "Malipo yameshindikana." : "Payment failed."); }
            else if (attempts >= 24) { clearInterval(pollRef.current); pollRef.current = null; setStep("error"); setErr(lang === "sw" ? "Muda umekwisha." : "Timed out."); }
          } catch { if (attempts >= 24) { clearInterval(pollRef.current); pollRef.current = null; setStep("error"); setErr("Check failed."); } }
        }, 5000);
      }
    } catch (e) { setStep("error"); setErr(e?.message || "Failed"); }
  };
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${step === "success" ? "bg-emerald-50" : step === "error" ? "bg-rose-50" : "bg-purple-50"}`}>
            {step === "success" ? <CheckCircle size={32} className="text-emerald-500" /> : step === "error" ? <AlertTriangle size={32} className="text-red-500" /> : <CreditCard size={32} className="text-purple-600" />}
          </div>
          <h1 className="text-slate-900 text-2xl font-heading font-black mb-1.5 mt-0">{step === "success" ? (lang === "sw" ? "Malipo Yamekubaliwa!" : "Payment Confirmed!") : (lang === "sw" ? "Kipindi cha Bure Kimeisha" : "Free Trial Ended")}</h1>
          {step !== "success" && <p className="text-slate-400 text-xs font-body m-0">{lang === "sw" ? "Chagua mpango" : "Choose a plan to continue"}</p>}
        </div>
        {step === "success" ? <Card className="text-center p-6"><CheckCircle size={32} className="text-emerald-500 mb-2" /><p className="text-emerald-500 text-base font-body font-extrabold mb-2 mt-0">{lang === "sw" ? "Akaunti imeamilishwa!" : "Account activated!"}</p><p className="text-slate-400 text-xs font-body m-0">{lang === "sw" ? "Inaelekeza..." : "Redirecting..."}</p></Card>
        : step === "polling" ? <Card className="text-center p-6"><Spinner /><div className="flex items-center justify-center gap-1.5 mt-3 mb-1.5"><Smartphone size={18} className="text-purple-600" /><p className="text-purple-600 text-sm font-body font-extrabold m-0">{lang === "sw" ? "Angalia simu" : "Check your phone"}</p></div><p className="text-slate-400 text-xs font-body mb-2 mt-0">{lang === "sw" ? "Ingiza PIN" : "Enter M-Pesa PIN"}</p><p className="text-slate-900 text-base font-body font-black">KES {amount.toLocaleString()}</p></Card>
        : step === "processing" ? <Card className="text-center p-6"><Spinner /><p className="text-slate-400 text-xs font-body mt-2.5 mb-0">{lang === "sw" ? "Inatuma..." : "Sending STK push..."}</p></Card>
        : (<>
          <Card className="mb-3.5">
            <p className="text-slate-900 text-[13px] font-body font-extrabold mb-2.5 mt-0">{lang === "sw" ? "Chagua Mpango" : "Choose Billing Cycle"}</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CYCLE_LABELS).map(([key, val]) => { const cp = pricing?.[key]; const isActive = cycle === key; return (
                <button key={key} onClick={() => setCycle(key)} className={`py-2.5 px-2 rounded-xl cursor-pointer text-center relative overflow-hidden border-2 ${isActive ? "border-purple-600 bg-purple-50" : "border-slate-200 bg-white"}`}>
                  {cp?.discount > 0 && <div className="absolute top-0 right-0 bg-emerald-500 rounded-[0_10px_0_8px] px-2 py-[2px]"><span className="text-white text-[8px] font-body font-extrabold">-{cp.discount}%</span></div>}
                  <p className={`text-[11px] font-body font-extrabold mb-1 mt-0 ${isActive ? "text-purple-600" : "text-slate-900"}`}>{val[lang] || val.en}</p>
                  <p className={`text-base font-body font-black mb-0.5 mt-0 ${isActive ? "text-slate-900" : "text-slate-400"}`}>KES {(cp?.total || amount).toLocaleString()}</p>
                  {cp?.savings > 0 && <p className="text-emerald-500 text-[9px] font-body font-bold m-0">{lang === "sw" ? "Okoa" : "Save"} KES {cp.savings.toLocaleString()}</p>}
                </button>);
              })}
            </div>
          </Card>
          <Card className="mb-3.5">
            <div className="bg-purple-50 rounded-xl p-3.5 mb-3.5 text-center">
              <p className="text-purple-600 text-[28px] font-body font-black mb-1 mt-0">KES {amount.toLocaleString()}<span className="text-xs text-slate-400 font-semibold"> / {CYCLE_LABELS[cycle]?.[lang] || cycle}</span></p>
              {discount > 0 && <p className="text-emerald-500 text-[11px] font-body font-bold mb-1 mt-0">{discount}% {lang === "sw" ? "punguzo" : "discount"}</p>}
              {couponDiscount > 0 && <p className="text-emerald-500 text-[11px] font-body font-bold mb-1 mt-0">Coupon: -KES {couponDiscount.toLocaleString()}</p>}
            </div>
            <div className="mb-3">
              {[lang === "sw" ? "AI Tutor bila kikomo" : "Unlimited AI Tutor", lang === "sw" ? "Mitihani ya zamani" : "Past paper exams", lang === "sw" ? "Ripoti za kila wiki" : "Weekly reports", lang === "sw" ? "Ankara kwa email" : "Invoice emailed"].map((f) => (
                <p key={f} className="text-slate-900 text-xs font-body mb-1.5 mt-0 flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500" /> {f}</p>
              ))}
            </div>
          </Card>
          <Card className="mb-3.5">
            <p className="text-slate-400 text-[11px] font-body font-bold mb-1.5 mt-0 flex items-center gap-1"><Tag size={14} /> {lang === "sw" ? "Msimbo wa Punguzo" : "Coupon Code"}</p>
            <div className="flex gap-2">
              <input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (couponResult) { setCouponResult(null); setCouponErr(""); } }} placeholder="e.g. SAVE20" className={`flex-1 ${inputCls} ${couponResult ? "border-emerald-500" : ""}`} />
              <button onClick={validateCoupon} disabled={couponLoading} className={`px-4 py-2.5 rounded-xl border-none cursor-pointer bg-slate-50 text-purple-600 text-xs font-body font-extrabold shrink-0 ${couponLoading ? "opacity-60" : ""}`}>{couponLoading ? "..." : (lang === "sw" ? "Thibitisha" : "Apply")}</button>
            </div>
            {couponResult && <p className="text-emerald-500 text-[11px] font-body font-bold mt-1.5 mb-0">{couponResult.coupon.description || couponResult.coupon.code}: -KES {couponResult.discount.toLocaleString()}</p>}
            {couponErr && <p className="text-red-500 text-[11px] font-body mt-1.5 mb-0">{couponErr}</p>}
          </Card>
          <Card className="mb-3.5">
            <p className="text-slate-400 text-[11px] font-body font-bold mb-1.5 mt-0 flex items-center gap-1"><Smartphone size={14} /> {lang === "sw" ? "Namba ya Safaricom" : "Safaricom Number"}</p>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="254712345678" maxLength={12} className={`${inputCls} text-base mb-1`} />
            {err && <p className="text-red-500 text-[11px] font-body mt-1 mb-0">{err}</p>}
          </Card>
          <button onClick={initiatePay} className={`${btnAccent} mb-2.5`}><CreditCard size={18} /> {lang === "sw" ? "Lipa" : "Pay"} KES {amount.toLocaleString()}</button>
          {step === "error" && <button onClick={() => { setStep("choose"); setErr(""); }} className="w-full py-2.5 rounded-xl border border-slate-200 cursor-pointer bg-transparent text-slate-400 text-xs font-body font-bold">{lang === "sw" ? "Jaribu tena" : "Try Again"}</button>}
          {invoices.length > 0 && <>
            <button onClick={() => setShowInvoices(!showInvoices)} className="w-full py-2.5 rounded-xl border border-slate-200 cursor-pointer bg-slate-50 text-slate-900 text-xs font-body font-bold mt-2 flex items-center justify-center gap-1.5"><Receipt size={14} /> {showInvoices ? (lang === "sw" ? "Ficha Ankara" : "Hide Invoices") : (lang === "sw" ? "Ona Ankara" : "View Invoices")} ({invoices.length})</button>
            {showInvoices && invoices.map((inv) => (
              <Card key={inv.id} className="mt-2">
                <div className="flex justify-between items-center mb-1.5">
                  <div><p className="text-slate-900 text-xs font-body font-extrabold m-0">#{inv.invoice_number}</p><p className="text-slate-400 text-[10px] font-body m-0">{new Date(inv.created_at).toLocaleDateString()}</p></div>
                  <div className="text-right"><p className="text-slate-900 text-sm font-body font-black m-0">KES {Number(inv.amount).toLocaleString()}</p><Badge color={inv.status === "paid" ? C.accent : C.gold}>{inv.status.toUpperCase()}</Badge></div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => { const token = getAuthToken(); window.open(`/api/payments/invoices/${inv.id}/pdf?token=${token}`, "_blank"); }} className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-transparent text-purple-600 text-[10px] font-body font-bold cursor-pointer flex items-center justify-center gap-1"><Download size={12} /> PDF</button>
                  <button onClick={async () => { try { const r = await apiPost(`/api/payments/invoices/${inv.id}/email`); alert(r?.message || "Sent!"); } catch (e) { alert(e?.message || "Failed"); } }} className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-transparent text-teal-500 text-[10px] font-body font-bold cursor-pointer flex items-center justify-center gap-1"><Mail size={12} /> Email</button>
                </div>
              </Card>
            ))}
          </>}
        </>)}
      </div>
    </div>
  );
}
