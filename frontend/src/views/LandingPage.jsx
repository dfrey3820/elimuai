"use client";
import { useRouter } from "next/navigation";
import { C, font } from "@/theme";
import { translations } from "@/i18n/translations";
import HeroSlider from "@/components/HeroSlider";
import { SectionTitle, Button, Card } from "@/components/ui";
import { PLANS } from "@/data/constants";
import {
  Bot, FileText, Globe, BarChart3, WifiOff, Mail,
  GraduationCap, Users, Heart, School,
  Target, Rocket, TrendingUp,
  Sparkles, ClipboardList, MessageCircle, Tag,
  Check, ArrowRight,
} from "lucide-react";

const PLAN_ICONS = {
  "🆓": <Sparkles size={32} />,
  "🎓": <GraduationCap size={32} />,
  "👨‍👩‍👧": <Heart size={32} />,
  "🏫": <School size={32} />,
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
    { name: "Zawadi K.", role: lang === "sw" ? "Mwanafunzi, Nairobi" : "Student, Nairobi", text: lang === "sw" ? "ElimuAI ilinisaidia kupata A katika mtihani wangu wa hesabu. Mwalimu wa AI anaeleza kitu kwa njia ninayoelewa!" : "ElimuAI helped me score an A in my math exam. The AI tutor explains things in a way I actually understand!", avatar: "Z", flag: "🇰🇪" },
    { name: "Ms. Wanjiku", role: lang === "sw" ? "Mwalimu, Mombasa" : "Teacher, Mombasa", text: lang === "sw" ? "Maarifa ya AI yananisaidia kutambua wanafunzi wanaohitaji msaada zaidi. Inaokoa masaa mengi kila wiki." : "The AI insights help me identify which students need extra support. It saves me hours every week.", avatar: "W", flag: "🇰🇪" },
    { name: "Mr. Okonkwo", role: lang === "sw" ? "Mzazi, Dar es Salaam" : "Parent, Dar es Salaam", text: lang === "sw" ? "Napokea ripoti kila Jumapili kuhusu maendeleo ya mtoto wangu. Ni rahisi sana kufuatilia!" : "I get a report every Sunday about my child's progress. It's so easy to stay involved!", avatar: "O", flag: "🇹🇿" },
  ];

  return (
    <div style={{ background: C.bg }}>
      {/* ─── HERO SLIDER ─────────────────────────────── */}
      <HeroSlider lang={lang} />

      {/* ─── FEATURES SECTION ─────────────────────────── */}
      <section style={{ padding: "80px 24px" }} id="features">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <SectionTitle
          badge={lang === "sw" ? "Features" : "Features"}
          title={t("why_students_love")}
          subtitle={lang === "sw" ? "Kila kitu unachohitaji kufaulu masomo yako, katika jukwaa moja." : "Everything you need to excel in your studies, in one platform."}
        />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 24,
        }} className="stagger">
          {features.map((f, i) => (
            <div
              key={f.titleKey}
              className="animate-fadeInUp"
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: 28,
                transition: "all 0.3s ease",
                cursor: "default",
                animationDelay: `${i * 0.1}s`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = C.shadowLg;
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = f.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = C.border;
              }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: f.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: f.color,
                marginBottom: 16,
              }}>
                {f.icon}
              </div>
              <h3 style={{
                color: C.text,
                fontSize: 18,
                fontFamily: font.body,
                fontWeight: 800,
                margin: "0 0 8px",
              }}>
                {t(f.titleKey)}
              </h3>
              <p style={{
                color: C.textSecondary,
                fontSize: 14,
                fontFamily: font.body,
                fontWeight: 600,
                lineHeight: 1.65,
                margin: 0,
              }}>
                {t(f.descKey)}
              </p>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────── */}
      <section style={{
        padding: "80px 24px",
        background: `linear-gradient(180deg, ${C.surface} 0%, ${C.white} 100%)`,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionTitle
          badge={lang === "sw" ? "Hatua" : "Steps"}
            title={t("how_it_works")}
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 32,
          }}>
            {steps.map((s, i) => (
              <div key={s.num} style={{ textAlign: "center", position: "relative" }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: `${s.color}12`,
                  border: `3px solid ${s.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: s.color,
                  margin: "0 auto 20px",
                  position: "relative",
                }}>
                  {s.icon}
                  <span style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    background: s.color,
                    color: C.white,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontFamily: font.body,
                    fontWeight: 900,
                  }}>
                    {s.num}
                  </span>
                </div>
                <h3 style={{
                  color: C.text,
                  fontSize: 20,
                  fontFamily: font.body,
                  fontWeight: 800,
                  margin: "0 0 8px",
                }}>
                  {t(s.titleKey)}
                </h3>
                <p style={{
                  color: C.textSecondary,
                  fontSize: 14,
                  fontFamily: font.body,
                  fontWeight: 600,
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {t(s.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ROLE SECTIONS ─────────────────────────────── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <SectionTitle
          badge={lang === "sw" ? "Kwa Kila Mtu" : "For Everyone"}
          title={lang === "sw" ? "Imetengenezwa Kwa Ajili Yako" : "Built Just For You"}
          subtitle={lang === "sw" ? "Kila mtumiaji anapata uzoefu uliotengenezwa maalum kwa mahitaji yake." : "Every user gets an experience tailored to their needs."}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {roles.map((r, i) => (
            <div
              key={r.titleKey}
              style={{
                display: "flex",
                flexDirection: i % 2 === 0 ? "row" : "row-reverse",
                gap: 40,
                alignItems: "center",
                flexWrap: "wrap",
                padding: 32,
                background: r.bg,
                borderRadius: 24,
                border: `1px solid ${r.color}20`,
              }}
            >
              {/* Icon */}
              <div style={{
                flex: "0 0 auto",
                width: 120,
                height: 120,
                borderRadius: 24,
                background: `${r.color}15`,
                border: `2px solid ${r.color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: r.color,
                margin: "0 auto",
              }}>
                {r.icon}
              </div>
              {/* Text */}
              <div style={{ flex: "1 1 300px" }}>
                <h3 style={{
                  color: r.color,
                  fontSize: 24,
                  fontFamily: font.heading,
                  fontWeight: 900,
                  margin: "0 0 8px",
                }}>
                  {t(r.titleKey)}
                </h3>
                <p style={{
                  color: C.textSecondary,
                  fontSize: 15,
                  fontFamily: font.body,
                  fontWeight: 600,
                  lineHeight: 1.65,
                  margin: "0 0 16px",
                }}>
                  {t(r.descKey)}
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 16,
                }}>
                  {r.features.map((f) => (
                    <span key={f} style={{
                      color: C.text,
                      fontSize: 13,
                      fontFamily: font.body,
                      fontWeight: 700,
                    }}>
                      ✓ {f}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => router.push("/register")}
                  style={{
                    background: r.color,
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 28px",
                    cursor: "pointer",
                    color: C.white,
                    fontSize: 14,
                    fontFamily: font.body,
                    fontWeight: 800,
                    boxShadow: `0 4px 14px ${r.color}40`,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  {t("get_started")} →
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────── */}
      <section style={{
        padding: "80px 24px",
        background: `linear-gradient(135deg, #0F172A 0%, #1E293B 100%)`,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionTitle
            badge="💬 Testimonials"
            title={t("trusted_by")}
            subtitle={lang === "sw" ? "Wanafunzi, walimu na wazazi wanapenda ElimuAI." : "Students, teachers and parents love ElimuAI."}
          />
          <style>{`.testimonial-title h2 { color: white !important; } .testimonial-title p { color: rgba(255,255,255,0.7) !important; }`}</style>
          <div className="testimonial-title" style={{ display: "none" }} />
          {/* Override section title colors for dark bg */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ display: "inline-block", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 800, padding: "6px 18px", borderRadius: 20, fontFamily: font.body, marginBottom: 12 }}>
              {lang === "sw" ? "Ushuhuda" : "Testimonials"}
            </span>
            <h2 style={{ color: C.white, fontSize: "clamp(28px, 4vw, 40px)", fontFamily: font.heading, fontWeight: 900, margin: "0 0 12px" }}>
              {t("trusted_by")}
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 24,
          }}>
            {testimonials.map((tm) => (
              <div key={tm.name} style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                padding: 28,
                backdropFilter: "blur(10px)",
              }}>
                <p style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 15,
                  fontFamily: font.body,
                  fontWeight: 600,
                  lineHeight: 1.7,
                  margin: "0 0 20px",
                  fontStyle: "italic",
                }}>
                  "{tm.text}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: C.gradientPrimary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.white,
                    fontSize: 18,
                    fontFamily: font.body,
                    fontWeight: 900,
                  }}>
                    {tm.avatar}
                  </div>
                  <div>
                    <p style={{ color: C.white, fontSize: 14, fontFamily: font.body, fontWeight: 800, margin: "0 0 2px" }}>
                      {tm.name} {tm.flag}
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: font.body, margin: 0 }}>
                      {tm.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────── */}
      <section style={{ padding: "80px 24px" }} id="pricing">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <SectionTitle
          badge={lang === "sw" ? "Bei" : "Pricing"}
          title={t("plans_pricing") || (lang === "sw" ? "Mipango na Bei" : "Plans & Pricing")}
          subtitle={lang === "sw" ? "Bei nafuu kwa kila mtu. Lipa kwa M-Pesa." : "Affordable plans for everyone. Pay with M-Pesa."}
        />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 24,
        }}>
          {PLANS.map((p) => (
            <div
              key={p.id}
              style={{
                background: C.white,
                border: p.popular ? `2px solid ${p.color}` : `1px solid ${C.border}`,
                borderRadius: 20,
                padding: 28,
                position: "relative",
                overflow: "hidden",
                transition: "all 0.3s ease",
                transform: p.popular ? "scale(1.02)" : "scale(1)",
                boxShadow: p.popular ? `0 8px 30px ${p.color}20` : C.shadow,
              }}
            >
              {p.popular && (
                <div style={{
                  position: "absolute",
                  top: 16,
                  right: -28,
                  background: p.color,
                  color: C.white,
                  fontSize: 10,
                  fontFamily: font.body,
                  fontWeight: 900,
                  padding: "4px 36px",
                  transform: "rotate(45deg)",
                  letterSpacing: 1,
                }}>
                  {t("popular")}
                </div>
              )}
              <div style={{ marginBottom: 12, color: p.color }}>{PLAN_ICONS[p.icon] || <Sparkles size={32} />}</div>
              <h3 style={{
                color: p.color,
                fontSize: 20,
                fontFamily: font.body,
                fontWeight: 900,
                margin: "0 0 4px",
              }}>
                {p.name[lang] || p.name.en}
              </h3>
              <div style={{ margin: "0 0 16px" }}>
                <span style={{
                  color: C.text,
                  fontSize: 32,
                  fontFamily: font.body,
                  fontWeight: 900,
                }}>
                  {p.price === 0 ? (lang === "sw" ? "Bure" : "Free") : `KES ${p.price.toLocaleString()}`}
                </span>
                {p.price > 0 && (
                  <span style={{
                    color: C.textMuted,
                    fontSize: 14,
                    fontFamily: font.body,
                    fontWeight: 600,
                  }}>
                    {" "}/ {p.desc[lang] || p.desc.en}
                  </span>
                )}
              </div>
              <div style={{ marginBottom: 20 }}>
                {(p.features[lang] || p.features.en).map((f) => (
                  <p key={f} style={{
                    color: C.textSecondary,
                    fontSize: 13,
                    fontFamily: font.body,
                    fontWeight: 600,
                    margin: "0 0 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    <Check size={14} style={{ color: C.accent, flexShrink: 0 }} /> {f}
                  </p>
                ))}
              </div>
              <button
                onClick={() => router.push("/register")}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  border: p.price === 0 ? `2px solid ${C.border}` : "none",
                  cursor: "pointer",
                  background: p.price === 0 ? "transparent" : p.color,
                  color: p.price === 0 ? C.textSecondary : C.white,
                  fontSize: 14,
                  fontFamily: font.body,
                  fontWeight: 800,
                  transition: "all 0.2s",
                  boxShadow: p.price > 0 ? `0 4px 14px ${p.color}40` : "none",
                }}
              >
                {p.price === 0 ? t("get_started") : (t("pay_mpesa") || t("pay_with_mpesa"))}
              </button>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────── */}
      <section style={{
        padding: "80px 24px",
        background: C.gradientPrimary,
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
            <GraduationCap size={56} color={C.white} strokeWidth={1.5} />
          </div>
          <h2 style={{
            color: C.white,
            fontSize: "clamp(28px, 4vw, 42px)",
            fontFamily: font.heading,
            fontWeight: 900,
            margin: "0 0 16px",
          }}>
            {t("start_free")}
          </h2>
          <p style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 17,
            fontFamily: font.body,
            fontWeight: 600,
            margin: "0 0 32px",
            lineHeight: 1.6,
          }}>
            {t("start_free_desc")}
          </p>
          <button
            onClick={() => router.push("/register")}
            style={{
              background: C.white,
              border: "none",
              borderRadius: 14,
              padding: "16px 40px",
              cursor: "pointer",
              color: C.primary,
              fontSize: 18,
              fontFamily: font.body,
              fontWeight: 900,
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            {t("get_started")} <ArrowRight size={18} style={{ display: "inline", verticalAlign: "middle" }} />
          </button>
        </div>
      </section>
    </div>
  );
}
