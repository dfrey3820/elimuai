"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
      <header className={`fixed top-0 inset-x-0 z-[1000] transition-all duration-300 ${
        scrolled ? "bg-white/[0.97] backdrop-blur-md border-b border-slate-200 py-2" : "bg-transparent py-3.5"
      }`}>
        <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="no-underline flex items-center gap-2.5">
            <GraduationCap size={28} className={`transition-colors duration-300 ${scrolled ? "text-purple-600" : "text-white"}`} />
            <div>
              <span className={`text-[22px] font-heading font-extrabold tracking-wide transition-colors duration-300 ${scrolled ? "text-purple-600" : "text-white"}`}>
                ElimuAI
              </span>
              <span className={`block text-[9px] font-body font-bold tracking-[2.5px] transition-colors duration-300 ${scrolled ? "text-slate-400" : "text-white/70"}`}>
                {t("motto")}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => handleNavClick(link.to)}
                className={`bg-transparent border-none cursor-pointer text-sm font-body font-bold px-3.5 py-2 rounded-lg transition-all duration-200 ${
                  scrolled ? "text-slate-600 hover:text-purple-600 hover:bg-purple-600/5" : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </button>
            ))}

            <div className={`w-px h-6 mx-2 ${scrolled ? "bg-slate-200" : "bg-white/20"}`} />

            <div className="flex gap-1 mr-1">
              {["\u{1F1F0}\u{1F1EA}", "\u{1F1F9}\u{1F1FF}", "\u{1F1FA}\u{1F1EC}"].map((f, i) => (
                <span key={i} className="text-base opacity-85">{f}</span>
              ))}
            </div>

            <button
              onClick={() => setLang?.((l) => (l === "en" ? "sw" : "en"))}
              className={`rounded-[10px] px-3.5 py-1.5 cursor-pointer text-xs font-body font-extrabold transition-all duration-300 flex items-center gap-1.5 ${
                scrolled
                  ? "bg-teal-500/[0.08] border border-teal-500/20 text-teal-500"
                  : "bg-white/15 border border-white/20 text-white"
              }`}
            >
              <Languages size={14} />
              {lang === "en" ? "Kiswahili" : "English"}
            </button>

            {isLoggedIn ? (
              <div className="flex gap-2 items-center">
                <button onClick={() => router.push("/dashboard")} className="bg-gradient-primary border-none rounded-[10px] px-[18px] py-2 cursor-pointer text-white text-[13px] font-body font-extrabold flex items-center gap-1.5">
                  <LayoutDashboard size={14} /> {t("dashboard")}
                </button>
                <button onClick={handleLogout} className={`rounded-[10px] px-3.5 py-2 cursor-pointer text-xs font-body font-extrabold transition-all duration-300 flex items-center gap-1.5 ${
                  scrolled ? "bg-red-500/[0.07] border border-red-500/20 text-red-500" : "bg-white/10 border border-white/20 text-red-300"
                }`}>
                  <LogOut size={14} /> {t("sign_out")}
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <button onClick={() => router.push("/login")} className={`bg-transparent rounded-[10px] px-[18px] py-2 cursor-pointer text-[13px] font-body font-extrabold transition-all duration-300 ${
                  scrolled ? "border-2 border-purple-600 text-purple-600" : "border-2 border-white/40 text-white"
                }`}>
                  {t("sign_in")}
                </button>
                <button onClick={() => router.push("/register")} className={`border-none rounded-[10px] px-[18px] py-2 cursor-pointer text-[13px] font-body font-extrabold shadow-md transition-all duration-300 flex items-center gap-1.5 ${
                  scrolled ? "bg-gradient-primary text-white" : "bg-white/95 text-purple-600"
                }`}>
                  {t("sign_up")} <ArrowRight size={14} />
                </button>
              </div>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            className="flex lg:hidden bg-transparent border-none cursor-pointer p-2 z-[1002]"
          >
            <div className="w-6 h-[18px] relative flex flex-col justify-between">
              <span className={`block h-[2.5px] w-full rounded-sm transition-all duration-300 ${scrolled ? "bg-slate-900" : "bg-white"} ${mobileOpen ? "rotate-45 translate-x-[5.5px] translate-y-[5.5px]" : ""}`} />
              <span className={`block h-[2.5px] w-full rounded-sm transition-all duration-300 ${scrolled ? "bg-slate-900" : "bg-white"} ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`block h-[2.5px] w-full rounded-sm transition-all duration-300 ${scrolled ? "bg-slate-900" : "bg-white"} ${mobileOpen ? "-rotate-45 translate-x-[6px] -translate-y-[6px]" : ""}`} />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/50 z-[998] backdrop-blur-sm" />
      )}

      {/* Mobile slide-out menu */}
      <div className={`fixed top-0 right-0 w-[min(320px,85vw)] h-screen bg-white z-[999] flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.15)] overflow-y-auto transition-transform duration-350 ${
        mobileOpen ? "translate-x-0" : "translate-x-full"
      }`} style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GraduationCap size={24} className="text-purple-600" />
            <span className="text-purple-600 text-xl font-heading font-extrabold">ElimuAI</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="bg-slate-50 border-none rounded-[10px] w-9 h-9 cursor-pointer flex items-center justify-center text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-3 py-4 flex-1">
          {navLinks.map((link) => (
            <button key={link.to} onClick={() => handleNavClick(link.to)} className="block w-full text-left bg-transparent border-none cursor-pointer text-slate-900 text-base font-body font-bold px-4 py-3.5 rounded-xl transition-all duration-200 hover:bg-purple-50 hover:text-purple-600">
              {link.label}
            </button>
          ))}
          <div className="flex gap-2 px-4 py-3.5">
            {["\u{1F1F0}\u{1F1EA}", "\u{1F1F9}\u{1F1FF}", "\u{1F1FA}\u{1F1EC}"].map((f, i) => (
              <span key={i} className="text-[22px]">{f}</span>
            ))}
          </div>
          <button onClick={() => setLang?.((l) => (l === "en" ? "sw" : "en"))} className="flex items-center justify-center gap-2 w-[calc(100%-32px)] mx-4 mb-2 bg-teal-500/[0.06] border border-teal-500/20 rounded-xl px-4 py-3 cursor-pointer text-teal-500 text-sm font-body font-extrabold">
            <Languages size={16} /> {lang === "en" ? "Badilisha kwa Kiswahili" : "Switch to English"}
          </button>
        </div>

        <div className="px-6 py-4 pb-8 border-t border-slate-200 flex flex-col gap-2.5">
          {isLoggedIn ? (
            <>
              <button onClick={() => { setMobileOpen(false); router.push("/dashboard"); }} className="bg-gradient-primary border-none rounded-xl py-3.5 cursor-pointer text-white text-[15px] font-body font-extrabold text-center">
                {t("dashboard")} <ArrowRight size={14} className="inline align-middle" />
              </button>
              <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="bg-red-500/5 border border-red-500/15 rounded-xl py-3.5 cursor-pointer text-red-500 text-sm font-body font-extrabold flex items-center justify-center gap-2">
                <LogOut size={16} /> {t("sign_out")}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setMobileOpen(false); router.push("/register"); }} className="bg-gradient-primary border-none rounded-xl py-3.5 cursor-pointer text-white text-[15px] font-body font-extrabold text-center">
                {t("sign_up")} <ArrowRight size={14} className="inline align-middle" />
              </button>
              <button onClick={() => { setMobileOpen(false); router.push("/login"); }} className="bg-transparent border-2 border-purple-600 rounded-xl py-3.5 cursor-pointer text-purple-600 text-[15px] font-body font-extrabold text-center">
                {t("sign_in")}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
