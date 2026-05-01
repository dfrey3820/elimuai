import { useRouter } from "next/navigation";
import { translations } from "@/i18n/translations";
import { hasAuthToken } from "@/utils/auth";
import { GraduationCap, LogOut, Languages, Wifi, WifiOff } from "lucide-react";

export default function TopBar({ lang, setLang, isOffline, setIsOffline, user, onLogout }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const router = useRouter();
  return (
    <div className="fixed top-0 left-0 right-0 max-w-[520px] mx-auto z-[150] bg-white/95 backdrop-blur-[10px] border-b border-slate-200 px-4 py-2 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <GraduationCap size={20} className="text-purple-600" strokeWidth={2} />
        <span className="text-purple-600 text-[15px] font-heading font-extrabold tracking-wide">ElimuAI</span>
      </div>
      <div className="flex items-center gap-2.5">
        {hasAuthToken() ? (
          <button onClick={onLogout} className="bg-rose-50 border-none rounded-lg px-2.5 py-1 cursor-pointer text-red-500 text-[10px] font-body font-bold flex items-center gap-1">
            <LogOut size={12} /> {t("sign_out")}
          </button>
        ) : (
          <button onClick={() => router.push("/login")} className="bg-purple-50 border-none rounded-lg px-2.5 py-1 cursor-pointer text-purple-600 text-[10px] font-body font-bold">
            {t("sign_in")}
          </button>
        )}
        <button onClick={() => setLang((l) => (l === "en" ? "sw" : "en"))} className="bg-teal-50 border-none rounded-lg px-2.5 py-1 cursor-pointer text-teal-500 text-[10px] font-body font-bold flex items-center gap-1">
          <Languages size={12} /> {lang === "en" ? "KSW" : "ENG"}
        </button>
        <div className="flex items-center gap-1.5">
          {isOffline ? <WifiOff size={14} className="text-amber-500" /> : <Wifi size={14} className="text-emerald-500" />}
          <div onClick={() => setIsOffline((p) => !p)} className={`w-[34px] h-[18px] rounded-[9px] cursor-pointer relative transition-colors duration-300 shrink-0 ${isOffline ? "bg-amber-500" : "bg-emerald-500"}`}>
            <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] transition-[left] duration-300" style={{ left: isOffline ? 2 : 18 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
