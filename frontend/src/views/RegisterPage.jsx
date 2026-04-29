"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, font } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost } from "@/utils/api";
import { setTokens } from "@/utils/auth";
import { CURRICULA } from "@/data/constants";
import { Spinner } from "@/components/ui";
import {
  GraduationCap, Users, Heart, School,
  User, Mail, Globe, ArrowLeft, ArrowRight,
  Languages, AlertTriangle, MailOpen,
} from "lucide-react";

const ROLES = [
  { id: "student", icon: <GraduationCap size={28} />, en: "Student", sw: "Mwanafunzi" },
  { id: "teacher", icon: <Users size={28} />, en: "Teacher", sw: "Mwalimu" },
  { id: "parent", icon: <Heart size={28} />, en: "Parent", sw: "Mzazi" },
  { id: "school_admin", icon: <School size={28} />, en: "School Admin", sw: "Msimamizi" },
];

export default function RegisterPage({ lang, setLang, onLogin }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("KE");
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

  const sendRegistrationOtp = async () => {
    if (!name.trim()) { setError(lang === "sw" ? "Ingiza jina lako." : "Please enter your name."); return; }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(lang === "sw" ? "Ingiza barua pepe sahihi." : "Please enter a valid email."); return;
    }
    setLoading(true);
    setError("");
    try {
      await apiPost("/api/auth/send-otp", { email: email.trim(), name: name.trim(), type: "register" });
      setStep(3);
      startResendTimer();
    } catch (err) {
      setError(err?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndRegister = async () => {
    if (otp.length !== 6) {
      setError(lang === "sw" ? "Ingiza msimbo wa nambari 6." : "Please enter the 6-digit code."); return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("/api/auth/register", {
        name: name.trim(),
        email: email.trim(),
        role,
        country,
        otp,
      });
      setTokens(data);
      if (onLogin) onLogin(data?.user, data);
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError("");
    try {
      await apiPost("/api/auth/send-otp", { email: email.trim(), name: name.trim(), type: "register" });
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
        background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 40px",
        position: "relative",
        overflow: "hidden",
      }} className="auth-left-panel">
        <div style={{ position: "absolute", top: "-15%", right: "-10%", width: "45vw", height: "45vw", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-8%", width: "35vw", height: "35vw", borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420 }}>
          <GraduationCap size={64} color="rgba(255,255,255,0.9)" strokeWidth={1.5} style={{ marginBottom: 24 }} />
          <h1 style={{ color: "#fff", fontSize: "clamp(32px, 4vw, 44px)", fontFamily: font.heading, fontWeight: 900, margin: "0 0 12px", lineHeight: 1.2 }}>
            {lang === "sw" ? "Jiunge na ElimuAI" : "Join ElimuAI"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: font.body, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 32px" }}>
            {t("motto")}
          </p>
          <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: "4px solid rgba(255,255,255,0.15)", marginBottom: 32 }}>
            <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop&crop=faces" alt="Students learning together" style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, fontFamily: font.body, fontWeight: 600, lineHeight: 1.7, margin: 0 }}>
            {lang === "sw" ? "Anzisha safari yako ya kujifunza leo. Akaunti ya bure inajumuisha maswali 5 ya AI kila siku." : "Start your learning journey today. Free accounts include 5 AI questions per day."}
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
        overflowY: "auto",
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

        <div style={{ maxWidth: 460, width: "100%", margin: "0 auto" }}>
          {/* Progress */}
          <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
            {[1, 2, 3].map((s) => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 4,
                background: step >= s ? C.gradientAccent : C.surface,
                transition: "background 0.3s",
              }} />
            ))}
          </div>

          {/* Step 1: Role */}
          {step === 1 && (<>
            <h2 style={{ color: C.text, fontSize: 26, fontFamily: font.heading, fontWeight: 900, margin: "0 0 4px" }}>
              {lang === "sw" ? "Wewe ni nani?" : "Who are you?"}
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 14, fontFamily: font.body, fontWeight: 600, margin: "0 0 28px" }}>
              {lang === "sw" ? "Chagua nafasi yako ili tupate kukutengenezea uzoefu bora." : "Choose your role so we can tailor the best experience for you."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {ROLES.map((r) => (
                <button key={r.id} onClick={() => setRole(r.id)} style={{
                  background: role === r.id ? `${C.primary}10` : C.surface,
                  border: `2px solid ${role === r.id ? C.primary : C.border}`,
                  borderRadius: 16, padding: "20px 12px", cursor: "pointer",
                  textAlign: "center", transition: "all 0.2s",
                }}>
                  <div style={{ color: role === r.id ? C.primary : C.textSecondary, marginBottom: 8, display: "flex", justifyContent: "center" }}>{r.icon}</div>
                  <span style={{ color: role === r.id ? C.primary : C.text, fontSize: 14, fontFamily: font.body, fontWeight: 800 }}>
                    {r[lang] || r.en}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => role && setStep(2)} disabled={!role} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              cursor: role ? "pointer" : "not-allowed",
              background: role ? C.gradientAccent : C.surface,
              color: role ? C.white : C.textMuted,
              fontSize: 16, fontFamily: font.body, fontWeight: 800,
              boxShadow: role ? `0 4px 14px ${C.accent}40` : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>{t("continue")} <ArrowRight size={16} /></button>
          </>)}

          {/* Step 2: Info */}
          {step === 2 && (<>
            <h2 style={{ color: C.text, fontSize: 26, fontFamily: font.heading, fontWeight: 900, margin: "0 0 4px" }}>
              {lang === "sw" ? "Maelezo yako" : "Your Details"}
            </h2>
            <p style={{ color: C.textSecondary, fontSize: 14, fontFamily: font.body, fontWeight: 600, margin: "0 0 28px" }}>
              {lang === "sw" ? "Tutakutumia msimbo wa kuthibitisha kwa barua pepe." : "We'll send a verification code to your email."}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.textSecondary, fontSize: 13, fontFamily: font.body, fontWeight: 700, marginBottom: 8 }}>
                <User size={15} /> {lang === "sw" ? "Jina Kamili" : "Full Name"}
              </label>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder={lang === "sw" ? "Jina lako" : "Your full name"} style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.textSecondary, fontSize: 13, fontFamily: font.body, fontWeight: 700, marginBottom: 8 }}>
                <Mail size={15} /> {t("enter_email")}
              </label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && sendRegistrationOtp()}
                placeholder="you@example.com" style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.textSecondary, fontSize: 13, fontFamily: font.body, fontWeight: 700, marginBottom: 8 }}>
                <Globe size={15} /> {lang === "sw" ? "Nchi" : "Country"}
              </label>
              <select value={country} onChange={(e) => setCountry(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}>
                <option value="KE">{"\u{1F1F0}\u{1F1EA}"} Kenya</option>
                <option value="TZ">{"\u{1F1F9}\u{1F1FF}"} Tanzania</option>
                <option value="UG">{"\u{1F1FA}\u{1F1EC}"} Uganda</option>
              </select>
            </div>
            {error && <p style={{ color: C.error, fontSize: 13, fontFamily: font.body, fontWeight: 700, margin: "0 0 16px", padding: "10px 14px", background: C.roseBg, borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={16} /> {error}</p>}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={() => { setStep(1); setError(""); }} style={{
                flex: "0 0 auto", padding: "14px 20px", borderRadius: 14, border: `2px solid ${C.border}`,
                cursor: "pointer", background: "transparent", color: C.textSecondary, fontSize: 15, fontFamily: font.body, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 4,
              }}><ArrowLeft size={16} /></button>
              <button onClick={sendRegistrationOtp} disabled={loading} style={{
                flex: 1, padding: "14px", borderRadius: 14, border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: C.gradientAccent, color: C.white,
                fontSize: 16, fontFamily: font.body, fontWeight: 800,
                opacity: loading ? 0.7 : 1, boxShadow: `0 4px 14px ${C.accent}40`,
              }}>{loading ? <Spinner color="#fff" size={6} /> : (lang === "sw" ? "Tuma Msimbo" : "Send Code")}</button>
            </div>
          </>)}

          {/* Step 3: OTP */}
          {step === 3 && (<>
            <div style={{ marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, marginBottom: 20 }}>
                <MailOpen size={28} />
              </div>
              <h2 style={{ color: C.text, fontSize: 24, fontFamily: font.heading, fontWeight: 900, margin: "0 0 8px" }}>
                {lang === "sw" ? "Thibitisha Barua Pepe" : "Verify Your Email"}
              </h2>
              <p style={{ color: C.textSecondary, fontSize: 14, fontFamily: font.body, fontWeight: 600, margin: 0 }}>
                {t("otp_sent")} <strong style={{ color: C.accent }}>{email}</strong>
              </p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <input type="text" value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && verifyAndRegister()}
                placeholder="000000" maxLength={6} autoFocus
                style={{ ...inputStyle, fontSize: 28, fontWeight: 900, textAlign: "center", letterSpacing: 12, padding: "16px" }}
                onFocus={(e) => (e.target.style.borderColor = C.accent)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
            </div>
            {error && <p style={{ color: C.error, fontSize: 13, fontFamily: font.body, fontWeight: 700, margin: "0 0 16px", padding: "10px 14px", background: C.roseBg, borderRadius: 12 }}>{error}</p>}
            <button onClick={verifyAndRegister} disabled={loading || otp.length !== 6} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              background: C.gradientAccent, color: C.white,
              fontSize: 16, fontFamily: font.body, fontWeight: 800,
              opacity: loading || otp.length !== 6 ? 0.6 : 1,
              boxShadow: `0 4px 14px ${C.accent}40`, marginBottom: 16,
            }}>{loading ? <Spinner color="#fff" size={6} /> : (lang === "sw" ? "Thibitisha & Jiandikishe" : "Verify & Register")}</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => { setStep(2); setOtp(""); setError(""); }} style={{
                background: "none", border: "none", color: C.textSecondary, fontSize: 13,
                fontFamily: font.body, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}><ArrowLeft size={14} /> {lang === "sw" ? "Rudi" : "Back"}</button>
              <button onClick={resendOtp} disabled={resendTimer > 0 || loading} style={{
                background: "none", border: "none", color: resendTimer > 0 ? C.textMuted : C.accent,
                fontSize: 13, fontFamily: font.body, fontWeight: 700, cursor: resendTimer > 0 ? "default" : "pointer",
              }}>{resendTimer > 0 ? `${t("resend_otp")} (${resendTimer}s)` : t("resend_otp")}</button>
            </div>
          </>)}

          {/* Divider + login link */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, fontWeight: 700 }}>{lang === "sw" ? "au" : "or"}</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: C.textSecondary, fontSize: 14, fontFamily: font.body, margin: "0 0 16px" }}>
              {lang === "sw" ? "Tayari una akaunti?" : "Already have an account?"}{" "}
              <Link href="/login" style={{ color: C.primary, fontWeight: 800, textDecoration: "none" }}>{t("sign_in")}</Link>
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
