import { GraduationCap, Heart, School } from "lucide-react";

export const FLAG = { KE: "\u{1F1F0}\u{1F1EA}", TZ: "\u{1F1F9}\u{1F1FF}", UG: "\u{1F1FA}\u{1F1EC}" };
export const COUNTRY_CODE = { Kenya: "KE", Tanzania: "TZ", Uganda: "UG" };
export const COUNTRY_NAME = { KE: "Kenya", TZ: "Tanzania", UG: "Uganda" };

export const OFFLINE_LESSONS = {
  Mathematics: [
    { title: { en: "Algebra Basics", sw: "Misingi ya Aljebra" }, content: { en: "Algebra uses letters to represent unknown numbers.\n\nExample: If x + 5 = 12, then x = 7\n\nKey rules:\n- x + a = b -> x = b - a\n- ax = b -> x = b/a\n\nAlways do the same operation on both sides!\n\nPractice: Solve 3x + 6 = 18\nStep 1: 3x = 12\nStep 2: x = 4", sw: "Aljebra hutumia herufi kuwakilisha nambari zisizojulikana.\n\nMfano: Kama x + 5 = 12, basi x = 7" } },
    { title: { en: "Fractions & Decimals", sw: "Sehemu na Desimali" }, content: { en: "A fraction = part of a whole.\n\nAdding: 1/3 + 1/4 = 4/12 + 3/12 = 7/12\n\nConverting: 1/2 = 0.5 | 3/4 = 0.75 | 1/5 = 0.2", sw: "Sehemu = sehemu ya jumla." } },
  ],
  Science: [
    { title: { en: "Photosynthesis", sw: "Usanisinuru" }, content: { en: "Plants make food using sunlight.\n\nFormula: 6CO2 + 6H2O + light -> C6H12O6 + 6O2\n\nNeeds: Sunlight, Water, CO2, Chlorophyll\nProduces: Glucose + Oxygen", sw: "Mimea hutengeneza chakula kwa kutumia mwanga wa jua." } },
  ],
  English: [
    { title: { en: "Essay Structure", sw: "Muundo wa Insha" }, content: { en: "A good essay has 3 parts:\n\n1. INTRODUCTION - Hook, Background, Thesis\n2. BODY (3+ paragraphs) - Topic sentence, Evidence, Explanation\n3. CONCLUSION - Restate thesis, Summarize, Closing thought", sw: "Insha nzuri ina sehemu 3." } },
  ],
};

export const LEADERBOARD_MOCK = [
  { rank: 1, name: "Zawadi K.", xp: 4820, streak: 14, tests: 28, country: "KE", is_current: false, avatar: "Z" },
  { rank: 2, name: "Amina H.", xp: 4650, streak: 11, tests: 24, country: "TZ", is_current: false, avatar: "A" },
  { rank: 3, name: "Brian O.", xp: 4200, streak: 9, tests: 21, country: "KE", is_current: false, avatar: "B" },
  { rank: 4, name: "Grace N.", xp: 3980, streak: 7, tests: 19, country: "UG", is_current: false, avatar: "G" },
  { rank: 5, name: "David M.", xp: 3750, streak: 6, tests: 17, country: "KE", is_current: false, avatar: "D" },
  { rank: 6, name: "Fatuma A.", xp: 3520, streak: 5, tests: 16, country: "TZ", is_current: false, avatar: "F" },
  { rank: 7, name: "You", xp: 3210, streak: 7, tests: 12, country: "KE", is_current: true, avatar: "Y" },
  { rank: 8, name: "Peter K.", xp: 2900, streak: 4, tests: 14, country: "UG", is_current: false, avatar: "P" },
  { rank: 9, name: "Joyce W.", xp: 2750, streak: 3, tests: 11, country: "KE", is_current: false, avatar: "J" },
  { rank: 10, name: "Hassan M.", xp: 2600, streak: 5, tests: 10, country: "TZ", is_current: false, avatar: "H" },
];

export const PLAN_ICONS = { free: GraduationCap, student: GraduationCap, family: Heart, school: School };

export const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-[10px] px-3 py-2.5 text-slate-900 text-[13px] font-body outline-none box-border";
export const btnPrimary = "w-full py-3 rounded-xl border-none cursor-pointer bg-gradient-primary text-white text-sm font-body font-extrabold flex items-center justify-center gap-1.5";
export const btnAccent = "w-full py-3 rounded-[14px] border-none cursor-pointer bg-gradient-accent text-white text-sm font-body font-extrabold flex items-center justify-center gap-1.5";
