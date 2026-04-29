"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, font } from "@/theme";
import { hasAuthToken, clearTokens } from "@/utils/auth";
import { translations } from "@/i18n/translations";
import { GraduationCap, Languages, LogOut, LayoutDashboard, ArrowRight, X } from "lucide-react";

export default function Header({ lang, setLang, user, onLogout }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = () => {
    clearTokens();
    if (onLogout) onLogout();
    router.push("/");
  };

  const navLinks = [
    { label: lang === "sw" ? "Nyumbani" : "Home", to: "/" },
    { label: lang === "sw" ? "Vipengele" : "Features", to: "/#features" },
    { label: lang === "sw" ? "Jinsi Inavyofanya Kazi" : "How It Works", to: "/#how-it-works" },
    { label: lang === "sw" ? "Bei" : "Pricing", to: "/#pricing" },
    { label: lang === "sw" ? "Ushuhuda" : "Testimonials", to: "/#testimonials" },
  ];

  const handleNavClick = (to) => {
    setMobileOpen(false);
    if (to.startsWith("/#")) {
      const el = document.getElementById(to.slice(2));
      if (el) { el.scrollIntoView({ behavior: "smooth" }); return; }
    }
    router.push(to);
  };

  const isLoggedIn = hasAuthToken();

  return (
    <>
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: scrolled ? "rgba(255,255,255,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "none",
        transition: "all 0.3s ease",
        padding: scrolled ? "8px 0" : "14px 0",
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <GraduationCap size={28} style={{ color: scrolled ? C.primary : C.white, transition: "color 0.3s" }} />
            <div>
              <span style={{
                color: scrolled ? C.primary : C.white,
                fontSize: 22,
                fontFamily: font.heading,
                fontWeight: 800,
                letterSpacing: 0.5,
                transition: "color 0.3s",
              }}>
                ElimuAI
              </span>
              <span style={{
                display: "block",
                color: scrolled ? C.textMuted : "rgba(255,255,255,0.7)",
                fontSize: 9,
                fontFamily: font.body,
                fontWeight: 700,
                letterSpacing: 2.5,
                transition: "color 0.3s",
              }}>
                {t("motto")}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {navLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => handleNavClick(link.to)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: scrolled ? C.textSecondary : "rgba(255,255,255,0.85)",
                  fontSize: 14,
                  fontFamily: font.body,
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: 8,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = scrolled ? C.primary : C.white;
                  e.currentTarget.style.background = scrolled ? `${C.primary}08` : "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = scrolled ? C.textSecondary : "rgba(255,255,255,0.85)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {link.label}
              </button>
            ))}

            <div style={{ width: 1, height: 24, background: scrolled ? C.border : "rgba(255,255,255,0.2)", margin: "0 8px" }} />

            <div style={{ display: "flex", gap: 4, marginRight: 4 }}>
              {["🇰🇪", "🇹🇿", "🇺🇬"].map((f, i) => (
                <span key={i} style={{ fontSize: 16, opacity: 0.85 }}>{f}</span>
              ))}
            </div>

            <button
              onClick={() => setLang?.((l) => (l === "en" ? "sw" : "en"))}
              style={{
                background: scrolled ? `${C.teal}15` : "rgba(255,255,255,0.15)",
                border: `1px solid ${scrolled ? `${C.teal}30` : "rgba(255,255,255,0.2)"}`,
                borderRadius: 10,
                padding: "6px 14px",
                cursor: "pointer",
                color: scrolled ? C.teal : C.white,
                fontSize: 12,
                fontFamily: font.body,
                fontWeight: 800,
                transition: "all 0.3s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Languages size={14} />
              {lang === "en" ? "Kiswahili" : "English"}
            </button>

            {isLoggedIn ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => router.push("/dashboard")} style={{
                  background: C.gradientPrimary, border: "none", borderRadius: 10,
                  padding: "8px 18px", cursor: "pointer", color: C.white,
                  fontSize: 13, fontFamily: font.body, fontWeight: 800,
                  display: "flex", alignItems: "center", gap: 6,
                }}><LayoutDashboard size={14} /> {t("dashboard")}</button>
                <button onClick={handleLogout} style={{
                  background: scrolled ? `${C.error}12` : "rgba(255,255,255,0.1)",
                  border: `1px solid ${scrolled ? `${C.error}30` : "rgba(255,255,255,0.2)"}`,
                  borderRadius: 10, padding: "8px 14px", cursor: "pointer",
                  color: scrolled ? C.error : "#FCA5A5", fontSize: 12,
                  fontFamily: font.body, fontWeight: 800, transition: "all 0.3s",
                  display: "flex", alignItems: "center", gap: 6,
                }}><LogOut size={14} /> {t("sign_out")}</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => router.push("/login")} style={{
                  background: "transparent",
                  border: `2px solid ${scrolled ? C.primary : "rgba(255,255,255,0.4)"}`,
                  borderRadius: 10, padding: "8px 18px", cursor: "pointer",
                  color: scrolled ? C.primary : C.white, fontSize: 13,
                  fontFamily: font.body, fontWeight: 800, transition: "all 0.3s",
                }}>{t("sign_in")}</button>
                <button onClick={() => router.push("/register")} style={{
                  background: scrolled ? C.gradientPrimary : "rgba(255,255,255,0.95)",
                  border: "none", borderRadius: 10, padding: "8px 18px",
                  cursor: "pointer", color: scrolled ? C.white : C.primary,
                  fontSize: 13, fontFamily: font.body, fontWeight: 800,
                  boxShadow: C.shadowMd, transition: "all 0.3s",
                  display: "flex", alignItems: "center", gap: 6,
                }}>{t("sign_up")} <ArrowRight size={14} /></button>
              </div>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            style={{ display: "none", background: "transparent", border: "none", cursor: "pointer", padding: 8, zIndex: 1002 }}
          >
            <div style={{ width: 24, height: 18, position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ display: "block", height: 2.5, width: "100%", background: scrolled ? C.text : C.white, borderRadius: 2, transition: "all 0.3s", transform: mobileOpen ? "rotate(45deg) translate(5.5px, 5.5px)" : "none" }} />
              <span style={{ display: "block", height: 2.5, width: "100%", background: scrolled ? C.text : C.white, borderRadius: 2, transition: "all 0.3s", opacity: mobileOpen ? 0 : 1 }} />
              <span style={{ display: "block", height: 2.5, width: "100%", background: scrolled ? C.text : C.white, borderRadius: 2, transition: "all 0.3s", transform: mobileOpen ? "rotate(-45deg) translate(6px, -6px)" : "none" }} />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 998, backdropFilter: "blur(4px)",
        }} />
      )}

      {/* Mobile slide-out menu */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: "min(320px, 85vw)", height: "100vh",
        background: C.white, zIndex: 999,
        transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex", flexDirection: "column",
        boxShadow: mobileOpen ? "-10px 0 40px rgba(0,0,0,0.15)" : "none",
        overflowY: "auto",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <GraduationCap size={24} style={{ color: C.primary }} />
            <span style={{ color: C.primary, fontSize: 20, fontFamily: font.heading, fontWeight: 800 }}>ElimuAI</span>
          </div>
          <button onClick={() => setMobileOpen(false)} style={{
            background: C.surface, border: "none", borderRadius: 10, width: 36, height: 36,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.textSecondary,
          }}><X size={18} /></button>
        </div>

        <div style={{ padding: "16px 12px", flex: 1 }}>
          {navLinks.map((link) => (
            <button key={link.to} onClick={() => handleNavClick(link.to)} style={{
              display: "block", width: "100%", textAlign: "left", background: "transparent",
              border: "none", cursor: "pointer", color: C.text, fontSize: 16,
              fontFamily: font.body, fontWeight: 700, padding: "14px 16px", borderRadius: 12, transition: "all 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.primaryBg; e.currentTarget.style.color = C.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.text; }}
            >{link.label}</button>
          ))}
          <div style={{ display: "flex", gap: 8, padding: "14px 16px" }}>
            {["🇰🇪", "🇹🇿", "🇺🇬"].map((f, i) => (
              <span key={i} style={{ fontSize: 22 }}>{f}</span>
            ))}
          </div>
          <button onClick={() => setLang?.((l) => (l === "en" ? "sw" : "en"))} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "calc(100% - 32px)", margin: "0 16px 8px",
            background: `${C.teal}10`, border: `1px solid ${C.teal}30`, borderRadius: 12,
            padding: "12px 16px", cursor: "pointer", color: C.teal, fontSize: 14,
            fontFamily: font.body, fontWeight: 800, textAlign: "center",
          }}><Languages size={16} /> {lang === "en" ? "Badilisha kwa Kiswahili" : "Switch to English"}</button>
        </div>

        <div style={{ padding: "16px 24px 32px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
          {isLoggedIn ? (
            <>
              <button onClick={() => { setMobileOpen(false); router.push("/dashboard"); }} style={{
                background: C.gradientPrimary, border: "none", borderRadius: 12, padding: "14px",
                cursor: "pointer", color: C.white, fontSize: 15, fontFamily: font.body, fontWeight: 800, textAlign: "center",
              }}>{t("dashboard")} <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} /></button>
              <button onClick={() => { setMobileOpen(false); handleLogout(); }} style={{
                background: `${C.error}08`, border: `1px solid ${C.error}25`, borderRadius: 12, padding: "14px",
                cursor: "pointer", color: C.error, fontSize: 14, fontFamily: font.body, fontWeight: 800, textAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}><LogOut size={16} /> {t("sign_out")}</button>
            </>
          ) : (
            <>
              <button onClick={() => { setMobileOpen(false); router.push("/register"); }} style={{
                background: C.gradientPrimary, border: "none", borderRadius: 12, padding: "14px",
                cursor: "pointer", color: C.white, fontSize: 15, fontFamily: font.body, fontWeight: 800, textAlign: "center",
              }}>{t("sign_up")} <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} /></button>
              <button onClick={() => { setMobileOpen(false); router.push("/login"); }} style={{
                background: "transparent", border: `2px solid ${C.primary}`, borderRadius: 12, padding: "14px",
                cursor: "pointer", color: C.primary, fontSize: 15, fontFamily: font.body, fontWeight: 800, textAlign: "center",
              }}>{t("sign_in")}</button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
