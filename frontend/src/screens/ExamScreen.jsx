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
  FileText, Clock, CheckCircle, Star, Trophy, TrendingUp, ArrowRight, X, Sparkles, RefreshCw,
} from "lucide-react";

/**
 * ExamScreen — students generate AI practice papers for a chosen subject and
 * (optionally) target year at their assigned grade level. Papers are persisted
 * server-side so students can revisit or retake them from the history list.
 */
export default function ExamScreen({ country, level, lang, user }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const curr = CURRICULA[country];
  const countryCode = COUNTRY_CODE[country];
  const curriculum = curr.curriculum;
  const effectiveLevel = user?.grade_level || level;

  const [mode, setMode] = useState("browse"); // browse | practice | results
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [year, setYear] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingPaperId, setLoadingPaperId] = useState(null);

  const [paper, setPaper] = useState(null);
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState({});
  const [time, setTime] = useState(0);
  const [results, setResults] = useState(null);
  const timerRef = useRef();

  // Load subject options for the student's grade level.
  useEffect(() => {
    if (!hasAuthToken()) return;
    let alive = true;
    apiGet("/api/curriculum/subjects", { country: countryCode, curriculum, level: effectiveLevel })
      .then((d) => {
        if (!alive) return;
        const list = Array.isArray(d?.subjects) ? d.subjects : [];
        setSubjects(list);
        if (list.length && !subjectId) setSubjectId(list[0].id);
      })
      .catch(() => {});
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, curriculum, effectiveLevel]);

  // Load the student's paper history.
  const reloadHistory = () => {
    if (!hasAuthToken()) return;
    setHistoryLoading(true);
    apiGet("/api/exams/papers", { country: countryCode, curriculum, level: effectiveLevel })
      .then((d) => setHistory(Array.isArray(d?.papers) ? d.papers : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };
  useEffect(() => {
    reloadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, curriculum, effectiveLevel]);

  // Practice timer.
  useEffect(() => {
    if (mode === "practice" && time > 0) {
      timerRef.current = setInterval(() => setTime((s) => {
        if (s <= 1) { clearInterval(timerRef.current); doSubmit(); return 0; }
        return s - 1;
      }), 1000);
    }
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const startPractice = (p, questions) => {
    setPaper(p);
    setQs(questions);
    setAns({});
    setTime(Math.max(15, questions.length) * 60); // ~1 min per question, min 15 min
    setResults(null);
    setMode("practice");
  };

  const handleGenerate = async () => {
    setGenerateError("");
    if (!subjectId) {
      setGenerateError(lang === "sw" ? "Chagua somo kwanza." : "Choose a subject first.");
      return;
    }
    setGenerating(true);
    try {
      const payload = {
        subjectId,
        country: countryCode,
        curriculum,
        gradeLevel: effectiveLevel,
      };
      if (year) payload.year = Number(year);
      const d = await apiPost("/api/exams/generate", payload);
      const questions = Array.isArray(d?.questions) ? d.questions : [];
      if (!questions.length) throw new Error("empty");
      const paperInfo = {
        id: d.id,
        title: d.title,
        subject_id: d.subject_id,
        subject_name: d.subject_name,
        grade_level: d.grade_level,
        year: d.year,
      };
      reloadHistory();
      startPractice(paperInfo, questions);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message;
      if (String(msg || "").includes("402")) {
        setGenerateError(lang === "sw"
          ? "Muda wako wa bure umeisha. Nunua mpango kuendelea."
          : "Your free trial has ended. Activate a plan to keep generating exams.");
      } else if (String(msg || "").toLowerCase().includes("profile")) {
        setGenerateError(lang === "sw"
          ? "Kamilisha wasifu wako (darasa, mtaala, nchi) kabla ya kutengeneza mtihani."
          : "Complete your profile (grade, curriculum, country) before generating an exam.");
      } else {
        setGenerateError(lang === "sw"
          ? "Imeshindwa kutengeneza mtihani. Jaribu tena."
          : "Couldn't generate an exam. Please try again.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const openHistoryPaper = async (p) => {
    setLoadingPaperId(p.id);
    try {
      const d = await apiGet(`/api/exams/papers/${p.id}/questions`);
      const questions = Array.isArray(d?.questions) ? d.questions : [];
      if (!questions.length) throw new Error("empty");
      startPractice({
        id: d.id,
        title: d.title,
        subject_id: d.subject_id,
        subject_name: d.subject_name,
        grade_level: d.grade_level,
        year: d.year,
      }, questions);
    } catch {
      alert(lang === "sw" ? "Haikupatikana." : "Couldn't load that paper.");
    } finally {
      setLoadingPaperId(null);
    }
  };

  const doSubmit = () => {
    clearInterval(timerRef.current);
    let score = 0;
    qs.forEach((q, i) => { if (ans[i] === q.answer) score++; });
    const total = qs.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const perQuestion = Math.max(15, qs.length) * 60;
    const timeTakenSecs = Math.max(0, perQuestion - time);
    setResults({ score, total, pct });
    if (hasAuthToken()) {
      apiPost("/api/exams/attempts", {
        pastPaperId: paper?.id || null,
        questions: qs, answers: ans, score, total, timeTakenSecs,
      }).catch(() => {});
      if (paper?.subject_id) {
        apiPost("/api/progress/log", {
          activityType: "exam_complete",
          subjectId: paper.subject_id,
          score: pct,
          durationMins: Math.round(timeTakenSecs / 60),
        }).catch(() => {});
      }
    }
    setMode("results");
  };

  // ─── Practice mode ─────────────────────────────────────────────────────
  if (mode === "practice" && qs.length) return (
    <div className="px-[18px] pt-[18px] pb-[100px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-slate-900 text-[13px] font-body font-extrabold m-0">{paper?.title}</p>
          <p className="text-slate-400 text-[10px] font-body mt-0.5 mb-0">{curr.flag} {curr.name}{paper?.grade_level ? ` · ${paper.grade_level}` : ""}</p>
        </div>
        <div className={`rounded-[10px] py-[5px] px-3 flex items-center gap-1 border ${time < 60 ? "bg-rose-50 border-red-500" : "bg-slate-50 border-slate-200"}`}>
          <Clock size={14} className={time < 60 ? "text-red-500" : "text-purple-600"} />
          <span className={`font-body font-extrabold text-[15px] ${time < 60 ? "text-red-500" : "text-purple-600"}`}>{fmt(time)}</span>
        </div>
      </div>
      {qs.map((q, i) => (
        <Card key={i} className="mb-2.5">
          <p className="text-slate-900 text-[13px] mb-2.5 mt-0 font-body font-bold leading-normal">
            <span className="text-purple-600 font-extrabold">{i + 1}. </span>{q.q}
          </p>
          {(q.options || []).map((opt) => (
            <button
              key={opt}
              onClick={() => setAns((a) => ({ ...a, [i]: opt[0] }))}
              className={`block w-full text-left py-2 px-3 mb-1 rounded-[10px] text-xs font-body font-semibold cursor-pointer border ${ans[i] === opt[0] ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-200 bg-white text-slate-900"}`}
            >
              {opt}
            </button>
          ))}
        </Card>
      ))}
      <button onClick={doSubmit} className={btnPrimary}>
        <CheckCircle size={16} /> {t("submit_test")}
      </button>
    </div>
  );

  // ─── Results mode ──────────────────────────────────────────────────────
  if (mode === "results" && results) return (
    <div className="px-[18px] pt-[22px] pb-[100px] text-center">
      <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-3 ${results.pct >= 70 ? "bg-emerald-50" : results.pct >= 50 ? "bg-yellow-50" : "bg-rose-50"}`}>
        {results.pct >= 70 ? <Trophy size={36} className="text-emerald-500" /> : results.pct >= 50 ? <Star size={36} className="text-yellow-500" /> : <TrendingUp size={36} className="text-rose-500" />}
      </div>
      <h2 className="text-slate-900 text-[32px] font-heading font-black mb-1 mt-0">{results.pct}%</h2>
      <p className="text-slate-400 font-body mb-2">{results.score}/{results.total}</p>
      <Badge color={results.pct >= 70 ? C.accent : results.pct >= 50 ? C.gold : C.rose}>
        {results.pct >= 70 ? t("excellent") : results.pct >= 50 ? t("good_effort") : t("keep_practicing")}
      </Badge>
      <Card className="mt-4 text-left">
        <SecTitle>{t("answer_review")}</SecTitle>
        {qs.map((q, i) => (
          <div key={i} className="mb-2.5 pb-2.5 border-b border-slate-100">
            <p className="text-slate-900 text-xs font-body mb-[3px] mt-0"><b>{i + 1}.</b> {q.q}</p>
            <p className={`text-[11px] font-body mb-0.5 mt-0 flex items-center gap-1 ${ans[i] === q.answer ? "text-emerald-500" : "text-red-500"}`}>
              {ans[i] === q.answer ? <CheckCircle size={12} /> : <X size={12} />} {t("your_answer")}: {ans[i] || "—"} | {t("correct")}: {q.answer}
            </p>
            <p className="text-slate-400 text-[11px] font-body m-0 italic">{q.explanation}</p>
          </div>
        ))}
      </Card>
      <button
        onClick={() => { setMode("browse"); setResults(null); setQs([]); setPaper(null); reloadHistory(); }}
        className={`${btnPrimary} mt-3.5`}
      >
        {t("try_another")}
      </button>
    </div>
  );

  // ─── Browse mode (subject picker + history) ────────────────────────────
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 15 }, (_, i) => currentYear - 1 - i);

  return (
    <div className="px-[18px] pt-[22px] pb-[100px]">
      <h2 className="text-slate-900 text-[22px] mb-1 mt-0 font-heading font-black flex items-center gap-2">
        <FileText size={22} className="text-purple-600" /> {t("exam_prep")}
      </h2>
      <p className="text-slate-400 text-xs mb-3.5 mt-0 font-body">
        {curr.flag} {curr.name}{effectiveLevel ? ` · ${effectiveLevel}` : ""}
      </p>

      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-purple-600" />
          <p className="text-slate-900 text-[14px] font-body font-extrabold m-0">
            {lang === "sw" ? "Tengeneza Mtihani wa Mazoezi" : "Generate a Practice Paper"}
          </p>
        </div>
        <label className="block text-slate-500 text-[11px] font-body font-bold mb-1">
          {lang === "sw" ? "Somo" : "Subject"}
        </label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="w-full py-2 px-3 mb-3 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-[13px] font-body"
        >
          {!subjects.length && (
            <option value="">{lang === "sw" ? "Hakuna masomo" : "No subjects available"}</option>
          )}
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{lang === "sw" && s.name_sw ? s.name_sw : s.name}</option>
          ))}
        </select>
        <label className="block text-slate-500 text-[11px] font-body font-bold mb-1">
          {lang === "sw" ? "Mwaka (hiari)" : "Target year (optional)"}
        </label>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-full py-2 px-3 mb-3 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-[13px] font-body"
        >
          <option value="">{lang === "sw" ? "Chagua kiotomatiki" : "Auto (most recent)"}</option>
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {generateError && (
          <p className="text-red-500 text-[11px] font-body font-semibold mb-2 mt-0">{generateError}</p>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating || !subjectId}
          className={`${btnPrimary} ${(generating || !subjectId) ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {generating ? <Spinner size={14} /> : <Sparkles size={16} />}
          {generating
            ? (lang === "sw" ? "Inatengeneza…" : "Generating…")
            : (lang === "sw" ? "Tengeneza Mtihani" : "Generate Paper")}
        </button>
      </Card>

      <div className="flex justify-between items-center mb-2">
        <SecTitle>{lang === "sw" ? "Mitihani Yako" : "Your Papers"}</SecTitle>
        <button
          onClick={reloadHistory}
          className="text-purple-600 text-[11px] font-body font-semibold flex items-center gap-1 border-none bg-transparent cursor-pointer"
        >
          <RefreshCw size={12} /> {lang === "sw" ? "Onyesha upya" : "Refresh"}
        </button>
      </div>

      {historyLoading && (
        <Card className="text-center"><Spinner /></Card>
      )}
      {!historyLoading && history.length === 0 && (
        <Card className="text-center">
          <p className="text-slate-900 text-[13px] font-body font-extrabold mb-1 mt-0">
            {lang === "sw" ? "Bado hakuna mitihani" : "No papers yet"}
          </p>
          <p className="text-slate-400 text-[11px] font-body m-0">
            {lang === "sw"
              ? "Tengeneza mtihani wako wa kwanza hapo juu."
              : "Generate your first practice paper above."}
          </p>
        </Card>
      )}
      {!historyLoading && history.map((p) => (
        <Card key={p.id} className="mb-2.5" hover>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-slate-900 text-[13px] mb-[3px] mt-0 font-body font-extrabold">{p.title}</p>
              <p className="text-slate-400 text-[11px] m-0 font-body">
                {(p.subject_name || "—")} · {p.grade_level || effectiveLevel} · {p.year}
              </p>
            </div>
            <button
              onClick={() => openHistoryPaper(p)}
              disabled={loadingPaperId === p.id}
              className={`py-[7px] px-3.5 rounded-[10px] border-none cursor-pointer shrink-0 ml-2.5 bg-gradient-accent text-white text-[11px] font-body font-extrabold flex items-center gap-1 ${loadingPaperId === p.id ? "opacity-60" : ""}`}
            >
              <ArrowRight size={12} /> {loadingPaperId === p.id ? "…" : t("start")}
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
