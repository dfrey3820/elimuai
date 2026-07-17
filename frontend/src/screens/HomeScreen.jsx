"use client";
import { useState, useEffect } from "react";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiGet } from "@/utils/api";
import { hasAuthToken } from "@/utils/auth";
import { CURRICULA } from "@/data/constants";
import { Card, Badge } from "@/components/ui";
import CurriculumPicker from "@/components/CurriculumPicker";
import {
  Bot, FileText, BookOpen, Trophy, Flame, Star, Target, Globe, WifiOff,
  Award, Zap, Medal, Crown, Sparkles, Rocket, CheckCircle, Lock, AlertTriangle,
} from "lucide-react";

// Maps backend achievement `icon` strings (or code fragments) to Lucide icons.
// Falls back to Award. Keys are intentionally lower-case for case-insensitive match.
const ACHIEVEMENT_ICONS = {
  flame: Flame, streak: Flame,
  book: BookOpen, "book-open": BookOpen, question: BookOpen, questions: BookOpen,
  star: Star, top: Star, scorer: Star,
  target: Target, perfect: Target, test: Target,
  globe: Globe, country: Globe, countries: Globe,
  trophy: Trophy,
  award: Award, achievement: Award,
  zap: Zap, bolt: Zap,
  medal: Medal,
  crown: Crown,
  sparkles: Sparkles,
  rocket: Rocket,
};
function pickAchievementIcon(a) {
  const keys = [a?.icon, a?.code].filter(Boolean).map((s) => String(s).toLowerCase());
  for (const k of keys) {
    if (ACHIEVEMENT_ICONS[k]) return ACHIEVEMENT_ICONS[k];
    for (const part of k.split(/[_\-\s]/)) if (ACHIEVEMENT_ICONS[part]) return ACHIEVEMENT_ICONS[part];
  }
  return Award;
}

export default function HomeScreen({ setActive, country, setCountry, level, setLevel, isOffline, plan, lang, user, subStatus }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [summary, setSummary] = useState(null);
  const [achievements, setAchievements] = useState(null); // null=loading, []=empty
  useEffect(() => {
    let alive = true;
    if (isOffline || !hasAuthToken()) { setAchievements([]); return; }
    apiGet("/api/progress/summary").then((d) => { if (alive) setSummary(d); }).catch(() => {});
    apiGet("/api/progress/achievements")
      .then((d) => { if (alive) setAchievements(Array.isArray(d?.achievements) ? d.achievements : []); })
      .catch(() => { if (alive) setAchievements([]); });
    return () => { alive = false; };
  }, [isOffline, user?.id]);
  const planLabel = (user?.plan || plan || "free").toUpperCase();
  const streakDays = summary?.streak ?? 7;
  const weekMins = summary?.weekMins ?? 320;
  // Once a student has been assigned a class (either by a teacher during onboarding, or by choosing
  // it themselves in the Profile modal), hide the country + class picker. Class changes are then
  // managed once per year from the Profile screen. Non-student roles (parents/guest) keep the picker.
  const isStudent = user?.role === "student";
  const hidePicker = isStudent && !!user?.grade_level;
  return (
    <div className="px-5 pt-6 pb-[100px]">
      <div className="flex justify-between items-center mb-5">
        <div>
          <p className="text-slate-400 text-xs m-0 font-body">{CURRICULA[country].flag} {CURRICULA[country].name}</p>
          <h1 className="text-slate-900 text-2xl mt-0.5 mb-0 font-heading font-black">{t("greeting")}</h1>
        </div>
        <Badge color={planLabel === "FREE" ? C.textMuted : C.success}>{planLabel === "FREE" ? "FREE" : planLabel}</Badge>
      </div>
      {hidePicker ? (
        <div className="mb-3.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-purple-50 text-purple-600 text-[11px] font-body font-bold">
            {CURRICULA[country]?.flag} {user.grade_level}
          </span>
        </div>
      ) : (
        <CurriculumPicker country={country} setCountry={setCountry} level={level} setLevel={setLevel} />
      )}
      <Card className="bg-yellow-50 border-yellow-500/20 mb-4 flex justify-between items-center">
        <div>
          <p className="text-yellow-500 text-[10px] m-0 font-body font-extrabold tracking-wider uppercase">{t("streak")}</p>
          <p className="text-slate-900 text-[28px] mt-1 mb-0 font-heading font-black flex items-center gap-2">{streakDays} {t("days")} <Flame size={24} className="text-orange-500" /></p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-[10px] m-0 font-body">{t("mins_week")}</p>
          <p className="text-slate-900 text-xl mt-0.5 mb-0 font-body font-extrabold">{weekMins}</p>
        </div>
      </Card>
      {/* Subscription banner — warns when trial is about to expire and blocks
          when it has already expired. Only shown when billing is enforced and
          the user is not exempt (admins/teachers/school-linked students). */}
      {subStatus && subStatus.billingEnabled && subStatus.source !== "exempt" && subStatus.source !== "school" && (
        <>
          {subStatus.source === "expired" && (
            <Card className="bg-rose-50 border-red-500/20 mb-3.5">
              <div className="flex gap-2.5 items-start">
                <Lock size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-500 text-xs font-body font-extrabold mb-0.5 mt-0">
                    {lang === "sw" ? "Kipindi cha bure kimeisha" : "Your free trial has ended"}
                  </p>
                  <p className="text-slate-600 text-[11px] font-body m-0 mb-2">
                    {lang === "sw"
                      ? "Amilisha mpango ili kuendelea kutumia AI Tutor na Homework Help."
                      : "Activate a plan to keep using AI Tutor and Homework Help."}
                  </p>
                  <button
                    onClick={() => setActive("Plans")}
                    className="py-1.5 px-3.5 rounded-lg bg-red-500 text-white text-[11px] font-body font-extrabold border-none cursor-pointer hover:bg-red-600"
                  >
                    {lang === "sw" ? "Amilisha mpango" : "Activate plan"}
                  </button>
                </div>
              </div>
            </Card>
          )}
          {subStatus.source === "trial" && subStatus.daysRemaining !== null && subStatus.daysRemaining <= 7 && (
            <Card className="bg-orange-50 border-amber-500/20 mb-3.5">
              <div className="flex gap-2.5 items-start">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-amber-600 text-xs font-body font-extrabold mb-0.5 mt-0">
                    {lang === "sw"
                      ? `Kipindi cha bure kinaisha kwa siku ${subStatus.daysRemaining}`
                      : `Trial ends in ${subStatus.daysRemaining} ${subStatus.daysRemaining === 1 ? "day" : "days"}`}
                  </p>
                  <p className="text-slate-600 text-[11px] font-body m-0 mb-2">
                    {lang === "sw"
                      ? "Chagua mpango ili usikatishwe kutumia AI."
                      : "Pick a plan so AI features stay on."}
                  </p>
                  <button
                    onClick={() => setActive("Plans")}
                    className="py-1.5 px-3.5 rounded-lg bg-amber-500 text-white text-[11px] font-body font-extrabold border-none cursor-pointer hover:bg-amber-600"
                  >
                    {lang === "sw" ? "Tazama mipango" : "View plans"}
                  </button>
                </div>
              </div>
            </Card>
          )}
          {subStatus.source === "personal" && subStatus.daysRemaining !== null && subStatus.daysRemaining <= 5 && (
            <Card className="bg-orange-50 border-amber-500/20 mb-3.5">
              <div className="flex gap-2.5 items-start">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-amber-600 text-xs font-body font-extrabold mb-0.5 mt-0">
                    {lang === "sw"
                      ? `Mpango wako unaisha kwa siku ${subStatus.daysRemaining}`
                      : `Your plan renews in ${subStatus.daysRemaining} ${subStatus.daysRemaining === 1 ? "day" : "days"}`}
                  </p>
                  <button
                    onClick={() => setActive("Plans")}
                    className="py-1.5 px-3.5 rounded-lg bg-amber-500 text-white text-[11px] font-body font-extrabold border-none cursor-pointer hover:bg-amber-600 mt-1.5"
                  >
                    {lang === "sw" ? "Onyesha upya" : "Renew now"}
                  </button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
      {isOffline && (
        <Card className="bg-orange-50 border-amber-500/20 mb-3.5">
          <div className="flex gap-2.5 items-start">
            <WifiOff size={18} className="text-amber-500" />
            <div>
              <p className="text-amber-500 text-xs font-body font-extrabold mb-0.5 mt-0">{t("offline_mode")}</p>
              <p className="text-slate-500 text-[11px] font-body m-0">{t("offline_desc")}</p>
            </div>
          </div>
        </Card>
      )}
      <p className="text-slate-400 text-[10px] mb-2.5 font-body tracking-wider uppercase font-bold">{t("quick_actions")}</p>
      <div className="grid grid-cols-2 gap-2.5 mb-[18px]">
        {[
          { l: t("ai_tutor"), icon: Bot, c: C.primary, s: "Tutor", ok: !isOffline },
          { l: t("exam_prep"), icon: FileText, c: C.accent, s: "Exams", ok: true },
          { l: t("homework_help"), icon: BookOpen, c: C.secondary, s: "Homework", ok: !isOffline },
          { l: t("rankings"), icon: Trophy, c: C.gold, s: "Rankings", ok: true },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.l} onClick={() => a.ok && setActive(a.s)} className={`bg-white border border-slate-200 rounded-[14px] py-4 px-3.5 text-left shadow-sm transition-all duration-200 ${isOffline && !a.ok ? "opacity-45 cursor-not-allowed border-slate-100" : "cursor-pointer"}`}>
              <Icon size={26} color={a.c} strokeWidth={1.5} className="mb-1.5" />
              <p className="text-slate-900 text-xs m-0 font-body font-extrabold">{a.l}</p>
            </button>
          );
        })}
      </div>
      <p className="text-slate-400 text-[10px] mb-2.5 font-body tracking-wider uppercase font-bold">{t("achievements")}</p>
      {achievements === null ? (
        <div className="text-slate-400 text-[11px] font-body italic">{t("loading") || "Loading..."}</div>
      ) : achievements.length === 0 ? (
        <div className="flex gap-2 flex-wrap opacity-60">
          <Badge color={C.textMuted}><span className="inline-flex items-center gap-1"><Lock size={12} /> {t("no_achievements_yet") || "No achievements yet"}</span></Badge>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {achievements.map((a) => {
            const Icon = pickAchievementIcon(a);
            const label = lang === "sw" ? (a.name_sw || a.name) : a.name;
            const earned = !!a.earned;
            return (
              <Badge
                key={a.id || a.code}
                color={earned ? C.gold : C.textMuted}
                className={earned ? "" : "opacity-55"}
              >
                <span
                  className="inline-flex items-center gap-1"
                  title={(lang === "sw" ? (a.desc_sw || a.description) : a.description) || label}
                >
                  {earned ? <Icon size={12} /> : <Lock size={12} />} {label}
                  {earned && a.xp_reward ? <span className="ml-1 opacity-80">+{a.xp_reward}</span> : null}
                </span>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
