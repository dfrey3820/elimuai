"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, font } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost } from "@/utils/api";
import { setTokens } from "@/utils/auth";
import { Spinner } from "@/components/ui";
import { GraduationCap, Mail, MailOpen, ArrowLeft, Languages, AlertTriangle } from "lucide-react";

export default function LoginPage({ lang, setLang, onLogin }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const router = useRouter();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(lang === "sw" ? "Ingiza barua pepe sahihi." : "Please enter a valid email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/api/auth/send-otp", { email: email.trim(), type: "login" });
      setStep("otp");
      startResendTimer();
    } catch (err) {
      setError(err?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setError(lang === "sw" ? "Ingiza msimbo wa nambari 6." : "Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("/api/auth/verify-otp", { email: email.trim(), otp, type: "login" });
      setTokens(data);
      if (onLogin) onLogin(data?.user, data);
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError("");
    try {
      await apiPost("/api/auth/send-otp", { email: email.trim(), type: "login" });
      startResendTimer();
    } catch (err) {
      setError(err?.message || "Failed to resend");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: C.surface,
    border: `2px solid ${C.border}`,
    borderRadius: 14,
    padding: "14px 16px",
    color: C.text,
    fontSize: 16,
    fontFamily: font.body,
    fontWeight: 600,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* Left panel: Branding */}
      <div style={{
        flex: "0 0 50%",
        background: C.gradientPrimary,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 40px",
        position: "relative",
        overflow: "hidden",
      }} className="auth-left-panel">
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "45vw", height: "45vw", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-8%", width: "35vw", height: "35vw", borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420 }}>
          <GraduationCap size={64} color="rgba(255,255,255,0.9)" strokeWidth={1.5} style={{ marginBottom: 24 }} />
          <h1 style={{ color: C.white, fontSize: "clamp(32px, 4vw, 44px)", fontFamily: font.heading, fontWeight: 900, margin: "0 0 12px", lineHeight: 1.2 }}>
            ElimuAI
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: font.body, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 32px" }}>
            {t("motto")}
          </p>
          <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: "4px solid rgba(255,255,255,0.15)", marginBottom: 32 }}>
            <img src="https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?w=600&h=400&fit=crop&crop=faces" alt="Student learning" style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, fontFamily: font.body, fontWeight: 600, lineHeight: 1.7, margin: 0 }}>
            {lang === "sw" ? "Jifunze kwa njia ya kisasa na AI. Mitaala ya Kenya, Tanzania na Uganda." : "AI-powered learning for East Africa. Kenya CBC, Tanzania TIE & Uganda NCDC curricula."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
            {["\u{1F1F0}\u{1F1EA}", "\u{1F1F9}\u{1F1FF}", "\u{1F1FA}\u{1F1EC}"].map((f, i) => (
              <span key={i} style={{ fontSize: 24, background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 12px" }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: Form */}
      <div style={{
        flex: "0 0 50%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "40px",
        background: C.white,
        position: "relative",
      }} className="auth-right-panel">
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <button onClick={() => setLang((l) => (l === "en" ? "sw" : "en"))} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "6px 14px", cursor: "pointer", color: C.teal, fontSize: 12,
            fontFamily: font.body, fontWeight: 800, display: "flex", alignItems: "center", gap: 6,
          }}>
            <Languages size={14} /> {lang === "en" ? "Kiswahili" : "English"}
          </button>
        </div>

        <div style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>
          {step === "email" ? (<>
            <h2 style={{ color: C.text, fontSize: 28, fontFamily: font.heading, fontWeight: 900, margin: "0 0 8px" }}>
              {lang === "sw" ? "Karibu Tena!" : "Welcome Back!"}
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 15, fontFamily: font.body, fontWeight: 600, margin: "0 0 32px" }}>
              {lang === "sw" ? "Ingiza barua pepe yako ili kupokea msimbo wa kuingia." : "Enter your email to receive a login code."}
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.textSecondary, fontSize: 13, fontFamily: font.body, fontWeight: 700, marginBottom: 8 }}>
                <Mail size={15} /> {t("enter_email")}
              </label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()} placeholder="you@example.com" style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = C.primary; }} onBlur={(e) => { e.target.style.borderColor = C.border; }} />
            </div>
            {error && <p style={{ color: C.error, fontSize: 13, fontFamily: font.body, fontWeight: 700, margin: "0 0 16px", padding: "10px 14px", background: C.roseBg, borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={16} /> {error}</p>}
            <button onClick={sendOtp} disabled={loading} style={{
              width: "100%", padding: "15px", borderRadius: 14, border: "none",
              cursor: loading ? "not-allowed" : "pointer", background: C.gradientPrimary,
              color: C.white, fontSize: 16, fontFamily: font.body, fontWeight: 800,
              opacity: loading ? 0.7 : 1, boxShadow: `0 4px 14px ${C.primary}40`, marginBottom: 24,
            }}>{loading ? <Spinner color="#fff" size={6} /> : t("send_otp")}</button>
          </>) : (<>
            <div style={{ marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: C.primaryBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.primary, marginBottom: 20 }}>
                <MailOpen size={28} />
              </div>
              <h2 style={{ color: C.text, fontSize: 24, fontFamily: font.heading, fontWeight: 900, margin: "0 0 8px" }}>
                {lang === "sw" ? "Angalia Barua Pepe" : "Check Your Email"}
              </h2>
              <p style={{ color: C.textSecondary, fontSize: 14, fontFamily: font.body, fontWeight: 600, margin: 0 }}>
                {t("otp_sent")} <strong style={{ color: C.primary }}>{email}</strong>
              </p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <input type="text" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && verifyOtp()} placeholder="000000" maxLength={6} autoFocus
                style={{ ...inputStyle, fontSize: 28, fontWeight: 900, textAlign: "center", letterSpacing: 12, padding: "16px" }}
                onFocus={(e) => { e.target.style.borderColor = C.primary; }} onBlur={(e) => { e.target.style.borderColor = C.border; }} />
            </div>
            {error && <p style={{ color: C.error, fontSize: 13, fontFamily: font.body, fontWeight: 700, margin: "0 0 16px", padding: "10px 14px", background: C.roseBg, borderRadius: 12 }}>{error}</p>}
            <button onClick={verifyOtp} disabled={loading || otp.length !== 6} style={{
              width: "100%", padding: "15px", borderRadius: 14, border: "none",
              cursor: loading ? "not-allowed" : "pointer", background: C.gradientPrimary,
              color: C.white, fontSize: 16, fontFamily: font.body, fontWeight: 800,
              opacity: loading || otp.length !== 6 ? 0.6 : 1, boxShadow: `0 4px 14px ${C.primary}40`, marginBottom: 16,
            }}>{loading ? <Spinner color="#fff" size={6} /> : t("verify_otp")}</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => { setStep("email"); setOtp(""); setError(""); }} style={{
                background: "none", border: "none", color: C.textSecondary, fontSize: 13,
                fontFamily: font.body, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}><ArrowLeft size={14} /> {t("back_to_login")}</button>
              <button onClick={resendOtp} disabled={resendTimer > 0 || loading} style={{
                background: "none", border: "none", color: resendTimer > 0 ? C.textMuted : C.primary,
                fontSize: 13, fontFamily: font.body, fontWeight: 700, cursor: resendTimer > 0 ? "default" : "pointer",
              }}>{resendTimer > 0 ? `${t("resend_otp")} (${resendTimer}s)` : t("resend_otp")}</button>
            </div>
          </>)}

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, fontWeight: 700 }}>{lang === "sw" ? "au" : "or"}</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: C.textSecondary, fontSize: 14, fontFamily: font.body, margin: "0 0 16px" }}>
              {lang === "sw" ? "Huna akaunti?" : "Don't have an account?"}{" "}
              <Link href="/register" style={{ color: C.primary, fontWeight: 800, textDecoration: "none" }}>{t("sign_up")}</Link>
            </p>
            <Link href="/" style={{ color: C.textMuted, fontSize: 13, fontFamily: font.body, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ArrowLeft size={14} /> {lang === "sw" ? "Rudi Nyumbani" : "Back to Home"}
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
          .auth-right-panel { flex: 1 1 100% !important; }
        }
      `}</style>
    </div>
  );
}
