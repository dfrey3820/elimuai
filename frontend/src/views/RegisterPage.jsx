"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { translations } from "@/i18n/translations";
import { apiPost } from "@/utils/api";
import { setTokens, hasAuthToken } from "@/utils/auth";
import { Spinner } from "@/components/ui";
import {
  GraduationCap, Users, Heart, School,
  User, Mail, Globe, ArrowLeft, ArrowRight,
  Languages, AlertTriangle, Lock, Eye, EyeOff,
  ShieldCheck, RotateCcw,
} from "lucide-react";

const ROLES = [
  { id: "student", icon: <GraduationCap size={28} />, en: "Student", sw: "Mwanafunzi" },
  { id: "teacher", icon: <Users size={28} />, en: "Teacher", sw: "Mwalimu" },
  { id: "parent", icon: <Heart size={28} />, en: "Parent", sw: "Mzazi" },
  { id: "admin", icon: <School size={28} />, en: "School Admin", sw: "Msimamizi" },
];

function OTPInput({ length = 6, value, onChange }) {
  const inputs = useRef([]);
  const handleChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const arr = value.split("");
    arr[i] = v.slice(-1);
    const next = arr.join("").slice(0, length);
    onChange(next);
    if (v && i < length - 1) inputs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) inputs.current[i - 1]?.focus();
  };
  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (paste.length) { onChange(paste); inputs.current[Math.min(paste.length, length - 1)]?.focus(); e.preventDefault(); }
  };
  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input key={i} ref={(el) => (inputs.current[i] = el)} type="text" inputMode="numeric" maxLength={1}
          value={value[i] || ""} onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-2xl font-heading font-black text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-colors duration-200 focus:border-emerald-500 focus:bg-white" />
      ))}
    </div>
  );
}

export default function RegisterPage({ lang, setLang, onLogin }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const router = useRouter();

  useEffect(() => { if (hasAuthToken()) router.replace("/dashboard"); }, [router]);

  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [country, setCountry] = useState("KE");
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRegister = async () => {
    if (!name.trim()) { setError(lang === "sw" ? "Ingiza jina lako." : "Please enter your name."); return; }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(lang === "sw" ? "Ingiza barua pepe sahihi." : "Please enter a valid email."); return;
    }
    if (password.length < 6) {
      setError(lang === "sw" ? "Nenosiri lazima liwe na herufi 6+." : "Password must be at least 6 characters."); return;
    }
    if (role === "admin" && !schoolName.trim()) {
      setError(lang === "sw" ? "Ingiza jina la shule." : "Please enter school name."); return;
    }
    setLoading(true);
    setError("");
    try {
      const body = { name: name.trim(), email: email.trim(), password, role, country };
      if (role === "admin" && schoolName.trim()) body.school_name = schoolName.trim();
      const data = await apiPost("/api/auth/register", body);

      if (data?.requiresOTP) {
        setOtpEmail(data.user?.email || email.trim());
        setResendCooldown(60);
        setStep(3); // Go to OTP verification step
        return;
      }

      // Fallback: direct registration (shouldn't happen with OTP enabled)
      setTokens(data);
      if (onLogin) onLogin(data?.user, data);
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message || (lang === "sw" ? "Usajili umeshindwa" : "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length < 6) { setError(lang === "sw" ? "Ingiza msimbo kamili." : "Please enter the full 6-digit code."); return; }
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("/api/auth/verify-otp", { email: otpEmail, code: otpCode, purpose: "signup" });
      if (data?.verified && data?.accessToken) {
        setTokens(data);
        if (onLogin) onLogin(data?.user, data);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err?.message || (lang === "sw" ? "Msimbo si sahihi" : "Invalid code"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await apiPost("/api/auth/resend-otp", { email: otpEmail, purpose: "signup" });
      setResendCooldown(60);
      setOtpCode("");
    } catch (err) {
      setError(err?.message || "Failed to resend");
    }
  };

  const inputCls = "w-full bg-slate-50 border-2 border-slate-200 rounded-[14px] px-4 py-3.5 text-slate-900 text-base font-body font-semibold outline-none transition-colors duration-200 focus:border-purple-600";

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden md:flex w-1/2 bg-gradient-register flex-col justify-center items-center p-10 relative overflow-hidden">
        <div className="absolute -top-[15%] -right-[10%] w-[45vw] h-[45vw] rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-[10%] -left-[8%] w-[35vw] h-[35vw] rounded-full bg-white/[0.03]" />
        <div className="relative z-[1] text-center max-w-[420px]">
          <GraduationCap size={64} className="text-white/90 mb-6" strokeWidth={1.5} />
          <h1 className="text-white text-[clamp(32px,4vw,44px)] font-heading font-black mb-3 leading-tight">
            {lang === "sw" ? "Jiunge na ElimuAI" : "Join ElimuAI"}
          </h1>
          <p className="text-white/60 text-[10px] font-body font-bold tracking-[3px] uppercase mb-8">{t("motto")}</p>
          <div className="rounded-[20px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-4 border-white/15 mb-8">
            <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop&crop=faces" alt="Students learning" className="w-full h-[260px] object-cover block" />
          </div>
          <p className="text-white/75 text-base font-body font-semibold leading-relaxed">
            {lang === "sw" ? "Anzisha safari yako ya kujifunza leo. Akaunti ya bure inajumuisha maswali 5 ya AI kila siku." : "Start your learning journey today. Free accounts include 5 AI questions per day."}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            {["\u{1F1F0}\u{1F1EA}", "\u{1F1F9}\u{1F1FF}", "\u{1F1FA}\u{1F1EC}"].map((f, i) => (
              <span key={i} className="text-2xl bg-white/[0.12] rounded-xl px-3 py-2">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-10 bg-white relative overflow-y-auto">
        <div className="absolute top-6 right-6">
          <button onClick={() => setLang((l) => (l === "en" ? "sw" : "en"))} className="bg-slate-50 border border-slate-200 rounded-[10px] px-3.5 py-1.5 cursor-pointer text-teal-500 text-xs font-body font-extrabold flex items-center gap-1.5">
            <Languages size={14} /> {lang === "en" ? "Kiswahili" : "English"}
          </button>
        </div>

        <div className="max-w-[460px] w-full mx-auto">
          {/* Progress bar */}
          <div className="flex gap-1.5 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded transition-colors duration-300 ${step >= s ? "bg-gradient-accent" : "bg-slate-50"}`} />
            ))}
          </div>

          {/* Step 1: Role */}
          {step === 1 && (<>
            <h2 className="text-slate-900 text-[26px] font-heading font-black mb-1">
              {lang === "sw" ? "Wewe ni nani?" : "Who are you?"}
            </h2>
            <p className="text-slate-600 text-sm font-body font-semibold mb-7">
              {lang === "sw" ? "Chagua nafasi yako ili tupate kukutengenezea uzoefu bora." : "Choose your role so we can tailor the best experience for you."}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {ROLES.map((r) => (
                <button key={r.id} onClick={() => setRole(r.id)} className={`rounded-2xl px-3 py-5 cursor-pointer text-center transition-all duration-200 ${
                  role === r.id ? "bg-purple-600/[0.06] border-2 border-purple-600" : "bg-slate-50 border-2 border-slate-200"
                }`}>
                  <div className={`mb-2 flex justify-center ${role === r.id ? "text-purple-600" : "text-slate-600"}`}>{r.icon}</div>
                  <span className={`text-sm font-body font-extrabold ${role === r.id ? "text-purple-600" : "text-slate-900"}`}>{r[lang] || r.en}</span>
                </button>
              ))}
            </div>
            <button onClick={() => role && setStep(2)} disabled={!role} className={`w-full py-3.5 rounded-[14px] border-none text-base font-body font-extrabold flex items-center justify-center gap-2 ${
              role ? "cursor-pointer bg-gradient-accent text-white shadow-[0_4px_14px_rgba(16,185,129,0.25)]" : "cursor-not-allowed bg-slate-50 text-slate-400"
            }`}>
              {t("continue")} <ArrowRight size={16} />
            </button>
          </>)}

          {/* Step 2: Details */}
          {step === 2 && (<>
            <h2 className="text-slate-900 text-[26px] font-heading font-black mb-1">
              {lang === "sw" ? "Maelezo yako" : "Your Details"}
            </h2>
            <p className="text-slate-600 text-sm font-body font-semibold mb-7">
              {lang === "sw" ? "Jaza maelezo yako kuunda akaunti." : "Fill in your details to create an account."}
            </p>

            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-slate-600 text-[13px] font-body font-bold mb-2"><User size={15} /> {lang === "sw" ? "Jina Kamili" : "Full Name"}</label>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder={lang === "sw" ? "Jina lako" : "Your full name"} className={inputCls} />
            </div>
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-slate-600 text-[13px] font-body font-bold mb-2"><Mail size={15} /> {t("enter_email")}</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" className={inputCls} />
            </div>
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-slate-600 text-[13px] font-body font-bold mb-2"><Lock size={15} /> {lang === "sw" ? "Nenosiri" : "Password"}</label>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder={lang === "sw" ? "Angalau herufi 6" : "At least 6 characters"} className={`${inputCls} pr-12`} />
                <button onClick={() => setShowPwd(!showPwd)} type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-400 p-0">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-slate-600 text-[13px] font-body font-bold mb-2"><Globe size={15} /> {lang === "sw" ? "Nchi" : "Country"}</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={`${inputCls} cursor-pointer appearance-auto`}>
                <option value="KE">{"\u{1F1F0}\u{1F1EA}"} Kenya</option>
                <option value="TZ">{"\u{1F1F9}\u{1F1FF}"} Tanzania</option>
                <option value="UG">{"\u{1F1FA}\u{1F1EC}"} Uganda</option>
              </select>
            </div>
            {role === "admin" && (
              <div className="mb-4">
                <label className="flex items-center gap-1.5 text-slate-600 text-[13px] font-body font-bold mb-2"><School size={15} /> {lang === "sw" ? "Jina la Shule" : "School Name"}</label>
                <input type="text" value={schoolName} onChange={(e) => { setSchoolName(e.target.value); setError(""); }} placeholder={lang === "sw" ? "Jina la shule yako" : "Your school name"} className={inputCls} />
              </div>
            )}

            {error && (
              <p className="text-red-500 text-[13px] font-body font-bold mb-4 px-3.5 py-2.5 bg-rose-50 rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} /> {error}
              </p>
            )}

            <div className="flex gap-3 mt-2">
              <button onClick={() => { setStep(1); setError(""); }} className="shrink-0 px-5 py-3.5 rounded-[14px] border-2 border-slate-200 cursor-pointer bg-transparent text-slate-600 text-[15px] font-body font-bold flex items-center gap-1">
                <ArrowLeft size={16} />
              </button>
              <button onClick={handleRegister} disabled={loading} className={`flex-1 py-3.5 rounded-[14px] border-none bg-gradient-accent text-white text-base font-body font-extrabold shadow-[0_4px_14px_rgba(16,185,129,0.25)] ${loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}>
                {loading ? <Spinner color="#fff" size={6} /> : (lang === "sw" ? "Jisajili" : "Create Account")}
              </button>
            </div>
          </>)}

          {/* Step 3: OTP Verification */}
          {step === 3 && (<>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} color="#fff" />
              </div>
              <h2 className="text-slate-900 text-[26px] font-heading font-black mb-2">
                {lang === "sw" ? "Thibitisha Barua Pepe" : "Verify Your Email"}
              </h2>
              <p className="text-slate-500 text-sm font-body">
                {lang === "sw" ? "Tumetuma msimbo wa tarakimu 6 kwa" : "We sent a 6-digit verification code to"}
              </p>
              <p className="text-emerald-600 text-sm font-body font-extrabold mt-1">{otpEmail}</p>
            </div>

            <OTPInput value={otpCode} onChange={(v) => { setOtpCode(v); setError(""); }} />

            {error && (
              <p className="text-red-500 text-[13px] font-body font-bold mt-4 mb-0 px-3.5 py-2.5 bg-rose-50 rounded-xl flex items-center gap-2">
                <AlertTriangle size={16} /> {error}
              </p>
            )}

            <button onClick={handleVerifyOTP} disabled={loading || otpCode.length < 6}
              className={`w-full py-[15px] rounded-[14px] border-none cursor-pointer bg-gradient-accent text-white text-base font-body font-extrabold shadow-[0_4px_14px_rgba(16,185,129,0.25)] mt-6 ${(loading || otpCode.length < 6) ? "opacity-60 cursor-not-allowed" : ""}`}>
              {loading ? <Spinner color="#fff" size={6} /> : (lang === "sw" ? "Thibitisha na Endelea" : "Verify & Continue")}
            </button>

            <div className="text-center mt-5">
              <p className="text-slate-400 text-xs font-body mb-2">{lang === "sw" ? "Hukupokea msimbo?" : "Didn't receive the code?"}</p>
              <button onClick={handleResend} disabled={resendCooldown > 0}
                className={`bg-transparent border-none text-sm font-body font-extrabold cursor-pointer inline-flex items-center gap-1 ${resendCooldown > 0 ? "text-slate-300 cursor-not-allowed" : "text-emerald-600"}`}>
                <RotateCcw size={14} /> {resendCooldown > 0 ? `${lang === "sw" ? "Tuma tena" : "Resend"} (${resendCooldown}s)` : (lang === "sw" ? "Tuma Tena" : "Resend Code")}
              </button>
            </div>

            <button onClick={() => { setStep(2); setOtpCode(""); setError(""); }}
              className="w-full mt-4 py-2.5 rounded-[14px] border-2 border-slate-200 bg-transparent text-slate-500 text-sm font-body font-bold cursor-pointer flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> {lang === "sw" ? "Rudi" : "Back"}
            </button>
          </>)}

          {/* Divider + login link */}
          {step !== 3 && (
            <>
              <div className="flex items-center gap-3 my-7">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-slate-400 text-xs font-body font-bold">{lang === "sw" ? "au" : "or"}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="text-center">
                <p className="text-slate-600 text-sm font-body mb-4">
                  {lang === "sw" ? "Tayari una akaunti?" : "Already have an account?"}{" "}
                  <Link href="/login" className="text-purple-600 font-extrabold no-underline">{t("sign_in")}</Link>
                </p>
                <Link href="/" className="text-slate-400 text-[13px] font-body font-bold no-underline inline-flex items-center gap-1">
                  <ArrowLeft size={14} /> {lang === "sw" ? "Rudi Nyumbani" : "Back to Home"}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
