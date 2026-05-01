"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";
import { hasAuthToken, clearTokens } from "@/utils/auth";
import { COUNTRY_NAME } from "@/shared/constants";
import {
  GraduationCap, Users, BookOpen, Settings, ArrowRight,
} from "lucide-react";

import NavBar from "@/components/NavBar";
import TopBar from "@/components/TopBar";
import HomeScreen from "@/screens/HomeScreen";
import TutorScreen from "@/screens/TutorScreen";
import ExamScreen from "@/screens/ExamScreen";
import HomeworkScreen from "@/screens/HomeworkScreen";
import LeaderboardScreen from "@/screens/LeaderboardScreen";
import ProgressScreen from "@/screens/ProgressScreen";
import PlansScreen from "@/screens/PlansScreen";
import BillingScreen from "@/screens/BillingScreen";
import SchoolAdmin from "@/screens/SchoolAdmin";

const SettingsIcon = Settings;

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
      setRole(r);
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
      setRole(r);
      if (r === "admin" || r === "super_admin") setActive("Overview");
      else if (r === "teacher" || r === "parent") setActive("Dashboard");
      else setActive("Home");
    }
  };

  const handleLogout = () => { clearTokens(); setUser(null); setRole(null); router.push("/login"); };
  const handleRole = (r) => { setRole(r); setActive(r === "admin" || r === "super_admin" ? "Overview" : r === "teacher" ? "Dashboard" : r === "parent" ? "Dashboard" : "Home"); };

  if (!role && !hasAuthToken()) {
    if (typeof window !== "undefined") router.push("/login");
    return null;
  }

  if (!role) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-3"><GraduationCap size={32} color="#fff" /></div>
      <h1 className="text-slate-900 text-4xl font-heading font-black text-center m-0 mb-1">ElimuAI</h1>
      <p className="text-purple-600 text-[11px] font-body font-extrabold tracking-[3px] text-center mb-1 uppercase">{lang === "sw" ? "Elimu Kwanza" : "Education First"}</p>
      <p className="text-slate-400 text-xs font-body text-center mb-7">{lang === "sw" ? "Chagua aina yako" : "Select your role to continue"}</p>
      {[{ role: "student", icon: GraduationCap, l: lang === "sw" ? "Mwanafunzi" : "Student", d: lang === "sw" ? "Jifunze na AI" : "Learn with AI tutor" }, { role: "teacher", icon: BookOpen, l: lang === "sw" ? "Mwalimu" : "Teacher", d: lang === "sw" ? "Simamia madarasa" : "Manage your classes" }, { role: "parent", icon: Users, l: lang === "sw" ? "Mzazi" : "Parent", d: lang === "sw" ? "Fuatilia watoto" : "Monitor children" }, { role: "admin", icon: SettingsIcon, l: lang === "sw" ? "Msimamizi" : "School Admin", d: lang === "sw" ? "Simamia shule" : "Manage your school" }].map((r) => { const Icon = r.icon; return (
        <button key={r.role} onClick={() => handleRole(r.role)} className="w-full max-w-[360px] py-[13px] px-4 rounded-[14px] border border-slate-200 bg-white cursor-pointer flex items-center gap-3 mb-2.5 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center"><Icon size={20} className="text-purple-600" /></div>
          <div className="text-left flex-1"><p className="text-slate-900 text-sm m-0 mb-0.5 font-body font-extrabold">{r.l}</p><p className="text-slate-400 text-[11px] m-0 font-body">{r.d}</p></div>
          <ArrowRight size={16} className="text-purple-600" />
        </button>);
      })}
    </div>
  );

  const renderScreen = () => {
    if (role === "super_admin" || role === "admin" || role === "teacher" || role === "student" || role === "parent") return <SchoolAdmin lang={lang} user={user} onLogout={handleLogout} country={country} setCountry={setCountry} level={level} setLevel={setLevel} isOffline={isOffline} plan={plan} setPlan={setPlan} />;
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
  const isExempt = role === "admin" || role === "super_admin" || role === "teacher" || role === "student";
  const mustPay = billingEnabled && user && isTrialExpired && !hasPaidPlan && !isExempt;

  const handlePaymentDone = () => { apiGet("/api/users/profile").then((d) => { if (d?.user) setUser(d.user); }).catch(() => {}); };

  if (mustPay) return <BillingScreen user={user} lang={lang} onPaid={handlePaymentDone} />;

  const isAdmin = role === "admin" || role === "super_admin" || role === "teacher" || role === "student" || role === "parent";

  return (
    <div className={`bg-slate-50 min-h-screen relative ${isAdmin ? "" : "max-w-2xl mx-auto"}`}>
      {!isAdmin && <TopBar lang={lang} setLang={setLang} isOffline={isOffline} setIsOffline={setIsOffline} user={user} onAuthOpen={() => {}} onLogout={handleLogout} />}
      <div className={isAdmin ? "" : "pt-[46px] pb-[72px]"}>{renderScreen()}</div>
      {!isAdmin && <NavBar active={active} setActive={setActive} role={role} lang={lang} />}
    </div>
  );
}
