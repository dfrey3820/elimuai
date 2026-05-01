"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { translations } from "@/i18n/translations";
import { apiPost } from "@/utils/api";
import { setTokens, hasAuthToken } from "@/utils/auth";
import { Spinner } from "@/components/ui";
import { GraduationCap, Mail, Lock, ArrowLeft, Languages, AlertTriangle, Eye, EyeOff, ShieldCheck, RotateCcw } from "lucide-react";

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
          className="w-12 h-14 text-center text-2xl font-heading font-black text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-colors duration-200 focus:border-purple-600 focus:bg-white" />
      ))}
    </div>
  );
}

export default function LoginPage({ lang, setLang, onLogin }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const router = useRouter();

  useEffect(() => { if (hasAuthToken()) router.replace("/dashboard"); }, [router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpPurpose, setOtpPurpose] = useState("login");
  const [otpEmail, setOtpEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleLogin = async () => {
    if (!email.trim()) { setError(lang === "sw" ? "Ingiza barua pepe au simu." : "Please enter your email or phone."); return; }
    if (!password) { setError(lang === "sw" ? "Ingiza nenosiri." : "Please enter your password."); return; }
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("/api/auth/login", { identifier: email.trim(), password });
      if (data?.requiresOTP) {
        setOtpStep(true);
        setOtpPurpose(data.purpose);
        setOtpEmail(data.email);
        setUserName(data.userName || "");
        setResendCooldown(60);
        return;
      }
      // Fallback: direct login (shouldn't happen with OTP enabled)
      setTokens(data);
      if (onLogin) onLogin(data?.user, data);
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message || (lang === "sw" ? "Imeshindwa kuingia" : "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length < 6) { setError(lang === "sw" ? "Ingiza msimbo kamili." : "Please enter the full 6-digit code."); return; }
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("/api/auth/verify-otp", { email: otpEmail, code: otpCode, purpose: otpPurpose });
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
      await apiPost("/api/auth/resend-otp", { email: otpEmail, purpose: otpPurpose });
      setResendCooldown(60);
      setOtpCode("");
    } catch (err) {
      setError(err?.message || "Failed to resend");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden md:flex w-1/2 bg-gradient-primary flex-col justify-center items-center p-10 relative overflow-hidden">
        <div className="absolute -top-[15%] -left-[10%] w-[45vw] h-[45vw] rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-[10%] -right-[8%] w-[35vw] h-[35vw] rounded-full bg-white/[0.03]" />
        <div className="relative z-[1] text-center max-w-[420px]">
          <GraduationCap size={64} className="text-white/90 mb-6" strokeWidth={1.5} />
          <h1 className="text-white text-[clamp(32px,4vw,44px)] font-heading font-black mb-3 leading-tight">ElimuAI</h1>
          <p className="text-white/60 text-[10px] font-body font-bold tracking-[3px] uppercase mb-8">{t("motto")}</p>
          <div className="rounded-[20px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-4 border-white/15 mb-8">
            <img src="https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?w=600&h=400&fit=crop&crop=faces" alt="Student learning" className="w-full h-[260px] object-cover block" />
          </div>
          <p className="text-white/75 text-base font-body font-semibold leading-relaxed">
            {lang === "sw" ? "Jifunze kwa njia ya kisasa na AI. Mitaala ya Kenya, Tanzania na Uganda." : "AI-powered learning for East Africa. Kenya CBC, Tanzania TIE & Uganda NCDC curricula."}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            {["\u{1F1F0}\u{1F1EA}", "\u{1F1F9}\u{1F1FF}", "\u{1F1FA}\u{1F1EC}"].map((f, i) => (
              <span key={i} className="text-2xl bg-white/[0.12] rounded-xl px-3 py-2">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-10 bg-white relative">
        <div className="absolute top-6 right-6">
          <button onClick={() => setLang((l) => (l === "en" ? "sw" : "en"))} className="bg-slate-50 border border-slate-200 rounded-[10px] px-3.5 py-1.5 cursor-pointer text-teal-500 text-xs font-body font-extrabold flex items-center gap-1.5">
            <Languages size={14} /> {lang === "en" ? "Kiswahili" : "English"}
          </button>
        </div>

        <div className="max-w-[420px] w-full mx-auto">
          {!otpStep ? (
            <>
              <h2 className="text-slate-900 text-[28px] font-heading font-black mb-2">
                {lang === "sw" ? "Karibu Tena!" : "Welcome Back!"}
              </h2>
              <p className="text-slate-600 text-[15px] font-body font-semibold mb-8">
                {lang === "sw" ? "Ingia kwa barua pepe na nenosiri lako." : "Sign in with your email and password."}
              </p>

              <div className="mb-5">
                <label className="flex items-center gap-1.5 text-slate-600 text-[13px] font-body font-bold mb-2">
                  <Mail size={15} /> {lang === "sw" ? "Barua Pepe au Simu" : "Email or Phone"}
                </label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && document.getElementById("pwd")?.focus()}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-[14px] px-4 py-3.5 text-slate-900 text-base font-body font-semibold outline-none transition-colors duration-200 focus:border-purple-600" />
              </div>

              <div className="mb-5">
                <label className="flex items-center gap-1.5 text-slate-600 text-[13px] font-body font-bold mb-2">
                  <Lock size={15} /> {lang === "sw" ? "Nenosiri" : "Password"}
                </label>
                <div className="relative">
                  <input id="pwd" type={showPwd ? "text" : "password"} value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-[14px] px-4 py-3.5 pr-12 text-slate-900 text-base font-body font-semibold outline-none transition-colors duration-200 focus:border-purple-600" />
                  <button onClick={() => setShowPwd(!showPwd)} type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-400 p-0">
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-[13px] font-body font-bold mb-4 px-3.5 py-2.5 bg-rose-50 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} /> {error}
                </p>
              )}

              <button onClick={handleLogin} disabled={loading} className={`w-full py-[15px] rounded-[14px] border-none cursor-pointer bg-gradient-primary text-white text-base font-body font-extrabold shadow-[0_4px_14px_rgba(37,99,235,0.25)] mb-6 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}>
                {loading ? <Spinner color="#fff" size={6} /> : (lang === "sw" ? "Ingia" : "Sign In")}
              </button>
            </>
          ) : (
            /* OTP Verification Step */
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} color="#fff" />
                </div>
                <h2 className="text-slate-900 text-[26px] font-heading font-black mb-2">
                  {lang === "sw" ? "Thibitisha Utambulisho" : "Verify Your Identity"}
                </h2>
                <p className="text-slate-500 text-sm font-body">
                  {lang === "sw" ? "Tumetuma msimbo wa tarakimu 6 kwa" : "We sent a 6-digit code to"}
                </p>
                <p className="text-purple-600 text-sm font-body font-extrabold mt-1">{otpEmail}</p>
                {userName && <p className="text-slate-400 text-xs font-body mt-1">{lang === "sw" ? "Karibu tena" : "Welcome back"}, {userName}!</p>}
              </div>

              <OTPInput value={otpCode} onChange={(v) => { setOtpCode(v); setError(""); }} />

              {error && (
                <p className="text-red-500 text-[13px] font-body font-bold mt-4 mb-0 px-3.5 py-2.5 bg-rose-50 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} /> {error}
                </p>
              )}

              <button onClick={handleVerifyOTP} disabled={loading || otpCode.length < 6}
                className={`w-full py-[15px] rounded-[14px] border-none cursor-pointer bg-gradient-primary text-white text-base font-body font-extrabold shadow-[0_4px_14px_rgba(37,99,235,0.25)] mt-6 ${(loading || otpCode.length < 6) ? "opacity-60 cursor-not-allowed" : ""}`}>
                {loading ? <Spinner color="#fff" size={6} /> : (lang === "sw" ? "Thibitisha" : "Verify & Sign In")}
              </button>

              <div className="text-center mt-5">
                <p className="text-slate-400 text-xs font-body mb-2">{lang === "sw" ? "Hukupokea msimbo?" : "Didn't receive the code?"}</p>
                <button onClick={handleResend} disabled={resendCooldown > 0}
                  className={`bg-transparent border-none text-sm font-body font-extrabold cursor-pointer inline-flex items-center gap-1 ${resendCooldown > 0 ? "text-slate-300 cursor-not-allowed" : "text-purple-600"}`}>
                  <RotateCcw size={14} /> {resendCooldown > 0 ? `${lang === "sw" ? "Tuma tena" : "Resend"} (${resendCooldown}s)` : (lang === "sw" ? "Tuma Tena" : "Resend Code")}
                </button>
              </div>

              <button onClick={() => { setOtpStep(false); setOtpCode(""); setError(""); }}
                className="w-full mt-4 py-2.5 rounded-[14px] border-2 border-slate-200 bg-transparent text-slate-500 text-sm font-body font-bold cursor-pointer flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> {lang === "sw" ? "Rudi" : "Back to Login"}
              </button>
            </>
          )}

          {!otpStep && (
            <>
              <div className="flex items-center gap-3 my-7">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-slate-400 text-xs font-body font-bold">{lang === "sw" ? "au" : "or"}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="text-center">
                <p className="text-slate-600 text-sm font-body mb-4">
                  {lang === "sw" ? "Huna akaunti?" : "Don't have an account?"}{" "}
                  <Link href="/register" className="text-purple-600 font-extrabold no-underline">{t("sign_up")}</Link>
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
