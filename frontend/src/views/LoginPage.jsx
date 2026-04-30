"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, font } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost } from "@/utils/api";
import { setTokens } from "@/utils/auth";
import { Spinner } from "@/components/ui";
import { GraduationCap, Mail, Lock, ArrowLeft, Languages, AlertTriangle, Eye, EyeOff } from "lucide-react";

export default function LoginPage({ lang, setLang, onLogin }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim()) { setError(lang === "sw" ? "Ingiza barua pepe au simu." : "Please enter your email or phone."); return; }
    if (!password) { setError(lang === "sw" ? "Ingiza nenosiri." : "Please enter your password."); return; }
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("/api/auth/login", { identifier: email.trim(), password });
      setTokens(data);
      if (onLogin) onLogin(data?.user, data);
      router.push("/dashboard");
    } catch (err) {
      setError(err?.message || (lang === "sw" ? "Imeshindwa kuingia" : "Login failed"));
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
      {/* Left panel */}
      <div style={{
        flex: "0 0 50%", background: C.gradientPrimary,
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: "60px 40px", position: "relative", overflow: "hidden",
      }} className="auth-left-panel">
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "45vw", height: "45vw", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-8%", width: "35vw", height: "35vw", borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420 }}>
          <GraduationCap size={64} color="rgba(255,255,255,0.9)" strokeWidth={1.5} style={{ marginBottom: 24 }} />
          <h1 style={{ color: C.white, fontSize: "clamp(32px, 4vw, 44px)", fontFamily: font.heading, fontWeight: 900, margin: "0 0 12px", lineHeight: 1.2 }}>ElimuAI</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: font.body, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 32px" }}>{t("motto")}</p>
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

      {/* Right panel */}
      <div style={{
        flex: "0 0 50%", display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "40px", background: C.white, position: "relative",
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
          <h2 style={{ color: C.text, fontSize: 28, fontFamily: font.heading, fontWeight: 900, margin: "0 0 8px" }}>
            {lang === "sw" ? "Karibu Tena!" : "Welcome Back!"}
          </h2>
          <p style={{ color: C.textSecondary, fontSize: 15, fontFamily: font.body, fontWeight: 600, margin: "0 0 32px" }}>
            {lang === "sw" ? "Ingia kwa barua pepe na nenosiri lako." : "Sign in with your email and password."}
          </p>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.textSecondary, fontSize: 13, fontFamily: font.body, fontWeight: 700, marginBottom: 8 }}>
              <Mail size={15} /> {lang === "sw" ? "Barua Pepe au Simu" : "Email or Phone"}
            </label>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && document.getElementById("pwd")?.focus()}
              placeholder="you@example.com" style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: C.textSecondary, fontSize: 13, fontFamily: font.body, fontWeight: 700, marginBottom: 8 }}>
              <Lock size={15} /> {lang === "sw" ? "Nenosiri" : "Password"}
            </label>
            <div style={{ position: "relative" }}>
              <input id="pwd" type={showPwd ? "text" : "password"} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••" style={{ ...inputStyle, paddingRight: 48 }}
                onFocus={(e) => (e.target.style.borderColor = C.primary)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
              <button onClick={() => setShowPwd(!showPwd)} type="button" style={{
                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 0,
              }}>{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>

          {error && <p style={{ color: C.error, fontSize: 13, fontFamily: font.body, fontWeight: 700, margin: "0 0 16px", padding: "10px 14px", background: C.roseBg, borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={16} /> {error}</p>}

          <button onClick={handleLogin} disabled={loading} style={{
            width: "100%", padding: "15px", borderRadius: 14, border: "none",
            cursor: loading ? "not-allowed" : "pointer", background: C.gradientPrimary,
            color: C.white, fontSize: 16, fontFamily: font.body, fontWeight: 800,
            opacity: loading ? 0.7 : 1, boxShadow: `0 4px 14px ${C.primary}40`, marginBottom: 24,
          }}>{loading ? <Spinner color="#fff" size={6} /> : (lang === "sw" ? "Ingia" : "Sign In")}</button>

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
