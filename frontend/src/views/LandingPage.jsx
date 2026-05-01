"use client";
import { useRouter } from "next/navigation";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import HeroSlider from "@/components/HeroSlider";
import { SectionTitle } from "@/components/ui";
import { PLANS } from "@/data/constants";
import { CheckIcon } from "@heroicons/react/24/outline";
import {
  Bot, FileText, Globe, BarChart3, WifiOff, Mail,
  GraduationCap, Users, Heart, School,
  Target, Rocket, TrendingUp,
  Sparkles, Check, ArrowRight,
} from "lucide-react";

const PLAN_ICONS = {
  "\u{1F193}": <Sparkles size={32} />,
  "\u{1F393}": <GraduationCap size={32} />,
  "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}": <Heart size={32} />,
  "\u{1F3EB}": <School size={32} />,
};

export default function LandingPage({ lang }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const router = useRouter();

  const features = [
    { icon: <Bot size={28} />, titleKey: "feat_ai_title", descKey: "feat_ai_desc", color: C.primary, bg: C.primaryBg },
    { icon: <FileText size={28} />, titleKey: "feat_exam_title", descKey: "feat_exam_desc", color: C.accent, bg: C.accentBg },
    { icon: <Globe size={28} />, titleKey: "feat_curr_title", descKey: "feat_curr_desc", color: C.secondary, bg: C.secondaryBg },
    { icon: <BarChart3 size={28} />, titleKey: "feat_progress_title", descKey: "feat_progress_desc", color: C.purple, bg: C.purpleBg },
    { icon: <WifiOff size={28} />, titleKey: "feat_offline_title", descKey: "feat_offline_desc", color: C.teal, bg: C.tealBg },
    { icon: <Mail size={28} />, titleKey: "feat_reports_title", descKey: "feat_reports_desc", color: C.rose, bg: C.roseBg },
  ];

  const roles = [
    { icon: <GraduationCap size={48} />, titleKey: "for_students", descKey: "for_students_desc", color: C.primary, bg: C.primaryBg, features: lang === "sw" ? ["Mwalimu wa AI 24/7", "Karatasi za zamani", "Fuatilia maendeleo", "Pata XP & tuzo"] : ["AI Tutor 24/7", "Past paper practice", "Progress tracking", "Earn XP & badges"] },
    { icon: <Users size={48} />, titleKey: "for_teachers", descKey: "for_teachers_desc", color: C.accent, bg: C.accentBg, features: lang === "sw" ? ["Maarifa ya AI", "Simamia madarasa", "Ripoti za otomatiki", "Tambua wanaoshindwa"] : ["AI insights", "Class management", "Auto reports", "Identify struggles"] },
    { icon: <Heart size={48} />, titleKey: "for_parents", descKey: "for_parents_desc", color: C.secondary, bg: C.secondaryBg, features: lang === "sw" ? ["Ripoti za kila wiki", "Fuatilia watoto", "Arifa za SMS", "Dashboard ya mzazi"] : ["Weekly reports", "Track children", "SMS alerts", "Parent dashboard"] },
    { icon: <School size={48} />, titleKey: "for_schools", descKey: "for_schools_desc", color: C.purple, bg: C.purpleBg, features: lang === "sw" ? ["Jopo la msimamizi", "Ankara ya M-Pesa", "Uandikishaji mkubwa", "Brand maalum"] : ["Admin panel", "M-Pesa billing", "Bulk enrollment", "Custom branding"] },
  ];

  const steps = [
    { num: "01", icon: <Target size={32} />, titleKey: "step1_title", descKey: "step1_desc", color: C.primary },
    { num: "02", icon: <Rocket size={32} />, titleKey: "step2_title", descKey: "step2_desc", color: C.accent },
    { num: "03", icon: <TrendingUp size={32} />, titleKey: "step3_title", descKey: "step3_desc", color: C.secondary },
  ];

  const testimonials = [
    { name: "Zawadi K.", role: lang === "sw" ? "Mwanafunzi, Nairobi" : "Student, Nairobi", text: lang === "sw" ? "ElimuAI ilinisaidia kupata A katika mtihani wangu wa hesabu. Mwalimu wa AI anaeleza kitu kwa njia ninayoelewa!" : "ElimuAI helped me score an A in my math exam. The AI tutor explains things in a way I actually understand!", avatar: "Z", flag: "\u{1F1F0}\u{1F1EA}" },
    { name: "Ms. Wanjiku", role: lang === "sw" ? "Mwalimu, Mombasa" : "Teacher, Mombasa", text: lang === "sw" ? "Maarifa ya AI yananisaidia kutambua wanafunzi wanaohitaji msaada zaidi. Inaokoa masaa mengi kila wiki." : "The AI insights help me identify which students need extra support. It saves me hours every week.", avatar: "W", flag: "\u{1F1F0}\u{1F1EA}" },
    { name: "Mr. Okonkwo", role: lang === "sw" ? "Mzazi, Dar es Salaam" : "Parent, Dar es Salaam", text: lang === "sw" ? "Napokea ripoti kila Jumapili kuhusu maendeleo ya mtoto wangu. Ni rahisi sana kufuatilia!" : "I get a report every Sunday about my child's progress. It's so easy to stay involved!", avatar: "O", flag: "\u{1F1F9}\u{1F1FF}" },
  ];

  return (
    <div className="bg-white">
      <HeroSlider lang={lang} />

      {/* ─── FEATURES ──────────────────────────────── */}
      <section className="py-20 px-6" id="features">
        <div className="max-w-[1200px] mx-auto">
          <SectionTitle
            badge={lang === "sw" ? "Features" : "Features"}
            title={t("why_students_love")}
            subtitle={lang === "sw" ? "Kila kitu unachohitaji kufaulu masomo yako, katika jukwaa moja." : "Everything you need to excel in your studies, in one platform."}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[clamp(12px,3vw,24px)] stagger">
            {features.map((f, i) => (
              <div
                key={f.titleKey}
                className="animate-fadeInUp bg-white border border-slate-200 rounded-[20px] p-7 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                style={{ animationDelay: `${i * 0.1}s` }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = f.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="text-slate-900 text-lg font-body font-extrabold mb-2">{t(f.titleKey)}</h3>
                <p className="text-slate-600 text-sm font-body font-semibold leading-relaxed m-0">{t(f.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-[1200px] mx-auto">
          <SectionTitle badge={lang === "sw" ? "Hatua" : "Steps"} title={t("how_it_works")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[clamp(16px,3vw,32px)]">
            {steps.map((s) => (
              <div key={s.num} className="text-center relative">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 relative" style={{ background: `${s.color}12`, border: `3px solid ${s.color}`, color: s.color }}>
                  {s.icon}
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-body font-black text-white" style={{ background: s.color }}>{s.num}</span>
                </div>
                <h3 className="text-slate-900 text-xl font-body font-extrabold mb-2">{t(s.titleKey)}</h3>
                <p className="text-slate-600 text-sm font-body font-semibold leading-relaxed m-0">{t(s.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ROLES ─────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <SectionTitle
            badge={lang === "sw" ? "Kwa Kila Mtu" : "For Everyone"}
            title={lang === "sw" ? "Imetengenezwa Kwa Ajili Yako" : "Built Just For You"}
            subtitle={lang === "sw" ? "Kila mtumiaji anapata uzoefu uliotengenezwa maalum kwa mahitaji yake." : "Every user gets an experience tailored to their needs."}
          />
          <div className="flex flex-col gap-8">
            {roles.map((r) => (
              <div key={r.titleKey} className="flex flex-row gap-[clamp(20px,3vw,40px)] items-center flex-wrap p-[clamp(16px,3vw,32px)] rounded-3xl" style={{ background: r.bg, border: `1px solid ${r.color}20` }}>
                <div className="shrink-0 w-[120px] h-[120px] rounded-3xl flex items-center justify-center mx-auto" style={{ background: `${r.color}15`, border: `2px solid ${r.color}30`, color: r.color }}>
                  {r.icon}
                </div>
                <div className="flex-[1_1_300px]">
                  <h3 className="text-2xl font-heading font-black mb-2" style={{ color: r.color }}>{t(r.titleKey)}</h3>
                  <p className="text-slate-600 text-[15px] font-body font-semibold leading-relaxed mb-4">{t(r.descKey)}</p>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(min(140px,100%),1fr))] gap-2 mb-4">
                    {r.features.map((f) => (
                      <span key={f} className="text-slate-900 text-[13px] font-body font-bold flex items-center gap-1"><CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" /> {f}</span>
                    ))}
                  </div>
                  <button onClick={() => router.push("/register")} className="border-none rounded-xl px-7 py-3 cursor-pointer text-white text-sm font-body font-extrabold transition-all duration-200 hover:-translate-y-0.5" style={{ background: r.color, boxShadow: `0 4px 14px ${r.color}40` }}>
                    {t("get_started")} &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ──────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-cta">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-white/10 text-white/80 text-[13px] font-extrabold px-[18px] py-1.5 rounded-full font-body mb-3">
              {lang === "sw" ? "Ushuhuda" : "Testimonials"}
            </span>
            <h2 className="text-white text-[clamp(28px,4vw,40px)] font-heading font-black mb-3">{t("trusted_by")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((tm) => (
              <div key={tm.name} className="bg-white/[0.06] border border-white/10 rounded-[20px] p-7 backdrop-blur-[10px]">
                <p className="text-white/85 text-[15px] font-body font-semibold leading-relaxed mb-5 italic">"{tm.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-white text-lg font-body font-black">{tm.avatar}</div>
                  <div>
                    <p className="text-white text-sm font-body font-extrabold m-0 mb-0.5">{tm.name} {tm.flag}</p>
                    <p className="text-white/50 text-xs font-body m-0">{tm.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ───────────────────────────────── */}
      <section className="py-20 px-6" id="pricing">
        <div className="max-w-[1200px] mx-auto">
          <SectionTitle
            badge={lang === "sw" ? "Bei" : "Pricing"}
            title={t("plans_pricing") || (lang === "sw" ? "Mipango na Bei" : "Plans & Pricing")}
            subtitle={lang === "sw" ? "Bei nafuu kwa kila mtu. Lipa kwa M-Pesa." : "Affordable plans for everyone. Pay with M-Pesa."}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((p) => (
              <div key={p.id} className={`bg-white rounded-[20px] p-7 relative overflow-hidden transition-all duration-300 ${
                p.popular ? "border-2 scale-[1.02]" : "border border-slate-200"
              }`} style={p.popular ? { borderColor: p.color, boxShadow: `0 8px 30px ${p.color}20` } : {}}>
                {p.popular && (
                  <div className="absolute top-4 -right-7 text-white text-[10px] font-body font-black px-9 py-1 rotate-45 tracking-wider" style={{ background: p.color }}>
                    {t("popular")}
                  </div>
                )}
                <div className="mb-3" style={{ color: p.color }}>{PLAN_ICONS[p.icon] || <Sparkles size={32} />}</div>
                <h3 className="text-xl font-body font-black mb-1" style={{ color: p.color }}>{p.name[lang] || p.name.en}</h3>
                <div className="mb-4">
                  <span className="text-slate-900 text-[32px] font-body font-black">
                    {p.price === 0 ? (lang === "sw" ? "Bure" : "Free") : `KES ${p.price.toLocaleString()}`}
                  </span>
                  {p.price > 0 && <span className="text-slate-400 text-sm font-body font-semibold"> / {p.desc[lang] || p.desc.en}</span>}
                </div>
                <div className="mb-5">
                  {(p.features[lang] || p.features.en).map((f) => (
                    <p key={f} className="text-slate-600 text-[13px] font-body font-semibold mb-2 flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" /> {f}
                    </p>
                  ))}
                </div>
                <button onClick={() => router.push("/register")} className={`w-full py-3 rounded-xl cursor-pointer text-sm font-body font-extrabold transition-all duration-200 ${
                  p.price === 0 ? "bg-transparent border-2 border-slate-200 text-slate-600" : "border-none text-white"
                }`} style={p.price > 0 ? { background: p.color, boxShadow: `0 4px 14px ${p.color}40` } : {}}>
                  {p.price === 0 ? t("get_started") : (t("pay_mpesa") || t("pay_with_mpesa"))}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-primary text-center">
        <div className="max-w-[600px] mx-auto">
          <div className="mb-4 flex justify-center">
            <GraduationCap size={56} className="text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-white text-[clamp(28px,4vw,42px)] font-heading font-black mb-4">{t("start_free")}</h2>
          <p className="text-white/80 text-[17px] font-body font-semibold mb-8 leading-relaxed">{t("start_free_desc")}</p>
          <button onClick={() => router.push("/register")} className="bg-white border-none rounded-[14px] px-10 py-4 cursor-pointer text-purple-600 text-lg font-body font-black shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-1">
            {t("get_started")} <ArrowRight size={18} className="inline align-middle" />
          </button>
        </div>
      </section>
    </div>
  );
}
