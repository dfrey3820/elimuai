"use client";
import { useState, useEffect, useRef } from "react";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost, apiGet } from "@/utils/api";
import { hasAuthToken } from "@/utils/auth";
import { CURRICULA } from "@/data/constants";
import { COUNTRY_CODE, btnPrimary } from "@/shared/constants";
import { Spinner, Card, Badge, SecTitle } from "@/components/ui";
import {
  FileText, Clock, CheckCircle, Star, Trophy, TrendingUp, ArrowRight, X,
} from "lucide-react";

export default function ExamScreen({ country, level, lang, user }) {
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
    <div className="px-[18px] pt-[18px] pb-[100px]">
      <div className="flex justify-between items-center mb-4">
        <div><p className="text-slate-900 text-[13px] font-body font-extrabold m-0">{paper?.title}</p><p className="text-slate-400 text-[10px] font-body mt-0.5 mb-0">{curr.flag} {curr.name}</p></div>
        <div className={`rounded-[10px] py-[5px] px-3 flex items-center gap-1 border ${time < 60 ? "bg-rose-50 border-red-500" : "bg-slate-50 border-slate-200"}`}>
          <Clock size={14} className={time < 60 ? "text-red-500" : "text-purple-600"} />
          <span className={`font-body font-extrabold text-[15px] ${time < 60 ? "text-red-500" : "text-purple-600"}`}>{fmt(time)}</span>
        </div>
      </div>
      {qs.map((q, i) => (
        <Card key={i} className="mb-2.5">
          <p className="text-slate-900 text-[13px] mb-2.5 mt-0 font-body font-bold leading-normal"><span className="text-purple-600 font-extrabold">{i + 1}. </span>{q.q}</p>
          {q.options.map((opt) => (
            <button key={opt} onClick={() => setAns((a) => ({ ...a, [i]: opt[0] }))} className={`block w-full text-left py-2 px-3 mb-1 rounded-[10px] text-xs font-body font-semibold cursor-pointer border ${ans[i] === opt[0] ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-200 bg-white text-slate-900"}`}>{opt}</button>
          ))}
        </Card>
      ))}
      <button onClick={doSubmit} className={btnPrimary}><CheckCircle size={16} /> {t("submit_test")}</button>
    </div>
  );
  if (mode === "results" && results) return (
    <div className="px-[18px] pt-[22px] pb-[100px] text-center">
      <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-3 ${results.pct >= 70 ? "bg-emerald-50" : results.pct >= 50 ? "bg-yellow-50" : "bg-rose-50"}`}>
        {results.pct >= 70 ? <Trophy size={36} className="text-emerald-500" /> : results.pct >= 50 ? <Star size={36} className="text-yellow-500" /> : <TrendingUp size={36} className="text-rose-500" />}
      </div>
      <h2 className="text-slate-900 text-[32px] font-heading font-black mb-1 mt-0">{results.pct}%</h2>
      <p className="text-slate-400 font-body mb-2">{results.score}/{results.total}</p>
      <Badge color={results.pct >= 70 ? C.accent : results.pct >= 50 ? C.gold : C.rose}>{results.pct >= 70 ? t("excellent") : results.pct >= 50 ? t("good_effort") : t("keep_practicing")}</Badge>
      <Card className="mt-4 text-left">
        <SecTitle>{t("answer_review")}</SecTitle>
        {qs.map((q, i) => (
          <div key={i} className="mb-2.5 pb-2.5 border-b border-slate-100">
            <p className="text-slate-900 text-xs font-body mb-[3px] mt-0"><b>{i + 1}.</b> {q.q}</p>
            <p className={`text-[11px] font-body mb-0.5 mt-0 flex items-center gap-1 ${ans[i] === q.answer ? "text-emerald-500" : "text-red-500"}`}>{ans[i] === q.answer ? <CheckCircle size={12} /> : <X size={12} />} {t("your_answer")}: {ans[i] || "—"} | {t("correct")}: {q.answer}</p>
            <p className="text-slate-400 text-[11px] font-body m-0 italic">{q.explanation}</p>
          </div>
        ))}
      </Card>
      <button onClick={() => { setMode("browse"); setResults(null); setQs([]); }} className={`${btnPrimary} mt-3.5`}>{t("try_another")}</button>
    </div>
  );
  return (
    <div className="px-[18px] pt-[22px] pb-[100px]">
      <h2 className="text-slate-900 text-[22px] mb-1 mt-0 font-heading font-black flex items-center gap-2"><FileText size={22} className="text-purple-600" /> {t("exam_prep")}</h2>
      <p className="text-slate-400 text-xs mb-2.5 mt-0 font-body">{curr.flag} {curr.name}</p>
      <div className="flex gap-1.5 mb-3.5 flex-wrap">{curr.exams.map((e) => (<Badge key={e} color={C.accent}>{e}</Badge>))}</div>
      {papers.map((p) => (
        <Card key={p.id} className="mb-2.5" hover>
          <div className="flex justify-between items-start">
            <div className="flex-1"><p className="text-slate-900 text-[13px] mb-[3px] mt-0 font-body font-extrabold">{p.title}</p><p className="text-slate-400 text-[11px] m-0 font-body">{p.level} · {p.year} · 5 Qs · 5 min</p></div>
            <button onClick={() => startPractice(p)} disabled={loading} className={`py-[7px] px-3.5 rounded-[10px] border-none cursor-pointer shrink-0 ml-2.5 bg-gradient-accent text-white text-[11px] font-body font-extrabold flex items-center gap-1 ${loading ? "opacity-60" : ""}`}><ArrowRight size={12} /> {loading ? "..." : t("start")}</button>
          </div>
        </Card>
      ))}
    </div>
  );
}
