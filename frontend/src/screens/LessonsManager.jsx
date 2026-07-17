"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";
import { CURRICULA } from "@/data/constants";
import { inputCls, btnPrimary } from "@/shared/constants";
import { Card, Spinner, Badge } from "@/components/ui";
import { BookOpen, Plus, Edit3, Trash2, X, CheckCircle, Search } from "lucide-react";

const COUNTRY_CODE = { Kenya: "KE", Tanzania: "TZ", Uganda: "UG" };

function emptyForm(defaults = {}) {
  return {
    id: null,
    title: "",
    title_sw: "",
    content: "",
    content_sw: "",
    subject_id: "",
    country: defaults.country || "Kenya",
    curriculum: defaults.curriculum || "CBC",
    grade_level: defaults.grade_level || "",
    order_index: 0,
    is_active: true,
  };
}

/**
 * LessonsManager — CRUD screen for offline lessons scoped to the caller's school.
 * Available to teachers, school admins and super_admins.
 *   GET    /api/curriculum/offline-lessons/manage
 *   POST   /api/curriculum/offline-lessons
 *   PUT    /api/curriculum/offline-lessons/{id}
 *   DELETE /api/curriculum/offline-lessons/{id}
 */
export default function LessonsManager({ lang = "en", user }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [msg, setMsg] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => emptyForm({ country: user?.country || "Kenya" }));
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const t = (en, sw) => (lang === "sw" ? sw : en);

  const load = () => {
    setLoading(true);
    apiGet("/api/curriculum/offline-lessons/manage")
      .then((d) => setLessons(Array.isArray(d?.lessons) ? d.lessons : []))
      .catch((e) => setMsg({ type: "error", text: e.message || "Failed to load lessons" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    const countryCode = COUNTRY_CODE[form.country] || "KE";
    apiGet("/api/curriculum/subjects", { country: countryCode, curriculum: form.curriculum, level: form.grade_level })
      .then((d) => setSubjects(Array.isArray(d?.subjects) ? d.subjects : []))
      .catch(() => setSubjects([]));
  }, [form.country, form.curriculum, form.grade_level]);

  const openCreate = () => {
    setForm(emptyForm({ country: user?.country || "Kenya" }));
    setShowForm(true);
    setMsg(null);
  };

  const openEdit = (l) => {
    setForm({
      id: l.id,
      title: l.title || "",
      title_sw: l.title_sw || "",
      content: l.content || "",
      content_sw: l.content_sw || "",
      subject_id: l.subject_id || "",
      country: Object.keys(COUNTRY_CODE).find((k) => COUNTRY_CODE[k] === l.country) || (user?.country || "Kenya"),
      curriculum: l.curriculum || CURRICULA[user?.country || "Kenya"]?.curriculum || "CBC",
      grade_level: l.grade_level || "",
      order_index: l.order_index || 0,
      is_active: l.is_active !== false,
    });
    setShowForm(true);
    setMsg(null);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim() || !form.grade_level) {
      setMsg({ type: "error", text: t("Title, class and content are required", "Kichwa, darasa na maudhui vinahitajika") });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        title: form.title.trim(),
        title_sw: form.title_sw?.trim() || null,
        content: form.content,
        content_sw: form.content_sw?.trim() || null,
        subject_id: form.subject_id || null,
        curriculum: form.curriculum || null,
        grade_level: form.grade_level,
        order_index: Number(form.order_index) || 0,
        is_active: !!form.is_active,
      };
      if (form.id) {
        await apiPut(`/api/curriculum/offline-lessons/${form.id}`, payload);
      } else {
        await apiPost("/api/curriculum/offline-lessons", payload);
      }
      setShowForm(false);
      load();
      setMsg({ type: "success", text: form.id ? t("Lesson updated", "Somo limesasishwa") : t("Lesson created", "Somo limeundwa") });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Failed to save lesson" });
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async (l) => {
    if (!confirm(t(`Deactivate lesson "${l.title}"?`, `Zima somo "${l.title}"?`))) return;
    try {
      await apiDelete(`/api/curriculum/offline-lessons/${l.id}`);
      load();
      setMsg({ type: "success", text: t("Lesson deactivated", "Somo limezimwa") });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Failed to delete lesson" });
    }
  };

  const country = form.country;
  const gradeLevels = Object.keys(CURRICULA?.[country]?.levels || {});
  const curriculumCode = CURRICULA?.[country]?.curriculum || form.curriculum;

  const filtered = lessons.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (l.title || "").toLowerCase().includes(q)
      || (l.grade_level || "").toLowerCase().includes(q)
      || (l.subject_name || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-slate-900 text-xl font-heading font-black m-0 flex items-center gap-2">
          <BookOpen size={22} className="text-purple-600" /> {t("Offline Lessons", "Masomo ya Nje ya Mtandao")}
        </h2>
        <button onClick={openCreate} className={btnPrimary}><Plus size={14} /> {t("New Lesson", "Somo Jipya")}</button>
      </div>

      {msg && (
        <div className={`rounded-xl p-3 mb-3 text-[12px] font-body font-bold ${msg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-rose-50 border border-red-200 text-red-600"}`}>
          {msg.text}
        </div>
      )}

      <div className="mb-3 relative max-w-[320px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Search title, class, subject...", "Tafuta kichwa, darasa, somo...")} className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-body outline-none w-full focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
      </div>

      {loading ? (
        <Card className="text-center py-6"><Spinner /></Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-8">
          <BookOpen size={36} className="text-slate-300 mx-auto mb-2" />
          <p className="text-slate-900 text-sm font-body font-black mb-1 mt-0">{t("No lessons yet", "Bado hakuna masomo")}</p>
          <p className="text-slate-400 text-[11px] font-body m-0">{t("Add your first lesson so it becomes available offline to your students.", "Ongeza somo la kwanza ili wanafunzi waweze kulisoma bila mtandao.")}</p>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {[t("Title", "Kichwa"), t("Class", "Darasa"), t("Subject", "Somo"), t("Order", "Mpangilio"), t("Status", "Hali"), t("Actions", "Vitendo")].map((h) => (
                    <th key={h} className="text-slate-500 text-[10px] font-body font-bold uppercase tracking-wider px-4 py-3 border-b border-slate-200 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 even:bg-slate-50/50 hover:bg-purple-50/30">
                    <td className="px-4 py-3 text-slate-900 text-[12px] font-body font-bold">{l.title}</td>
                    <td className="px-4 py-3 text-slate-700 text-[12px] font-body whitespace-nowrap">{l.grade_level || "—"}</td>
                    <td className="px-4 py-3 text-slate-700 text-[12px] font-body whitespace-nowrap">{l.subject_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-700 text-[12px] font-body whitespace-nowrap">{l.order_index ?? 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge color={l.is_active ? "#10b981" : "#94a3b8"}>{l.is_active ? t("Active", "Hai") : t("Inactive", "Imezimwa")}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border-none cursor-pointer text-slate-600"><Edit3 size={13} /></button>
                        <button onClick={() => removeLesson(l)} className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border-none cursor-pointer text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[1100] flex items-center justify-center p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-[20px] p-[22px] w-full max-w-[640px] max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between mb-3">
              <h3 className="text-slate-900 font-heading font-black m-0">{form.id ? t("Edit Lesson", "Hariri Somo") : t("New Lesson", "Somo Jipya")}</h3>
              <button onClick={() => setShowForm(false)} className="bg-transparent border-none text-slate-400 cursor-pointer"><X size={20} /></button>
            </div>

            <label className="text-slate-500 text-[11px] font-body font-bold uppercase tracking-wider">{t("Title (English)", "Kichwa (Kiingereza)")}</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`w-full ${inputCls} mb-2 mt-1`} />

            <label className="text-slate-500 text-[11px] font-body font-bold uppercase tracking-wider">{t("Title (Swahili — optional)", "Kichwa (Kiswahili — hiari)")}</label>
            <input value={form.title_sw} onChange={(e) => setForm({ ...form, title_sw: e.target.value })} className={`w-full ${inputCls} mb-2 mt-1`} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-500 text-[11px] font-body font-bold uppercase tracking-wider">{t("Country", "Nchi")}</label>
                <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value, curriculum: CURRICULA[e.target.value]?.curriculum || "CBC", grade_level: "" })} className={`w-full ${inputCls} mb-2 mt-1`}>
                  {Object.keys(CURRICULA).map((c) => <option key={c} value={c}>{CURRICULA[c].flag} {c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-500 text-[11px] font-body font-bold uppercase tracking-wider">{t("Curriculum", "Mtaala")}</label>
                <input value={curriculumCode} disabled className={`w-full ${inputCls} mb-2 mt-1 bg-slate-50`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-500 text-[11px] font-body font-bold uppercase tracking-wider">{t("Class", "Darasa")}</label>
                <select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value, subject_id: "" })} className={`w-full ${inputCls} mb-2 mt-1`}>
                  <option value="">{t("-- Select --", "-- Chagua --")}</option>
                  {gradeLevels.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-500 text-[11px] font-body font-bold uppercase tracking-wider">{t("Order", "Mpangilio")}</label>
                <input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: e.target.value })} className={`w-full ${inputCls} mb-2 mt-1`} />
              </div>
            </div>

            <label className="text-slate-500 text-[11px] font-body font-bold uppercase tracking-wider">{t("Subject", "Somo")}</label>
            <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className={`w-full ${inputCls} mb-2 mt-1`}>
              <option value="">{t("-- Optional --", "-- Hiari --")}</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <label className="text-slate-500 text-[11px] font-body font-bold uppercase tracking-wider">{t("Content (English)", "Maudhui (Kiingereza)")}</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} className={`w-full ${inputCls} mb-2 mt-1 leading-relaxed`} />

            <label className="text-slate-500 text-[11px] font-body font-bold uppercase tracking-wider">{t("Content (Swahili — optional)", "Maudhui (Kiswahili — hiari)")}</label>
            <textarea value={form.content_sw} onChange={(e) => setForm({ ...form, content_sw: e.target.value })} rows={6} className={`w-full ${inputCls} mb-2 mt-1 leading-relaxed`} />

            <label className="flex items-center gap-2 text-[12px] font-body text-slate-700 mb-3 mt-1">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              {t("Active (visible to students)", "Hai (inaonekana kwa wanafunzi)")}
            </label>

            {msg && msg.type === "error" && <p className="text-red-500 text-[11px] font-body font-bold mb-2 mt-0 px-2.5 py-1.5 bg-rose-50 rounded-lg">{msg.text}</p>}

            <button onClick={submit} disabled={saving} className={`${btnPrimary} ${saving ? "opacity-60" : ""}`}>
              {saving ? <Spinner color="#fff" size={6} /> : <><CheckCircle size={14} /> {t("Save Lesson", "Hifadhi Somo")}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
