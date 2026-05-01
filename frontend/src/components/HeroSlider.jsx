"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { translations } from "@/i18n/translations";
import { GraduationCap, BookOpen, Brain, Sparkles, ArrowRight, ChevronLeft, ChevronRight, Star, Users, Globe, Headphones } from "lucide-react";

const slides = [
  {
    titleKey: "hero_title_1",
    subKey: "hero_sub_1",
    ctaKey: "hero_cta_1",
    ctaTo: "/register",
    badge: { icon: Brain, label: "AI-Powered" },
    accent: "bg-yellow-500",
    accentText: "text-yellow-500",
    image: "/images/african student.jpeg",
    imageAlt: "African student using a laptop",
    icons: [GraduationCap, BookOpen, Brain, Sparkles],
  },
  {
    titleKey: "hero_title_2",
    subKey: "hero_sub_2",
    ctaKey: "hero_cta_2",
    ctaTo: "/register",
    badge: { icon: Star, label: "Past Papers" },
    accent: "bg-emerald-500",
    accentText: "text-emerald-500",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=600&fit=crop&crop=faces",
    imageAlt: "Students studying together with technology",
    icons: [Star, BookOpen, GraduationCap, Sparkles],
  },
  {
    titleKey: "hero_title_3",
    subKey: "hero_sub_3",
    ctaKey: "hero_cta_3",
    ctaTo: "/#pricing",
    badge: { icon: Globe, label: "East Africa" },
    accent: "bg-orange-500",
    accentText: "text-orange-500",
    image: "/images/teacher.jpg",
    imageAlt: "Teacher in a classroom",
    icons: [Globe, Users, Headphones, Sparkles],
  },
];

export default function HeroSlider({ lang }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback((i) => {
    if (i === current || isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => { setCurrent(i); setIsAnimating(false); }, 400);
  }, [current, isAnimating]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);

  useEffect(() => {
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];
  const BadgeIcon = slide.badge.icon;

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#1a0a2e]">
      {/* Background — deep academic purple with notebook grid */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[#1a0a2e]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 40px)" }} />
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-600/10 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-yellow-500/[0.08] blur-[100px]" />
      </div>

      {/* Floating academic icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {slide.icons.map((Icon, i) => (
          <div key={i} className="absolute animate-float opacity-[0.07]" style={{ top: `${12 + i * 20}%`, right: `${3 + i * 7}%`, animationDelay: `${i * 1.2}s`, animationDuration: `${4 + i * 0.8}s` }}>
            <Icon size={40 + i * 10} className="text-white" strokeWidth={1} />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="max-w-[1240px] mx-auto px-6 pt-[120px] pb-[80px] w-full relative z-[1]">
        <div className="flex items-center gap-[clamp(32px,5vw,72px)] flex-wrap">

          {/* Text Column */}
          <div className={`flex-[1_1_320px] transition-all duration-500 ease-out ${isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}>

            {/* Top badge */}
            <div className="inline-flex items-center gap-2 bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] rounded-full px-4 py-2 mb-7">
              <div className={`w-7 h-7 rounded-full ${slide.accent} flex items-center justify-center`}>
                <BadgeIcon size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-white/90 text-[13px] font-body font-bold tracking-wide">{slide.badge.label}</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
              </span>
            </div>

            {/* Country flags */}
            <div className="flex gap-2 mb-5">
              {[
                { flag: "\u{1F1F0}\u{1F1EA}", name: "Kenya" },
                { flag: "\u{1F1F9}\u{1F1FF}", name: "Tanzania" },
                { flag: "\u{1F1FA}\u{1F1EC}", name: "Uganda" },
              ].map((c) => (
                <div key={c.name} className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5">
                  <span className="text-lg">{c.flag}</span>
                  <span className="text-white/50 text-[10px] font-body font-bold uppercase tracking-wider hidden sm:inline">{c.name}</span>
                </div>
              ))}
            </div>

            {/* Headline — last word gets accent color */}
            <h1 className="text-white text-[clamp(34px,5.5vw,60px)] font-heading font-black leading-[1.1] mb-5 tracking-tight">
              {t(slide.titleKey).split(" ").map((word, i, arr) =>
                i === arr.length - 1
                  ? <span key={i} className={slide.accentText}>{word}</span>
                  : <span key={i}>{word} </span>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-white/70 text-[clamp(15px,1.8vw,19px)] font-body font-semibold leading-relaxed mb-9 max-w-[500px]">
              {t(slide.subKey)}
            </p>

            {/* CTA buttons */}
            <div className="flex gap-3 flex-wrap items-center mb-10">
              <button
                onClick={() => {
                  if (slide.ctaTo.startsWith("/#")) {
                    const el = document.getElementById(slide.ctaTo.slice(2));
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  } else {
                    router.push(slide.ctaTo);
                  }
                }}
                className={`group ${slide.accent} border-none rounded-2xl px-8 py-4 cursor-pointer text-white text-[16px] font-heading font-extrabold shadow-lg shadow-yellow-500/20 transition-all duration-200 flex items-center gap-2.5 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-yellow-500/30`}
              >
                {t(slide.ctaKey)}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
              </button>
              <button
                onClick={() => router.push("/login")}
                className="bg-white/[0.08] border-2 border-white/20 rounded-2xl px-7 py-3.5 cursor-pointer text-white text-[15px] font-body font-bold backdrop-blur-xl transition-all duration-200 hover:bg-white/15 hover:border-white/30"
              >
                {lang === "sw" ? "Nina akaunti" : "I have an account"}
              </button>
            </div>

            {/* Trust stats */}
            <div className="flex gap-6 flex-wrap">
              {[
                { v: "10K+", l: lang === "sw" ? "Wanafunzi" : "Students", icon: Users },
                { v: "3", l: lang === "sw" ? "Nchi" : "Countries", icon: Globe },
                { v: "24/7", l: lang === "sw" ? "AI Msaada" : "AI Support", icon: Headphones },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.l} className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                      <Icon size={16} className="text-white/50" />
                    </div>
                    <div>
                      <p className="text-white text-lg font-heading font-black m-0 leading-none">{stat.v}</p>
                      <p className="text-white/40 text-[10px] font-body font-bold m-0 mt-0.5 uppercase tracking-wider">{stat.l}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Image Column */}
          <div className="flex-[0_1_480px] flex justify-center items-center w-full">
            <div className={`relative transition-all duration-500 ease-out ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
              {/* Accent glow behind image */}
              <div className={`absolute -inset-3 rounded-[28px] ${slide.accent} opacity-20 blur-xl`} />

              {/* Main image card */}
              <div className="relative w-[clamp(240px,75vw,460px)] h-[clamp(280px,80vw,520px)] rounded-[24px] overflow-hidden border-2 border-white/15 shadow-2xl shadow-black/40">
                <img src={slide.image} alt={slide.imageAlt} className="w-full h-full object-cover block" loading={current === 0 ? "eager" : "lazy"} />
                <div className="absolute inset-0 bg-black/30" />
                {/* Bottom caption */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 bg-black/30 backdrop-blur-xl rounded-xl px-4 py-2.5 border border-white/10">
                  <GraduationCap size={18} className={slide.accentText} />
                  <div>
                    <p className="text-white text-[12px] font-body font-bold m-0 leading-tight">{slide.imageAlt}</p>
                    <p className="text-white/50 text-[9px] font-body m-0">ElimuAI Platform</p>
                  </div>
                </div>
              </div>

              {/* Floating stat card — top-right */}
              <div className="absolute -top-3 -right-3 bg-white rounded-2xl shadow-xl shadow-black/15 px-4 py-3 flex items-center gap-2 animate-float" style={{ animationDuration: "4s" }}>
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center">
                  <Brain size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-slate-900 text-[13px] font-heading font-black m-0 leading-none">AI Tutor</p>
                  <p className="text-emerald-500 text-[9px] font-body font-bold m-0 mt-0.5">{"\u25CF"} Online 24/7</p>
                </div>
              </div>

              {/* Floating stat card — bottom-left */}
              <div className="absolute -bottom-2 -left-3 bg-white rounded-2xl shadow-xl shadow-black/15 px-4 py-3 flex items-center gap-2 animate-float" style={{ animationDelay: "1.5s", animationDuration: "5s" }}>
                <div className="w-8 h-8 rounded-xl bg-yellow-500 flex items-center justify-center">
                  <Star size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-slate-900 text-[13px] font-heading font-black m-0 leading-none">4.9{"\u2605"}</p>
                  <p className="text-slate-400 text-[9px] font-body font-bold m-0 mt-0.5">Student Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 z-[3] w-11 h-11 rounded-xl bg-white/[0.08] border border-white/[0.12] backdrop-blur-xl flex items-center justify-center cursor-pointer text-white/70 hover:bg-white/15 hover:text-white transition-all">
        <ChevronLeft size={20} />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 z-[3] w-11 h-11 rounded-xl bg-white/[0.08] border border-white/[0.12] backdrop-blur-xl flex items-center justify-center cursor-pointer text-white/70 hover:bg-white/15 hover:text-white transition-all">
        <ChevronRight size={20} />
      </button>

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[2] bg-white/[0.06] backdrop-blur-xl rounded-full px-3 py-2 border border-white/[0.08]">
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} className={`rounded-full border-none cursor-pointer transition-all duration-300 ${
            current === i
              ? `w-8 h-2.5 ${slides[current].accent}`
              : "w-2.5 h-2.5 bg-white/30 hover:bg-white/50"
          }`} />
        ))}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-4 right-6 text-white/30 text-[10px] font-body font-bold flex items-center gap-1.5 animate-bounce">
        {"\u2193"} {lang === "sw" ? "Sogeza chini" : "Scroll"}
      </div>
    </section>
  );
}
