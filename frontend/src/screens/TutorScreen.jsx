"use client";
import { useState, useEffect, useRef } from "react";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost } from "@/utils/api";
import { CURRICULA } from "@/data/constants";
import { OFFLINE_LESSONS } from "@/shared/constants";
import { Spinner, Card, Badge, SecTitle, SubjectPills } from "@/components/ui";
import { Bot, Send, WifiOff, Download, Check, Lock, Camera, X } from "lucide-react";
import PhotoScan from "@/components/PhotoScan";

export default function TutorScreen({ country, level, isOffline, lang, user, subStatus, setActive }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const curr = CURRICULA[country];
  const subjects = curr.levels[level] || [];
  const [subject, setSubject] = useState(subjects[0] || "Mathematics");
  const [msgs, setMsgs] = useState([{ role: "assistant", text: lang === "sw" ? `Habari! Mimi ni mwalimu wako wa ElimuAI kwa **${level}** chini ya **${curr.name}**.\n\nNiulize chochote kuhusu ${subject}. Nitaeleza hatua kwa hatua na mifano kutoka Afrika Mashariki!` : `Hi! I'm your ElimuAI tutor for **${level}** under the **${curr.name}**.\n\nAsk me anything about ${subject}. I'll explain step-by-step with East African examples!` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Tracks which assistant messages have been saved as offline lessons — keyed by message index.
  const [savedIdx, setSavedIdx] = useState({});
  const [savingIdx, setSavingIdx] = useState(null);
  // Set to true if the server returns 402 — AI is locked until the user upgrades.
  const [locked, setLocked] = useState(false);
  // Show the photo-scan panel above the input bar when true.
  const [showPhotoScan, setShowPhotoScan] = useState(false);
  const endRef = useRef();
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => {
    // Pre-lock based on subscription status so users don't waste a keystroke.
    if (subStatus && subStatus.billingEnabled && subStatus.aiEnabled === false) setLocked(true);
  }, [subStatus?.aiEnabled, subStatus?.billingEnabled]);
  const send = async () => {
    if (!input.trim() || loading || isOffline || locked) return;
    const q = input.trim(); setInput("");
    setMsgs((p) => [...p, { role: "user", text: q }]); setLoading(true);
    const history = msgs.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
    history.push({ role: "user", content: q });
    try {
      const data = await apiPost("/api/ai/tutor", { messages: history, subject });
      setMsgs((p) => [...p, { role: "assistant", text: data?.reply || (lang === "sw" ? "Samahani, tatizo la mtandao." : "Sorry, connection issue.") }]);
    } catch (err) {
      if (err?.status === 402) {
        setLocked(true);
      } else {
        const msg = err?.status === 401 ? (lang === "sw" ? "Tafadhali ingia ili kutumia AI." : "Please sign in to use AI.") : (err?.message || "Error");
        setMsgs((p) => [...p, { role: "assistant", text: msg }]);
      }
    } finally { setLoading(false); }
  };
  // Save an assistant reply (and the preceding user question) as a personal offline lesson.
  const saveAsLesson = async (assistantIdx) => {
    if (savedIdx[assistantIdx] || savingIdx === assistantIdx) return;
    // Find the most recent user message before this assistant reply.
    let questionText = "";
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (msgs[i].role === "user") { questionText = msgs[i].text; break; }
    }
    if (!questionText) return; // Skip the greeting message that has no preceding question.
    setSavingIdx(assistantIdx);
    try {
      await apiPost("/api/curriculum/offline-lessons/from-tutor", {
        question: questionText,
        answer: msgs[assistantIdx].text,
        subject,
      });
      setSavedIdx((prev) => ({ ...prev, [assistantIdx]: true }));
    } catch (err) {
      // Surface the error inline as a system message instead of alert().
      setMsgs((p) => [...p, { role: "assistant", text: (lang === "sw" ? "Samahani, imeshindwa kuhifadhi somo: " : "Sorry, failed to save lesson: ") + (err?.message || "Error") }]);
    } finally {
      setSavingIdx(null);
    }
  };
  if (isOffline) return (
    <div className="px-5 pt-6 pb-[100px]">
      <h2 className="text-slate-900 text-[22px] mb-1.5 mt-0 font-heading font-black">{t("ai_tutor")}</h2>
      <Card className="bg-orange-50 border-amber-500/20 mb-[18px]">
        <div className="flex gap-2 items-center"><WifiOff size={18} className="text-amber-500" /><p className="text-amber-500 font-body font-extrabold m-0">{t("offline_tutor")}</p></div>
      </Card>
      <SecTitle>{t("offline_lessons")}</SecTitle>
      {Object.entries(OFFLINE_LESSONS).map(([subj, lessons]) => (
        <div key={subj} className="mb-3.5">
          <p className="text-purple-600 text-xs font-body font-extrabold mb-2 mt-0">{subj.toUpperCase()}</p>
          {lessons.map((l) => (<Card key={l.title.en} className="mb-2"><p className="text-slate-900 text-[13px] font-body font-extrabold mb-1.5 mt-0">{l.title[lang] || l.title.en}</p><p className="text-slate-500 text-xs font-body leading-relaxed m-0 whitespace-pre-wrap">{l.content[lang] || l.content.en}</p></Card>))}
        </div>
      ))}
    </div>
  );
  return (
    <div className="flex flex-col h-screen">
      <div className="px-4 pt-3 pb-2 bg-white border-b border-slate-200 shrink-0 mt-11">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-slate-900 text-[17px] m-0 font-heading font-black flex items-center gap-1.5"><Bot size={20} className="text-purple-600" /> {t("ai_tutor")}</h2>
          <Badge color={C.accent}>{curr.flag} {curr.name}</Badge>
        </div>
        <SubjectPills subjects={subjects} active={subject} setActive={setSubject} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-3.5 flex flex-col gap-2.5 pb-[100px] bg-slate-50">
        {msgs.map((m, i) => {
          // Only assistant replies that follow a user question can be saved
          // (the greeting message has no prior question).
          const hasPriorQuestion = m.role === "assistant" && msgs.slice(0, i).some((p) => p.role === "user");
          return (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center mr-1.5 shrink-0 self-end"><Bot size={14} color="#fff" /></div>}
              <div className="flex flex-col items-start max-w-[76%]">
                <div className={`w-full px-3.5 py-2.5 text-[13px] leading-relaxed font-body font-semibold whitespace-pre-wrap shadow-sm ${m.role === "user" ? "rounded-[16px_16px_4px_16px] bg-gradient-primary text-white border-none" : "rounded-[16px_16px_16px_4px] bg-white text-slate-900 border border-slate-200"}`}>{m.text}</div>
                {hasPriorQuestion && (
                  <button
                    onClick={() => saveAsLesson(i)}
                    disabled={!!savedIdx[i] || savingIdx === i}
                    className={`mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold border transition-colors ${savedIdx[i] ? "bg-emerald-50 border-emerald-200 text-emerald-600 cursor-default" : "bg-white border-slate-200 text-purple-600 hover:bg-purple-50 hover:border-purple-200 cursor-pointer"}`}
                  >
                    {savedIdx[i] ? (
                      <><Check size={11} /> {lang === "sw" ? "Imehifadhiwa" : "Saved offline"}</>
                    ) : savingIdx === i ? (
                      <>{lang === "sw" ? "Inahifadhi..." : "Saving..."}</>
                    ) : (
                      <><Download size={11} /> {lang === "sw" ? "Hifadhi kama somo" : "Save as lesson"}</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {loading && <div className="flex gap-1.5"><div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center"><Bot size={14} color="#fff" /></div><Card className="px-3.5 py-2"><Spinner /></Card></div>}
        <div ref={endRef} />
      </div>
      {locked ? (
        <div className="px-4 py-3 bg-white border-t border-red-200 fixed bottom-[62px] left-0 right-0 max-w-[520px] mx-auto box-border">
          <div className="flex items-start gap-2.5 bg-rose-50 border border-red-200 rounded-xl px-3 py-2.5">
            <Lock size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-red-500 text-[12px] font-body font-extrabold mb-0.5 mt-0">
                {lang === "sw" ? "AI imezimwa" : "AI is locked"}
              </p>
              <p className="text-slate-600 text-[11px] font-body m-0 mb-2">
                {lang === "sw"
                  ? "Kipindi cha bure kimeisha. Amilisha mpango ili kuendelea."
                  : "Your free trial has ended. Activate a plan to continue."}
              </p>
              <button
                onClick={() => setActive && setActive("Plans")}
                className="py-1.5 px-3.5 rounded-lg bg-red-500 text-white text-[11px] font-body font-extrabold border-none cursor-pointer hover:bg-red-600"
              >
                {lang === "sw" ? "Amilisha mpango" : "Activate plan"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-[62px] left-0 right-0 max-w-[520px] mx-auto box-border">
          {showPhotoScan && (
            <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-200 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-body font-extrabold text-purple-600 uppercase tracking-wider m-0">
                  {lang === "sw" ? "Piga picha ya kazi yako" : "Snap a photo of your work"}
                </p>
                <button
                  onClick={() => setShowPhotoScan(false)}
                  className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 border-none cursor-pointer flex items-center justify-center"
                  aria-label={lang === "sw" ? "Funga" : "Close"}
                >
                  <X size={12} />
                </button>
              </div>
              <PhotoScan
                subject={subject}
                lang={lang}
                locked={locked}
                onLockedError={() => setLocked(true)}
                onComplete={({ mode, text }) => {
                  const label = mode === "mark"
                    ? (lang === "sw" ? "📷 Ukaguzi wa picha" : "📷 Photo marking")
                    : (lang === "sw" ? "📷 Ufafanuzi wa picha" : "📷 Photo explanation");
                  setMsgs((p) => [...p, { role: "assistant", text: `**${label}**\n\n${text}` }]);
                  setShowPhotoScan(false);
                }}
              />
            </div>
          )}
          <div className="px-3 py-2 bg-white border-t border-slate-200 flex gap-2 items-end">
            <button
              onClick={() => setShowPhotoScan((v) => !v)}
              disabled={loading || isOffline}
              title={lang === "sw" ? "Piga picha" : "Photo scan"}
              className={`w-10 h-10 rounded-xl border-2 cursor-pointer flex items-center justify-center shrink-0 ${showPhotoScan ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-200 bg-white text-slate-500"} ${(loading || isOffline) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Camera size={16} />
            </button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`${t("type_question")} (${subject})`} rows={1} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-[13px] font-body resize-none outline-none" />
            <button onClick={send} disabled={loading} className={`w-10 h-10 rounded-xl border-none cursor-pointer bg-gradient-primary flex items-center justify-center ${loading ? "opacity-50" : ""}`}><Send size={16} color="#fff" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
