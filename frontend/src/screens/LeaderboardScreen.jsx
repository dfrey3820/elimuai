"use client";
import { useState, useEffect } from "react";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiGet } from "@/utils/api";
import { FLAG, LEADERBOARD_MOCK } from "@/shared/constants";
import { Card, Badge, SecTitle } from "@/components/ui";
import { Trophy, FileText, Flame, Award } from "lucide-react";

export default function LeaderboardScreen({ lang, user }) {
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
    <div className="px-[18px] pt-[22px] pb-[100px]">
      <h2 className="text-slate-900 text-[22px] mb-1 mt-0 font-heading font-black flex items-center gap-2"><Trophy size={22} className="text-yellow-500" /> {t("rankings")}</h2>
      <p className="text-slate-400 text-xs mb-3.5 mt-0 font-body">{FLAG.KE} Kenya · {FLAG.TZ} Tanzania · {FLAG.UG} Uganda</p>
      <div className="flex gap-1.5 mb-2.5">
        {[{ k: "global", l: t("global") }, { k: "country", l: t("country") }, { k: "school", l: t("school") }].map((o) => (
          <button key={o.k} onClick={() => setScope(o.k)} className={`flex-1 py-[7px] rounded-[10px] border-none cursor-pointer text-[11px] font-body font-extrabold ${scope === o.k ? "bg-purple-600 text-white" : "bg-slate-50 text-slate-400"}`}>{o.l}</button>
        ))}
      </div>
      <div className="flex gap-1.5 mb-4">
        {[{ k: "weekly", l: t("weekly") }, { k: "monthly", l: t("monthly") }, { k: "all_time", l: t("all_time") }].map((o) => (
          <button key={o.k} onClick={() => setPeriod(o.k)} className={`flex-1 py-1.5 rounded-[10px] cursor-pointer text-[10px] font-body font-extrabold border ${period === o.k ? "border-emerald-500 bg-emerald-50 text-emerald-500" : "border-slate-200 bg-transparent text-slate-400"}`}>{o.l}</button>
        ))}
      </div>
      {displayUser && (
        <Card className="bg-yellow-50 border-yellow-500/20 mb-3.5">
          <SecTitle color={C.gold}>{t("your_rank")}</SecTitle>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-base font-black text-white font-body">{displayUser.avatar || "Y"}</div>
              <div><p className="text-slate-900 text-sm mb-0.5 mt-0 font-body font-extrabold">{displayUser.name || "You"}</p><p className="text-slate-400 text-[11px] m-0 font-body flex items-center gap-1.5"><Flame size={12} className="text-orange-500" /> {displayUser.streak} {t("days")} · <FileText size={12} /> {displayUser.tests}</p></div>
            </div>
            <div className="text-right"><p className="text-yellow-500 text-[26px] m-0 font-body font-black">#{displayUser.rank}</p><p className="text-slate-400 text-[11px] mt-0.5 mb-0 font-body">{displayUser.xp} XP</p></div>
          </div>
        </Card>
      )}
      <SecTitle>{t("top_learners")}</SecTitle>
      {displayEntries.map((e, idx) => (
        <div key={e.rank} className={`rounded-xl py-[11px] px-3.5 mb-2 flex items-center gap-2.5 shadow-sm animate-fadeIn border ${e.is_current ? "bg-purple-50 border-purple-600" : "bg-white border-slate-200"}`} style={{ animationDelay: `${idx * 0.04}s` }}>
          <div className="w-8 text-center shrink-0">
            {MEDAL_COLORS[e.rank] ? <Award size={20} color={MEDAL_COLORS[e.rank]} fill={MEDAL_COLORS[e.rank]} /> : <span className="text-slate-400 font-body font-black text-sm">#{e.rank}</span>}
          </div>
          <div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm font-black text-white font-body shrink-0 ${e.is_current ? "bg-gradient-primary" : "bg-gradient-accent"}`}>{e.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5"><p className={`text-[13px] m-0 font-body font-extrabold overflow-hidden text-ellipsis whitespace-nowrap ${e.is_current ? "text-purple-600" : "text-slate-900"}`}>{e.name}</p><span className="text-[13px]">{FLAG[e.country]}</span></div>
            <p className="text-slate-400 text-[10px] mt-0.5 mb-0 font-body flex items-center gap-1.5"><Flame size={10} /> {e.streak} · <FileText size={10} /> {e.tests}</p>
          </div>
          <div className="text-right shrink-0"><p className={`text-[15px] m-0 font-body font-black ${e.is_current ? "text-purple-600" : "text-slate-900"}`}>{e.xp.toLocaleString()}</p><p className="text-slate-400 text-[9px] mt-[1px] mb-0 font-body">XP</p></div>
        </div>
      ))}
    </div>
  );
}
