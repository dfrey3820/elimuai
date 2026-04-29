"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { C, font } from "@/theme";
import { translations } from "@/i18n/translations";

const slides = [
  {
    titleKey: "hero_title_1",
    subKey: "hero_sub_1",
    ctaKey: "hero_cta_1",
    ctaTo: "/register",
    gradient: "linear-gradient(135deg, #1E3A5F 0%, #2563EB 50%, #7C3AED 100%)",
    decorEmoji: ["📚", "🧠", "💡", "⭐"],
    image: "/images/african student.jpeg",
    imageAlt: "African student using a laptop",
  },
  {
    titleKey: "hero_title_2",
    subKey: "hero_sub_2",
    ctaKey: "hero_cta_2",
    ctaTo: "/register",
    gradient: "linear-gradient(135deg, #1A4731 0%, #059669 50%, #10B981 100%)",
    decorEmoji: ["🏆", "📊", "✅", "🎯"],
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=600&fit=crop&crop=faces",
    imageAlt: "Students studying together with technology",
  },
  {
    titleKey: "hero_title_3",
    subKey: "hero_sub_3",
    ctaKey: "hero_cta_3",
    ctaTo: "/#pricing",
    gradient: "linear-gradient(135deg, #4C1D0F 0%, #EA580C 50%, #F97316 100%)",
    decorEmoji: ["🇰🇪", "🇹🇿", "🇺🇬", "💚"],
    image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=600&fit=crop&crop=faces",
    imageAlt: "Young students using smartphones for learning",
  },
];

export default function HeroSlider({ lang }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrent((p) => (p + 1) % slides.length);
        setIsAnimating(false);
      }, 300);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (i) => {
    if (i === current) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrent(i);
      setIsAnimating(false);
    }, 300);
  };

  const slide = slides[current];

  return (
    <section style={{
      position: "relative",
      background: slide.gradient,
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
      transition: "background 0.8s ease",
    }}>
      {/* Decorative elements */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {/* Large faded circles */}
        <div style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
        }} />
        <div style={{
          position: "absolute",
          bottom: "-15%",
          left: "-10%",
          width: "40vw",
          height: "40vw",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.03)",
        }} />
        {/* Floating emojis */}
        {slide.decorEmoji.map((emoji, i) => (
          <span key={i} style={{
            position: "absolute",
            fontSize: "clamp(30px, 5vw, 60px)",
            opacity: 0.15,
            animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.8}s`,
            top: `${15 + i * 18}%`,
            right: `${5 + i * 8}%`,
          }}>
            {emoji}
          </span>
        ))}
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "120px 24px 80px",
        width: "100%",
        position: "relative",
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        gap: 60,
        flexWrap: "wrap",
      }}>
        {/* Text side */}
        <div style={{
          flex: "1 1 480px",
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating ? "translateY(20px)" : "translateY(0)",
          transition: "all 0.5s ease",
        }}>
          {/* Country flags */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["🇰🇪", "🇹🇿", "🇺🇬"].map((f, i) => (
              <span key={i} style={{
                fontSize: 22,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "6px 10px",
                backdropFilter: "blur(10px)",
              }}>{f}</span>
            ))}
          </div>

          <h1 style={{
            color: C.white,
            fontSize: "clamp(36px, 5vw, 56px)",
            fontFamily: font.heading,
            fontWeight: 900,
            lineHeight: 1.15,
            margin: "0 0 20px",
            textShadow: "0 2px 40px rgba(0,0,0,0.2)",
          }}>
            {t(slide.titleKey)}
          </h1>

          <p style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: "clamp(16px, 2vw, 20px)",
            fontFamily: font.body,
            fontWeight: 600,
            lineHeight: 1.6,
            margin: "0 0 32px",
            maxWidth: 520,
          }}>
            {t(slide.subKey)}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => {
                if (slide.ctaTo.startsWith("/#")) {
                  const el = document.getElementById(slide.ctaTo.slice(2));
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                } else {
                  router.push(slide.ctaTo);
                }
              }}
              style={{
                background: "rgba(255,255,255,0.95)",
                border: "none",
                borderRadius: 14,
                padding: "16px 32px",
                cursor: "pointer",
                color: "#1E293B",
                fontSize: 16,
                fontFamily: font.body,
                fontWeight: 900,
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
              }}
            >
              {t(slide.ctaKey)} →
            </button>

            <button
              onClick={() => router.push("/login")}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: 14,
                padding: "14px 28px",
                cursor: "pointer",
                color: C.white,
                fontSize: 15,
                fontFamily: font.body,
                fontWeight: 800,
                backdropFilter: "blur(10px)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
              }}
            >
              {lang === "sw" ? "Nina akaunti" : "I have an account"}
            </button>
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", gap: 20, marginTop: 40, flexWrap: "wrap" }}>
            {[
              { v: "10K+", l: lang === "sw" ? "Wanafunzi" : "Students" },
              { v: "3", l: lang === "sw" ? "Nchi" : "Countries" },
              { v: "24/7", l: lang === "sw" ? "AI Msaada" : "AI Support" },
            ].map((stat) => (
              <div key={stat.l} style={{ textAlign: "center" }}>
                <p style={{
                  color: C.white,
                  fontSize: 24,
                  fontFamily: font.body,
                  fontWeight: 900,
                  margin: "0 0 2px",
                }}>
                  {stat.v}
                </p>
                <p style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  fontFamily: font.body,
                  fontWeight: 700,
                  margin: 0,
                }}>
                  {stat.l}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Photo side */}
        <div style={{
          flex: "0 1 500px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
          <div style={{
            width: "clamp(300px, 38vw, 500px)",
            height: "clamp(300px, 38vw, 500px)",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            border: "4px solid rgba(255,255,255,0.2)",
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? "scale(0.95)" : "scale(1)",
            transition: "all 0.5s ease",
          }}>
            <img
              src={slide.image}
              alt={slide.imageAlt}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>

      {/* Dots navigation */}
      <div style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 10,
        zIndex: 2,
      }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: current === i ? 32 : 10,
              height: 10,
              borderRadius: 5,
              background: current === i ? C.white : "rgba(255,255,255,0.4)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: "absolute",
        bottom: 20,
        right: 30,
        color: "rgba(255,255,255,0.5)",
        fontSize: 11,
        fontFamily: font.body,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 6,
        animation: "bounce 2s ease-in-out infinite",
      }}>
        ↓ {lang === "sw" ? "Sogeza chini" : "Scroll down"}
      </div>
    </section>
  );
}
