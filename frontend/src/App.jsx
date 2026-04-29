"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { C, font } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost, apiGet } from "@/utils/api";
import { hasAuthToken, clearTokens, getAuthHeader, getAuthToken } from "@/utils/auth";
import { CURRICULA, PLANS } from "@/data/constants";
import { Spinner, Card, Badge, SecTitle, SubjectPills } from "@/components/ui";
import {
  Home, Bot, FileText, BookOpen, BarChart3, Trophy, CreditCard,
  GraduationCap, Users, User, Heart, School, Settings, MessageSquare,
  LogOut, Menu, X, Send, Clock, CheckCircle, Flame, Star, Target,
  ArrowLeft, ArrowRight, Globe, Smartphone, Receipt, Tag, UserPlus,
  Shield, Key, Mail, Download, Wifi, WifiOff, TrendingUp, Award,
  Zap, LayoutDashboard, Languages, Filter, Plus, Edit3, Trash2,
  ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, AlertTriangle,
} from "lucide-react";
const SettingsIcon = Settings;

// ─── DATA ─────────────────────────────────────────────────────────────────────
const FLAG = { KE: "\u{1F1F0}\u{1F1EA}", TZ: "\u{1F1F9}\u{1F1FF}", UG: "\u{1F1FA}\u{1F1EC}" };
const COUNTRY_CODE = { Kenya: "KE", Tanzania: "TZ", Uganda: "UG" };
const COUNTRY_NAME = { KE: "Kenya", TZ: "Tanzania", UG: "Uganda" };

const OFFLINE_LESSONS = {
  Mathematics: [
    { title: { en: "Algebra Basics", sw: "Misingi ya Aljebra" }, content: { en: "Algebra uses letters to represent unknown numbers.\n\nExample: If x + 5 = 12, then x = 7\n\nKey rules:\n- x + a = b -> x = b - a\n- ax = b -> x = b/a\n\nAlways do the same operation on both sides!\n\nPractice: Solve 3x + 6 = 18\nStep 1: 3x = 12\nStep 2: x = 4", sw: "Aljebra hutumia herufi kuwakilisha nambari zisizojulikana.\n\nMfano: Kama x + 5 = 12, basi x = 7" } },
    { title: { en: "Fractions & Decimals", sw: "Sehemu na Desimali" }, content: { en: "A fraction = part of a whole.\n\nAdding: 1/3 + 1/4 = 4/12 + 3/12 = 7/12\n\nConverting: 1/2 = 0.5 | 3/4 = 0.75 | 1/5 = 0.2", sw: "Sehemu = sehemu ya jumla." } },
  ],
  Science: [
    { title: { en: "Photosynthesis", sw: "Usanisinuru" }, content: { en: "Plants make food using sunlight.\n\nFormula: 6CO2 + 6H2O + light -> C6H12O6 + 6O2\n\nNeeds: Sunlight, Water, CO2, Chlorophyll\nProduces: Glucose + Oxygen", sw: "Mimea hutengeneza chakula kwa kutumia mwanga wa jua." } },
  ],
  English: [
    { title: { en: "Essay Structure", sw: "Muundo wa Insha" }, content: { en: "A good essay has 3 parts:\n\n1. INTRODUCTION - Hook, Background, Thesis\n2. BODY (3+ paragraphs) - Topic sentence, Evidence, Explanation\n3. CONCLUSION - Restate thesis, Summarize, Closing thought", sw: "Insha nzuri ina sehemu 3." } },
  ],
};

const LEADERBOARD_MOCK = [
  { rank: 1, name: "Zawadi K.", xp: 4820, streak: 14, tests: 28, country: "KE", is_current: false, avatar: "Z" },
  { rank: 2, name: "Amina H.", xp: 4650, streak: 11, tests: 24, country: "TZ", is_current: false, avatar: "A" },
  { rank: 3, name: "Brian O.", xp: 4200, streak: 9, tests: 21, country: "KE", is_current: false, avatar: "B" },
  { rank: 4, name: "Grace N.", xp: 3980, streak: 7, tests: 19, country: "UG", is_current: false, avatar: "G" },
  { rank: 5, name: "David M.", xp: 3750, streak: 6, tests: 17, country: "KE", is_current: false, avatar: "D" },
  { rank: 6, name: "Fatuma A.", xp: 3520, streak: 5, tests: 16, country: "TZ", is_current: false, avatar: "F" },
  { rank: 7, name: "You", xp: 3210, streak: 7, tests: 12, country: "KE", is_current: true, avatar: "Y" },
  { rank: 8, name: "Peter K.", xp: 2900, streak: 4, tests: 14, country: "UG", is_current: false, avatar: "P" },
  { rank: 9, name: "Joyce W.", xp: 2750, streak: 3, tests: 11, country: "KE", is_current: false, avatar: "J" },
  { rank: 10, name: "Hassan M.", xp: 2600, streak: 5, tests: 10, country: "TZ", is_current: false, avatar: "H" },
];

const PLAN_ICONS = { free: GraduationCap, student: GraduationCap, family: Heart, school: School };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function SkeletonLine({ w = "100%", h = 12, r = 6, mb = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: C.surfaceHover, marginBottom: mb, animation: "skPulse 1.4s ease-in-out infinite" }} />;
}
function SkeletonCard({ lines = 3, avatar = false }) {
  return (<div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 8 }}>
    <style>{`@keyframes skPulse{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}`}</style>
    <div style={{ display: "flex", gap: 10, alignItems: avatar ? "center" : "flex-start" }}>
      {avatar && <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.surfaceHover, flexShrink: 0, animation: "skPulse 1.4s ease-in-out infinite" }} />}
      <div style={{ flex: 1 }}>{Array.from({ length: lines }).map((_, i) => (<SkeletonLine key={i} w={i === 0 ? "60%" : i === lines - 1 ? "40%" : "80%"} h={i === 0 ? 14 : 11} mb={i < lines - 1 ? 8 : 0} />))}</div>
    </div>
  </div>);
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function NavBar({ active, setActive, role, lang }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const tabs = role === "teacher"
    ? [{ l: t("dashboard"), icon: LayoutDashboard, k: "Dashboard" }, { l: t("classes"), icon: Users, k: "Classes" }, { l: t("admin"), icon: School, k: "Admin" }, { l: t("leaderboard"), icon: Trophy, k: "Rankings" }]
    : role === "parent"
    ? [{ l: t("dashboard"), icon: LayoutDashboard, k: "Dashboard" }, { l: t("children"), icon: Heart, k: "Children" }, { l: t("leaderboard"), icon: Trophy, k: "Rankings" }, { l: t("plans"), icon: CreditCard, k: "Plans" }]
    : [{ l: t("home"), icon: Home, k: "Home" }, { l: t("tutor"), icon: Bot, k: "Tutor" }, { l: t("exams"), icon: FileText, k: "Exams" }, { l: t("leaderboard"), icon: Trophy, k: "Rankings" }, { l: t("progress"), icon: BarChart3, k: "Progress" }];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.white, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "6px 0 16px", zIndex: 200, maxWidth: 520, margin: "0 auto", boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}>
      {tabs.map((tb) => {
        const Icon = tb.icon;
        return (
          <button key={tb.k} onClick={() => setActive(tb.k)} style={{ background: "none", border: "none", cursor: "pointer", color: active === tb.k ? C.primary : C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "color 0.2s", padding: "4px 8px" }}>
            <Icon size={20} strokeWidth={active === tb.k ? 2.5 : 1.5} />
            {tb.l}
          </button>
        );
      })}
    </nav>
  );
}

// ─── TOP BAR ──────────────────────────────────────────────────────────────────
function TopBar({ lang, setLang, isOffline, setIsOffline, user, onLogout }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const router = useRouter();
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, maxWidth: 520, margin: "0 auto", zIndex: 150, background: `${C.white}f0`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.border}`, padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <GraduationCap size={20} color={C.primary} strokeWidth={2} />
        <span style={{ color: C.primary, fontSize: 15, fontFamily: font.heading, fontWeight: 800, letterSpacing: 0.5 }}>ElimuAI</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {hasAuthToken() ? (
          <button onClick={onLogout} style={{ background: C.roseBg, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: C.error, fontSize: 10, fontFamily: font.body, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <LogOut size={12} /> {t("sign_out")}
          </button>
        ) : (
          <button onClick={() => router.push("/login")} style={{ background: C.primaryBg, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: C.primary, fontSize: 10, fontFamily: font.body, fontWeight: 700 }}>
            {t("sign_in")}
          </button>
        )}
        <button onClick={() => setLang((l) => (l === "en" ? "sw" : "en"))} style={{ background: C.tealBg, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: C.teal, fontSize: 10, fontFamily: font.body, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          <Languages size={12} /> {lang === "en" ? "KSW" : "ENG"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isOffline ? <WifiOff size={14} color={C.warning} /> : <Wifi size={14} color={C.success} />}
          <div onClick={() => setIsOffline((p) => !p)} style={{ width: 34, height: 18, borderRadius: 9, cursor: "pointer", background: isOffline ? C.warning : C.success, position: "relative", transition: "background 0.3s", flexShrink: 0 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: isOffline ? 2 : 18, transition: "left 0.3s" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CURRICULUM PICKER ───────────────────────────────────────────────────────
function CurriculumPicker({ country, setCountry, level, setLevel }) {
  const levels = Object.keys(CURRICULA[country].levels);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {Object.keys(CURRICULA).map((c) => (
          <button key={c} onClick={() => { setCountry(c); const lvls = Object.keys(CURRICULA[c].levels); setLevel(lvls[Math.min(8, lvls.length - 1)]); }} style={{ flex: 1, padding: "8px 4px", borderRadius: 12, border: `2px solid ${country === c ? C.primary : C.border}`, cursor: "pointer", background: country === c ? C.primaryBg : C.white, transition: "all 0.2s" }}>
            <div style={{ fontSize: 18, textAlign: "center" }}>{CURRICULA[c].flag}</div>
            <div style={{ color: country === c ? C.primary : C.textMuted, fontSize: 9, fontFamily: font.body, fontWeight: 700, textAlign: "center" }}>{c}</div>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {levels.map((l) => (
          <button key={l} onClick={() => setLevel(l)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, background: level === l ? C.primary : C.surface, color: level === l ? C.white : C.textMuted, fontSize: 11, fontFamily: font.body, fontWeight: 700 }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ setActive, country, setCountry, level, setLevel, isOffline, plan, lang, user }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const hour = new Date().getHours();
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    let alive = true;
    if (isOffline || !hasAuthToken()) return;
    apiGet("/api/progress/summary").then((d) => { if (alive) setSummary(d); }).catch(() => {});
    return () => { alive = false; };
  }, [isOffline, user?.id]);
  const planLabel = (user?.plan || plan || "free").toUpperCase();
  const streakDays = summary?.streak ?? 7;
  const weekMins = summary?.weekMins ?? 320;
  return (
    <div style={{ padding: "24px 20px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ color: C.textMuted, fontSize: 12, margin: 0, fontFamily: font.body }}>{CURRICULA[country].flag} {CURRICULA[country].name}</p>
          <h1 style={{ color: C.text, fontSize: 24, margin: "2px 0 0", fontFamily: font.heading, fontWeight: 900 }}>{t("greeting")}</h1>
        </div>
        <Badge color={planLabel === "FREE" ? C.textMuted : C.success}>{planLabel === "FREE" ? "FREE" : `${planLabel}`}</Badge>
      </div>
      <CurriculumPicker country={country} setCountry={setCountry} level={level} setLevel={setLevel} />
      <Card style={{ background: C.goldBg, border: `1px solid ${C.gold}30`, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ color: C.gold, fontSize: 10, margin: 0, fontFamily: font.body, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>{t("streak")}</p>
          <p style={{ color: C.text, fontSize: 28, margin: "4px 0 0", fontFamily: font.heading, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>{streakDays} {t("days")} <Flame size={24} color={C.secondary} /></p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: C.textMuted, fontSize: 10, margin: 0, fontFamily: font.body }}>{t("mins_week")}</p>
          <p style={{ color: C.text, fontSize: 20, margin: "2px 0 0", fontFamily: font.body, fontWeight: 800 }}>{weekMins}</p>
        </div>
      </Card>
      {isOffline && (
        <Card style={{ background: C.secondaryBg, border: `1px solid ${C.warning}30`, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <WifiOff size={18} color={C.warning} />
            <div>
              <p style={{ color: C.warning, fontSize: 12, fontFamily: font.body, fontWeight: 800, margin: "0 0 2px" }}>{t("offline_mode")}</p>
              <p style={{ color: C.textSecondary, fontSize: 11, fontFamily: font.body, margin: 0 }}>{t("offline_desc")}</p>
            </div>
          </div>
        </Card>
      )}
      <p style={{ color: C.textMuted, fontSize: 10, marginBottom: 10, fontFamily: font.body, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{t("quick_actions")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[
          { l: t("ai_tutor"), icon: Bot, c: C.primary, s: "Tutor", ok: !isOffline },
          { l: t("exam_prep"), icon: FileText, c: C.accent, s: "Exams", ok: true },
          { l: t("homework_help"), icon: BookOpen, c: C.secondary, s: "Homework", ok: !isOffline },
          { l: t("rankings"), icon: Trophy, c: C.gold, s: "Rankings", ok: true },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.l} onClick={() => a.ok && setActive(a.s)} style={{ background: C.white, border: `1px solid ${isOffline && !a.ok ? C.borderLight : C.border}`, borderRadius: 14, padding: "16px 14px", cursor: isOffline && !a.ok ? "not-allowed" : "pointer", textAlign: "left", opacity: isOffline && !a.ok ? 0.45 : 1, boxShadow: C.shadow, transition: "all 0.2s" }}>
              <Icon size={26} color={a.c} strokeWidth={1.5} style={{ marginBottom: 6 }} />
              <p style={{ color: C.text, fontSize: 12, margin: 0, fontFamily: font.body, fontWeight: 800 }}>{a.l}</p>
            </button>
          );
        })}
      </div>
      <p style={{ color: C.textMuted, fontSize: 10, marginBottom: 10, fontFamily: font.body, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{t("achievements")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[{ l: "7-Day Streak", icon: Flame }, { l: "100 Questions", icon: BookOpen }, { l: "Top Scorer", icon: Star }, { l: "Perfect Test", icon: Target }, { l: "3 Countries", icon: Globe }].map((b) => {
          const Icon = b.icon;
          return <Badge key={b.l} color={C.gold} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon size={12} /> {b.l}</Badge>;
        })}
      </div>
    </div>
  );
}

// ─── AI TUTOR ─────────────────────────────────────────────────────────────────
function TutorScreen({ country, level, isOffline, lang, user }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const curr = CURRICULA[country];
  const subjects = curr.levels[level] || [];
  const [subject, setSubject] = useState(subjects[0] || "Mathematics");
  const [msgs, setMsgs] = useState([{ role: "assistant", text: lang === "sw" ? `Habari! Mimi ni mwalimu wako wa ElimuAI kwa **${level}** chini ya **${curr.name}**.\n\nNiulize chochote kuhusu ${subject}. Nitaeleza hatua kwa hatua na mifano kutoka Afrika Mashariki!` : `Hi! I'm your ElimuAI tutor for **${level}** under the **${curr.name}**.\n\nAsk me anything about ${subject}. I'll explain step-by-step with East African examples!` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef();
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const send = async () => {
    if (!input.trim() || loading || isOffline) return;
    const q = input.trim(); setInput("");
    setMsgs((p) => [...p, { role: "user", text: q }]); setLoading(true);
    const history = msgs.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
    history.push({ role: "user", content: q });
    try {
      const data = await apiPost("/api/ai/tutor", { messages: history, subject });
      setMsgs((p) => [...p, { role: "assistant", text: data?.reply || (lang === "sw" ? "Samahani, tatizo la mtandao." : "Sorry, connection issue.") }]);
    } catch (err) {
      const msg = err?.status === 401 ? (lang === "sw" ? "Tafadhali ingia ili kutumia AI." : "Please sign in to use AI.") : (err?.message || "Error");
      setMsgs((p) => [...p, { role: "assistant", text: msg }]);
    } finally { setLoading(false); }
  };
  if (isOffline) return (
    <div style={{ padding: "24px 20px 100px" }}>
      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 6px", fontFamily: font.heading, fontWeight: 900 }}>{t("ai_tutor")}</h2>
      <Card style={{ background: C.secondaryBg, border: `1px solid ${C.warning}30`, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><WifiOff size={18} color={C.warning} /><p style={{ color: C.warning, fontFamily: font.body, fontWeight: 800, margin: 0 }}>{t("offline_tutor")}</p></div>
      </Card>
      <SecTitle>{t("offline_lessons")}</SecTitle>
      {Object.entries(OFFLINE_LESSONS).map(([subj, lessons]) => (
        <div key={subj} style={{ marginBottom: 14 }}>
          <p style={{ color: C.primary, fontSize: 12, fontFamily: font.body, fontWeight: 800, margin: "0 0 8px" }}>{subj.toUpperCase()}</p>
          {lessons.map((l) => (<Card key={l.title.en} style={{ marginBottom: 8 }}><p style={{ color: C.text, fontSize: 13, fontFamily: font.body, fontWeight: 800, margin: "0 0 6px" }}>{l.title[lang] || l.title.en}</p><p style={{ color: C.textSecondary, fontSize: 12, fontFamily: font.body, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{l.content[lang] || l.content.en}</p></Card>))}
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: "12px 16px 8px", background: C.white, borderBottom: `1px solid ${C.border}`, flexShrink: 0, marginTop: 44 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ color: C.text, fontSize: 17, margin: 0, fontFamily: font.heading, fontWeight: 900, display: "flex", alignItems: "center", gap: 6 }}><Bot size={20} color={C.primary} /> {t("ai_tutor")}</h2>
          <Badge color={C.accent}>{curr.flag} {curr.name}</Badge>
        </div>
        <SubjectPills subjects={subjects} active={subject} setActive={setSubject} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 100, background: C.surface }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.gradientPrimary, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 6, flexShrink: 0, alignSelf: "flex-end" }}><Bot size={14} color="#fff" /></div>}
            <div style={{ maxWidth: "76%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? C.gradientPrimary : C.white, border: m.role === "user" ? "none" : `1px solid ${C.border}`, color: m.role === "user" ? "#fff" : C.text, fontSize: 13, lineHeight: 1.65, fontFamily: font.body, fontWeight: 600, whiteSpace: "pre-wrap", boxShadow: C.shadow }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ display: "flex", gap: 6 }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: C.gradientPrimary, display: "flex", alignItems: "center", justifyContent: "center" }}><Bot size={14} color="#fff" /></div><Card style={{ padding: "8px 14px" }}><Spinner /></Card></div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: "8px 12px", background: C.white, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "flex-end", position: "fixed", bottom: 62, left: 0, right: 0, maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`${t("type_question")} (${subject})`} rows={1} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, resize: "none", outline: "none" }} />
        <button onClick={send} disabled={loading} style={{ width: 40, height: 40, borderRadius: 12, border: "none", cursor: "pointer", background: C.gradientPrimary, display: "flex", alignItems: "center", justifyContent: "center", opacity: loading ? 0.5 : 1 }}><Send size={16} color="#fff" /></button>
      </div>
    </div>
  );
}

// ─── EXAMS ────────────────────────────────────────────────────────────────────
function ExamScreen({ country, level, lang, user }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const curr = CURRICULA[country];
  const [mode, setMode] = useState("browse");
  const [paper, setPaper] = useState(null);
  const [papers, setPapers] = useState(curr.papers);
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState({});
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [results, setResults] = useState(null);
  const timerRef = useRef();
  useEffect(() => {
    let alive = true;
    if (!hasAuthToken()) return;
    const curriculum = curr.curriculum;
    const countryCode = COUNTRY_CODE[country];
    apiGet("/api/exams/papers", { country: countryCode, curriculum, level }).then((d) => {
      if (!alive) return;
      if (Array.isArray(d?.papers) && d.papers.length) {
        setPapers(d.papers.map((p) => ({ id: p.id, title: (lang === "sw" && p.title_sw) ? p.title_sw : p.title, subject: p.subject_name || p.subject || "Subject", year: p.year, level: p.grade_level || level, subject_id: p.subject_id })));
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [country, level, lang, user?.id]);
  useEffect(() => { setPapers(curr.papers); }, [country]);
  useEffect(() => { if (mode === "practice" && time > 0) { timerRef.current = setInterval(() => setTime((t) => { if (t <= 1) { clearInterval(timerRef.current); doSubmit(); return 0; } return t - 1; }), 1000); } return () => clearInterval(timerRef.current); }, [mode]);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const startPractice = async (p) => {
    setPaper(p); setLoading(true);
    try {
      const data = await apiPost("/api/ai/generate-questions", { paperId: p.id, subject: p.subject, gradeLevel: p.level, year: p.year, count: 5 });
      const questions = Array.isArray(data?.questions) ? data.questions : [];
      if (!questions.length) throw new Error("No questions");
      setQs(questions); setAns({}); setTime(5 * 60); setMode("practice");
    } catch { alert(lang === "sw" ? "Haikuweza kutengeneza maswali." : "Couldn't generate questions."); }
    finally { setLoading(false); }
  };
  const doSubmit = () => {
    clearInterval(timerRef.current);
    let score = 0; qs.forEach((q, i) => { if (ans[i] === q.answer) score++; });
    const total = qs.length;
    const pct = Math.round(score / total * 100);
    const timeTakenSecs = Math.max(0, 5 * 60 - time);
    setResults({ score, total, pct });
    if (hasAuthToken()) {
      apiPost("/api/exams/attempts", { pastPaperId: paper?.id || null, questions: qs, answers: ans, score, total, timeTakenSecs }).catch(() => {});
      if (paper?.subject_id) { apiPost("/api/progress/log", { activityType: "exam_complete", subjectId: paper.subject_id, score: pct, durationMins: Math.round(timeTakenSecs / 60) }).catch(() => {}); }
    }
    setMode("results");
  };
  if (mode === "practice" && qs.length) return (
    <div style={{ padding: "18px 18px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><p style={{ color: C.text, fontSize: 13, fontFamily: font.body, fontWeight: 800, margin: 0 }}>{paper?.title}</p><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, margin: "2px 0 0" }}>{curr.flag} {curr.name}</p></div>
        <div style={{ background: time < 60 ? C.roseBg : C.surface, border: `1px solid ${time < 60 ? C.error : C.border}`, borderRadius: 10, padding: "5px 12px", display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={14} color={time < 60 ? C.error : C.primary} />
          <span style={{ color: time < 60 ? C.error : C.primary, fontFamily: font.body, fontWeight: 800, fontSize: 15 }}>{fmt(time)}</span>
        </div>
      </div>
      {qs.map((q, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <p style={{ color: C.text, fontSize: 13, margin: "0 0 10px", fontFamily: font.body, fontWeight: 700, lineHeight: 1.5 }}><span style={{ color: C.primary, fontWeight: 800 }}>{i + 1}. </span>{q.q}</p>
          {q.options.map((opt) => (
            <button key={opt} onClick={() => setAns((a) => ({ ...a, [i]: opt[0] }))} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", marginBottom: 4, borderRadius: 10, border: `1px solid ${ans[i] === opt[0] ? C.primary : C.border}`, background: ans[i] === opt[0] ? C.primaryBg : C.white, color: ans[i] === opt[0] ? C.primary : C.text, fontSize: 12, fontFamily: font.body, fontWeight: 600, cursor: "pointer" }}>{opt}</button>
          ))}
        </Card>
      ))}
      <button onClick={doSubmit} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 14, fontFamily: font.body, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CheckCircle size={16} /> {t("submit_test")}</button>
    </div>
  );
  if (mode === "results" && results) return (
    <div style={{ padding: "22px 18px 100px", textAlign: "center" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: results.pct >= 70 ? C.accentBg : results.pct >= 50 ? C.goldBg : C.roseBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        {results.pct >= 70 ? <Trophy size={36} color={C.accent} /> : results.pct >= 50 ? <Star size={36} color={C.gold} /> : <TrendingUp size={36} color={C.rose} />}
      </div>
      <h2 style={{ color: C.text, fontSize: 32, fontFamily: font.heading, fontWeight: 900, margin: "0 0 4px" }}>{results.pct}%</h2>
      <p style={{ color: C.textMuted, fontFamily: font.body, marginBottom: 8 }}>{results.score}/{results.total}</p>
      <Badge color={results.pct >= 70 ? C.accent : results.pct >= 50 ? C.gold : C.rose}>{results.pct >= 70 ? t("excellent") : results.pct >= 50 ? t("good_effort") : t("keep_practicing")}</Badge>
      <Card style={{ marginTop: 16, textAlign: "left" }}>
        <SecTitle>{t("answer_review")}</SecTitle>
        {qs.map((q, i) => (
          <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${C.borderLight}` }}>
            <p style={{ color: C.text, fontSize: 12, fontFamily: font.body, margin: "0 0 3px" }}><b>{i + 1}.</b> {q.q}</p>
            <p style={{ color: ans[i] === q.answer ? C.success : C.error, fontSize: 11, fontFamily: font.body, margin: "0 0 2px", display: "flex", alignItems: "center", gap: 4 }}>{ans[i] === q.answer ? <CheckCircle size={12} /> : <X size={12} />} {t("your_answer")}: {ans[i] || "—"} | {t("correct")}: {q.answer}</p>
            <p style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, margin: 0, fontStyle: "italic" }}>{q.explanation}</p>
          </div>
        ))}
      </Card>
      <button onClick={() => { setMode("browse"); setResults(null); setQs([]); }} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 14, fontFamily: font.body, fontWeight: 800, marginTop: 14 }}>{t("try_another")}</button>
    </div>
  );
  return (
    <div style={{ padding: "22px 18px 100px" }}>
      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 4px", fontFamily: font.heading, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}><FileText size={22} color={C.primary} /> {t("exam_prep")}</h2>
      <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 10px", fontFamily: font.body }}>{curr.flag} {curr.name}</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>{curr.exams.map((e) => (<Badge key={e} color={C.accent}>{e}</Badge>))}</div>
      {papers.map((p) => (
        <Card key={p.id} style={{ marginBottom: 10 }} hover>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}><p style={{ color: C.text, fontSize: 13, margin: "0 0 3px", fontFamily: font.body, fontWeight: 800 }}>{p.title}</p><p style={{ color: C.textMuted, fontSize: 11, margin: 0, fontFamily: font.body }}>{p.level} · {p.year} · 5 Qs · 5 min</p></div>
            <button onClick={() => startPractice(p)} disabled={loading} style={{ padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer", flexShrink: 0, marginLeft: 10, background: C.gradientAccent, color: "#fff", fontSize: 11, fontFamily: font.body, fontWeight: 800, opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", gap: 4 }}><ArrowRight size={12} /> {loading ? "..." : t("start")}</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── HOMEWORK ─────────────────────────────────────────────────────────────────
function HomeworkScreen({ country, level, isOffline, lang, user }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const curr = CURRICULA[country];
  const subjects = curr.levels[level] || [];
  const [subject, setSubject] = useState(subjects[0] || "Mathematics");
  const [question, setQuestion] = useState("");
  const [myAnswer, setMyAnswer] = useState("");
  const [mode, setMode] = useState("solve");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!question.trim() || loading || isOffline) return;
    setLoading(true); setResult("");
    try {
      const data = await apiPost("/api/ai/homework", { question, studentAnswer: myAnswer, mode, subject });
      setResult(data?.reply || (lang === "sw" ? "Hitilafu ya mtandao." : "Connection error."));
    } catch (err) {
      setResult(err?.status === 401 ? (lang === "sw" ? "Tafadhali ingia." : "Please sign in.") : (err?.message || "Error"));
    } finally { setLoading(false); }
  };
  return (
    <div style={{ padding: "22px 18px 100px" }}>
      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 4px", fontFamily: font.heading, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}><BookOpen size={22} color={C.secondary} /> {t("homework_help")}</h2>
      <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 14px", fontFamily: font.body }}>{curr.flag} {curr.name} · {level}</p>
      {isOffline && <Card style={{ background: C.secondaryBg, border: `1px solid ${C.warning}30`, marginBottom: 12 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><WifiOff size={16} color={C.warning} /><p style={{ color: C.warning, fontFamily: font.body, fontSize: 12, fontWeight: 800, margin: 0 }}>{t("ai_unavailable")}</p></div></Card>}
      <div style={{ display: "flex", background: C.surface, borderRadius: 12, padding: 3, marginBottom: 12, border: `1px solid ${C.border}` }}>
        {["solve", "check"].map((m) => (
          <button key={m} onClick={() => { setMode(m); setResult(""); }} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", background: mode === m ? C.gradientPrimary : "transparent", color: mode === m ? "#fff" : C.textMuted, fontSize: 12, fontFamily: font.body, fontWeight: 800 }}>{m === "solve" ? t("solve_for_me") : t("check_my_work")}</button>
        ))}
      </div>
      <SubjectPills subjects={subjects.slice(0, 6)} active={subject} setActive={setSubject} />
      <div style={{ marginTop: 10 }}>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("type_question_hw")} rows={3} style={{ width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 13px", color: C.text, fontSize: 13, fontFamily: font.body, resize: "none", outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
        {mode === "check" && <textarea value={myAnswer} onChange={(e) => setMyAnswer(e.target.value)} placeholder={t("type_answer")} rows={3} style={{ width: "100%", background: C.white, border: `1px solid ${C.primary}30`, borderRadius: 12, padding: "10px 13px", color: C.text, fontSize: 13, fontFamily: font.body, resize: "none", outline: "none", marginBottom: 8, boxSizing: "border-box" }} />}
        <button onClick={submit} disabled={loading || isOffline} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 14, fontFamily: font.body, fontWeight: 800, opacity: (loading || isOffline) ? 0.6 : 1, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{loading ? <Spinner color="#fff" size={6} /> : mode === "solve" ? <><Target size={16} /> {t("solve_btn")}</> : <><CheckCircle size={16} /> {t("check_btn")}</>}</button>
      </div>
      {loading && <Spinner />}
      {result && <Card><SecTitle color={C.accent}>{mode === "solve" ? t("solution") : t("review")}</SecTitle><p style={{ color: C.text, fontSize: 13, fontFamily: font.body, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{result}</p></Card>}
    </div>
  );
}

// ─── PROGRESS ─────────────────────────────────────────────────────────────────
function ProgressScreen({ country, level, lang, user }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const curriculum = CURRICULA[country].curriculum;
  const [summary, setSummary] = useState(null);
  const [offlineLessons, setOfflineLessons] = useState(null);
  useEffect(() => { let alive = true; if (!hasAuthToken()) return; apiGet("/api/progress/summary").then((d) => { if (alive) setSummary(d); }).catch(() => {}); return () => { alive = false; }; }, [user?.id]);
  useEffect(() => { let alive = true; apiGet("/api/curriculum/offline-lessons", { level, curriculum, lang }).then((d) => { if (alive) setOfflineLessons(d?.lessons || []); }).catch(() => {}); return () => { alive = false; }; }, [level, curriculum, lang]);
  const subjects = summary?.subjects?.length
    ? summary.subjects.map((s) => ({ name: s.name, score: Math.round(s.avg_score || 0), color: C.primary }))
    : [{ name: "Mathematics", score: 78, color: C.primary }, { name: "English", score: 85, color: C.accent }, { name: "Science", score: 62, color: C.secondary }, { name: "History", score: 90, color: C.gold }];
  const streakVal = summary?.streak ?? 7;
  const weekMins = summary?.weekMins ?? 320;
  const testsTaken = summary?.recentActivity?.filter((a) => a.activity_type?.includes("exam")).length ?? 12;
  return (
    <div style={{ padding: "22px 18px 100px" }}>
      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 4px", fontFamily: font.heading, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}><BarChart3 size={22} color={C.primary} /> {t("my_progress")}</h2>
      <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 16px", fontFamily: font.body }}>{CURRICULA[country].flag} {CURRICULA[country].name} · {level}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[{ l: t("days_streak"), v: streakVal, icon: Flame, c: C.secondary }, { l: t("mins_week"), v: weekMins, icon: Clock, c: C.primary }, { l: t("tests_taken"), v: testsTaken, icon: FileText, c: C.accent }].map((s) => {
          const Icon = s.icon;
          return (<Card key={s.l} style={{ textAlign: "center", padding: "12px 8px" }}><Icon size={20} color={s.c} style={{ marginBottom: 4 }} /><p style={{ color: C.text, fontSize: 20, margin: "0 0 3px", fontFamily: font.body, fontWeight: 900 }}>{s.v}</p><p style={{ color: C.textMuted, fontSize: 9, margin: 0, fontFamily: font.body, fontWeight: 700 }}>{s.l}</p></Card>);
        })}
      </div>
      <Card style={{ marginBottom: 14 }}>
        <SecTitle>{t("subject_performance")}</SecTitle>
        {subjects.map((s) => (
          <div key={s.name} style={{ marginBottom: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ color: C.text, fontSize: 12, fontFamily: font.body, fontWeight: 700 }}>{s.name}</span><span style={{ color: s.color, fontSize: 12, fontFamily: font.body, fontWeight: 800 }}>{s.score}%</span></div>
            <div style={{ background: C.surface, borderRadius: 6, height: 7, overflow: "hidden" }}><div style={{ width: `${s.score}%`, height: "100%", background: `linear-gradient(90deg, ${s.color}88, ${s.color})`, borderRadius: 6 }} /></div>
          </div>
        ))}
      </Card>
      <Card style={{ marginBottom: 14 }}>
        <SecTitle>{t("cached_lessons")}</SecTitle>
        {offlineLessons?.length ? offlineLessons.map((l) => (<div key={l.id} style={{ background: C.surface, borderRadius: 10, padding: "8px 12px", marginBottom: 5, border: `1px solid ${C.borderLight}` }}><p style={{ color: C.primary, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: "0 0 3px" }}>{l.title}</p><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, margin: 0 }}>{l.content.substring(0, 100)}...</p></div>))
        : Object.entries(OFFLINE_LESSONS).map(([subj, lessons]) => (<div key={subj} style={{ marginBottom: 10 }}><p style={{ color: C.text, fontSize: 12, fontFamily: font.body, fontWeight: 800, margin: "0 0 5px" }}>{subj}</p>{lessons.map((l) => (<div key={l.title.en} style={{ background: C.surface, borderRadius: 10, padding: "8px 12px", marginBottom: 5, border: `1px solid ${C.borderLight}` }}><p style={{ color: C.primary, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: "0 0 3px" }}>{l.title[lang] || l.title.en}</p><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, margin: 0 }}>{(l.content[lang] || l.content.en).substring(0, 100)}...</p></div>))}</div>))}
      </Card>
      <Card style={{ background: C.accentBg, border: `1px solid ${C.accent}30` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Mail size={16} color={C.accent} /><p style={{ color: C.accent, fontSize: 11, fontFamily: font.body, fontWeight: 800, letterSpacing: 1, margin: 0, textTransform: "uppercase" }}>{t("weekly_report")}</p></div>
        <p style={{ color: C.text, fontSize: 12, fontFamily: font.body, lineHeight: 1.5, margin: "0 0 8px" }}>{t("report_desc")}</p>
        <Badge color={C.accent}>{t("auto_sent")}</Badge>
      </Card>
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function LeaderboardScreen({ lang, user }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [scope, setScope] = useState("global");
  const [period, setPeriod] = useState("weekly");
  const [entries, setEntries] = useState(LEADERBOARD_MOCK);
  const [userEntry, setUserEntry] = useState(LEADERBOARD_MOCK.find((e) => e.is_current));
  useEffect(() => {
    let alive = true;
    apiGet("/api/leaderboard", { scope, period: period === "all_time" ? "all_time" : period, limit: 50 }).then((d) => {
      if (!alive) return;
      const rows = d?.leaderboard;
      if (Array.isArray(rows) && rows.length) {
        const mapped = rows.map((r) => ({ rank: r.rank || 0, name: r.name || "Student", xp: r.xp || 0, streak: r.streak || 0, tests: r.tests_taken || 0, country: r.country || "KE", is_current: !!r.is_current_user, avatar: (r.name || "S").slice(0, 1).toUpperCase() }));
        setEntries(mapped);
        const current = mapped.find((e) => e.is_current);
        if (current) setUserEntry(current);
        else if (d?.userRank) setUserEntry({ rank: d.userRank.rank || 0, name: lang === "sw" ? "Wewe" : "You", xp: d.userRank.xp || 0, streak: d.userRank.streak || 0, tests: 0, country: user?.country || "KE", is_current: true, avatar: "Y" });
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [scope, period, lang, user?.country]);
  const displayEntries = entries.length ? entries : LEADERBOARD_MOCK;
  const displayUser = userEntry || LEADERBOARD_MOCK.find((e) => e.is_current);
  const MEDAL_COLORS = { 1: C.gold, 2: "#C0C0C0", 3: "#CD7F32" };
  return (
    <div style={{ padding: "22px 18px 100px" }}>
      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 4px", fontFamily: font.heading, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}><Trophy size={22} color={C.gold} /> {t("rankings")}</h2>
      <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 14px", fontFamily: font.body }}>{FLAG.KE} Kenya · {FLAG.TZ} Tanzania · {FLAG.UG} Uganda</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[{ k: "global", l: t("global") }, { k: "country", l: t("country") }, { k: "school", l: t("school") }].map((o) => (
          <button key={o.k} onClick={() => setScope(o.k)} style={{ flex: 1, padding: "7px", borderRadius: 10, border: "none", cursor: "pointer", background: scope === o.k ? C.primary : C.surface, color: scope === o.k ? "#fff" : C.textMuted, fontSize: 11, fontFamily: font.body, fontWeight: 800 }}>{o.l}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[{ k: "weekly", l: t("weekly") }, { k: "monthly", l: t("monthly") }, { k: "all_time", l: t("all_time") }].map((o) => (
          <button key={o.k} onClick={() => setPeriod(o.k)} style={{ flex: 1, padding: "6px", borderRadius: 10, border: `1px solid ${period === o.k ? C.accent : C.border}`, cursor: "pointer", background: period === o.k ? C.accentBg : "transparent", color: period === o.k ? C.accent : C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 800 }}>{o.l}</button>
        ))}
      </div>
      {displayUser && (
        <Card style={{ background: C.goldBg, border: `1px solid ${C.gold}30`, marginBottom: 14 }}>
          <SecTitle color={C.gold}>{t("your_rank")}</SecTitle>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.gradientGold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff", fontFamily: font.body }}>{displayUser.avatar || "Y"}</div>
              <div><p style={{ color: C.text, fontSize: 14, margin: "0 0 2px", fontFamily: font.body, fontWeight: 800 }}>{displayUser.name || "You"}</p><p style={{ color: C.textMuted, fontSize: 11, margin: 0, fontFamily: font.body, display: "flex", alignItems: "center", gap: 6 }}><Flame size={12} color={C.secondary} /> {displayUser.streak} {t("days")} · <FileText size={12} /> {displayUser.tests}</p></div>
            </div>
            <div style={{ textAlign: "right" }}><p style={{ color: C.gold, fontSize: 26, margin: 0, fontFamily: font.body, fontWeight: 900 }}>#{displayUser.rank}</p><p style={{ color: C.textMuted, fontSize: 11, margin: "2px 0 0", fontFamily: font.body }}>{displayUser.xp} XP</p></div>
          </div>
        </Card>
      )}
      <SecTitle>{t("top_learners")}</SecTitle>
      {displayEntries.map((e, idx) => (
        <div key={e.rank} style={{ background: e.is_current ? C.primaryBg : C.white, border: `1px solid ${e.is_current ? C.primary : C.border}`, borderRadius: 12, padding: "11px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, boxShadow: C.shadow, animation: `fadeIn 0.3s ease ${idx * 0.04}s both` }}>
          <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ width: 32, textAlign: "center", flexShrink: 0 }}>
            {MEDAL_COLORS[e.rank] ? <Award size={20} color={MEDAL_COLORS[e.rank]} fill={MEDAL_COLORS[e.rank]} /> : <span style={{ color: C.textMuted, fontFamily: font.body, fontWeight: 900, fontSize: 14 }}>#{e.rank}</span>}
          </div>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: e.is_current ? C.gradientPrimary : C.gradientAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff", fontFamily: font.body, flexShrink: 0 }}>{e.avatar}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><p style={{ color: e.is_current ? C.primary : C.text, fontSize: 13, margin: 0, fontFamily: font.body, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</p><span style={{ fontSize: 13 }}>{FLAG[e.country]}</span></div>
            <p style={{ color: C.textMuted, fontSize: 10, margin: "2px 0 0", fontFamily: font.body, display: "flex", alignItems: "center", gap: 6 }}><Flame size={10} /> {e.streak} · <FileText size={10} /> {e.tests}</p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}><p style={{ color: e.is_current ? C.primary : C.text, fontSize: 15, margin: 0, fontFamily: font.body, fontWeight: 900 }}>{e.xp.toLocaleString()}</p><p style={{ color: C.textMuted, fontSize: 9, margin: "1px 0 0", fontFamily: font.body }}>XP</p></div>
        </div>
      ))}
    </div>
  );
}

// ─── BILLING SCREEN ───────────────────────────────────────────────────────────
function BillingScreen({ user, lang, onPaid }) {
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
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: step === "success" ? C.accentBg : step === "error" ? C.roseBg : C.primaryBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            {step === "success" ? <CheckCircle size={32} color={C.accent} /> : step === "error" ? <AlertTriangle size={32} color={C.error} /> : <CreditCard size={32} color={C.primary} />}
          </div>
          <h1 style={{ color: C.text, fontSize: 24, fontFamily: font.heading, fontWeight: 900, margin: "0 0 6px" }}>{step === "success" ? (lang === "sw" ? "Malipo Yamekubaliwa!" : "Payment Confirmed!") : (lang === "sw" ? "Kipindi cha Bure Kimeisha" : "Free Trial Ended")}</h1>
          {step !== "success" && <p style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, margin: 0 }}>{lang === "sw" ? "Chagua mpango" : "Choose a plan to continue"}</p>}
        </div>
        {step === "success" ? <Card style={{ textAlign: "center", padding: 24 }}><CheckCircle size={32} color={C.accent} style={{ marginBottom: 8 }} /><p style={{ color: C.accent, fontSize: 16, fontFamily: font.body, fontWeight: 800, margin: "0 0 8px" }}>{lang === "sw" ? "Akaunti imeamilishwa!" : "Account activated!"}</p><p style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, margin: 0 }}>{lang === "sw" ? "Inaelekeza..." : "Redirecting..."}</p></Card>
        : step === "polling" ? <Card style={{ textAlign: "center", padding: 24 }}><Spinner /><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, margin: "12px 0 6px" }}><Smartphone size={18} color={C.primary} /><p style={{ color: C.primary, fontSize: 14, fontFamily: font.body, fontWeight: 800, margin: 0 }}>{lang === "sw" ? "Angalia simu" : "Check your phone"}</p></div><p style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, margin: "0 0 8px" }}>{lang === "sw" ? "Ingiza PIN" : "Enter M-Pesa PIN"}</p><p style={{ color: C.text, fontSize: 16, fontFamily: font.body, fontWeight: 900 }}>KES {amount.toLocaleString()}</p></Card>
        : step === "processing" ? <Card style={{ textAlign: "center", padding: 24 }}><Spinner /><p style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, margin: "10px 0 0" }}>{lang === "sw" ? "Inatuma..." : "Sending STK push..."}</p></Card>
        : (<>
          <Card style={{ marginBottom: 14 }}>
            <p style={{ color: C.text, fontSize: 13, fontFamily: font.body, fontWeight: 800, margin: "0 0 10px" }}>{lang === "sw" ? "Chagua Mpango" : "Choose Billing Cycle"}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.entries(CYCLE_LABELS).map(([key, val]) => { const cp = pricing?.[key]; const isActive = cycle === key; return (
                <button key={key} onClick={() => setCycle(key)} style={{ padding: "10px 8px", borderRadius: 12, border: `2px solid ${isActive ? C.primary : C.border}`, background: isActive ? C.primaryBg : C.white, cursor: "pointer", textAlign: "center", position: "relative", overflow: "hidden" }}>
                  {cp?.discount > 0 && <div style={{ position: "absolute", top: 0, right: 0, background: C.accent, borderRadius: "0 10px 0 8px", padding: "2px 8px" }}><span style={{ color: "#fff", fontSize: 8, fontFamily: font.body, fontWeight: 800 }}>-{cp.discount}%</span></div>}
                  <p style={{ color: isActive ? C.primary : C.text, fontSize: 11, fontFamily: font.body, fontWeight: 800, margin: "0 0 4px" }}>{val[lang] || val.en}</p>
                  <p style={{ color: isActive ? C.text : C.textMuted, fontSize: 16, fontFamily: font.body, fontWeight: 900, margin: "0 0 2px" }}>KES {(cp?.total || amount).toLocaleString()}</p>
                  {cp?.savings > 0 && <p style={{ color: C.accent, fontSize: 9, fontFamily: font.body, fontWeight: 700, margin: 0 }}>{lang === "sw" ? "Okoa" : "Save"} KES {cp.savings.toLocaleString()}</p>}
                </button>);
              })}
            </div>
          </Card>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ background: C.primaryBg, borderRadius: 12, padding: 14, marginBottom: 14, textAlign: "center" }}>
              <p style={{ color: C.primary, fontSize: 28, fontFamily: font.body, fontWeight: 900, margin: "0 0 4px" }}>KES {amount.toLocaleString()}<span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}> / {CYCLE_LABELS[cycle]?.[lang] || cycle}</span></p>
              {discount > 0 && <p style={{ color: C.accent, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>{discount}% {lang === "sw" ? "punguzo" : "discount"}</p>}
              {couponDiscount > 0 && <p style={{ color: C.accent, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Coupon: -KES {couponDiscount.toLocaleString()}</p>}
            </div>
            <div style={{ marginBottom: 12 }}>
              {[lang === "sw" ? "AI Tutor bila kikomo" : "Unlimited AI Tutor", lang === "sw" ? "Mitihani ya zamani" : "Past paper exams", lang === "sw" ? "Ripoti za kila wiki" : "Weekly reports", lang === "sw" ? "Ankara kwa email" : "Invoice emailed"].map((f) => (
                <p key={f} style={{ color: C.text, fontSize: 12, fontFamily: font.body, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}><CheckCircle size={14} color={C.accent} /> {f}</p>
              ))}
            </div>
          </Card>
          <Card style={{ marginBottom: 14 }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 4 }}><Tag size={14} /> {lang === "sw" ? "Msimbo wa Punguzo" : "Coupon Code"}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (couponResult) { setCouponResult(null); setCouponErr(""); } }} placeholder="e.g. SAVE20" style={{ flex: 1, background: C.surface, border: `1px solid ${couponResult ? C.accent : C.border}`, borderRadius: 12, padding: "10px 14px", color: C.text, fontSize: 14, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} />
              <button onClick={validateCoupon} disabled={couponLoading} style={{ padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer", background: C.surface, color: C.primary, fontSize: 12, fontFamily: font.body, fontWeight: 800, flexShrink: 0, opacity: couponLoading ? 0.6 : 1 }}>{couponLoading ? "..." : (lang === "sw" ? "Thibitisha" : "Apply")}</button>
            </div>
            {couponResult && <p style={{ color: C.accent, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: "6px 0 0" }}>{couponResult.coupon.description || couponResult.coupon.code}: -{lang === "sw" ? "KES" : "KES"} {couponResult.discount.toLocaleString()}</p>}
            {couponErr && <p style={{ color: C.error, fontSize: 11, fontFamily: font.body, margin: "6px 0 0" }}>{couponErr}</p>}
          </Card>
          <Card style={{ marginBottom: 14 }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 4 }}><Smartphone size={14} /> {lang === "sw" ? "Namba ya Safaricom" : "Safaricom Number"}</p>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="254712345678" maxLength={12} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 16, fontFamily: font.body, outline: "none", boxSizing: "border-box", marginBottom: 4 }} />
            {err && <p style={{ color: C.error, fontSize: 11, fontFamily: font.body, margin: "4px 0 0" }}>{err}</p>}
          </Card>
          <button onClick={initiatePay} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", background: C.gradientAccent, color: "#fff", fontSize: 15, fontFamily: font.body, fontWeight: 800, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><CreditCard size={18} /> {lang === "sw" ? "Lipa" : "Pay"} KES {amount.toLocaleString()}</button>
          {step === "error" && <button onClick={() => { setStep("choose"); setErr(""); }} style={{ width: "100%", padding: "10px", borderRadius: 12, border: `1px solid ${C.border}`, cursor: "pointer", background: "transparent", color: C.textMuted, fontSize: 12, fontFamily: font.body, fontWeight: 700 }}>{lang === "sw" ? "Jaribu tena" : "Try Again"}</button>}
          {invoices.length > 0 && <>
            <button onClick={() => setShowInvoices(!showInvoices)} style={{ width: "100%", padding: "10px", borderRadius: 12, border: `1px solid ${C.border}`, cursor: "pointer", background: C.surface, color: C.text, fontSize: 12, fontFamily: font.body, fontWeight: 700, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Receipt size={14} /> {showInvoices ? (lang === "sw" ? "Ficha Ankara" : "Hide Invoices") : (lang === "sw" ? "Ona Ankara" : "View Invoices")} ({invoices.length})</button>
            {showInvoices && invoices.map((inv) => (
              <Card key={inv.id} style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div><p style={{ color: C.text, fontSize: 12, fontFamily: font.body, fontWeight: 800, margin: 0 }}>#{inv.invoice_number}</p><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, margin: 0 }}>{new Date(inv.created_at).toLocaleDateString()}</p></div>
                  <div style={{ textAlign: "right" }}><p style={{ color: C.text, fontSize: 14, fontFamily: font.body, fontWeight: 900, margin: 0 }}>KES {Number(inv.amount).toLocaleString()}</p><Badge color={inv.status === "paid" ? C.accent : C.gold}>{inv.status.toUpperCase()}</Badge></div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { const token = getAuthToken(); window.open(`/api/payments/invoices/${inv.id}/pdf?token=${token}`, "_blank"); }} style={{ flex: 1, padding: "6px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.primary, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Download size={12} /> PDF</button>
                  <button onClick={async () => { try { const r = await apiPost(`/api/payments/invoices/${inv.id}/email`); alert(r?.message || "Sent!"); } catch (e) { alert(e?.message || "Failed"); } }} style={{ flex: 1, padding: "6px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.teal, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Mail size={12} /> Email</button>
                </div>
              </Card>
            ))}
          </>}
        </>)}
      </div>
    </div>
  );
}

// ─── MPESA MODAL ──────────────────────────────────────────────────────────────
function MpesaModal({ plan, onClose, onSuccess, lang }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [phone, setPhone] = useState("254");
  const [step, setStep] = useState("enter");
  const [err, setErr] = useState("");
  const initiate = () => { if (phone.length < 12) { setErr(lang === "sw" ? "Namba si sahihi" : "Invalid number"); return; } setErr(""); setStep("processing"); setTimeout(() => setStep("confirm"), 2500); };
  const confirm = () => { setStep("success"); setTimeout(() => { onSuccess(plan); onClose(); }, 2000); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22, width: "100%", maxWidth: 360, boxShadow: C.shadowXl }}>
        {step === "success" ? <div style={{ textAlign: "center", padding: "18px 0" }}><CheckCircle size={52} color={C.accent} style={{ marginBottom: 10 }} /><h3 style={{ color: C.accent, fontFamily: font.heading, fontWeight: 900, margin: "0 0 6px" }}>{t("payment_confirmed")}</h3><p style={{ color: C.textMuted, fontFamily: font.body, fontSize: 12 }}>{t("activating")}</p></div>
        : step === "confirm" ? <div style={{ textAlign: "center" }}><Smartphone size={44} color={C.primary} style={{ marginBottom: 10 }} /><h3 style={{ color: C.text, fontFamily: font.heading, fontWeight: 900, margin: "0 0 6px" }}>{t("check_phone")}</h3><p style={{ color: C.textMuted, fontFamily: font.body, fontSize: 12, marginBottom: 18 }}>{t("stk_sent")} <b style={{ color: C.primary }}>{phone}</b>. {t("enter_pin")} <b style={{ color: C.primary }}>KES {plan.price.toLocaleString()}</b>.</p><button onClick={confirm} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", cursor: "pointer", background: C.gradientAccent, color: "#fff", fontSize: 13, fontFamily: font.body, fontWeight: 800, marginBottom: 8 }}>{t("pin_entered")}</button><button onClick={onClose} style={{ width: "100%", padding: "9px", borderRadius: 14, border: `1px solid ${C.border}`, cursor: "pointer", background: "transparent", color: C.textMuted, fontSize: 12, fontFamily: font.body, fontWeight: 700 }}>{t("cancel")}</button></div>
        : step === "processing" ? <div style={{ textAlign: "center", padding: "18px 0" }}><Spinner /><p style={{ color: C.textMuted, fontFamily: font.body, fontSize: 12, marginTop: 10 }}>{lang === "sw" ? "Inatuma..." : "Sending STK push..."}</p></div>
        : <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h3 style={{ color: C.text, fontFamily: font.heading, fontWeight: 900, margin: 0, fontSize: 18 }}>{t("mpesa_payment")}</h3><button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}><X size={22} /></button></div>
          <Card style={{ background: C.accentBg, border: `1px solid ${C.accent}30`, marginBottom: 16 }}><p style={{ color: C.accent, fontSize: 11, fontFamily: font.body, fontWeight: 800, margin: "0 0 3px" }}>{plan.name[lang] || plan.name.en}</p><p style={{ color: C.text, fontSize: 22, fontFamily: font.body, fontWeight: 900, margin: 0 }}>KES {plan.price.toLocaleString()}<span style={{ fontSize: 12, color: C.textMuted }}> / {plan.desc[lang] || plan.desc.en}</span></p></Card>
          <p style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, margin: "0 0 6px" }}>{t("safaricom_number")}</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="254712345678" maxLength={12} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px", color: C.text, fontSize: 15, fontFamily: font.body, outline: "none", boxSizing: "border-box", marginBottom: 4 }} />
          {err && <p style={{ color: C.error, fontSize: 11, fontFamily: font.body, marginBottom: 8 }}>{err}</p>}
          <p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, margin: "0 0 14px" }}>{t("also_accepts")}</p>
          <button onClick={initiate} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", cursor: "pointer", background: C.gradientAccent, color: "#fff", fontSize: 13, fontFamily: font.body, fontWeight: 800 }}>{t("pay_mpesa")}</button>
        </>}
      </div>
    </div>
  );
}

// ─── PLANS ────────────────────────────────────────────────────────────────────
function PlansScreen({ plan, setPlan, lang, user }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [mpesaTarget, setMpesaTarget] = useState(null);
  const [subInfo, setSubInfo] = useState(null);
  const [cycle, setCycle] = useState("monthly");
  const [invoices, setInvoices] = useState([]);
  const userRole = (user?.role === "admin" || user?.role === "super_admin") ? "school" : (user?.role || "student");
  useEffect(() => { apiGet("/api/payments/subscription-info").then((d) => setSubInfo(d)).catch(() => {}); if (hasAuthToken()) apiGet("/api/payments/invoices").then((d) => setInvoices(d?.invoices || [])).catch(() => {}); }, []);
  const CYCLE_LABELS = { monthly: { en: "Monthly", sw: "Kila Mwezi" }, quarterly: { en: "Quarterly", sw: "Robo Mwaka" }, semi_annual: { en: "Semi-Annual", sw: "Nusu Mwaka" }, annual: { en: "Annual", sw: "Kila Mwaka" } };
  return (
    <div style={{ padding: "22px 18px 100px" }}>
      {mpesaTarget && <MpesaModal plan={mpesaTarget} onClose={() => setMpesaTarget(null)} onSuccess={(p) => setPlan(p.id)} lang={lang} />}
      <h2 style={{ color: C.text, fontSize: 22, margin: "0 0 4px", fontFamily: font.heading, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}><CreditCard size={22} color={C.primary} /> {t("plans_pricing")}</h2>
      <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 12px", fontFamily: font.body }}>M-Pesa · Airtel Money · T-Kash</p>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(CYCLE_LABELS).map(([key, val]) => { const pricing = subInfo?.pricing?.[userRole]?.[key]; return (
          <button key={key} onClick={() => setCycle(key)} style={{ flex: 1, minWidth: 70, padding: "6px 4px", borderRadius: 10, border: `1px solid ${cycle === key ? C.primary : C.border}`, background: cycle === key ? C.primaryBg : "transparent", cursor: "pointer", textAlign: "center" }}>
            <p style={{ color: cycle === key ? C.primary : C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 800, margin: 0 }}>{val[lang] || val.en}</p>
            {pricing?.discount > 0 && <p style={{ color: C.accent, fontSize: 8, fontFamily: font.body, fontWeight: 700, margin: 0 }}>-{pricing.discount}%</p>}
          </button>);
        })}
      </div>
      {PLANS.map((p) => {
        const pricing = subInfo?.pricing?.[p.id === "family" ? "parent" : p.id]?.[cycle];
        const displayPrice = pricing?.total || p.price * ({ monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 }[cycle] || 1);
        const PlanIcon = PLAN_ICONS[p.id] || GraduationCap;
        return (
          <Card key={p.id} style={{ marginBottom: 12, border: `1px solid ${plan === p.id ? p.color : C.border}`, position: "relative", overflow: "hidden" }} hover>
            {p.popular && <div style={{ position: "absolute", top: 12, right: 12, background: C.primary, borderRadius: 7, padding: "2px 10px" }}><span style={{ color: "#fff", fontSize: 9, fontFamily: font.body, fontWeight: 800 }}>{t("popular")}</span></div>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><PlanIcon size={18} color={p.color} /><p style={{ color: p.color, fontSize: 15, margin: 0, fontFamily: font.body, fontWeight: 900 }}>{p.name[lang] || p.name.en}</p></div>
            <p style={{ color: C.text, fontSize: 20, margin: "0 0 2px", fontFamily: font.body, fontWeight: 900 }}>{p.price === 0 ? (lang === "sw" ? "Bure" : "Free") : `KES ${displayPrice.toLocaleString()}`}<span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}> {p.price > 0 ? `/ ${CYCLE_LABELS[cycle]?.[lang] || cycle}` : ""}</span></p>
            {pricing?.savings > 0 && <p style={{ color: C.accent, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 8px" }}>{lang === "sw" ? "Okoa" : "Save"} KES {pricing.savings.toLocaleString()}</p>}
            <div style={{ marginBottom: 12 }}>{(p.features[lang] || p.features.en).map((f) => (<p key={f} style={{ color: C.textSecondary, fontSize: 11, fontFamily: font.body, margin: "0 0 3px", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={12} color={C.accent} /> {f}</p>))}</div>
            {plan === p.id ? <div style={{ background: `${p.color}15`, borderRadius: 10, padding: "8px", textAlign: "center" }}><span style={{ color: p.color, fontFamily: font.body, fontWeight: 800, fontSize: 12 }}>{t("current_plan")}</span></div>
            : <button onClick={() => p.price === 0 ? setPlan("free") : setMpesaTarget(p)} style={{ width: "100%", padding: "10px", borderRadius: 12, border: p.price === 0 ? `1px solid ${C.border}` : "none", cursor: "pointer", background: p.price === 0 ? "transparent" : `linear-gradient(135deg, ${p.color}, ${p.color}bb)`, color: p.price === 0 ? C.text : "#fff", fontSize: 12, fontFamily: font.body, fontWeight: 800 }}>{p.price === 0 ? t("free_plan") : t("pay_mpesa")}</button>}
          </Card>
        );
      })}
      {invoices.length > 0 && <>
        <h3 style={{ color: C.text, fontSize: 16, fontFamily: font.heading, fontWeight: 900, margin: "20px 0 10px", display: "flex", alignItems: "center", gap: 6 }}><Receipt size={18} /> {lang === "sw" ? "Ankara Zako" : "Your Invoices"}</h3>
        {invoices.map((inv) => (
          <Card key={inv.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div><p style={{ color: C.text, fontSize: 12, fontFamily: font.body, fontWeight: 800, margin: 0 }}>#{inv.invoice_number}</p><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, margin: 0 }}>{new Date(inv.created_at).toLocaleDateString()}</p></div>
              <div style={{ textAlign: "right" }}><p style={{ color: C.text, fontSize: 13, fontFamily: font.body, fontWeight: 900, margin: 0 }}>KES {Number(inv.amount).toLocaleString()}</p><Badge color={inv.status === "paid" ? C.accent : C.gold}>{inv.status.toUpperCase()}</Badge></div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => window.open(`/api/payments/invoices/${inv.id}/pdf`, "_blank")} style={{ flex: 1, padding: "5px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.primary, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Download size={12} /> PDF</button>
              <button onClick={async () => { try { const r = await apiPost(`/api/payments/invoices/${inv.id}/email`); alert(r?.message || "Sent!"); } catch (e) { alert(e?.message || "Failed"); } }} style={{ flex: 1, padding: "5px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.teal, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Mail size={12} /> Email</button>
            </div>
          </Card>
        ))}
      </>}
    </div>
  );
}

// ─── SCHOOL ADMIN ─────────────────────────────────────────────────────────────
const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE_URL || "") : "";

function SchoolAdmin({ lang, user, onLogout }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [tab, setTab] = useState("Overview");
  const [aiReport, setAiReport] = useState("");
  const [loadingRep, setLoadingRep] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newSt, setNewSt] = useState({ name: "", grade: "", phone: "" });
  const [students, setStudents] = useState([
    { id: 1, name: "Amina Hassan", grade: "Form 3", subject: "Mathematics", score: 82, status: "Active" },
    { id: 2, name: "Brian Otieno", grade: "Grade 8", subject: "Science", score: 71, status: "Active" },
    { id: 3, name: "Zawadi Kimani", grade: "Grade 9", subject: "English", score: 90, status: "Active" },
    { id: 4, name: "David Mwangi", grade: "Form 2", subject: "History", score: 65, status: "Inactive" },
    { id: 5, name: "Fatuma Ali", grade: "Form 3", subject: "Physics", score: 58, status: "Active" },
    { id: 6, name: "Grace Nekesa", grade: "Grade 7", subject: "Mathematics", score: 88, status: "Active" },
  ]);
  const [schoolStats, setSchoolStats] = useState(null);
  const teachers = [
    { name: "Mr. Kamau", subject: "Mathematics", classes: 3, students: 95 },
    { name: "Ms. Wanjiku", subject: "English", classes: 2, students: 62 },
    { name: "Mr. Okonkwo", subject: "Science", classes: 4, students: 112 },
  ];
  const stats = {
    total: schoolStats?.student_count ?? students.length,
    active: students.filter((s) => s.status === "Active").length,
    avg: Math.round(schoolStats?.avg_score ?? students.reduce((a, s) => a + s.score, 0) / Math.max(1, students.length)),
    teachers: schoolStats?.teacher_count ?? teachers.length,
  };
  useEffect(() => {
    let alive = true;
    if (!hasAuthToken() || !user?.school_id) return;
    apiGet(`/api/schools/${user.school_id}/stats`).then((d) => { if (alive) setSchoolStats(d?.school || null); }).catch(() => {});
    apiGet(`/api/schools/${user.school_id}/students`).then((d) => {
      if (!alive) return;
      if (Array.isArray(d?.students) && d.students.length) {
        const mapped = d.students.map((s) => ({ id: s.id, name: s.name, grade: s.grade_level, subject: s.subject || "", score: Math.round(s.avg_score || 0), status: s.last_login ? (Date.now() - new Date(s.last_login).getTime() < 30 * 24 * 60 * 60 * 1000 ? "Active" : "Inactive") : "Inactive" }));
        setStudents(mapped);
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [user?.school_id]);
  const generateReport = async () => {
    setLoadingRep(true);
    try { const data = await apiPost("/api/ai/school-insights", { classData: { stats, students, teachers } }); setAiReport(data?.insights || ""); }
    catch (err) { setAiReport(err?.status === 401 ? (lang === "sw" ? "Tafadhali ingia." : "Please sign in.") : (err?.message || "Error")); }
    finally { setLoadingRep(false); }
  };
  const addStudent = () => { if (!newSt.name) return; setStudents((p) => [...p, { id: Date.now(), ...newSt, score: 0, status: "Active" }]); setNewSt({ name: "", grade: "", phone: "" }); setShowAdd(false); };

  // Transactions
  const [transactions, setTransactions] = useState([]); const [txTotal, setTxTotal] = useState(0); const [txPage, setTxPage] = useState(1); const [txFilter, setTxFilter] = useState(""); const [txLoading, setTxLoading] = useState(false);
  // SMS
  const [smsLogs, setSmsLogs] = useState([]); const [smsTotal, setSmsTotal] = useState(0); const [smsPage, setSmsPage] = useState(1); const [smsFilter, setSmsFilter] = useState(""); const [smsLoading, setSmsLoading] = useState(false);
  // Dashboard stats
  const [dashStats, setDashStats] = useState(null); const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => { if (!hasAuthToken()) return; setLoadingAdmin(true); apiGet("/api/admin/dashboard").then((d) => setDashStats(d)).catch(() => {}).finally(() => setLoadingAdmin(false)); }, []);
  useEffect(() => { if (!hasAuthToken() || tab !== "Transactions") return; setTxLoading(true); const params = { page: txPage, limit: 20 }; if (txFilter) params.status = txFilter; apiGet("/api/admin/transactions", params).then((d) => { setTransactions(d?.transactions || []); setTxTotal(d?.total || 0); }).catch(() => {}).finally(() => setTxLoading(false)); }, [tab, txPage, txFilter]);
  useEffect(() => { if (!hasAuthToken() || tab !== "SMS Logs") return; setSmsLoading(true); const params = { page: smsPage, limit: 20 }; if (smsFilter) params.status = smsFilter; apiGet("/api/admin/sms-logs", params).then((d) => { setSmsLogs(d?.sms_logs || []); setSmsTotal(d?.total || 0); }).catch(() => {}).finally(() => setSmsLoading(false)); }, [tab, smsPage, smsFilter]);

  // Settings
  const [settings, setSettings] = useState({}); const [settingsLoading, setSettingsLoading] = useState(false); const [settingsSaved, setSettingsSaved] = useState(false); const [settingsTab, setSettingsTab] = useState("mpesa");
  // Users
  const [adminUsers, setAdminUsers] = useState([]); const [usersTotal, setUsersTotal] = useState(0); const [usersPage, setUsersPage] = useState(1); const [usersRoleFilter, setUsersRoleFilter] = useState(""); const [resetMsg, setResetMsg] = useState(""); const [usersLoading, setUsersLoading] = useState(false);
  const [showResetPw, setShowResetPw] = useState(null); const [resetPwInput, setResetPwInput] = useState(""); const [resetPwSaving, setResetPwSaving] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false); const [createUserForm, setCreateUserForm] = useState({ name: "", email: "", phone: "", password: "", role: "student", country: "KE", grade_level: "" }); const [createUserMsg, setCreateUserMsg] = useState(""); const [createUserSaving, setCreateUserSaving] = useState(false);
  // Coupons
  const [coupons, setCoupons] = useState([]); const [couponsTotal, setCouponsTotal] = useState(0); const [couponsPage, setCouponsPage] = useState(1); const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false); const [editCoupon, setEditCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({ code: "", description: "", type: "percentage", value: "", min_amount: "", max_discount: "", applicable_plans: [], applicable_cycles: [], max_uses: "", max_uses_per_user: "1", starts_at: "", expires_at: "" });
  const [couponSaving, setCouponSaving] = useState(false); const [couponMsg, setCouponMsg] = useState("");

  const loadCoupons = () => { setCouponsLoading(true); apiGet("/api/coupons/admin", { page: couponsPage, limit: 20 }).then((d) => { setCoupons(d?.coupons || []); setCouponsTotal(d?.total || 0); }).catch(() => {}).finally(() => setCouponsLoading(false)); };
  useEffect(() => { if (!hasAuthToken() || tab !== "Coupons") return; loadCoupons(); }, [tab, couponsPage]);

  const saveCoupon = async () => {
    if (!couponForm.code || !couponForm.value) { setCouponMsg("Code and value required"); return; }
    setCouponSaving(true); setCouponMsg("");
    try {
      const payload = { ...couponForm, value: parseFloat(couponForm.value), min_amount: couponForm.min_amount ? parseFloat(couponForm.min_amount) : 0, max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null, max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses) : null, max_uses_per_user: couponForm.max_uses_per_user ? parseInt(couponForm.max_uses_per_user) : 1 };
      if (editCoupon) { await fetch(`${API_BASE}/api/coupons/admin/${editCoupon.id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify(payload) }); }
      else { await apiPost("/api/coupons/admin", payload); }
      setShowCouponForm(false); setEditCoupon(null); setCouponForm({ code: "", description: "", type: "percentage", value: "", min_amount: "", max_discount: "", applicable_plans: [], applicable_cycles: [], max_uses: "", max_uses_per_user: "1", starts_at: "", expires_at: "" });
      loadCoupons(); setCouponMsg(editCoupon ? "Coupon updated!" : "Coupon created!"); setTimeout(() => setCouponMsg(""), 3000);
    } catch (e) { setCouponMsg(e?.message || "Failed"); } finally { setCouponSaving(false); }
  };
  const deleteCoupon = async (id) => { if (!confirm("Delete this coupon?")) return; try { await fetch(`${API_BASE}/api/coupons/admin/${id}`, { method: "DELETE", headers: { ...getAuthHeader() } }); loadCoupons(); } catch {} };
  const toggleCouponActive = async (c) => { try { await fetch(`${API_BASE}/api/coupons/admin/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify({ is_active: !c.is_active }) }); loadCoupons(); } catch {} };

  useEffect(() => { if (!hasAuthToken() || tab !== "Settings") return; setSettingsLoading(true); apiGet("/api/admin/settings").then((d) => setSettings(d?.settings || {})).catch(() => {}).finally(() => setSettingsLoading(false)); }, [tab]);
  useEffect(() => { if (!hasAuthToken() || tab !== "Users") return; setUsersLoading(true); const params = { page: usersPage, limit: 20 }; if (usersRoleFilter) params.role = usersRoleFilter; apiGet("/api/admin/users", params).then((d) => { setAdminUsers(d?.users || []); setUsersTotal(d?.total || 0); }).catch(() => {}).finally(() => setUsersLoading(false)); }, [tab, usersPage, usersRoleFilter]);

  const saveSettings = async () => { setSettingsSaved(false); try { await fetch(`${API_BASE}/api/admin/settings`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify(settings) }); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 3000); } catch {} };
  const resetPassword = async (uid, newPassword) => { setResetMsg(""); setResetPwSaving(true); try { const body = newPassword ? { newPassword } : {}; const d = await apiPost(`/api/admin/users/${uid}/reset-password`, body); setResetMsg(d?.message || (d?.tempPassword ? `Password reset to: ${d.tempPassword}` : "Password changed")); setShowResetPw(null); setResetPwInput(""); } catch (e) { setResetMsg(e?.message || "Failed"); } finally { setResetPwSaving(false); } };
  const toggleActive = async (uid) => { try { const r = await fetch(`${API_BASE}/api/admin/users/${uid}/toggle-active`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeader() } }); const d = await r.json(); if (d?.user) setAdminUsers((p) => p.map((u) => u.id === uid ? { ...u, is_active: d.user.is_active } : u)); } catch {} };
  const changeRole = async (uid, role) => { try { const r = await fetch(`${API_BASE}/api/admin/users/${uid}/role`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify({ role }) }); const d = await r.json(); if (d?.user) setAdminUsers((p) => p.map((u) => u.id === uid ? { ...u, role: d.user.role } : u)); } catch {} };
  const createUser = async () => {
    if (!createUserForm.name || !createUserForm.email || !createUserForm.password) { setCreateUserMsg("Name, email and password required"); return; }
    if (createUserForm.password.length < 8) { setCreateUserMsg("Password must be at least 8 characters"); return; }
    setCreateUserSaving(true); setCreateUserMsg("");
    try {
      const d = await apiPost("/api/admin/users", createUserForm);
      if (d?.user) { setCreateUserMsg(""); setShowCreateUser(false); setCreateUserForm({ name: "", email: "", phone: "", password: "", role: "student", country: "KE", grade_level: "" }); setUsersPage(1); setUsersRoleFilter(""); setUsersLoading(true); apiGet("/api/admin/users", { page: 1, limit: 20 }).then((r) => { setAdminUsers(r?.users || []); setUsersTotal(r?.total || 0); }).catch(() => {}).finally(() => setUsersLoading(false)); }
    } catch (e) { setCreateUserMsg(e?.message || "Failed to create user"); } finally { setCreateUserSaving(false); }
  };

  const sidebarItems = [
    { l: "Overview", icon: BarChart3 }, { l: "Transactions", icon: CreditCard }, { l: "SMS Logs", icon: Smartphone },
    { l: "Users", icon: Users }, { l: "Students", icon: GraduationCap }, { l: "Teachers", icon: BookOpen },
    { l: "Coupons", icon: Tag }, { l: "Settings", icon: SettingsIcon }, { l: "Reports", icon: TrendingUp },
  ];
  const [sideOpen, setSideOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => { const h = () => { const m = window.innerWidth < 768; setIsMobile(m); if (!m) setSideOpen(false); }; window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const sideW = 220;

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      {isMobile && sideOpen && <div onClick={() => setSideOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99 }} />}
      {/* Sidebar */}
      <div style={{ width: sideW, background: C.white, borderRight: `1px solid ${C.border}`, padding: "18px 0", flexShrink: 0, position: "fixed", top: 0, bottom: 0, left: isMobile && !sideOpen ? -sideW : 0, zIndex: 100, overflowY: "auto", transition: "left 0.25s ease", display: "flex", flexDirection: "column", boxShadow: C.shadow }}>
        <div style={{ padding: "0 16px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><h2 style={{ color: C.primary, fontSize: 16, margin: "0 0 4px", fontFamily: font.heading, fontWeight: 900, display: "flex", alignItems: "center", gap: 6 }}><GraduationCap size={18} /> ElimuAI</h2><p style={{ color: C.textMuted, fontSize: 9, margin: 0, fontFamily: font.body }}>Admin Portal</p></div>
          {isMobile && <button onClick={() => setSideOpen(false)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 0 }}><X size={20} /></button>}
        </div>
        {sidebarItems.map((s) => { const Icon = s.icon; return (
          <button key={s.l} onClick={() => { setTab(s.l); if (isMobile) setSideOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", border: "none", cursor: "pointer", background: tab === s.l ? C.primaryBg : "transparent", color: tab === s.l ? C.primary : C.textMuted, fontSize: 12, fontFamily: font.body, fontWeight: tab === s.l ? 800 : 600, textAlign: "left", borderLeft: tab === s.l ? `3px solid ${C.primary}` : "3px solid transparent" }}>
            <Icon size={16} /> {s.l}
          </button>);
        })}
        <div style={{ padding: "16px", marginTop: "auto", borderTop: `1px solid ${C.border}` }}>
          {user && <p style={{ color: C.textMuted, fontSize: 10, margin: "0 0 8px", fontFamily: font.body, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}><User size={12} /> {user.name || user.email}</p>}
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: C.roseBg, color: C.error, fontSize: 12, fontFamily: font.body, fontWeight: 700 }}><LogOut size={14} /> Logout</button>
        </div>
      </div>
      {/* Main content */}
      <div style={{ marginLeft: isMobile ? 0 : sideW, flex: 1, padding: isMobile ? "14px 12px 40px" : "24px 32px 60px", minWidth: 0, background: C.bg }}>
        {isMobile && <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <button onClick={() => setSideOpen(true)} style={{ background: "none", border: "none", color: C.primary, cursor: "pointer", padding: 0 }}><Menu size={24} /></button>
          <h2 style={{ color: C.text, fontSize: 18, margin: 0, fontFamily: font.heading, fontWeight: 900 }}>{tab}</h2>
          <Badge color={C.accent} style={{ marginLeft: "auto" }}>Admin</Badge>
        </div>}
        {!isMobile && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ color: C.text, fontSize: 20, margin: "0 0 2px", fontFamily: font.heading, fontWeight: 900 }}>{tab}</h2>
          <Badge color={C.accent}>Admin</Badge>
        </div>}

        {/* Add Student Modal */}
        {showAdd && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22, width: "100%", maxWidth: 360, boxShadow: C.shadowXl }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}><h3 style={{ color: C.text, fontFamily: font.heading, fontWeight: 900, margin: 0 }}>{t("add_student")}</h3><button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}><X size={20} /></button></div>
            {["name", "grade", "phone"].map((f) => (<div key={f} style={{ marginBottom: 10 }}><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px", textTransform: "capitalize" }}>{f}</p><input value={newSt[f]} onChange={(e) => setNewSt((p) => ({ ...p, [f]: e.target.value }))} placeholder={f === "name" ? "Full name" : f === "grade" ? "e.g. Form 3" : "e.g. 254712..."} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>))}
            <button onClick={addStudent} style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 13, fontFamily: font.body, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CheckCircle size={16} /> Add</button>
          </div>
        </div>}

        {/* OVERVIEW TAB */}
        {tab === "Overview" && (<>
          {loadingAdmin && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>{[0, 1, 2, 3, 4, 5].map((i) => (<div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, textAlign: "center" }}><SkeletonLine w="50%" h={22} mb={6} /><SkeletonLine w="70%" h={9} mb={0} /></div>))}<style>{`@keyframes skPulse{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}`}</style></div>}
          {dashStats && (<>
            <Card style={{ marginBottom: 14 }}><SecTitle>Platform Overview</SecTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
                {[{ l: "Total Users", v: dashStats.users?.total_users || 0, c: C.primary }, { l: "Students", v: dashStats.users?.students || 0, c: C.accent }, { l: "Teachers", v: dashStats.users?.teachers || 0, c: C.secondary }, { l: "Paid Users", v: dashStats.users?.paid_users || 0, c: C.gold }, { l: "Revenue (KES)", v: Number(dashStats.payments?.total_revenue || 0).toLocaleString(), c: C.primary }, { l: "Active", v: dashStats.users?.active_users || 0, c: C.accent }].map((s) => (<div key={s.l} style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 14, textAlign: "center" }}><p style={{ color: s.c, fontSize: 22, margin: "0 0 4px", fontFamily: font.body, fontWeight: 900 }}>{s.v}</p><p style={{ color: C.textMuted, fontSize: 9, margin: 0, fontFamily: font.body, fontWeight: 700, textTransform: "uppercase" }}>{s.l}</p></div>))}
              </div>
            </Card>
            <Card style={{ marginBottom: 14 }}><SecTitle>Payments Summary</SecTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
                {[{ l: "Total", v: dashStats.payments?.total || 0, c: C.primary }, { l: "Completed", v: dashStats.payments?.completed || 0, c: C.accent }, { l: "Pending", v: dashStats.payments?.pending || 0, c: C.gold }, { l: "Failed", v: dashStats.payments?.failed || 0, c: C.error }].map((s) => (<div key={s.l} style={{ textAlign: "center" }}><p style={{ color: s.c, fontSize: 22, margin: "0 0 4px", fontFamily: font.body, fontWeight: 900 }}>{s.v}</p><p style={{ color: C.textMuted, fontSize: 9, margin: 0, fontFamily: font.body, fontWeight: 700 }}>{s.l}</p></div>))}
              </div>
            </Card>
            <Card><SecTitle>SMS Summary</SecTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
                {[{ l: "Total Sent", v: dashStats.sms?.total || 0, c: C.primary }, { l: "Delivered", v: dashStats.sms?.sent || 0, c: C.accent }, { l: "Failed", v: dashStats.sms?.failed || 0, c: C.error }].map((s) => (<div key={s.l} style={{ textAlign: "center" }}><p style={{ color: s.c, fontSize: 22, margin: "0 0 4px", fontFamily: font.body, fontWeight: 900 }}>{s.v}</p><p style={{ color: C.textMuted, fontSize: 9, margin: 0, fontFamily: font.body, fontWeight: 700 }}>{s.l}</p></div>))}
              </div>
            </Card>
          </>)}
          {!dashStats && !loadingAdmin && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
            {[{ l: "Total Students", v: stats.total, c: C.primary }, { l: "Active", v: stats.active, c: C.accent }, { l: "Avg Score", v: `${stats.avg}%`, c: C.secondary }, { l: "Teachers", v: stats.teachers, c: C.gold }].map((s) => (<Card key={s.l} style={{ textAlign: "center" }}><p style={{ color: s.c, fontSize: 24, margin: "0 0 3px", fontFamily: font.body, fontWeight: 900 }}>{s.v}</p><p style={{ color: C.textMuted, fontSize: 9, margin: 0, fontFamily: font.body, fontWeight: 700 }}>{s.l}</p></Card>))}
          </div>}
        </>)}

        {/* TRANSACTIONS TAB */}
        {tab === "Transactions" && (<>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {["", "completed", "pending", "failed"].map((f) => (<button key={f || "all"} onClick={() => { setTxFilter(f); setTxPage(1); }} style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", background: txFilter === f ? C.primary : C.surface, color: txFilter === f ? "#fff" : C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 800 }}>{f || "All"}</button>))}
          </div>
          <p style={{ color: C.textMuted, fontSize: 10, margin: "0 0 8px", fontFamily: font.body }}>{txTotal} transactions</p>
          {txLoading && [0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={3} />)}
          {!txLoading && transactions.length === 0 && <p style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, textAlign: "center", padding: 20 }}>No transactions found</p>}
          {!txLoading && transactions.map((tx) => (<Card key={tx.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><p style={{ color: C.text, fontSize: 13, margin: "0 0 2px", fontFamily: font.body, fontWeight: 800 }}>{tx.user_name || "Unknown"}</p><p style={{ color: C.textMuted, fontSize: 10, margin: "0 0 2px", fontFamily: font.body }}>{tx.user_email || tx.phone_number}</p><p style={{ color: C.textMuted, fontSize: 9, margin: 0, fontFamily: font.body }}>{tx.reference}</p></div>
              <div style={{ textAlign: "right" }}><p style={{ color: C.primary, fontSize: 15, margin: "0 0 2px", fontFamily: font.body, fontWeight: 900 }}>KES {Number(tx.amount).toLocaleString()}</p><Badge color={tx.status === "completed" ? C.accent : tx.status === "pending" ? C.gold : C.error}>{tx.status}</Badge></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={{ color: C.textMuted, fontSize: 9, fontFamily: font.body }}>{tx.plan} · {tx.method}</span><span style={{ color: C.textMuted, fontSize: 9, fontFamily: font.body }}>{new Date(tx.created_at).toLocaleString()}</span></div>
            {tx.mpesa_receipt && <p style={{ color: C.accent, fontSize: 9, margin: "4px 0 0", fontFamily: font.body }}>Receipt: {tx.mpesa_receipt}</p>}
          </Card>))}
          {!txLoading && txTotal > 20 && <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
            <button disabled={txPage <= 1} onClick={() => setTxPage((p) => p - 1)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 11, cursor: "pointer", opacity: txPage <= 1 ? 0.4 : 1 }}>Prev</button>
            <span style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, alignSelf: "center" }}>Page {txPage}</span>
            <button disabled={txPage * 20 >= txTotal} onClick={() => setTxPage((p) => p + 1)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 11, cursor: "pointer", opacity: txPage * 20 >= txTotal ? 0.4 : 1 }}>Next</button>
          </div>}
        </>)}

        {/* SMS LOGS TAB */}
        {tab === "SMS Logs" && (<>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {["", "sent", "failed"].map((f) => (<button key={f || "all"} onClick={() => { setSmsFilter(f); setSmsPage(1); }} style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", background: smsFilter === f ? C.primary : C.surface, color: smsFilter === f ? "#fff" : C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 800 }}>{f || "All"}</button>))}
          </div>
          <p style={{ color: C.textMuted, fontSize: 10, margin: "0 0 8px", fontFamily: font.body }}>{smsTotal} SMS messages</p>
          {smsLoading && [0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={2} />)}
          {!smsLoading && smsLogs.length === 0 && <p style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, textAlign: "center", padding: 20 }}>No SMS logs found</p>}
          {!smsLoading && smsLogs.map((sm) => (<Card key={sm.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}><p style={{ color: C.text, fontSize: 12, margin: "0 0 2px", fontFamily: font.body, fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}><Smartphone size={12} /> {sm.recipient}</p><p style={{ color: C.textMuted, fontSize: 10, margin: "0 0 2px", fontFamily: font.body, lineHeight: 1.4, wordBreak: "break-word" }}>{sm.message}</p></div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}><Badge color={sm.status === "sent" ? C.accent : C.error}>{sm.status}</Badge></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={{ color: C.textMuted, fontSize: 9, fontFamily: font.body }}>{sm.provider}</span><span style={{ color: C.textMuted, fontSize: 9, fontFamily: font.body }}>{new Date(sm.created_at).toLocaleString()}</span></div>
          </Card>))}
          {!smsLoading && smsTotal > 20 && <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
            <button disabled={smsPage <= 1} onClick={() => setSmsPage((p) => p - 1)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 11, cursor: "pointer", opacity: smsPage <= 1 ? 0.4 : 1 }}>Prev</button>
            <span style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, alignSelf: "center" }}>Page {smsPage}</span>
            <button disabled={smsPage * 20 >= smsTotal} onClick={() => setSmsPage((p) => p + 1)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 11, cursor: "pointer", opacity: smsPage * 20 >= smsTotal ? 0.4 : 1 }}>Next</button>
          </div>}
        </>)}

        {/* STUDENTS TAB */}
        {tab === "Students" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><p style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, margin: 0 }}>{students.length} students</p><button onClick={() => setShowAdd(true)} style={{ padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 11, fontFamily: font.body, fontWeight: 800 }}>{t("add_student")}</button></div>
          {students.map((s) => (<Card key={s.id} style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 34, height: 34, borderRadius: "50%", background: C.gradientAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{s.name[0]}</div><div><p style={{ color: C.text, fontSize: 13, margin: "0 0 2px", fontFamily: font.body, fontWeight: 800 }}>{s.name}</p><p style={{ color: C.textMuted, fontSize: 10, margin: 0, fontFamily: font.body }}>{s.grade} · {s.subject}</p></div></div><div style={{ textAlign: "right" }}><p style={{ color: s.score >= 75 ? C.accent : s.score >= 60 ? C.gold : C.error, fontSize: 16, margin: "0 0 2px", fontFamily: font.body, fontWeight: 900 }}>{s.score}%</p><Badge color={s.status === "Active" ? C.accent : C.textMuted}>{s.status}</Badge></div></div></Card>))}
        </>)}

        {/* TEACHERS TAB */}
        {tab === "Teachers" && (<>
          {teachers.map((tc) => (<Card key={tc.name} style={{ marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 38, height: 38, borderRadius: "50%", background: C.gradientGold, display: "flex", alignItems: "center", justifyContent: "center" }}><BookOpen size={18} color="#fff" /></div><div><p style={{ color: C.text, fontSize: 13, margin: "0 0 2px", fontFamily: font.body, fontWeight: 800 }}>{tc.name}</p><p style={{ color: C.textMuted, fontSize: 10, margin: 0, fontFamily: font.body }}>{tc.subject} · {tc.students} students</p></div></div></div><div style={{ display: "flex", gap: 8 }}><button style={{ flex: 1, padding: "6px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer" }}>{t("view_perf")}</button><button style={{ flex: 1, padding: "6px", borderRadius: 10, border: `1px solid ${C.primary}30`, background: C.primaryBg, color: C.primary, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer" }}>{t("msg")}</button></div></Card>))}
        </>)}

        {/* REPORTS TAB */}
        {tab === "Reports" && (<>
          <Card style={{ marginBottom: 12 }}>
            <SecTitle>{t("ai_insights")}</SecTitle>
            {loadingRep && <Spinner />}
            {aiReport && <p style={{ color: C.text, fontSize: 12, fontFamily: font.body, lineHeight: 1.7, margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{aiReport}</p>}
            {!aiReport && !loadingRep && <p style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, fontStyle: "italic", marginBottom: 10 }}>{lang === "sw" ? "Bofya 'Tengeneza' kupata uchambuzi wa AI." : "Click Generate for AI analysis."}</p>}
            <button onClick={generateReport} disabled={loadingRep} style={{ width: "100%", padding: "10px", borderRadius: 12, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 12, fontFamily: font.body, fontWeight: 800, opacity: loadingRep ? 0.6 : 1 }}>{loadingRep ? t("generating") : t("gen_report")}</button>
          </Card>
          <Card>
            <SecTitle color={C.primary}><FileText size={16} style={{ display: "inline", verticalAlign: "middle" }} /> {lang === "sw" ? "Hamisha Ripoti" : "Export Reports"}</SecTitle>
            {[lang === "sw" ? "Ripoti ya Utendaji (PDF)" : "Performance Report (PDF)", lang === "sw" ? "Muhtasari wa Mahudhurio" : "Attendance Summary", lang === "sw" ? "Ripoti ya SMS kwa Wazazi" : "Parent SMS Report"].map((r) => (<div key={r} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.borderLight}` }}><p style={{ color: C.text, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: 0 }}>{r}</p><button style={{ padding: "4px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.primary, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Download size={12} /> {t("export_lbl")}</button></div>))}
          </Card>
        </>)}

        {/* SETTINGS TAB */}
        {tab === "Settings" && (<>
          {settingsLoading && <Spinner />}
          {!settingsLoading && (<>
            <div style={{ display: "flex", gap: 0, minHeight: 400 }}>
              <div style={{ width: isMobile ? 54 : 180, flexShrink: 0, background: C.surface, borderRadius: "14px 0 0 14px", border: `1px solid ${C.border}`, borderRight: "none", overflow: "hidden" }}>
                {[{ id: "mpesa", icon: CreditCard, l: "M-Pesa" }, { id: "sms", icon: Smartphone, l: "SMS (AT)" }, { id: "billing", icon: Receipt, l: "Billing Plans" }, { id: "email", icon: Mail, l: "Email (SMTP)" }].map((s) => { const Icon = s.icon; return (
                  <button key={s.id} onClick={() => setSettingsTab(s.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: isMobile ? "12px 6px" : "12px 16px", border: "none", cursor: "pointer", background: settingsTab === s.id ? C.primaryBg : "transparent", color: settingsTab === s.id ? C.primary : C.textMuted, fontSize: isMobile ? 9 : 12, fontFamily: font.body, fontWeight: settingsTab === s.id ? 800 : 600, textAlign: "left", borderLeft: settingsTab === s.id ? `3px solid ${C.primary}` : "3px solid transparent", borderBottom: `1px solid ${C.borderLight}` }}>
                    <Icon size={isMobile ? 16 : 18} /> {!isMobile && s.l}
                  </button>);
                })}
              </div>
              <div style={{ flex: 1, background: C.white, borderRadius: "0 14px 14px 0", border: `1px solid ${C.border}`, padding: isMobile ? 14 : 22, minWidth: 0, overflowY: "auto" }}>
                {settingsTab === "mpesa" && (<>
                  <SecTitle>M-Pesa Configuration</SecTitle>
                  <div style={{ marginBottom: 10 }}><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Environment</p>
                    <select value={settings.mpesa_environment || "sandbox"} onChange={(e) => setSettings((p) => ({ ...p, mpesa_environment: e.target.value }))} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }}><option value="sandbox">Sandbox (Testing)</option><option value="production">Production (Live)</option></select>
                  </div>
                  {[{ k: "mpesa_consumer_key", l: "Consumer Key", p: "Enter M-Pesa consumer key" }, { k: "mpesa_consumer_secret", l: "Consumer Secret", p: "Enter M-Pesa consumer secret" }, { k: "mpesa_shortcode", l: "Business Shortcode", p: "e.g. 174379" }, { k: "mpesa_passkey", l: "Passkey", p: "Enter M-Pesa passkey" }, { k: "mpesa_callback_url", l: "Callback URL", p: "e.g. https://elimuai.africa/api/payments/mpesa/callback" }].map((f) => (<div key={f.k} style={{ marginBottom: 10 }}><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>{f.l}</p><input value={settings[f.k] || ""} onChange={(e) => setSettings((p) => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} type={f.k.includes("secret") || f.k.includes("passkey") ? "password" : "text"} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>))}
                </>)}
                {settingsTab === "sms" && (<>
                  <SecTitle>Africa&apos;s Talking (SMS)</SecTitle>
                  <div style={{ marginBottom: 10 }}><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Environment</p>
                    <select value={settings.at_environment || "sandbox"} onChange={(e) => setSettings((p) => ({ ...p, at_environment: e.target.value }))} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }}><option value="sandbox">Sandbox (Testing)</option><option value="production">Production (Live)</option></select>
                  </div>
                  {[{ k: "at_api_key", l: "API Key", p: "Enter API key" }, { k: "at_username", l: "Username", p: "e.g. sandbox" }, { k: "at_sender_id", l: "Sender ID (optional)", p: "e.g. ElimuAI" }].map((f) => (<div key={f.k} style={{ marginBottom: 10 }}><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>{f.l}</p><input value={settings[f.k] || ""} onChange={(e) => setSettings((p) => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} type={f.k.includes("key") ? "password" : "text"} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>))}
                </>)}
                {settingsTab === "billing" && (<>
                  <SecTitle>Trial & Billing Plans</SecTitle>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                    <div><p style={{ color: C.text, fontSize: 13, fontFamily: font.body, fontWeight: 800, margin: 0 }}>Billing System</p><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, margin: "2px 0 0" }}>Enable or disable payment gate</p></div>
                    <div onClick={() => setSettings((p) => ({ ...p, billing_enabled: p.billing_enabled === "false" ? "true" : "false" }))} style={{ width: 44, height: 24, borderRadius: 12, background: settings.billing_enabled === "false" ? C.surfaceHover : C.accent, cursor: "pointer", position: "relative", transition: "background 0.2s" }}><div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: settings.billing_enabled === "false" ? 2 : 22, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} /></div>
                  </div>
                  <div style={{ marginBottom: 10 }}><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Free Trial Days</p><input value={settings.trial_days || ""} onChange={(e) => setSettings((p) => ({ ...p, trial_days: e.target.value }))} placeholder="e.g. 7" type="number" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[{ role: "school", label: "School", ak: "school_subscription_amount", dk: "school_subscription_days" }, { role: "teacher", label: "Teacher", ak: "teacher_subscription_amount", dk: "teacher_subscription_days" }, { role: "parent", label: "Parent", ak: "parent_subscription_amount", dk: "parent_subscription_days" }, { role: "student", label: "Student", ak: "student_subscription_amount", dk: "student_subscription_days" }].map((p) => (<div key={p.role} style={{ background: C.surface, borderRadius: 10, padding: 10 }}>
                      <p style={{ color: C.primary, fontSize: 11, fontFamily: font.body, fontWeight: 800, margin: "0 0 6px" }}>{p.label}</p>
                      <p style={{ color: C.textMuted, fontSize: 9, fontFamily: font.body, fontWeight: 700, margin: "0 0 3px" }}>Monthly (KES)</p>
                      <input value={settings[p.ak] || ""} onChange={(e) => setSettings((s) => ({ ...s, [p.ak]: e.target.value }))} type="number" placeholder="0" style={{ width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 12, fontFamily: font.body, outline: "none", boxSizing: "border-box", marginBottom: 4 }} />
                      <p style={{ color: C.textMuted, fontSize: 9, fontFamily: font.body, fontWeight: 700, margin: "0 0 3px" }}>Duration (days)</p>
                      <input value={settings[p.dk] || ""} onChange={(e) => setSettings((s) => ({ ...s, [p.dk]: e.target.value }))} type="number" placeholder="30" style={{ width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 12, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} />
                    </div>))}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 6px" }}>Billing Cycle Discounts (%)</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {[{ k: "billing_quarterly_discount", l: "Quarterly" }, { k: "billing_semi_annual_discount", l: "Semi-Annual" }, { k: "billing_annual_discount", l: "Annual" }].map((d) => (<div key={d.k}><p style={{ color: C.textMuted, fontSize: 9, fontFamily: font.body, fontWeight: 700, margin: "0 0 3px" }}>{d.l}</p><input value={settings[d.k] || ""} onChange={(e) => setSettings((s) => ({ ...s, [d.k]: e.target.value }))} type="number" placeholder="0" style={{ width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 12, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>))}
                    </div>
                  </div>
                  <div style={{ background: C.primaryBg, borderRadius: 10, padding: 10, marginTop: 8 }}><p style={{ color: C.primary, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: 0 }}>Users get {settings.trial_days || 7} free trial days. They can choose monthly, quarterly ({settings.billing_quarterly_discount || 10}% off), semi-annual ({settings.billing_semi_annual_discount || 15}% off), or annual ({settings.billing_annual_discount || 20}% off) billing.</p></div>
                </>)}
                {settingsTab === "email" && (<>
                  <SecTitle>Email (SMTP)</SecTitle>
                  {[{ k: "smtp_host", l: "SMTP Host", p: "e.g. smtp.gmail.com" }, { k: "smtp_port", l: "SMTP Port", p: "587" }, { k: "smtp_user", l: "SMTP User / Email", p: "e.g. noreply@elimuai.africa" }, { k: "smtp_pass", l: "SMTP Password", p: "Enter password", secret: true }, { k: "smtp_from_name", l: "From Name", p: "e.g. ElimuAI" }, { k: "smtp_from_email", l: "From Email", p: "e.g. noreply@elimuai.africa" }].map((f) => (<div key={f.k} style={{ marginBottom: 10 }}><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>{f.l}</p><input value={settings[f.k] || ""} onChange={(e) => setSettings((p) => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} type={f.secret ? "password" : "text"} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>))}
                  <div style={{ background: C.accentBg, borderRadius: 10, padding: 10 }}><p style={{ color: C.accent, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 4 }}><Mail size={12} /> Configure SMTP for invoice emails and payment confirmations.</p></div>
                </>)}
              </div>
            </div>
            <button onClick={saveSettings} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 14, fontFamily: font.body, fontWeight: 800, marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CheckCircle size={16} /> Save Settings</button>
            {settingsSaved && <p style={{ color: C.accent, fontSize: 12, fontFamily: font.body, fontWeight: 700, textAlign: "center", margin: "10px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><CheckCircle size={14} /> Settings saved!</p>}
          </>)}
        </>)}

        {/* USERS TAB */}
        {tab === "Users" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["", "student", "teacher", "parent", "admin", "super_admin"].map((f) => (<button key={f || "all"} onClick={() => { setUsersRoleFilter(f); setUsersPage(1); }} style={{ padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", background: usersRoleFilter === f ? C.primary : C.surface, color: usersRoleFilter === f ? "#fff" : C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 800 }}>{f || "All"}</button>))}
            </div>
            <button onClick={() => { setCreateUserMsg(""); setShowCreateUser(true); }} style={{ padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 11, fontFamily: font.body, fontWeight: 800, flexShrink: 0 }}>+ Create User</button>
          </div>
          <p style={{ color: C.textMuted, fontSize: 10, margin: "0 0 8px", fontFamily: font.body }}>{usersTotal} users</p>
          {resetMsg && <p style={{ color: C.accent, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: "0 0 8px", padding: "6px 10px", background: C.accentBg, borderRadius: 8 }}>{resetMsg}</p>}
          {usersLoading && [0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={2} avatar />)}
          {!usersLoading && adminUsers.length === 0 && <p style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, textAlign: "center", padding: 20 }}>No users found</p>}
          {!usersLoading && adminUsers.map((u) => (<Card key={u.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.gradientAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700, flexShrink: 0 }}>{(u.name || "?")[0]}</div>
                <div><p style={{ color: C.text, fontSize: 13, margin: "0 0 2px", fontFamily: font.body, fontWeight: 800 }}>{u.name}</p><p style={{ color: C.textMuted, fontSize: 10, margin: 0, fontFamily: font.body }}>{u.email || u.phone || "—"}</p></div>
              </div>
              <div style={{ textAlign: "right" }}><Badge color={u.is_active ? C.accent : C.error}>{u.is_active ? "Active" : "Inactive"}</Badge><p style={{ color: C.textMuted, fontSize: 9, margin: "4px 0 0", fontFamily: font.body }}>{u.plan} plan · {u.total_xp || 0} XP</p></div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 8px", color: C.text, fontSize: 10, fontFamily: font.body, outline: "none" }}>
                {["student", "teacher", "parent", "admin", "super_admin"].map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
              <button onClick={() => toggleActive(u.id)} style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${u.is_active ? C.error : C.accent}30`, background: u.is_active ? C.roseBg : C.accentBg, color: u.is_active ? C.error : C.accent, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer" }}>{u.is_active ? "Deactivate" : "Activate"}</button>
              <button onClick={() => { setShowResetPw(u); setResetPwInput(""); setResetMsg(""); }} style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.gold}30`, background: C.goldBg, color: C.gold, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Key size={10} /> Change Password</button>
            </div>
          </Card>))}
          {!usersLoading && usersTotal > 20 && <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
            <button disabled={usersPage <= 1} onClick={() => setUsersPage((p) => p - 1)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 11, cursor: "pointer", opacity: usersPage <= 1 ? 0.4 : 1 }}>Prev</button>
            <span style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, alignSelf: "center" }}>Page {usersPage}</span>
            <button disabled={usersPage * 20 >= usersTotal} onClick={() => setUsersPage((p) => p + 1)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 11, cursor: "pointer", opacity: usersPage * 20 >= usersTotal ? 0.4 : 1 }}>Next</button>
          </div>}
          {/* Change Password Modal */}
          {showResetPw && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22, width: "100%", maxWidth: 380, boxShadow: C.shadowXl }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}><h3 style={{ color: C.text, fontFamily: font.heading, fontWeight: 900, margin: 0 }}>Change Password</h3><button onClick={() => setShowResetPw(null)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}><X size={20} /></button></div>
              <p style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, margin: "0 0 12px" }}>User: <strong style={{ color: C.text }}>{showResetPw.name}</strong> ({showResetPw.email})</p>
              <p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>New Password *</p>
              <input type="password" value={resetPwInput} onChange={(e) => setResetPwInput(e.target.value)} placeholder="Min 8 characters" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
              <button onClick={() => { if (resetPwInput.length < 8) { setResetMsg("Password must be at least 8 characters"); return; } resetPassword(showResetPw.id, resetPwInput); }} disabled={resetPwSaving} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 14, fontFamily: font.body, fontWeight: 800, opacity: resetPwSaving ? 0.6 : 1 }}>{resetPwSaving ? "Saving..." : "Set New Password"}</button>
            </div>
          </div>}
          {/* Create User Modal */}
          {showCreateUser && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", boxShadow: C.shadowXl }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}><h3 style={{ color: C.text, fontFamily: font.heading, fontWeight: 900, margin: 0 }}>Create User</h3><button onClick={() => setShowCreateUser(false)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}><X size={20} /></button></div>
              {createUserMsg && <p style={{ color: C.error, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: "0 0 8px", padding: "6px 10px", background: C.roseBg, borderRadius: 8 }}>{createUserMsg}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ gridColumn: "1/-1" }}><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Full Name *</p><input value={createUserForm.name} onChange={(e) => setCreateUserForm((p) => ({ ...p, name: e.target.value }))} placeholder="John Doe" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Email *</p><input type="email" value={createUserForm.email} onChange={(e) => setCreateUserForm((p) => ({ ...p, email: e.target.value }))} placeholder="user@example.com" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Phone</p><input value={createUserForm.phone} onChange={(e) => setCreateUserForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+254..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Password *</p><input type="password" value={createUserForm.password} onChange={(e) => setCreateUserForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min 8 chars" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Role *</p><select value={createUserForm.role} onChange={(e) => setCreateUserForm((p) => ({ ...p, role: e.target.value }))} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }}>{["student", "teacher", "parent", "admin", "super_admin"].map((r) => (<option key={r} value={r}>{r}</option>))}</select></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Country</p><input value={createUserForm.country} onChange={(e) => setCreateUserForm((p) => ({ ...p, country: e.target.value }))} placeholder="KE" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Grade Level</p><input value={createUserForm.grade_level} onChange={(e) => setCreateUserForm((p) => ({ ...p, grade_level: e.target.value }))} placeholder="e.g. Grade 5" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
              </div>
              <button onClick={createUser} disabled={createUserSaving} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 14, fontFamily: font.body, fontWeight: 800, marginTop: 14, opacity: createUserSaving ? 0.6 : 1 }}>{createUserSaving ? "Creating..." : "Create User"}</button>
            </div>
          </div>}
        </>)}

        {/* COUPONS TAB */}
        {tab === "Coupons" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, margin: 0 }}>{couponsTotal} coupons</p>
            <button onClick={() => { setEditCoupon(null); setCouponForm({ code: "", description: "", type: "percentage", value: "", min_amount: "", max_discount: "", applicable_plans: [], applicable_cycles: [], max_uses: "", max_uses_per_user: "1", starts_at: "", expires_at: "" }); setShowCouponForm(true); }} style={{ padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 11, fontFamily: font.body, fontWeight: 800 }}>+ New Coupon</button>
          </div>
          {couponMsg && <p style={{ color: C.accent, fontSize: 11, fontFamily: font.body, fontWeight: 700, margin: "0 0 8px", padding: "6px 10px", background: C.accentBg, borderRadius: 8 }}>{couponMsg}</p>}
          {/* Coupon Form Modal */}
          {showCouponForm && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 22, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", boxShadow: C.shadowXl }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}><h3 style={{ color: C.text, fontFamily: font.heading, fontWeight: 900, margin: 0 }}>{editCoupon ? "Edit Coupon" : "Create Coupon"}</h3><button onClick={() => setShowCouponForm(false)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}><X size={20} /></button></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Code *</p><input value={couponForm.code} onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. SAVE20" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Type</p><select value={couponForm.type} onChange={(e) => setCouponForm((p) => ({ ...p, type: e.target.value }))} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (KES)</option></select></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Value * {couponForm.type === "percentage" ? "(%)" : "(KES)"}</p><input value={couponForm.value} onChange={(e) => setCouponForm((p) => ({ ...p, value: e.target.value }))} type="number" placeholder={couponForm.type === "percentage" ? "e.g. 20" : "e.g. 500"} style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Max Discount (KES)</p><input value={couponForm.max_discount} onChange={(e) => setCouponForm((p) => ({ ...p, max_discount: e.target.value }))} type="number" placeholder="Optional cap" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
              </div>
              <div style={{ marginTop: 8 }}><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Description</p><input value={couponForm.description} onChange={(e) => setCouponForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Back to school promo" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Min Amount (KES)</p><input value={couponForm.min_amount} onChange={(e) => setCouponForm((p) => ({ ...p, min_amount: e.target.value }))} type="number" placeholder="0" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Max Uses (total)</p><input value={couponForm.max_uses} onChange={(e) => setCouponForm((p) => ({ ...p, max_uses: e.target.value }))} type="number" placeholder="Unlimited" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Max Per User</p><input value={couponForm.max_uses_per_user} onChange={(e) => setCouponForm((p) => ({ ...p, max_uses_per_user: e.target.value }))} type="number" placeholder="1" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Applicable Plans</p><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{["student", "teacher", "parent", "school"].map((p) => (<button key={p} onClick={() => setCouponForm((f) => ({ ...f, applicable_plans: f.applicable_plans.includes(p) ? f.applicable_plans.filter((x) => x !== p) : [...f.applicable_plans, p] }))} style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${couponForm.applicable_plans.includes(p) ? C.primary : C.border}`, background: couponForm.applicable_plans.includes(p) ? C.primaryBg : "transparent", color: couponForm.applicable_plans.includes(p) ? C.primary : C.textMuted, fontSize: 9, fontFamily: font.body, fontWeight: 700, cursor: "pointer" }}>{p}</button>))}</div></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Start Date</p><input value={couponForm.starts_at} onChange={(e) => setCouponForm((p) => ({ ...p, starts_at: e.target.value }))} type="datetime-local" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 12, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, fontFamily: font.body, fontWeight: 700, margin: "0 0 4px" }}>Expiry Date</p><input value={couponForm.expires_at} onChange={(e) => setCouponForm((p) => ({ ...p, expires_at: e.target.value }))} type="datetime-local" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 12, fontFamily: font.body, outline: "none", boxSizing: "border-box" }} /></div>
              </div>
              <button onClick={saveCoupon} disabled={couponSaving} style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 13, fontFamily: font.body, fontWeight: 800, marginTop: 14, opacity: couponSaving ? 0.6 : 1 }}>{couponSaving ? "Saving..." : (editCoupon ? "Update Coupon" : "Create Coupon")}</button>
            </div>
          </div>}
          {couponsLoading && [0, 1, 2, 3].map((i) => <SkeletonCard key={i} lines={2} />)}
          {!couponsLoading && coupons.length === 0 && <p style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, textAlign: "center", padding: 20 }}>No coupons yet. Create your first promo code!</p>}
          {!couponsLoading && coupons.map((c) => (<Card key={c.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><p style={{ color: C.primary, fontSize: 16, margin: 0, fontFamily: font.body, fontWeight: 900, letterSpacing: 1 }}>{c.code}</p><Badge color={c.is_active ? C.accent : C.error}>{c.is_active ? "Active" : "Inactive"}</Badge></div>
                {c.description && <p style={{ color: C.textMuted, fontSize: 10, margin: "2px 0 0", fontFamily: font.body }}>{c.description}</p>}
              </div>
              <div style={{ textAlign: "right" }}><p style={{ color: C.text, fontSize: 16, margin: 0, fontFamily: font.body, fontWeight: 900 }}>{c.type === "percentage" ? `${Number(c.value)}%` : `KES ${Number(c.value).toLocaleString()}`}</p><p style={{ color: C.textMuted, fontSize: 9, margin: 0, fontFamily: font.body }}>{c.type === "percentage" ? "off" : "discount"}{c.max_discount ? ` (max KES ${Number(c.max_discount).toLocaleString()})` : ""}</p></div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ color: C.textMuted, fontSize: 9, fontFamily: font.body }}>Used: {c.times_used || 0}{c.max_uses ? `/${c.max_uses}` : ""}</span>
              {c.applicable_plans && c.applicable_plans.length > 0 && <span style={{ color: C.textMuted, fontSize: 9, fontFamily: font.body }}>Plans: {c.applicable_plans.join(", ")}</span>}
              {c.expires_at && <span style={{ color: new Date(c.expires_at) < new Date() ? C.error : C.textMuted, fontSize: 9, fontFamily: font.body }}>Expires: {new Date(c.expires_at).toLocaleDateString()}</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => toggleCouponActive(c)} style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${c.is_active ? C.error : C.accent}30`, background: c.is_active ? C.roseBg : C.accentBg, color: c.is_active ? C.error : C.accent, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer" }}>{c.is_active ? "Deactivate" : "Activate"}</button>
              <button onClick={() => { setEditCoupon(c); setCouponForm({ code: c.code, description: c.description || "", type: c.type, value: String(Number(c.value)), min_amount: c.min_amount ? String(Number(c.min_amount)) : "", max_discount: c.max_discount ? String(Number(c.max_discount)) : "", applicable_plans: c.applicable_plans || [], applicable_cycles: c.applicable_cycles || [], max_uses: c.max_uses ? String(c.max_uses) : "", max_uses_per_user: c.max_uses_per_user ? String(c.max_uses_per_user) : "1", starts_at: c.starts_at ? new Date(c.starts_at).toISOString().slice(0, 16) : "", expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : "" }); setShowCouponForm(true); }} style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.primary}30`, background: C.primaryBg, color: C.primary, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Edit3 size={10} /> Edit</button>
              <button onClick={() => deleteCoupon(c.id)} style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.error}30`, background: C.roseBg, color: C.error, fontSize: 10, fontFamily: font.body, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={10} /> Delete</button>
            </div>
          </Card>))}
          {!couponsLoading && couponsTotal > 20 && <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
            <button disabled={couponsPage <= 1} onClick={() => setCouponsPage((p) => p - 1)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 11, cursor: "pointer", opacity: couponsPage <= 1 ? 0.4 : 1 }}>Prev</button>
            <span style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, alignSelf: "center" }}>Page {couponsPage}</span>
            <button disabled={couponsPage * 20 >= couponsTotal} onClick={() => setCouponsPage((p) => p + 1)} style={{ padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 11, cursor: "pointer", opacity: couponsPage * 20 >= couponsTotal ? 0.4 : 1 }}>Next</button>
          </div>}
        </>)}
      </div>
    </div>
  );
}

// ─── TEACHER ──────────────────────────────────────────────────────────────────
function TeacherDash({ country, lang }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [insight, setInsight] = useState(""); const [loading, setLoading] = useState(false);
  const classes = [
    { name: "Form 3A", students: 32, avg: 74, top: "English", weak: "Mathematics" },
    { name: "Form 3B", students: 28, avg: 68, top: "History", weak: "Physics" },
    { name: "Form 2A", students: 35, avg: 81, top: "Science", weak: "Kiswahili" },
  ];
  const getInsight = async () => {
    setLoading(true);
    try { const data = await apiPost("/api/ai/school-insights", { classData: { classes } }); setInsight(data?.insights || ""); }
    catch (err) { setInsight(err?.status === 401 ? (lang === "sw" ? "Tafadhali ingia." : "Please sign in.") : (err?.message || "Error")); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ padding: "22px 18px 100px" }}>
      <h2 style={{ color: C.text, fontSize: 20, margin: "0 0 4px", fontFamily: font.heading, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}><BookOpen size={20} color={C.secondary} /> {lang === "sw" ? "Dashibodi ya Mwalimu" : "Teacher Dashboard"}</h2>
      <p style={{ color: C.textMuted, fontSize: 11, margin: "0 0 14px", fontFamily: font.body }}>{CURRICULA[country].flag} {CURRICULA[country].name}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[{ l: "Classes", v: "3" }, { l: "Students", v: "95" }, { l: "Avg", v: "74%" }].map((s) => (<Card key={s.l} style={{ textAlign: "center", padding: "12px 8px" }}><p style={{ color: C.primary, fontSize: 22, margin: "0 0 2px", fontFamily: font.body, fontWeight: 900 }}>{s.v}</p><p style={{ color: C.textMuted, fontSize: 9, margin: 0, fontFamily: font.body, fontWeight: 700 }}>{s.l}</p></Card>))}
      </div>
      {classes.map((c) => (<Card key={c.name} style={{ marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div><p style={{ color: C.text, fontSize: 13, margin: "0 0 2px", fontFamily: font.body, fontWeight: 800 }}>{c.name}</p><p style={{ color: C.textMuted, fontSize: 10, margin: 0, fontFamily: font.body }}>{c.students} students</p></div><p style={{ color: c.avg >= 75 ? C.accent : c.avg >= 60 ? C.gold : C.error, fontSize: 22, margin: 0, fontFamily: font.body, fontWeight: 900 }}>{c.avg}%</p></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Badge color={C.accent}><CheckCircle size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {c.top}</Badge><Badge color={C.error}><AlertTriangle size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {c.weak}</Badge></div></Card>))}
      <Card><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><SecTitle>{t("ai_insights")}</SecTitle><button onClick={getInsight} disabled={loading} style={{ padding: "4px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: C.gradientPrimary, color: "#fff", fontSize: 10, fontFamily: font.body, fontWeight: 800, opacity: loading ? 0.6 : 1 }}>{loading ? "..." : t("generate")}</button></div>{loading && <Spinner />}{insight ? <p style={{ color: C.text, fontSize: 12, fontFamily: font.body, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{insight}</p> : <p style={{ color: C.textMuted, fontSize: 11, fontFamily: font.body, fontStyle: "italic", margin: 0 }}>{lang === "sw" ? "Bofya Tengeneza kupata maarifa ya AI." : "Click Generate for AI recommendations."}</p>}</Card>
    </div>
  );
}

// ─── PARENT ───────────────────────────────────────────────────────────────────
function ParentDash({ country, setActive, setPlan, lang }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [children, setChildren] = useState([
    { name: "Amina", grade: "Form 3", streak: 7, avg: 78, active: true },
    { name: "Brian", grade: "Grade 5", streak: 2, avg: 65, active: false },
  ]);
  useEffect(() => {
    let alive = true;
    if (!hasAuthToken()) return;
    apiGet("/api/users/children").then((d) => {
      if (!alive) return;
      if (Array.isArray(d?.children) && d.children.length) {
        const mapped = d.children.map((c) => ({ name: c.name, grade: c.grade_level || "", streak: c.streak_days || 0, avg: Math.round(c.total_xp ? Math.min(100, c.total_xp / 10) : 0), active: (c.today_sessions || 0) > 0 }));
        setChildren(mapped);
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <div style={{ padding: "22px 18px 100px" }}>
      <h2 style={{ color: C.text, fontSize: 20, margin: "0 0 4px", fontFamily: font.heading, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}><Users size={20} color={C.primary} /> {lang === "sw" ? "Dashibodi ya Mzazi" : "Parent Dashboard"}</h2>
      <p style={{ color: C.textMuted, fontSize: 11, margin: "0 0 14px", fontFamily: font.body }}>{CURRICULA[country].flag} {lang === "sw" ? "Fuatilia watoto wako" : "Monitor your children's learning"}</p>
      {children.map((child) => (<Card key={child.name} style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 40, height: 40, borderRadius: "50%", background: C.gradientPrimary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", fontWeight: 700 }}>{child.name[0]}</div><div><p style={{ color: C.text, fontSize: 13, margin: "0 0 2px", fontFamily: font.body, fontWeight: 800 }}>{child.name}</p><p style={{ color: C.textMuted, fontSize: 10, margin: 0, fontFamily: font.body }}>{child.grade}</p></div></div><p style={{ color: C.primary, fontSize: 20, margin: 0, fontFamily: font.body, fontWeight: 900 }}>{child.avg}%</p></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Badge color={C.secondary}><Flame size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {child.streak} {t("days")}</Badge><Badge color={child.active ? C.accent : C.error}>{child.active ? (lang === "sw" ? "Amefanya leo" : "Active today") : (lang === "sw" ? "Karibu siku 2" : "Inactive 2 days")}</Badge></div></Card>))}
      <Card style={{ background: C.primaryBg, border: `1px solid ${C.primary}30`, marginBottom: 12 }}>
        <p style={{ color: C.primary, fontSize: 10, fontFamily: font.body, fontWeight: 800, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{t("weekly_report")}</p>
        <p style={{ color: C.text, fontSize: 12, fontFamily: font.body, lineHeight: 1.5, margin: "0 0 8px" }}>{t("report_desc")}</p>
        <Badge color={C.accent}>{t("notifications_on")}</Badge>
      </Card>
      <button onClick={() => setActive("Plans")} style={{ width: "100%", padding: "11px", borderRadius: 14, border: "none", cursor: "pointer", background: C.gradientAccent, color: "#fff", fontSize: 13, fontFamily: font.body, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CreditCard size={16} /> {t("upgrade_mpesa")}</button>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function ElimuAI() {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [active, setActive] = useState("Home");
  const [country, setCountry] = useState("Kenya");
  const [level, setLevel] = useState("Grade 9 (JSS)");
  const [isOffline, setIsOffline] = useState(false);
  const [plan, setPlan] = useState("free");
  const [lang, setLang] = useState("en");
  const [user, setUser] = useState(null);
  const [billingEnabled, setBillingEnabled] = useState(true);

  useEffect(() => { let alive = true; if (!hasAuthToken()) return; apiGet("/api/users/profile").then((d) => { if (alive) setUser(d?.user || null); }).catch(() => {}); return () => { alive = false; }; }, []);
  useEffect(() => { apiGet("/api/payments/subscription-info").then((d) => { if (typeof d?.billingEnabled !== "undefined") setBillingEnabled(d.billingEnabled); }).catch(() => {}); }, []);

  useEffect(() => {
    if (user?.plan) setPlan(user.plan);
    if (user?.language) setLang(user.language);
    if (user?.country && COUNTRY_NAME[user.country]) setCountry(COUNTRY_NAME[user.country]);
    if (user?.grade_level) setLevel(user.grade_level);
    if (user?.role && !role) {
      const r = user.role;
      setRole(r === "super_admin" ? "admin" : r);
      if (r === "admin" || r === "super_admin") setActive("Overview");
      else if (r === "teacher" || r === "parent") setActive("Dashboard");
      else setActive("Home");
    }
  }, [user?.plan, user?.language, user?.country, user?.grade_level, user?.role]);

  const handleAuthSuccess = (u, data) => {
    if (data?.accessToken) localStorage.setItem("accessToken", data.accessToken);
    if (data?.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    if (u) setUser(u);
    if (u?.role) {
      const r = u.role;
      setRole(r === "super_admin" ? "admin" : r);
      if (r === "admin" || r === "super_admin") setActive("Overview");
      else if (r === "teacher" || r === "parent") setActive("Dashboard");
      else setActive("Home");
    }
  };

  const handleLogout = () => { clearTokens(); setUser(null); setRole(null); router.push("/login"); };
  const handleRole = (r) => { setRole(r); setActive(r === "admin" || r === "super_admin" ? "Overview" : r === "teacher" ? "Dashboard" : r === "parent" ? "Dashboard" : "Home"); };

  // If no role and not authenticated, redirect to login
  if (!role && !hasAuthToken()) {
    if (typeof window !== "undefined") router.push("/login");
    return null;
  }

  // If no role but authenticated, show role selector inline
  if (!role) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.gradientPrimary, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><GraduationCap size={32} color="#fff" /></div>
      <h1 style={{ color: C.text, fontSize: 36, fontFamily: font.heading, fontWeight: 900, textAlign: "center", margin: "0 0 4px" }}>ElimuAI</h1>
      <p style={{ color: C.primary, fontSize: 11, fontFamily: font.body, fontWeight: 800, letterSpacing: 3, textAlign: "center", marginBottom: 4, textTransform: "uppercase" }}>{lang === "sw" ? "Elimu Kwanza" : "Education First"}</p>
      <p style={{ color: C.textMuted, fontSize: 12, fontFamily: font.body, textAlign: "center", marginBottom: 28 }}>{lang === "sw" ? "Chagua aina yako" : "Select your role to continue"}</p>
      {[{ role: "student", icon: GraduationCap, l: lang === "sw" ? "Mwanafunzi" : "Student", d: lang === "sw" ? "Jifunze na AI" : "Learn with AI tutor" }, { role: "teacher", icon: BookOpen, l: lang === "sw" ? "Mwalimu" : "Teacher", d: lang === "sw" ? "Simamia madarasa" : "Manage your classes" }, { role: "parent", icon: Users, l: lang === "sw" ? "Mzazi" : "Parent", d: lang === "sw" ? "Fuatilia watoto" : "Monitor children" }, { role: "admin", icon: SettingsIcon, l: lang === "sw" ? "Msimamizi" : "School Admin", d: lang === "sw" ? "Simamia shule" : "Manage your school" }].map((r) => { const Icon = r.icon; return (
        <button key={r.role} onClick={() => handleRole(r.role)} style={{ width: "100%", maxWidth: 360, padding: "13px 16px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 10, boxShadow: C.shadow }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.primaryBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={20} color={C.primary} /></div>
          <div style={{ textAlign: "left", flex: 1 }}><p style={{ color: C.text, fontSize: 14, margin: "0 0 2px", fontFamily: font.body, fontWeight: 800 }}>{r.l}</p><p style={{ color: C.textMuted, fontSize: 11, margin: 0, fontFamily: font.body }}>{r.d}</p></div>
          <ArrowRight size={16} color={C.primary} />
        </button>);
      })}
    </div>
  );

  const renderScreen = () => {
    if (role === "admin") return <SchoolAdmin lang={lang} user={user} onLogout={handleLogout} />;
    if (role === "teacher") {
      if (active === "Admin") return <SchoolAdmin lang={lang} user={user} onLogout={handleLogout} />;
      if (active === "Rankings") return <LeaderboardScreen lang={lang} user={user} />;
      return <TeacherDash country={country} lang={lang} />;
    }
    if (role === "parent") {
      if (active === "Plans") return <PlansScreen plan={plan} setPlan={setPlan} lang={lang} user={user} />;
      if (active === "Rankings") return <LeaderboardScreen lang={lang} user={user} />;
      return <ParentDash country={country} setActive={setActive} setPlan={setPlan} lang={lang} />;
    }
    switch (active) {
      case "Home": return <HomeScreen setActive={setActive} country={country} setCountry={setCountry} level={level} setLevel={setLevel} isOffline={isOffline} plan={plan} lang={lang} user={user} />;
      case "Tutor": return <TutorScreen country={country} level={level} isOffline={isOffline} lang={lang} user={user} />;
      case "Exams": return <ExamScreen country={country} level={level} lang={lang} user={user} />;
      case "Homework": return <HomeworkScreen country={country} level={level} isOffline={isOffline} lang={lang} user={user} />;
      case "Rankings": return <LeaderboardScreen lang={lang} user={user} />;
      case "Progress": return <ProgressScreen country={country} level={level} lang={lang} user={user} />;
      case "Plans": return <PlansScreen plan={plan} setPlan={setPlan} lang={lang} user={user} />;
      default: return <HomeScreen setActive={setActive} country={country} setCountry={setCountry} level={level} setLevel={setLevel} isOffline={isOffline} plan={plan} lang={lang} user={user} />;
    }
  };

  const isTrialExpired = user && user.trial_expires && new Date(user.trial_expires) < new Date();
  const hasPaidPlan = user && user.plan && user.plan !== "free" && user.plan_expires && new Date(user.plan_expires) > new Date();
  const isExempt = role === "admin" || role === "teacher";
  const mustPay = billingEnabled && user && isTrialExpired && !hasPaidPlan && !isExempt;

  const handlePaymentDone = () => { apiGet("/api/users/profile").then((d) => { if (d?.user) setUser(d.user); }).catch(() => {}); };

  if (mustPay) return <BillingScreen user={user} lang={lang} onPaid={handlePaymentDone} />;

  const isAdmin = role === "admin";

  return (
    <div style={{ background: C.bg, minHeight: "100vh", ...(isAdmin ? {} : { maxWidth: 480, margin: "0 auto" }), position: "relative" }}>
      {!isAdmin && <TopBar lang={lang} setLang={setLang} isOffline={isOffline} setIsOffline={setIsOffline} user={user} onAuthOpen={() => {}} onLogout={handleLogout} />}
      <div style={isAdmin ? {} : { paddingTop: 46, paddingBottom: 72 }}>{renderScreen()}</div>
      {!isAdmin && <NavBar active={active} setActive={setActive} role={role} lang={lang} />}
    </div>
  );
}
