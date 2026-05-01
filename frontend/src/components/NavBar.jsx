import { translations } from "@/i18n/translations";
import {
  Home, Bot, FileText, BarChart3, Trophy, CreditCard,
  Users, Heart, LayoutDashboard, School,
} from "lucide-react";

export default function NavBar({ active, setActive, role, lang }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const tabs = role === "teacher"
    ? [{ l: t("dashboard"), icon: LayoutDashboard, k: "Dashboard" }, { l: t("classes"), icon: Users, k: "Classes" }, { l: t("admin"), icon: School, k: "Admin" }, { l: t("leaderboard"), icon: Trophy, k: "Rankings" }]
    : role === "parent"
    ? [{ l: t("dashboard"), icon: LayoutDashboard, k: "Dashboard" }, { l: t("children"), icon: Heart, k: "Children" }, { l: t("leaderboard"), icon: Trophy, k: "Rankings" }, { l: t("plans"), icon: CreditCard, k: "Plans" }]
    : [{ l: t("home"), icon: Home, k: "Home" }, { l: t("tutor"), icon: Bot, k: "Tutor" }, { l: t("exams"), icon: FileText, k: "Exams" }, { l: t("leaderboard"), icon: Trophy, k: "Rankings" }, { l: t("progress"), icon: BarChart3, k: "Progress" }];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around pt-1.5 pb-4 z-[200] max-w-[520px] mx-auto shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {tabs.map((tb) => {
        const Icon = tb.icon;
        return (
          <button key={tb.k} onClick={() => setActive(tb.k)} className={`bg-transparent border-none cursor-pointer text-[10px] font-body font-bold flex flex-col items-center gap-[3px] transition-colors duration-200 px-2 py-1 ${active === tb.k ? "text-purple-600" : "text-slate-400"}`}>
            <Icon size={20} strokeWidth={active === tb.k ? 2.5 : 1.5} />
            {tb.l}
          </button>
        );
      })}
    </nav>
  );
}
