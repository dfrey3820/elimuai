"use client";
import { useState, useEffect, useRef } from "react";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost } from "@/utils/api";
import { CURRICULA } from "@/data/constants";
import { OFFLINE_LESSONS } from "@/shared/constants";
import { Spinner, Card, Badge, SecTitle, SubjectPills } from "@/components/ui";
import { Bot, Send, WifiOff } from "lucide-react";

export default function TutorScreen({ country, level, isOffline, lang, user }) {
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
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center mr-1.5 shrink-0 self-end"><Bot size={14} color="#fff" /></div>}
            <div className={`max-w-[76%] px-3.5 py-2.5 text-[13px] leading-relaxed font-body font-semibold whitespace-pre-wrap shadow-sm ${m.role === "user" ? "rounded-[16px_16px_4px_16px] bg-gradient-primary text-white border-none" : "rounded-[16px_16px_16px_4px] bg-white text-slate-900 border border-slate-200"}`}>{m.text}</div>
          </div>
        ))}
        {loading && <div className="flex gap-1.5"><div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center"><Bot size={14} color="#fff" /></div><Card className="px-3.5 py-2"><Spinner /></Card></div>}
        <div ref={endRef} />
      </div>
      <div className="px-3 py-2 bg-white border-t border-slate-200 flex gap-2 items-end fixed bottom-[62px] left-0 right-0 max-w-[520px] mx-auto box-border">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`${t("type_question")} (${subject})`} rows={1} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-[13px] font-body resize-none outline-none" />
        <button onClick={send} disabled={loading} className={`w-10 h-10 rounded-xl border-none cursor-pointer bg-gradient-primary flex items-center justify-center ${loading ? "opacity-50" : ""}`}><Send size={16} color="#fff" /></button>
      </div>
    </div>
  );
}
