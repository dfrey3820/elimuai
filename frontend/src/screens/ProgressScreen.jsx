"use client";
import { useState, useEffect } from "react";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiGet } from "@/utils/api";
import { hasAuthToken } from "@/utils/auth";
import { CURRICULA } from "@/data/constants";
import { OFFLINE_LESSONS } from "@/shared/constants";
import { Card, Badge, SecTitle } from "@/components/ui";
import { BarChart3, FileText, Clock, Flame, Mail } from "lucide-react";

export default function ProgressScreen({ country, level, lang, user }) {
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
    <div className="px-[18px] pt-[22px] pb-[100px]">
      <h2 className="text-slate-900 text-[22px] mb-1 mt-0 font-heading font-black flex items-center gap-2"><BarChart3 size={22} className="text-purple-600" /> {t("my_progress")}</h2>
      <p className="text-slate-400 text-xs mb-4 mt-0 font-body">{CURRICULA[country].flag} {CURRICULA[country].name} · {level}</p>
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {[{ l: t("days_streak"), v: streakVal, icon: Flame, c: C.secondary }, { l: t("mins_week"), v: weekMins, icon: Clock, c: C.primary }, { l: t("tests_taken"), v: testsTaken, icon: FileText, c: C.accent }].map((s) => {
          const Icon = s.icon;
          return (<Card key={s.l} className="text-center py-3 px-2"><Icon size={20} color={s.c} className="mb-1" /><p className="text-slate-900 text-xl mb-[3px] mt-0 font-body font-black">{s.v}</p><p className="text-slate-400 text-[9px] m-0 font-body font-bold">{s.l}</p></Card>);
        })}
      </div>
      <Card className="mb-3.5">
        <SecTitle>{t("subject_performance")}</SecTitle>
        {subjects.map((s) => (
          <div key={s.name} className="mb-[11px]">
            <div className="flex justify-between mb-[3px]"><span className="text-slate-900 text-xs font-body font-bold">{s.name}</span><span className="text-xs font-body font-extrabold" style={{ color: s.color }}>{s.score}%</span></div>
            <div className="bg-slate-50 rounded-md h-[7px] overflow-hidden"><div className="h-full rounded-md" style={{ width: `${s.score}%`, background: s.color }} /></div>
          </div>
        ))}
      </Card>
      <Card className="mb-3.5">
        <SecTitle>{t("cached_lessons")}</SecTitle>
        {offlineLessons?.length ? offlineLessons.map((l) => (<div key={l.id} className="bg-slate-50 rounded-[10px] px-3 py-2 mb-[5px] border border-slate-100"><p className="text-purple-600 text-[11px] font-body font-bold mb-[3px] mt-0">{l.title}</p><p className="text-slate-400 text-[10px] font-body m-0">{l.content.substring(0, 100)}...</p></div>))
        : Object.entries(OFFLINE_LESSONS).map(([subj, lessons]) => (<div key={subj} className="mb-2.5"><p className="text-slate-900 text-xs font-body font-extrabold mb-[5px] mt-0">{subj}</p>{lessons.map((l) => (<div key={l.title.en} className="bg-slate-50 rounded-[10px] px-3 py-2 mb-[5px] border border-slate-100"><p className="text-purple-600 text-[11px] font-body font-bold mb-[3px] mt-0">{l.title[lang] || l.title.en}</p><p className="text-slate-400 text-[10px] font-body m-0">{(l.content[lang] || l.content.en).substring(0, 100)}...</p></div>))}</div>))}
      </Card>
      <Card className="bg-emerald-50 border-emerald-500/20">
        <div className="flex items-center gap-2 mb-1.5"><Mail size={16} className="text-emerald-500" /><p className="text-emerald-500 text-[11px] font-body font-extrabold tracking-wider m-0 uppercase">{t("weekly_report")}</p></div>
        <p className="text-slate-900 text-xs font-body leading-normal mb-2 mt-0">{t("report_desc")}</p>
        <Badge color={C.accent}>{t("auto_sent")}</Badge>
      </Card>
    </div>
  );
}
