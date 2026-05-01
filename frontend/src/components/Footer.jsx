"use client";
import Link from "next/link";
import { translations } from "@/i18n/translations";
import { GraduationCap } from "lucide-react";

export default function Footer({ lang }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const year = new Date().getFullYear();

  const sections = [
    {
      title: lang === "sw" ? "Bidhaa" : "Product",
      links: [
        { label: t("ai_tutor"), to: "/register" },
        { label: t("exam_prep"), to: "/register" },
        { label: t("homework_help"), to: "/register" },
        { label: t("rankings"), to: "/register" },
      ],
    },
    {
      title: lang === "sw" ? "Kwa" : "For",
      links: [
        { label: t("for_students") || "Students", to: "/register" },
        { label: t("for_teachers") || "Teachers", to: "/register" },
        { label: t("for_parents") || "Parents", to: "/register" },
        { label: t("for_schools") || "Schools", to: "/register" },
      ],
    },
    {
      title: lang === "sw" ? "Mitaala" : "Curricula",
      links: [
        { label: "\u{1F1F0}\u{1F1EA} Kenya CBC", to: "/register" },
        { label: "\u{1F1F9}\u{1F1FF} Tanzania TIE", to: "/register" },
        { label: "\u{1F1FA}\u{1F1EC} Uganda NCDC", to: "/register" },
      ],
    },
    {
      title: lang === "sw" ? "Kampuni" : "Company",
      links: [
        { label: lang === "sw" ? "Kutuhusu" : "About Us", to: "/" },
        { label: lang === "sw" ? "Bei" : "Pricing", to: "/#pricing" },
        { label: lang === "sw" ? "Wasiliana nasi" : "Contact", to: "/" },
        { label: lang === "sw" ? "Masharti ya Huduma" : "Terms of Service", to: "/terms" },
        { label: lang === "sw" ? "Sera ya Faragha" : "Privacy Policy", to: "/privacy" },
        { label: lang === "sw" ? "Taarifa ya Kuki" : "Cookie Notice", to: "/cookies" },
      ],
    },
  ];

  return (
    <footer className="bg-gradient-dark text-white px-6 pt-16 pb-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Top grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-[clamp(20px,4vw,40px)] mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <GraduationCap size={32} className="text-white" />
              <div>
                <span className="text-white text-2xl font-heading font-black">ElimuAI</span>
                <span className="block text-white/50 text-[9px] font-body font-bold tracking-[2.5px]">{t("motto")}</span>
              </div>
            </div>
            <p className="text-white/60 text-sm font-body leading-relaxed mb-4 max-w-[280px]">{t("tagline")}</p>
            <div className="flex gap-2">
              {["\u{1F1F0}\u{1F1EA}", "\u{1F1F9}\u{1F1FF}", "\u{1F1FA}\u{1F1EC}"].map((f, i) => (
                <span key={i} className="text-2xl bg-white/10 rounded-[10px] px-2.5 py-1.5">{f}</span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {sections.map((sec) => (
            <div key={sec.title}>
              <h4 className="text-white text-sm font-body font-extrabold mb-4 tracking-wide">{sec.title}</h4>
              {sec.links.map((link) => (
                <Link key={link.label} href={link.to} className="block text-white/55 text-[13px] font-body font-semibold no-underline mb-2.5 hover:text-white transition-colors duration-200">
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div className="border-t border-white/10 pt-6 mb-6 flex flex-wrap gap-4 justify-center items-center">
          <span className="text-white/40 text-xs font-body font-bold">
            {lang === "sw" ? "Njia za Malipo:" : "Payment Methods:"}
          </span>
          {["M-Pesa", "Airtel Money", "T-Kash"].map((m) => (
            <span key={m} className="bg-white/[0.08] rounded-lg px-3 py-1 text-white/60 text-xs font-body font-bold">{m}</span>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-5 flex flex-wrap justify-between items-center gap-3">
          <p className="text-white/40 text-xs font-body m-0">
            &copy; {year} ElimuAI. {lang === "sw" ? "Haki zote zimehifadhiwa." : "All rights reserved."}
          </p>
          <p className="text-white/40 text-xs font-body m-0">
            {lang === "sw" ? "Imetengenezwa kwa \u2764\uFE0F kwa Afrika Mashariki" : "Made with \u2764\uFE0F for East Africa"}
          </p>
        </div>
      </div>
    </footer>
  );
}
