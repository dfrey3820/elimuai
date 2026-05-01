"use client";
import { useState } from "react";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost } from "@/utils/api";
import { CURRICULA } from "@/data/constants";
import { btnPrimary } from "@/shared/constants";
import { Spinner, Card, SecTitle, SubjectPills } from "@/components/ui";
import { BookOpen, CheckCircle, Target, WifiOff } from "lucide-react";

export default function HomeworkScreen({ country, level, isOffline, lang, user }) {
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
    <div className="px-[18px] pt-[22px] pb-[100px]">
      <h2 className="text-slate-900 text-[22px] mb-1 mt-0 font-heading font-black flex items-center gap-2"><BookOpen size={22} className="text-orange-500" /> {t("homework_help")}</h2>
      <p className="text-slate-400 text-xs mb-3.5 mt-0 font-body">{curr.flag} {curr.name} · {level}</p>
      {isOffline && <Card className="bg-orange-50 border-amber-500/20 mb-3"><div className="flex items-center gap-2"><WifiOff size={16} className="text-amber-500" /><p className="text-amber-500 font-body text-xs font-extrabold m-0">{t("ai_unavailable")}</p></div></Card>}
      <div className="flex bg-slate-50 rounded-xl p-[3px] mb-3 border border-slate-200">
        {["solve", "check"].map((m) => (
          <button key={m} onClick={() => { setMode(m); setResult(""); }} className={`flex-1 py-2 rounded-[10px] border-none cursor-pointer text-xs font-body font-extrabold ${mode === m ? "bg-gradient-primary text-white" : "bg-transparent text-slate-400"}`}>{m === "solve" ? t("solve_for_me") : t("check_my_work")}</button>
        ))}
      </div>
      <SubjectPills subjects={subjects.slice(0, 6)} active={subject} setActive={setSubject} />
      <div className="mt-2.5">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("type_question_hw")} rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-[13px] font-body resize-none outline-none mb-2 box-border" />
        {mode === "check" && <textarea value={myAnswer} onChange={(e) => setMyAnswer(e.target.value)} placeholder={t("type_answer")} rows={3} className="w-full bg-white border border-purple-600/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-[13px] font-body resize-none outline-none mb-2 box-border" />}
        <button onClick={submit} disabled={loading || isOffline} className={`${btnPrimary} mb-3.5 ${(loading || isOffline) ? "opacity-60" : ""}`}>{loading ? <Spinner color="#fff" size={6} /> : mode === "solve" ? <><Target size={16} /> {t("solve_btn")}</> : <><CheckCircle size={16} /> {t("check_btn")}</>}</button>
      </div>
      {loading && <Spinner />}
      {result && <Card><SecTitle color={C.accent}>{mode === "solve" ? t("solution") : t("review")}</SecTitle><p className="text-slate-900 text-[13px] font-body leading-relaxed m-0 whitespace-pre-wrap">{result}</p></Card>}
    </div>
  );
}
