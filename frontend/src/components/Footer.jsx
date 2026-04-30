"use client";
import Link from "next/link";
import { C, font } from "@/theme";
import { translations } from "@/i18n/translations";
import { GraduationCap, Smartphone, CreditCard } from "lucide-react";

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
        { label: "🇰🇪 Kenya CBC", to: "/register" },
        { label: "🇹🇿 Tanzania TIE", to: "/register" },
        { label: "🇺🇬 Uganda NCDC", to: "/register" },
      ],
    },
    {
      title: lang === "sw" ? "Kampuni" : "Company",
      links: [
        { label: lang === "sw" ? "Kutuhusu" : "About Us", to: "/" },
        { label: lang === "sw" ? "Bei" : "Pricing", to: "/#pricing" },
        { label: lang === "sw" ? "Wasiliana nasi" : "Contact", to: "/" },
      ],
    },
  ];

  return (
    <footer style={{
      background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)",
      color: C.white,
      padding: "60px 24px 30px",
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        {/* Top section */}
        <div className="footer-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
          gap: "clamp(20px, 4vw, 40px)",
          marginBottom: 48,
        }}>
          {/* Brand column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <GraduationCap size={32} color={C.white} />
              <div>
                <span style={{
                  color: C.white,
                  fontSize: 24,
                  fontFamily: font.heading,
                  fontWeight: 900,
                }}>
                  ElimuAI
                </span>
                <span style={{
                  display: "block",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 9,
                  fontFamily: font.body,
                  fontWeight: 700,
                  letterSpacing: 2.5,
                }}>
                  {t("motto")}
                </span>
              </div>
            </div>
            <p style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 14,
              fontFamily: font.body,
              lineHeight: 1.7,
              margin: "0 0 16px",
              maxWidth: 280,
            }}>
              {t("tagline")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {"🇰🇪🇹🇿🇺🇬".match(/\p{Emoji_Presentation}/gu)?.map((f, i) => (
                <span key={i} style={{
                  fontSize: 24,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "6px 10px",
                }}>{f}</span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {sections.map((sec) => (
            <div key={sec.title}>
              <h4 style={{
                color: C.white,
                fontSize: 14,
                fontFamily: font.body,
                fontWeight: 800,
                margin: "0 0 16px",
                letterSpacing: 0.5,
              }}>
                {sec.title}
              </h4>
              {sec.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.to}
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 13,
                    fontFamily: font.body,
                    fontWeight: 600,
                    textDecoration: "none",
                    margin: "0 0 10px",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = C.white)}
                  onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.55)")}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 24,
          marginBottom: 24,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          justifyContent: "center",
          alignItems: "center",
        }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: font.body, fontWeight: 700 }}>
            {lang === "sw" ? "Njia za Malipo:" : "Payment Methods:"}
          </span>
          {["M-Pesa", "Airtel Money", "T-Kash"].map((m) => (
            <span key={m} style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "4px 12px",
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
              fontFamily: font.body,
              fontWeight: 700,
            }}>
              {m}
            </span>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 20,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}>
          <p style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            fontFamily: font.body,
            margin: 0,
          }}>
            © {year} ElimuAI. {lang === "sw" ? "Haki zote zimehifadhiwa." : "All rights reserved."}
          </p>
          <p style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 12,
            fontFamily: font.body,
            margin: 0,
          }}>
            {lang === "sw" ? "Imetengenezwa kwa ❤️ kwa Afrika Mashariki" : "Made with ❤️ for East Africa"}
          </p>
        </div>
      </div>
    </footer>
  );
}
