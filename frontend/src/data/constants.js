export const CURRICULA = {
  Kenya: {
    name: "Kenya CBC", flag: "🇰🇪", curriculum: "CBC",
    levels: {
      "PP1": ["Language Activities", "Math Activities", "Environmental Activities", "Creative Arts"],
      "PP2": ["Language Activities", "Mathematical Activities", "Environmental Activities", "Creative Arts"],
      "Grade 1": ["Literacy", "Kiswahili", "Mathematics", "Environmental", "Creative Arts", "Religious Education"],
      "Grade 2": ["English", "Kiswahili", "Mathematics", "Environmental", "Creative Arts", "Religious Education"],
      "Grade 3": ["English", "Kiswahili", "Mathematics", "Science & Technology", "Social Studies", "Creative Arts", "Religious Education"],
      "Grade 4": ["English", "Kiswahili", "Mathematics", "Science & Technology", "Social Studies", "Creative Arts", "Religious Education", "Agriculture"],
      "Grade 5": ["English", "Kiswahili", "Mathematics", "Science & Technology", "Social Studies", "Creative Arts", "Religious Education", "Agriculture"],
      "Grade 6": ["English", "Kiswahili", "Mathematics", "Science & Technology", "Social Studies", "Creative Arts", "Religious Education", "Agriculture"],
      "Grade 7 (JSS)": ["English", "Kiswahili", "Mathematics", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Creative Arts", "Agriculture", "Financial Literacy"],
      "Grade 8 (JSS)": ["English", "Kiswahili", "Mathematics", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Creative Arts", "Agriculture", "Financial Literacy"],
      "Grade 9 (JSS)": ["English", "Kiswahili", "Mathematics", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Creative Arts", "Agriculture", "Financial Literacy"],
    },
    exams: ["KPSEA (Grade 6)", "Kenya Junior School Assessment (Grade 9)", "KCSE (Form 4)"],
    papers: [
      { id: 1, title: "CBC Integrated Science Grade 9 2023", subject: "Integrated Science", year: 2023, level: "Grade 9 (JSS)" },
      { id: 2, title: "KPSEA Mathematics 2022", subject: "Mathematics", year: 2022, level: "Grade 6" },
      { id: 3, title: "CBC Financial Literacy Grade 9 2023", subject: "Financial Literacy", year: 2023, level: "Grade 9 (JSS)" },
      { id: 4, title: "CBC English Grade 8 2023", subject: "English", year: 2023, level: "Grade 8 (JSS)" },
      { id: 5, title: "CBC Social Studies Grade 7 2023", subject: "Social Studies", year: 2023, level: "Grade 7 (JSS)" },
    ],
  },
  Tanzania: {
    name: "Tanzania TIE 2023", flag: "🇹🇿", curriculum: "NECTA",
    levels: {
      "Standard 1": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT"],
      "Standard 2": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT"],
      "Standard 3": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT", "Vocational Skills"],
      "Standard 4": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT", "Vocational Skills"],
      "Standard 5": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT", "Vocational Skills"],
      "Standard 6": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT", "Vocational Skills"],
      "Standard 7": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT", "Vocational Skills"],
      "Form 1": ["Kiswahili", "English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Civics", "ICT"],
      "Form 2": ["Kiswahili", "English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Civics", "Commerce"],
      "Form 3": ["Kiswahili", "English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Civics", "Book Keeping"],
      "Form 4": ["Kiswahili", "English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Civics", "Commerce", "Book Keeping"],
    },
    exams: ["PSLE — Standard 7", "FTNA — Form 2", "CSEE — Form 4", "ACSEE — Form 6"],
    papers: [
      { id: 6, title: "CSEE Mathematics 2023", subject: "Mathematics", year: 2023, level: "Form 4" },
      { id: 7, title: "CSEE Biology 2023", subject: "Biology", year: 2023, level: "Form 4" },
      { id: 8, title: "PSLE Kiswahili 2022", subject: "Kiswahili", year: 2022, level: "Standard 7" },
      { id: 9, title: "FTNA English 2023", subject: "English", year: 2023, level: "Form 2" },
      { id: 10, title: "CSEE Physics 2022", subject: "Physics", year: 2022, level: "Form 4" },
    ],
  },
  Uganda: {
    name: "Uganda NCDC 2020", flag: "🇺🇬", curriculum: "NCDC",
    levels: {
      "Primary 1": ["Literacy 1", "Literacy 2 (Local Lang)", "Numeracy", "Elementary Science", "Religious Education", "Physical Education"],
      "Primary 2": ["Literacy 1", "Literacy 2", "Numeracy", "Elementary Science", "Social Studies", "Religious Education", "Creative Arts"],
      "Primary 3": ["English", "Local Language", "Mathematics", "Science", "Social Studies", "Religious Education", "Creative Arts"],
      "Primary 4": ["English", "Mathematics", "Science", "Social Studies", "Religious Education", "Creative Arts & Technology"],
      "Primary 5": ["English", "Mathematics", "Science", "Social Studies", "Religious Education", "Creative Arts & Technology"],
      "Primary 6": ["English", "Mathematics", "Science", "Social Studies", "Religious Education", "Creative Arts & Technology"],
      "Primary 7": ["English", "Mathematics", "Science", "Social Studies", "Religious Education", "Creative Arts & Technology"],
      "Senior 1": ["English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Religious Education", "Entrepreneurship", "ICT", "Fine Art"],
      "Senior 2": ["English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Religious Education", "Entrepreneurship", "ICT", "Commerce"],
      "Senior 3": ["English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Religious Education", "Entrepreneurship", "ICT", "Commerce"],
      "Senior 4": ["English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Religious Education", "Entrepreneurship", "ICT", "Commerce"],
    },
    exams: ["PLE — Primary 7", "UCE — Senior 4 (Uganda Certificate of Education)", "UACE — Senior 6"],
    papers: [
      { id: 11, title: "UCE Mathematics 2023", subject: "Mathematics", year: 2023, level: "Senior 4" },
      { id: 12, title: "PLE Science 2022", subject: "Science", year: 2022, level: "Primary 7" },
      { id: 13, title: "UCE Biology 2023", subject: "Biology", year: 2023, level: "Senior 4" },
      { id: 14, title: "UCE English 2022", subject: "English", year: 2022, level: "Senior 4" },
      { id: 15, title: "PLE English 2023", subject: "English", year: 2023, level: "Primary 7" },
    ],
  },
};

export const PLANS = [
  { id: "free", name: { en: "Free", sw: "Bure" }, price: 0, desc: { en: "Get started", sw: "Anza" }, features: { en: ["5 AI questions/day", "2 practice tests/month", "Basic progress"], sw: ["Maswali 5 ya AI/siku", "Mitihani 2 ya mazoezi/mwezi", "Maendeleo ya msingi"] }, color: "#94A3B8", icon: "🆓" },
  { id: "student", name: { en: "Student Pro", sw: "Mwanafunzi Pro" }, price: 299, desc: { en: "per month", sw: "kwa mwezi" }, features: { en: ["Unlimited AI tutoring", "All past papers", "Photo scan", "Analytics", "Parent weekly report"], sw: ["Mwalimu wa AI bila kikomo", "Karatasi zote za zamani", "Skan ya picha", "Uchambuzi", "Ripoti ya kila wiki kwa mzazi"] }, color: "#2563EB", popular: true, icon: "🎓" },
  { id: "family", name: { en: "Family", sw: "Familia" }, price: 499, desc: { en: "per month · 3 children", sw: "kwa mwezi · watoto 3" }, features: { en: ["Everything in Student Pro", "3 student accounts", "Parent dashboard", "SMS reports"], sw: ["Kila kitu katika Student Pro", "Akaunti 3 za wanafunzi", "Dashibodi ya mzazi", "Ripoti za SMS"] }, color: "#10B981", icon: "👨‍👩‍👧" },
  { id: "school", name: { en: "School", sw: "Shule" }, price: 15000, desc: { en: "per term · unlimited", sw: "kwa muhula · bila kikomo" }, features: { en: ["All Family features", "Admin panel", "Teacher dashboards", "Bulk import", "Custom branding"], sw: ["Vipengele vyote vya Familia", "Jopo la msimamizi", "Dashibodi za walimu", "Uingizaji mkubwa", "Brand maalum"] }, color: "#8B5CF6", icon: "🏫" },
];

export const OFFLINE_LESSONS = {
  Mathematics: [
    { title: { en: "Algebra Basics", sw: "Misingi ya Aljebra" }, content: { en: "Algebra uses letters to represent unknown numbers.\n\nExample: If x + 5 = 12, then x = 7\n\nKey rules:\n• x + a = b → x = b - a\n• ax = b → x = b/a\n\nAlways do the same operation on both sides!\n\nPractice: Solve 3x + 6 = 18\nStep 1: 3x = 12\nStep 2: x = 4 ✓", sw: "Aljebra hutumia herufi kuwakilisha nambari zisizojulikana.\n\nMfano: Kama x + 5 = 12, basi x = 7\n\nSheria kuu:\n• x + a = b → x = b - a\n• ax = b → x = b/a\n\nDaima fanya operesheni sawa pande zote mbili!\n\nZoezi: Tatua 3x + 6 = 18\nHatua 1: 3x = 12\nHatua 2: x = 4 ✓" } },
    { title: { en: "Fractions & Decimals", sw: "Sehemu na Desimali" }, content: { en: "A fraction = part of a whole.\n\nAdding (same denom): 1/4 + 2/4 = 3/4\nAdding (diff denom): 1/3 + 1/4 = 4/12 + 3/12 = 7/12\n\nConverting:\n1/2 = 0.5 | 3/4 = 0.75 | 1/5 = 0.2\n\nTip: divide numerator by denominator.", sw: "Sehemu = sehemu ya jumla.\n\nKuongeza (denominator sawa): 1/4 + 2/4 = 3/4\nKuongeza (denominator tofauti): 1/3 + 1/4 = 4/12 + 3/12 = 7/12\n\nKubadilisha:\n1/2 = 0.5 | 3/4 = 0.75 | 1/5 = 0.2\n\nKidokezo: gawanya nambari ya juu na ya chini." } },
  ],
  Science: [
    { title: { en: "Photosynthesis", sw: "Usanisinuru" }, content: { en: "Plants make food using sunlight.\n\nFormula: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂\n\nNeeds: Sunlight, Water, CO₂, Chlorophyll\nProduces: Glucose (food) + Oxygen\n\nFun fact: The mango tree in your compound does this every day! 🌳", sw: "Mimea hutengeneza chakula kwa kutumia mwanga wa jua.\n\nFomula: 6CO₂ + 6H₂O + mwanga → C₆H₁₂O₆ + 6O₂\n\nInahitaji: Mwanga wa jua, Maji, CO₂, Klorofili\nInatoa: Glukosi (chakula) + Oksijeni\n\nUkweli wa kuvutia: Mti wa mwembe nyumbani kwako hufanya hivi kila siku! 🌳" } },
  ],
  English: [
    { title: { en: "Essay Structure", sw: "Muundo wa Insha" }, content: { en: "A good essay has 3 parts:\n\n1. INTRODUCTION\n• Hook sentence\n• Background\n• Thesis (your main argument)\n\n2. BODY (3+ paragraphs)\n• Topic sentence\n• Evidence/Examples\n• Explanation\n\n3. CONCLUSION\n• Restate thesis\n• Summarize key points\n• Closing thought", sw: "Insha nzuri ina sehemu 3:\n\n1. UTANGULIZI\n• Sentensi ya kuvutia\n• Muktadha\n• Nadharia (hoja yako kuu)\n\n2. MWILI (aya 3+)\n• Sentensi ya mada\n• Ushahidi/Mifano\n• Maelezo\n\n3. HITIMISHO\n• Rudia nadharia\n• Muhtasari wa mambo muhimu\n• Wazo la mwisho" } },
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

export const FLAG = { KE: "🇰🇪", TZ: "🇹🇿", UG: "🇺🇬" };
export const MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };
export const COUNTRY_CODE = { Kenya: "KE", Tanzania: "TZ", Uganda: "UG" };
export const COUNTRY_NAME = { KE: "Kenya", TZ: "Tanzania", UG: "Uganda" };
