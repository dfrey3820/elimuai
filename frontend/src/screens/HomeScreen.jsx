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
} from "lucide-react";

export default function HomeScreen({ setActive, country, setCountry, level, setLevel, isOffline, plan, lang, user }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
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
    <div className="px-5 pt-6 pb-[100px]">
      <div className="flex justify-between items-center mb-5">
        <div>
          <p className="text-slate-400 text-xs m-0 font-body">{CURRICULA[country].flag} {CURRICULA[country].name}</p>
          <h1 className="text-slate-900 text-2xl mt-0.5 mb-0 font-heading font-black">{t("greeting")}</h1>
        </div>
        <Badge color={planLabel === "FREE" ? C.textMuted : C.success}>{planLabel === "FREE" ? "FREE" : planLabel}</Badge>
      </div>
      <CurriculumPicker country={country} setCountry={setCountry} level={level} setLevel={setLevel} />
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
      <div className="flex gap-2 flex-wrap">
        {[{ l: "7-Day Streak", icon: Flame }, { l: "100 Questions", icon: BookOpen }, { l: "Top Scorer", icon: Star }, { l: "Perfect Test", icon: Target }, { l: "3 Countries", icon: Globe }].map((b) => {
          const Icon = b.icon;
          return <Badge key={b.l} color={C.gold}><span className="inline-flex items-center gap-1"><Icon size={12} /> {b.l}</span></Badge>;
        })}
      </div>
    </div>
  );
}
