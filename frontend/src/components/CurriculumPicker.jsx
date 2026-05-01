import { CURRICULA } from "@/data/constants";

export default function CurriculumPicker({ country, setCountry, level, setLevel }) {
  const levels = Object.keys(CURRICULA[country].levels);
  return (
    <div className="mb-3.5">
      <div className="flex gap-2 mb-2.5">
        {Object.keys(CURRICULA).map((c) => (
          <button key={c} onClick={() => { setCountry(c); const lvls = Object.keys(CURRICULA[c].levels); setLevel(lvls[Math.min(8, lvls.length - 1)]); }} className={`flex-1 py-2 px-1 rounded-xl cursor-pointer transition-all duration-200 border-2 ${country === c ? "border-purple-600 bg-purple-50" : "border-slate-200 bg-white"}`}>
            <div className="text-lg text-center">{CURRICULA[c].flag}</div>
            <div className={`text-[9px] font-body font-bold text-center ${country === c ? "text-purple-600" : "text-slate-400"}`}>{c}</div>
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {levels.map((l) => (
          <button key={l} onClick={() => setLevel(l)} className={`py-[5px] px-3 rounded-full border-none cursor-pointer whitespace-nowrap shrink-0 text-[11px] font-body font-bold ${level === l ? "bg-purple-600 text-white" : "bg-slate-50 text-slate-400"}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
