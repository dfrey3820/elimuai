import { useState, useEffect, useRef } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#08100C", surface:"#0F1810", card:"#162014", border:"#243022",
  gold:"#EDB942", amber:"#C8880A", green:"#38B060", lime:"#8ED14A",
  terracotta:"#B84E28", red:"#D84444", teal:"#2A9090",
  muted:"#728870", text:"#E4EEE0", dim:"#2E4035", white:"#F5F0E8",
};

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  en:{
    home:"Home",tutor:"Tutor",exams:"Exams",homework:"Homework",progress:"Progress",
    leaderboard:"Rankings",dashboard:"Dashboard",classes:"Classes",admin:"Admin",
    children:"Children",reports:"Reports",plans:"Plans",
    greeting:"Karibu!", streak:"Learning Streak",days:"Days",mins_week:"Mins This Week",
    quick_actions:"Quick Actions",achievements:"Achievements",your_level:"Your Level",
    offline_active:"📴 Offline Mode Active",offline_desc:"Cached lessons available. AI tutor requires connection.",
    online:"ONLINE",offline:"OFFLINE",
    ai_tutor:"AI Tutor",ask_placeholder:"Ask a question...",
    exam_prep:"Exam Prep",submit_test:"Submit Test ✓",answer_review:"Answer Review",
    try_another:"Try Another Paper",excellent:"Excellent! 🌟",good_effort:"Good Effort! 📚",keep_going:"Keep Practicing! 💪",
    homework_help:"Homework Help",solve_me:"🔢 Solve For Me",check_work:"✅ Check My Work",
    solve_btn:"Solve Step-by-Step 🔍",check_btn:"Check My Answer ✅",thinking:"Thinking...",
    solution:"STEP-BY-STEP SOLUTION",review_lbl:"ANSWER REVIEW",ai_offline:"📴 AI unavailable offline",
    my_progress:"My Progress",subject_perf:"SUBJECT PERFORMANCE",weekly_report:"📧 WEEKLY REPORT",
    report_desc:"You're in the top 15% of your class! Sent to parent every Sunday.",auto_sent:"✓ Auto-sent Sunday",
    cached:"💾 Cached Lessons",
    rankings:"Rankings",global_lb:"Global",country_lb:"Country",school_lb:"School",
    weekly_lb:"Weekly",monthly_lb:"Monthly",alltime_lb:"All Time",
    your_rank:"YOUR RANK",top_learners:"TOP LEARNERS",no_entries:"Start learning to appear on the leaderboard!",
    rank_lbl:"Rank",xp_lbl:"XP",streak_lbl:"Streak",tests_lbl:"Tests",
    plans_title:"Plans & Pricing",current_plan:"✓ Current Plan",free_plan:"Use Free Plan",popular:"POPULAR",
    mpesa_title:"M-Pesa Payment",saf_number:"Safaricom Number",check_phone:"Check Your Phone",
    stk_sent:"STK push sent to",enter_pin:"Enter your PIN to confirm",
    confirmed_pin:"✓ I've Entered My PIN",cancel:"Cancel",pay_confirmed:"Payment Confirmed!",
    activating:"Activating your account...",also_accepts:"Also accepts Airtel Money & T-Kash",
    who_are_you:"Who are you?",motto:"ELIMU · UJUZI · MAFANIKIO",tagline:"AI-powered learning for East Africa",
    student:"Student",teacher:"Teacher",parent:"Parent",school_admin:"School Admin",
    student_desc:"Learn, practice & track your progress",
    teacher_desc:"Manage classes & get AI insights",
    parent_desc:"Monitor children & weekly reports",
    admin_desc:"Manage your entire institution",
    language_toggle:"🇬🇧 English",switch_lang:"Switch to Kiswahili",
    upgrade_mpesa:"💚 Upgrade Plan — M-Pesa",pay_mpesa:"💚 Pay with M-Pesa",
    notifications_on:"✓ Notifications On",add_student:"+ Add Student",
    generate:"Generate",export_lbl:"Export",view_perf:"📊 View Performance",msg:"💬 Message",
    ai_insights:"🤖 AI Teaching Insights",gen_report:"Generate AI Report 🤖",generating:"Generating...",
  },
  sw:{
    home:"Nyumbani",tutor:"Mwalimu",exams:"Mitihani",homework:"Kazi ya Nyumbani",progress:"Maendeleo",
    leaderboard:"Orodha",dashboard:"Dashibodi",classes:"Madarasa",admin:"Msimamizi",
    children:"Watoto",reports:"Ripoti",plans:"Mipango",
    greeting:"Habari!",streak:"Msururu wa Kujifunza",days:"Siku",mins_week:"Dakika Wiki Hii",
    quick_actions:"Vitendo vya Haraka",achievements:"Mafanikio",your_level:"Kiwango Chako",
    offline_active:"📴 Hali ya Nje ya Mtandao",offline_desc:"Masomo yaliyohifadhiwa yanapatikana. Mwalimu wa AI anahitaji mtandao.",
    online:"MTANDAONI",offline:"NJE YA MTANDAO",
    ai_tutor:"Mwalimu wa AI",ask_placeholder:"Uliza swali...",
    exam_prep:"Maandalizi ya Mtihani",submit_test:"Wasilisha Mtihani ✓",answer_review:"Ukaguzi wa Majibu",
    try_another:"Jaribu Karatasi Nyingine",excellent:"Vizuri Sana! 🌟",good_effort:"Juhudi Nzuri! 📚",keep_going:"Endelea Kufanya Mazoezi! 💪",
    homework_help:"Msaada wa Kazi ya Nyumbani",solve_me:"🔢 Nitatulie",check_work:"✅ Kagua Kazi Yangu",
    solve_btn:"Tatua Hatua kwa Hatua 🔍",check_btn:"Kagua Jibu Langu ✅",thinking:"Inafikiri...",
    solution:"SULUHISHO HATUA KWA HATUA",review_lbl:"UKAGUZI WA JIBU",ai_offline:"📴 AI haitapatikani bila mtandao",
    my_progress:"Maendeleo Yangu",subject_perf:"UTENDAJI WA SOMO",weekly_report:"📧 RIPOTI YA WIKI",
    report_desc:"Uko katika top 15% ya darasa lako! Inatumwa kwa mzazi kila Jumapili.",auto_sent:"✓ Inatumwa Jumapili",
    cached:"💾 Masomo Yaliyohifadhiwa",
    rankings:"Orodha ya Wabora",global_lb:"Duniani",country_lb:"Nchini",school_lb:"Shuleni",
    weekly_lb:"Wiki Hii",monthly_lb:"Mwezi Huu",alltime_lb:"Wakati Wote",
    your_rank:"NAFASI YAKO",top_learners:"WANAFUNZI BORA",no_entries:"Anza kujifunza ili kuonekana kwenye orodha!",
    rank_lbl:"Nafasi",xp_lbl:"Pointi",streak_lbl:"Msururu",tests_lbl:"Mitihani",
    plans_title:"Mipango na Bei",current_plan:"✓ Mpango wa Sasa",free_plan:"Tumia Mpango wa Bure",popular:"MAARUFU",
    mpesa_title:"Malipo ya M-Pesa",saf_number:"Nambari ya Safaricom",check_phone:"Angalia Simu Yako",
    stk_sent:"Ombi la M-Pesa limetumwa kwa",enter_pin:"Ingiza PIN yako kuthibitisha",
    confirmed_pin:"✓ Nimeingiza PIN Yangu",cancel:"Ghairi",pay_confirmed:"Malipo Yamethibitishwa!",
    activating:"Inawasha akaunti yako...",also_accepts:"Pia inakubali Airtel Money & T-Kash",
    who_are_you:"Wewe ni nani?",motto:"ELIMU · UJUZI · MAFANIKIO",tagline:"Elimu ya AI kwa Afrika Mashariki",
    student:"Mwanafunzi",teacher:"Mwalimu",parent:"Mzazi",school_admin:"Msimamizi wa Shule",
    student_desc:"Jifunza, fanya mazoezi na ufuatilie maendeleo yako",
    teacher_desc:"Simamia madarasa na upate maarifa ya AI",
    parent_desc:"Fuatilia watoto na upokee ripoti za kila wiki",
    admin_desc:"Simamia taasisi yako yote",
    language_toggle:"🇰🇪 Kiswahili",switch_lang:"Badilisha kwa Kiingereza",
    upgrade_mpesa:"💚 Boresha Mpango — M-Pesa",pay_mpesa:"💚 Lipa kwa M-Pesa",
    notifications_on:"✓ Arifa Zimewashwa",add_student:"+ Ongeza Mwanafunzi",
    generate:"Tengeneza",export_lbl:"Hamisha",view_perf:"📊 Ona Utendaji",msg:"💬 Tuma Ujumbe",
    ai_insights:"🤖 Maarifa ya AI",gen_report:"Tengeneza Ripoti ya AI 🤖",generating:"Inatengeneza...",
  }
};

// ─── CURRICULA ────────────────────────────────────────────────────────────────
const CURRICULA = {
  Kenya:{name:"Kenya CBC",flag:"🇰🇪",curriculum:"CBC",
    levels:{"PP1":["Language Activities","Math Activities","Environmental Activities","Creative Arts"],"PP2":["Language Activities","Mathematical Activities","Environmental Activities","Creative Arts"],"Grade 1":["Literacy","Kiswahili","Mathematics","Environmental","Creative Arts","Religious Education"],"Grade 2":["English","Kiswahili","Mathematics","Environmental","Creative Arts","Religious Education"],"Grade 3":["English","Kiswahili","Mathematics","Science & Technology","Social Studies","Creative Arts","Religious Education"],"Grade 4":["English","Kiswahili","Mathematics","Science & Technology","Social Studies","Creative Arts","Religious Education","Agriculture"],"Grade 5":["English","Kiswahili","Mathematics","Science & Technology","Social Studies","Creative Arts","Religious Education","Agriculture"],"Grade 6":["English","Kiswahili","Mathematics","Science & Technology","Social Studies","Creative Arts","Religious Education","Agriculture"],"Grade 7 (JSS)":["English","Kiswahili","Mathematics","Integrated Science","Social Studies","Pre-Technical Studies","Creative Arts","Agriculture","Financial Literacy"],"Grade 8 (JSS)":["English","Kiswahili","Mathematics","Integrated Science","Social Studies","Pre-Technical Studies","Creative Arts","Agriculture","Financial Literacy"],"Grade 9 (JSS)":["English","Kiswahili","Mathematics","Integrated Science","Social Studies","Pre-Technical Studies","Creative Arts","Agriculture","Financial Literacy"]},
    exams:["KPSEA (Grade 6)","Kenya Junior School Assessment (Grade 9)","KCSE (Form 4)"],
    papers:[{id:1,title:"CBC Integrated Science Grade 9 2023",subject:"Integrated Science",year:2023,level:"Grade 9 (JSS)"},{id:2,title:"KPSEA Mathematics 2022",subject:"Mathematics",year:2022,level:"Grade 6"},{id:3,title:"CBC Financial Literacy Grade 9 2023",subject:"Financial Literacy",year:2023,level:"Grade 9 (JSS)"},{id:4,title:"CBC English Grade 8 2023",subject:"English",year:2023,level:"Grade 8 (JSS)"},{id:5,title:"CBC Social Studies Grade 7 2023",subject:"Social Studies",year:2023,level:"Grade 7 (JSS)"}]},
  Tanzania:{name:"Tanzania TIE 2023",flag:"🇹🇿",curriculum:"NECTA",
    levels:{"Standard 1":["Kiswahili","English","Mathematics","Science & Technology","Social Studies","ICT"],"Standard 2":["Kiswahili","English","Mathematics","Science & Technology","Social Studies","ICT"],"Standard 3":["Kiswahili","English","Mathematics","Science & Technology","Social Studies","ICT","Vocational Skills"],"Standard 4":["Kiswahili","English","Mathematics","Science & Technology","Social Studies","ICT","Vocational Skills"],"Standard 5":["Kiswahili","English","Mathematics","Science & Technology","Social Studies","ICT","Vocational Skills"],"Standard 6":["Kiswahili","English","Mathematics","Science & Technology","Social Studies","ICT","Vocational Skills"],"Standard 7":["Kiswahili","English","Mathematics","Science & Technology","Social Studies","ICT","Vocational Skills"],"Form 1":["Kiswahili","English","Mathematics","Biology","Chemistry","Physics","History","Geography","Civics","ICT"],"Form 2":["Kiswahili","English","Mathematics","Biology","Chemistry","Physics","History","Geography","Civics","Commerce"],"Form 3":["Kiswahili","English","Mathematics","Biology","Chemistry","Physics","History","Geography","Civics","Book Keeping"],"Form 4":["Kiswahili","English","Mathematics","Biology","Chemistry","Physics","History","Geography","Civics","Commerce","Book Keeping"]},
    exams:["PSLE — Standard 7","FTNA — Form 2","CSEE — Form 4","ACSEE — Form 6"],
    papers:[{id:6,title:"CSEE Mathematics 2023",subject:"Mathematics",year:2023,level:"Form 4"},{id:7,title:"CSEE Biology 2023",subject:"Biology",year:2023,level:"Form 4"},{id:8,title:"PSLE Kiswahili 2022",subject:"Kiswahili",year:2022,level:"Standard 7"},{id:9,title:"FTNA English 2023",subject:"English",year:2023,level:"Form 2"},{id:10,title:"CSEE Physics 2022",subject:"Physics",year:2022,level:"Form 4"}]},
  Uganda:{name:"Uganda NCDC 2020",flag:"🇺🇬",curriculum:"NCDC",
    levels:{"Primary 1":["Literacy 1","Literacy 2 (Local Lang)","Numeracy","Elementary Science","Religious Education","Physical Education"],"Primary 2":["Literacy 1","Literacy 2","Numeracy","Elementary Science","Social Studies","Religious Education","Creative Arts"],"Primary 3":["English","Local Language","Mathematics","Science","Social Studies","Religious Education","Creative Arts"],"Primary 4":["English","Mathematics","Science","Social Studies","Religious Education","Creative Arts & Technology"],"Primary 5":["English","Mathematics","Science","Social Studies","Religious Education","Creative Arts & Technology"],"Primary 6":["English","Mathematics","Science","Social Studies","Religious Education","Creative Arts & Technology"],"Primary 7":["English","Mathematics","Science","Social Studies","Religious Education","Creative Arts & Technology"],"Senior 1":["English","Mathematics","Biology","Chemistry","Physics","History","Geography","Religious Education","Entrepreneurship","ICT","Fine Art"],"Senior 2":["English","Mathematics","Biology","Chemistry","Physics","History","Geography","Religious Education","Entrepreneurship","ICT","Commerce"],"Senior 3":["English","Mathematics","Biology","Chemistry","Physics","History","Geography","Religious Education","Entrepreneurship","ICT","Commerce"],"Senior 4":["English","Mathematics","Biology","Chemistry","Physics","History","Geography","Religious Education","Entrepreneurship","ICT","Commerce"]},
    exams:["PLE — Primary 7","UCE — Senior 4 (Uganda Certificate of Education)","UACE — Senior 6"],
    papers:[{id:11,title:"UCE Mathematics 2023",subject:"Mathematics",year:2023,level:"Senior 4"},{id:12,title:"PLE Science 2022",subject:"Science",year:2022,level:"Primary 7"},{id:13,title:"UCE Biology 2023",subject:"Biology",year:2023,level:"Senior 4"},{id:14,title:"UCE English 2022",subject:"English",year:2022,level:"Senior 4"},{id:15,title:"PLE English 2023",subject:"English",year:2023,level:"Primary 7"}]}
};

const PLANS=[
  {id:"free",name:{en:"Free",sw:"Bure"},price:0,desc:{en:"Get started",sw:"Anza"},features:{en:["5 AI questions/day","2 practice tests/month","Basic progress"],sw:["Maswali 5 ya AI/siku","Mitihani 2 ya mazoezi/mwezi","Maendeleo ya msingi"]},color:C.muted},
  {id:"student",name:{en:"Student Pro",sw:"Mwanafunzi Pro"},price:299,desc:{en:"per month",sw:"kwa mwezi"},features:{en:["Unlimited AI tutoring","All past papers","Photo scan","Analytics","Parent weekly report"],sw:["Mwalimu wa AI bila kikomo","Karatasi zote za zamani","Skan ya picha","Uchambuzi","Ripoti ya kila wiki kwa mzazi"]},color:C.gold,popular:true},
  {id:"family",name:{en:"Family",sw:"Familia"},price:499,desc:{en:"per month · 3 children",sw:"kwa mwezi · watoto 3"},features:{en:["Everything in Student Pro","3 student accounts","Parent dashboard","SMS reports"],sw:["Kila kitu katika Student Pro","Akaunti 3 za wanafunzi","Dashibodi ya mzazi","Ripoti za SMS"]},color:C.green},
  {id:"school",name:{en:"School",sw:"Shule"},price:15000,desc:{en:"per term · unlimited",sw:"kwa muhula · bila kikomo"},features:{en:["All Family features","Admin panel","Teacher dashboards","Bulk import","Custom branding"],sw:["Vipengele vyote vya Familia","Jopo la msimamizi","Dashibodi za walimu","Uingizaji mkubwa","Brand maalum"]},color:C.lime},
];

const OFFLINE_LESSONS={
  Mathematics:[
    {title:{en:"Algebra Basics",sw:"Misingi ya Aljebra"},content:{en:"Algebra uses letters to represent unknown numbers.\n\nExample: If x + 5 = 12, then x = 7\n\nKey rules:\n• x + a = b → x = b - a\n• ax = b → x = b/a\n\nAlways do the same operation on both sides!\n\nPractice: Solve 3x + 6 = 18\nStep 1: 3x = 12\nStep 2: x = 4 ✓",sw:"Aljebra hutumia herufi kuwakilisha nambari zisizojulikana.\n\nMfano: Kama x + 5 = 12, basi x = 7\n\nSheria kuu:\n• x + a = b → x = b - a\n• ax = b → x = b/a\n\nDaima fanya operesheni sawa pande zote mbili!\n\nZoezi: Tatua 3x + 6 = 18\nHatua 1: 3x = 12\nHatua 2: x = 4 ✓"}},
    {title:{en:"Fractions & Decimals",sw:"Sehemu na Desimali"},content:{en:"A fraction = part of a whole.\n\nAdding (same denom): 1/4 + 2/4 = 3/4\nAdding (diff denom): 1/3 + 1/4 = 4/12 + 3/12 = 7/12\n\nConverting:\n1/2 = 0.5 | 3/4 = 0.75 | 1/5 = 0.2\n\nTip: divide numerator by denominator.",sw:"Sehemu = sehemu ya jumla.\n\nKuongeza (denominator sawa): 1/4 + 2/4 = 3/4\nKuongeza (denominator tofauti): 1/3 + 1/4 = 4/12 + 3/12 = 7/12\n\nKubadilisha:\n1/2 = 0.5 | 3/4 = 0.75 | 1/5 = 0.2\n\nKidokezo: gawanya nambari ya juu na ya chini."}},
  ],
  Science:[
    {title:{en:"Photosynthesis",sw:"Usanisinuru"},content:{en:"Plants make food using sunlight.\n\nFormula: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂\n\nNeeds: Sunlight, Water, CO₂, Chlorophyll\nProduces: Glucose (food) + Oxygen\n\nFun fact: The mango tree in your compound does this every day! 🌳",sw:"Mimea hutengeneza chakula kwa kutumia mwanga wa jua.\n\nFomula: 6CO₂ + 6H₂O + mwanga → C₆H₁₂O₆ + 6O₂\n\nInahitaji: Mwanga wa jua, Maji, CO₂, Klorofili\nInatoa: Glukosi (chakula) + Oksijeni\n\nUkweli wa kuvutia: Mti wa mwembe nyumbani kwako hufanya hivi kila siku! 🌳"}},
  ],
  English:[
    {title:{en:"Essay Structure",sw:"Muundo wa Insha"},content:{en:"A good essay has 3 parts:\n\n1. INTRODUCTION\n• Hook sentence\n• Background\n• Thesis (your main argument)\n\n2. BODY (3+ paragraphs)\n• Topic sentence\n• Evidence/Examples\n• Explanation\n\n3. CONCLUSION\n• Restate thesis\n• Summarize key points\n• Closing thought",sw:"Insha nzuri ina sehemu 3:\n\n1. UTANGULIZI\n• Sentensi ya kuvutia\n• Muktadha\n• Nadharia (hoja yako kuu)\n\n2. MWILI (aya 3+)\n• Sentensi ya mada\n• Ushahidi/Mifano\n• Maelezo\n\n3. HITIMISHO\n• Rudia nadharia\n• Muhtasari wa mambo muhimu\n• Wazo la mwisho"}},
  ],
};

const LEADERBOARD_MOCK=[
  {rank:1,name:"Zawadi K.",xp:4820,streak:14,tests:28,country:"KE",is_current:false,avatar:"Z"},
  {rank:2,name:"Amina H.",xp:4650,streak:11,tests:24,country:"TZ",is_current:false,avatar:"A"},
  {rank:3,name:"Brian O.",xp:4200,streak:9,tests:21,country:"KE",is_current:false,avatar:"B"},
  {rank:4,name:"Grace N.",xp:3980,streak:7,tests:19,country:"UG",is_current:false,avatar:"G"},
  {rank:5,name:"David M.",xp:3750,streak:6,tests:17,country:"KE",is_current:false,avatar:"D"},
  {rank:6,name:"Fatuma A.",xp:3520,streak:5,tests:16,country:"TZ",is_current:false,avatar:"F"},
  {rank:7,name:"You",xp:3210,streak:7,tests:12,country:"KE",is_current:true,avatar:"Y"},
  {rank:8,name:"Peter K.",xp:2900,streak:4,tests:14,country:"UG",is_current:false,avatar:"P"},
  {rank:9,name:"Joyce W.",xp:2750,streak:3,tests:11,country:"KE",is_current:false,avatar:"J"},
  {rank:10,name:"Hassan M.",xp:2600,streak:5,tests:10,country:"TZ",is_current:false,avatar:"H"},
];

const FLAG={KE:"🇰🇪",TZ:"🇹🇿",UG:"🇺🇬"};
const MEDAL={1:"🥇",2:"🥈",3:"🥉"};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Spinner(){return(<div style={{display:"flex",gap:5,alignItems:"center",justifyContent:"center",padding:"10px 0"}}>{[0,1,2].map(i=>(<div key={i} style={{width:7,height:7,borderRadius:"50%",background:C.gold,animation:`elb 1s ease-in-out ${i*0.15}s infinite`}}/>))}<style>{`@keyframes elb{0%,80%,100%{transform:scale(0.4);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style></div>);}
function Card({children,style={}}){return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,...style}}>{children}</div>;}
function Badge({children,color=C.gold}){return <span style={{background:`${color}22`,color,fontSize:11,padding:"3px 10px",borderRadius:10,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{children}</span>;}
function SecTitle({children}){return <p style={{color:C.gold,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",margin:"0 0 12px"}}>{children}</p>;}
function SubjectPills({subjects,active,setActive}){return(<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>{subjects.map(s=>(<button key={s} onClick={()=>setActive(s)} style={{padding:"4px 12px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,background:active===s?C.gold:C.card,color:active===s?C.bg:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s}</button>))}</div>);}

async function callClaude(messages,system){
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system,messages})});
    const d=await r.json();
    return d.content?.map(b=>b.text||"").join("")||"";
  }catch{return null;}
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function NavBar({active,setActive,role,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const tabs=role==="teacher"?[{l:t("dashboard"),i:"🏠",k:"Dashboard"},{l:t("classes"),i:"👥",k:"Classes"},{l:t("admin"),i:"🏫",k:"Admin"},{l:t("leaderboard"),i:"🏆",k:"Rankings"}]
    :role==="parent"?[{l:t("dashboard"),i:"🏠",k:"Dashboard"},{l:t("children"),i:"👧",k:"Children"},{l:t("leaderboard"),i:"🏆",k:"Rankings"},{l:t("plans"),i:"💳",k:"Plans"}]
    :role==="admin"?[{l:t("dashboard"),i:"🏠",k:"Dashboard"},{l:"Students",i:"👥",k:"Students"},{l:"Teachers",i:"👨‍🏫",k:"Teachers"},{l:t("reports"),i:"📈",k:"Reports"}]
    :[{l:t("home"),i:"🏠",k:"Home"},{l:t("tutor"),i:"🤖",k:"Tutor"},{l:t("exams"),i:"📝",k:"Exams"},{l:t("leaderboard"),i:"🏆",k:"Rankings"},{l:t("progress"),i:"📊",k:"Progress"}];
  return(<nav style={{position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 16px",zIndex:200,maxWidth:480,margin:"0 auto"}}>{tabs.map(tb=>(<button key={tb.k} onClick={()=>setActive(tb.k)} style={{background:"none",border:"none",cursor:"pointer",color:active===tb.k?C.gold:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800,display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"color 0.2s",padding:"0 4px"}}><span style={{fontSize:20}}>{tb.i}</span>{tb.l}</button>))}</nav>);
}

// ─── TOP BAR ──────────────────────────────────────────────────────────────────
function TopBar({lang,setLang,isOffline,setIsOffline}){
  const t=k=>T[lang]?.[k]||T.en[k];
  return(<div style={{position:"fixed",top:0,left:0,right:0,maxWidth:480,margin:"0 auto",zIndex:150,background:`${C.surface}f0`,borderBottom:`1px solid ${C.border}`,padding:"6px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <span style={{color:C.gold,fontSize:14,fontFamily:"'Nunito',sans-serif",fontWeight:900,letterSpacing:1}}>⚡ ElimuAI</span>
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <button onClick={()=>setLang(l=>l==="en"?"sw":"en")} style={{background:`${C.teal}22`,border:`1px solid ${C.teal}44`,borderRadius:8,padding:"3px 10px",cursor:"pointer",color:C.teal,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{lang==="en"?"🇰🇪 KSW":"🇬🇧 ENG"}</button>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{isOffline?t("offline"):t("online")}</span>
        <div onClick={()=>setIsOffline(p=>!p)} style={{width:34,height:18,borderRadius:9,cursor:"pointer",background:isOffline?C.amber:C.green,position:"relative",transition:"background 0.3s",flexShrink:0}}>
          <div style={{width:14,height:14,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:isOffline?2:18,transition:"left 0.3s"}}/>
        </div>
      </div>
    </div>
  </div>);
}

// ─── CURRICULUM PICKER ───────────────────────────────────────────────────────
function CurriculumPicker({country,setCountry,level,setLevel}){
  const levels=Object.keys(CURRICULA[country].levels);
  return(<div style={{marginBottom:14}}>
    <div style={{display:"flex",gap:8,marginBottom:10}}>
      {Object.keys(CURRICULA).map(c=>(<button key={c} onClick={()=>{setCountry(c);const lvls=Object.keys(CURRICULA[c].levels);setLevel(lvls[Math.min(8,lvls.length-1)]);}} style={{flex:1,padding:"8px 4px",borderRadius:10,border:`1px solid ${country===c?C.green:C.border}`,cursor:"pointer",background:country===c?`${C.green}22`:C.card,transition:"all 0.2s"}}><div style={{fontSize:18,textAlign:"center"}}>{CURRICULA[c].flag}</div><div style={{color:country===c?C.green:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:700,textAlign:"center"}}>{c}</div></button>))}
    </div>
    <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
      {levels.map(l=>(<button key={l} onClick={()=>setLevel(l)} style={{padding:"4px 11px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,background:level===l?C.gold:C.card,color:level===l?C.bg:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{l}</button>))}
    </div>
  </div>);
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({setActive,country,setCountry,level,setLevel,isOffline,plan,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const hour=new Date().getHours();
  const greet=hour<12?t("greeting_morning"):hour<17?t("greeting_afternoon"):t("greeting_evening");
  return(<div style={{padding:"24px 20px 100px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div>
        <p style={{color:C.muted,fontSize:12,margin:0,fontFamily:"'Nunito',sans-serif"}}>{CURRICULA[country].flag} {CURRICULA[country].name}</p>
        <h1 style={{color:C.text,fontSize:24,margin:"2px 0 0",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("greeting")} 🌅</h1>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{background:`${C.green}22`,border:`1px solid ${C.green}44`,borderRadius:10,padding:"4px 10px"}}>
          <span style={{color:C.green,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{plan==="free"?"FREE":plan.toUpperCase()+" ✓"}</span>
        </div>
      </div>
    </div>
    <CurriculumPicker country={country} setCountry={setCountry} level={level} setLevel={setLevel}/>
    <div style={{background:`linear-gradient(135deg,${C.gold}22,${C.amber}11)`,border:`1px solid ${C.gold}44`,borderRadius:16,padding:"14px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><p style={{color:C.gold,fontSize:10,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:800,letterSpacing:1}}>{t("streak").toUpperCase()}</p><p style={{color:C.text,fontSize:28,margin:"4px 0 0",fontFamily:"'Playfair Display',serif",fontWeight:900}}>7 {t("days")} 🔥</p></div>
      <div style={{textAlign:"right"}}><p style={{color:C.muted,fontSize:10,margin:0,fontFamily:"'Nunito',sans-serif"}}>{t("mins_week")}</p><p style={{color:C.text,fontSize:20,margin:"2px 0 0",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>320</p></div>
    </div>
    {isOffline&&<div style={{background:`${C.amber}20`,border:`1px solid ${C.amber}44`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}><span style={{fontSize:18}}>📴</span><div><p style={{color:C.amber,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 2px"}}>{t("offline_active")}</p><p style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:0}}>{t("offline_desc")}</p></div></div>}
    <p style={{color:C.muted,fontSize:10,marginBottom:10,fontFamily:"'Nunito',sans-serif",letterSpacing:1,textTransform:"uppercase"}}>{t("quick_actions")}</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
      {[{l:t("ai_tutor"),i:"🤖",c:C.gold,s:"Tutor",ok:!isOffline},{l:t("exam_prep"),i:"📝",c:C.green,s:"Exams",ok:true},{l:t("homework_help"),i:"📚",c:C.terracotta,s:"Homework",ok:!isOffline},{l:t("rankings"),i:"🏆",c:C.amber,s:"Rankings",ok:true}].map(a=>(<button key={a.l} onClick={()=>a.ok&&setActive(a.s)} style={{background:C.card,border:`1px solid ${isOffline&&!a.ok?C.dim:C.border}`,borderRadius:14,padding:"16px 14px",cursor:isOffline&&!a.ok?"not-allowed":"pointer",textAlign:"left",opacity:isOffline&&!a.ok?0.45:1}}><div style={{fontSize:26,marginBottom:6}}>{a.i}</div><p style={{color:C.text,fontSize:12,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{a.l}</p></button>))}
    </div>
    <p style={{color:C.muted,fontSize:10,marginBottom:10,fontFamily:"'Nunito',sans-serif",letterSpacing:1,textTransform:"uppercase"}}>{t("achievements")}</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["🔥 7-Day Streak","📚 100 Questions","⭐ Top Scorer","🎯 Perfect Test","🌍 3 Countries"].map(b=>(<Badge key={b}>{b}</Badge>))}</div>
  </div>);
}

// ─── AI TUTOR ─────────────────────────────────────────────────────────────────
function TutorScreen({country,level,isOffline,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const curr=CURRICULA[country];
  const subjects=curr.levels[level]||[];
  const [subject,setSubject]=useState(subjects[0]||"Mathematics");
  const [msgs,setMsgs]=useState([{role:"assistant",text:lang==="sw"?`Habari! 👋 Mimi ni mwalimu wako wa ElimuAI kwa **${level}** chini ya **${curr.name}**.\n\nNiulize chochote kuhusu ${subject}. Nitaeleza hatua kwa hatua na mifano kutoka Afrika Mashariki! 🌍`:`Habari! 👋 I'm your ElimuAI tutor for **${level}** under the **${curr.name}**.\n\nAsk me anything about ${subject}. I'll explain step-by-step with East African examples! 🌍`}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef();
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const send=async()=>{
    if(!input.trim()||loading||isOffline)return;
    const q=input.trim();setInput("");
    setMsgs(p=>[...p,{role:"user",text:q}]);setLoading(true);
    const history=msgs.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text}));
    history.push({role:"user",content:q});
    const system=lang==="sw"
      ?`Wewe ni ElimuAI, mwalimu wa AI wa kusisimua kwa wanafunzi wa ${level} wanaofuata ${curr.name}. Unafundisha: ${subject}. Eleza hatua kwa hatua kwa Kiswahili safi. Tumia mifano kutoka Afrika Mashariki (masoko, shamba, miji). Usitoe majibu tu — fundisha dhana. Jibu kwa Kiswahili KABISA.`
      :`You are ElimuAI, a friendly AI tutor for ${level} students following ${curr.name} (${curr.curriculum}). Teaching: ${subject}. Explain step-by-step. Use East African examples (markets, farms, cities, wildlife). Never just give answers — teach the concept. Be encouraging and concise.`;
    const reply=await callClaude(history,system);
    setMsgs(p=>[...p,{role:"assistant",text:reply||(lang==="sw"?"Samahani, tatizo la mtandao. Jaribu tena!":"Sorry, connection issue. Please try again!")}]);
    setLoading(false);
  };
  if(isOffline)return(<div style={{padding:"24px 20px 100px"}}><h2 style={{color:C.text,fontSize:22,margin:"0 0 6px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("ai_tutor")}</h2><div style={{background:`${C.amber}20`,border:`1px solid ${C.amber}44`,borderRadius:14,padding:14,marginBottom:18}}><p style={{color:C.amber,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 4px"}}>{t("ai_offline")}</p><p style={{color:C.muted,fontFamily:"'Nunito',sans-serif",fontSize:12,margin:0}}>{t("offline_desc")}</p></div>
    <SecTitle>{t("cached")}</SecTitle>
    {Object.entries(OFFLINE_LESSONS).map(([subj,lessons])=>(<div key={subj} style={{marginBottom:14}}><p style={{color:C.gold,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 8px"}}>{subj.toUpperCase()}</p>{lessons.map(l=>(<Card key={l.title.en} style={{marginBottom:8}}><p style={{color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 6px"}}>{l.title[lang]||l.title.en}</p><p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",lineHeight:1.65,margin:0,whiteSpace:"pre-wrap"}}>{l.content[lang]||l.content.en}</p></Card>))}</div>))}
  </div>);
  return(<div style={{display:"flex",flexDirection:"column",height:"100vh"}}>
    <div style={{padding:"12px 16px 8px",background:C.surface,borderBottom:`1px solid ${C.border}`,flexShrink:0,marginTop:44}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><h2 style={{color:C.text,fontSize:17,margin:0,fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("ai_tutor")}</h2><Badge color={C.green}>{curr.flag} {curr.name}</Badge></div>
      <SubjectPills subjects={subjects} active={subject} setActive={setSubject}/>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10,paddingBottom:100}}>
      {msgs.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
        {m.role==="assistant"&&<div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.amber})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,marginRight:6,flexShrink:0,alignSelf:"flex-end"}}>🤖</div>}
        <div style={{maxWidth:"76%",padding:"10px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?`linear-gradient(135deg,${C.gold},${C.amber})`:C.card,border:m.role==="user"?"none":`1px solid ${C.border}`,color:m.role==="user"?C.bg:C.text,fontSize:13,lineHeight:1.65,fontFamily:"'Nunito',sans-serif",fontWeight:600,whiteSpace:"pre-wrap"}}>{m.text}</div>
      </div>))}
      {loading&&<div style={{display:"flex",gap:6}}><div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.amber})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤖</div><Card style={{padding:"8px 14px"}}><Spinner/></Card></div>}
      <div ref={endRef}/>
    </div>
    <div style={{padding:"8px 12px",background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"flex-end",position:"fixed",bottom:62,left:0,right:0,maxWidth:480,margin:"0 auto",boxSizing:"border-box"}}>
      <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder={`${t("ask_placeholder")} (${subject})`} rows={1} style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",resize:"none",outline:"none"}}/>
      <button onClick={send} disabled={loading} style={{width:40,height:40,borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,fontSize:15,opacity:loading?0.5:1}}>➤</button>
    </div>
  </div>);
}

// ─── EXAMS ────────────────────────────────────────────────────────────────────
function ExamScreen({country,level,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const curr=CURRICULA[country];
  const [mode,setMode]=useState("browse");
  const [paper,setPaper]=useState(null);
  const [qs,setQs]=useState([]);
  const [ans,setAns]=useState({});
  const [loading,setLoading]=useState(false);
  const [time,setTime]=useState(0);
  const [results,setResults]=useState(null);
  const timerRef=useRef();
  useEffect(()=>{if(mode==="practice"&&time>0){timerRef.current=setInterval(()=>setTime(t=>{if(t<=1){clearInterval(timerRef.current);doSubmit();return 0;}return t-1;}),1000);}return()=>clearInterval(timerRef.current);},[mode]);
  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const startPractice=async(p)=>{
    setPaper(p);setLoading(true);
    const system=`You are ElimuAI exam generator for ${curr.name} (${curr.curriculum}).
Generate exactly 5 multiple-choice questions for ${p.title}.
Return ONLY a valid JSON array (no markdown):
[{"q":"question","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A","explanation":"why A is correct"}]
${lang==="sw"?"Write all questions, options and explanations in Kiswahili.":""}`;
    const reply=await callClaude([{role:"user",content:`Generate 5 ${p.subject} questions for ${p.level} (${curr.name}), style like ${p.year} past paper.`}],system);
    try{const clean=reply.replace(/```json|```/g,"").trim();setQs(JSON.parse(clean));setAns({});setTime(5*60);setMode("practice");}
    catch{alert(lang==="sw"?"Haikuweza kutengeneza maswali. Jaribu tena!":"Couldn't generate questions. Try again!");}
    setLoading(false);
  };
  const doSubmit=()=>{
    clearInterval(timerRef.current);
    let score=0;qs.forEach((q,i)=>{if(ans[i]===q.answer)score++;});
    setResults({score,total:qs.length,pct:Math.round(score/qs.length*100)});
    setMode("results");
  };
  if(mode==="practice"&&qs.length)return(<div style={{padding:"18px 18px 100px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div><p style={{color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:0}}>{paper?.title}</p><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:"2px 0 0"}}>{curr.flag} {curr.name}</p></div>
      <div style={{background:time<60?`${C.terracotta}33`:C.card,border:`1px solid ${time<60?C.terracotta:C.border}`,borderRadius:10,padding:"5px 12px"}}><span style={{color:time<60?C.terracotta:C.gold,fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:15}}>⏱ {fmt(time)}</span></div>
    </div>
    {qs.map((q,i)=>(<Card key={i} style={{marginBottom:10}}><p style={{color:C.text,fontSize:13,margin:"0 0 10px",fontFamily:"'Nunito',sans-serif",fontWeight:700,lineHeight:1.5}}><span style={{color:C.gold}}>{i+1}. </span>{q.q}</p>{q.options.map(opt=>(<button key={opt} onClick={()=>setAns(a=>({...a,[i]:opt[0]}))} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",marginBottom:4,borderRadius:10,border:`1px solid ${ans[i]===opt[0]?C.gold:C.border}`,background:ans[i]===opt[0]?`${C.gold}22`:C.surface,color:ans[i]===opt[0]?C.gold:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:600,cursor:"pointer"}}>{opt}</button>))}</Card>))}
    <button onClick={doSubmit} style={{width:"100%",padding:"12px",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:14,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{t("submit_test")}</button>
  </div>);
  if(mode==="results"&&results)return(<div style={{padding:"22px 18px 100px",textAlign:"center"}}>
    <div style={{fontSize:56,marginBottom:6}}>{results.pct>=70?"🏆":results.pct>=50?"👍":"💪"}</div>
    <h2 style={{color:C.text,fontSize:32,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:"0 0 4px"}}>{results.pct}%</h2>
    <p style={{color:C.muted,fontFamily:"'Nunito',sans-serif",marginBottom:8}}>{results.score}/{results.total}</p>
    <Badge color={results.pct>=70?C.green:results.pct>=50?C.gold:C.terracotta}>{results.pct>=70?t("excellent"):results.pct>=50?t("good_effort"):t("keep_going")}</Badge>
    <Card style={{marginTop:16,textAlign:"left"}}>
      <SecTitle>{t("answer_review")}</SecTitle>
      {qs.map((q,i)=>(<div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}><p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",margin:"0 0 3px"}}><b>{i+1}.</b> {q.q}</p><p style={{color:ans[i]===q.answer?C.green:C.terracotta,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:"0 0 2px"}}>{t("your_answer")}: {ans[i]||"—"} {ans[i]===q.answer?"✓":"✗"} | {t("correct")}: {q.answer}</p><p style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:0,fontStyle:"italic"}}>{q.explanation}</p></div>))}
    </Card>
    <button onClick={()=>{setMode("browse");setResults(null);setQs([]);}} style={{width:"100%",padding:"12px",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:14,fontFamily:"'Nunito',sans-serif",fontWeight:800,marginTop:14}}>{t("try_another")}</button>
  </div>);
  return(<div style={{padding:"22px 18px 100px"}}>
    <h2 style={{color:C.text,fontSize:22,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("exam_prep")}</h2>
    <p style={{color:C.muted,fontSize:12,margin:"0 0 10px",fontFamily:"'Nunito',sans-serif"}}>{curr.flag} {curr.name}</p>
    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>{curr.exams.map(e=>(<Badge key={e} color={C.green}>{e}</Badge>))}</div>
    {curr.papers.map(p=>(<Card key={p.id} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><p style={{color:C.text,fontSize:13,margin:"0 0 3px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{p.title}</p><p style={{color:C.muted,fontSize:11,margin:0,fontFamily:"'Nunito',sans-serif"}}>{p.level} • {p.year} • 5 Qs • 5 min</p></div><button onClick={()=>startPractice(p)} disabled={loading} style={{padding:"7px 14px",borderRadius:10,border:"none",cursor:"pointer",flexShrink:0,marginLeft:10,background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,opacity:loading?0.6:1}}>{loading?"...":t("start")}</button></div></Card>))}
  </div>);
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function LeaderboardScreen({lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const [scope,setScope]=useState("global");
  const [period,setPeriod]=useState("weekly");
  const [entries]=useState(LEADERBOARD_MOCK);
  const userEntry=entries.find(e=>e.is_current);
  const scopeOpts=[{k:"global",l:t("global_lb")},{k:"country",l:t("country_lb")},{k:"school",l:t("school_lb")}];
  const periodOpts=[{k:"weekly",l:t("weekly_lb")},{k:"monthly",l:t("monthly_lb")},{k:"all_time",l:t("alltime_lb")}];
  const getRankColor=r=>r===1?C.gold:r===2?"#C0C0C0":r===3?"#CD7F32":C.muted;
  return(<div style={{padding:"22px 18px 100px"}}>
    <h2 style={{color:C.text,fontSize:22,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("rankings")}</h2>
    <p style={{color:C.muted,fontSize:12,margin:"0 0 14px",fontFamily:"'Nunito',sans-serif"}}>Kenya 🇰🇪 · Tanzania 🇹🇿 · Uganda 🇺🇬</p>
    {/* Scope tabs */}
    <div style={{display:"flex",gap:6,marginBottom:10}}>
      {scopeOpts.map(o=>(<button key={o.k} onClick={()=>setScope(o.k)} style={{flex:1,padding:"7px",borderRadius:10,border:"none",cursor:"pointer",background:scope===o.k?C.gold:C.card,color:scope===o.k?C.bg:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{o.l}</button>))}
    </div>
    {/* Period tabs */}
    <div style={{display:"flex",gap:6,marginBottom:16}}>
      {periodOpts.map(o=>(<button key={o.k} onClick={()=>setPeriod(o.k)} style={{flex:1,padding:"6px",borderRadius:10,border:`1px solid ${period===o.k?C.green:C.border}`,cursor:"pointer",background:period===o.k?`${C.green}22`:"transparent",color:period===o.k?C.green:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{o.l}</button>))}
    </div>
    {/* User's rank card */}
    {userEntry&&<div style={{background:`linear-gradient(135deg,${C.gold}22,${C.amber}11)`,border:`1px solid ${C.gold}44`,borderRadius:14,padding:"12px 16px",marginBottom:14}}>
      <SecTitle>{t("your_rank")}</SecTitle>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.amber})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:C.bg,fontFamily:"'Nunito',sans-serif"}}>{userEntry.avatar}</div>
          <div><p style={{color:C.text,fontSize:14,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{lang==="sw"?"Wewe":"You"}</p><p style={{color:C.muted,fontSize:11,margin:0,fontFamily:"'Nunito',sans-serif"}}>🔥 {userEntry.streak} {t("days")} · 📝 {userEntry.tests}</p></div>
        </div>
        <div style={{textAlign:"right"}}>
          <p style={{color:C.gold,fontSize:26,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:900}}>#{userEntry.rank}</p>
          <p style={{color:C.muted,fontSize:11,margin:"2px 0 0",fontFamily:"'Nunito',sans-serif"}}>{userEntry.xp} XP</p>
        </div>
      </div>
    </div>}
    {/* Top learners */}
    <SecTitle>{t("top_learners")}</SecTitle>
    {entries.map((e,idx)=>(<div key={e.rank} style={{background:e.is_current?`${C.gold}18`:C.card,border:`1px solid ${e.is_current?C.gold:C.border}`,borderRadius:12,padding:"11px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10,animation:`fadeIn 0.3s ease ${idx*0.04}s both`}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <div style={{width:32,textAlign:"center",flexShrink:0}}>{MEDAL[e.rank]?<span style={{fontSize:18}}>{MEDAL[e.rank]}</span>:<span style={{color:getRankColor(e.rank),fontFamily:"'Nunito',sans-serif",fontWeight:900,fontSize:14}}>#{e.rank}</span>}</div>
      <div style={{width:34,height:34,borderRadius:"50%",background:e.is_current?`linear-gradient(135deg,${C.gold},${C.amber})`:`linear-gradient(135deg,${C.green}88,${C.teal}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#fff",fontFamily:"'Nunito',sans-serif",flexShrink:0}}>{e.avatar}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><p style={{color:e.is_current?C.gold:C.text,fontSize:13,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name}</p><span style={{fontSize:13}}>{FLAG[e.country]}</span></div>
        <p style={{color:C.muted,fontSize:10,margin:"2px 0 0",fontFamily:"'Nunito',sans-serif"}}>🔥 {e.streak} · 📝 {e.tests}</p>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}><p style={{color:e.is_current?C.gold:C.text,fontSize:15,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{e.xp.toLocaleString()}</p><p style={{color:C.muted,fontSize:9,margin:"1px 0 0",fontFamily:"'Nunito',sans-serif"}}>XP</p></div>
    </div>))}
  </div>);
}

// ─── HOMEWORK ─────────────────────────────────────────────────────────────────
function HomeworkScreen({country,level,isOffline,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const curr=CURRICULA[country];
  const subjects=curr.levels[level]||[];
  const [subject,setSubject]=useState(subjects[0]||"Mathematics");
  const [question,setQuestion]=useState("");
  const [myAnswer,setMyAnswer]=useState("");
  const [mode,setMode]=useState("solve");
  const [result,setResult]=useState("");
  const [loading,setLoading]=useState(false);
  const submit=async()=>{
    if(!question.trim()||loading||isOffline)return;
    setLoading(true);setResult("");
    const system=lang==="sw"
      ?`Wewe ni msaidizi wa kazi za nyumbani wa ElimuAI kwa ${level} ${subject} (${curr.name}). ${mode==="solve"?"Tatua hatua kwa hatua ukionyesha kazi yote. Eleza kila hatua kwa lugha rahisi. Malizia na ujumbe wa kutia moyo.":"Kagua jibu la mwanafunzi. Kwanza sifa kile kilichosahihi. Kisha eleza makosa kwa uwazi. Onyesha njia sahihi."} Tumia mifano ya Afrika Mashariki. JIBU KWA KISWAHILI KABISA.`
      :`You are ElimuAI homework helper for ${level} ${subject} (${curr.name}). ${mode==="solve"?"Solve step-by-step showing all working. Explain each step simply. End with encouragement.":"Review the student answer. Praise what is correct first. Then explain mistakes clearly. Show correct approach."} Use East African examples.`;
    const content=mode==="solve"?(lang==="sw"?`Swali: ${question}`:`Question: ${question}`):(lang==="sw"?`Swali: ${question}\n\nJibu la mwanafunzi: ${myAnswer}\n\nTafadhali kagua kazi yangu.`:`Question: ${question}\n\nStudent's answer: ${myAnswer}\n\nPlease check my work.`);
    const reply=await callClaude([{role:"user",content}],system);
    setResult(reply||(lang==="sw"?"Hitilafu ya mtandao. Jaribu tena!":"Connection error. Try again!"));
    setLoading(false);
  };
  return(<div style={{padding:"22px 18px 100px"}}>
    <h2 style={{color:C.text,fontSize:22,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("homework_help")}</h2>
    <p style={{color:C.muted,fontSize:12,margin:"0 0 14px",fontFamily:"'Nunito',sans-serif"}}>{curr.flag} {curr.name} · {level}</p>
    {isOffline&&<div style={{background:`${C.amber}20`,border:`1px solid ${C.amber}44`,borderRadius:12,padding:"10px 14px",marginBottom:12}}><p style={{color:C.amber,fontFamily:"'Nunito',sans-serif",fontSize:12,fontWeight:800,margin:0}}>{t("ai_offline")}</p></div>}
    <div style={{display:"flex",background:C.card,borderRadius:12,padding:3,marginBottom:12,border:`1px solid ${C.border}`}}>
      {["solve","check"].map(m=>(<button key={m} onClick={()=>{setMode(m);setResult("");}} style={{flex:1,padding:"8px",borderRadius:10,border:"none",cursor:"pointer",background:mode===m?`linear-gradient(135deg,${C.gold},${C.amber})`:"transparent",color:mode===m?C.bg:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{m==="solve"?t("solve_me"):t("check_work")}</button>))}
    </div>
    <SubjectPills subjects={subjects.slice(0,6)} active={subject} setActive={setSubject}/>
    <div style={{marginTop:10}}>
      <textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder={lang==="sw"?"Weka swali lako la kazi ya nyumbani hapa...":"Paste your homework question here..."} rows={3} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 13px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",resize:"none",outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
      {mode==="check"&&<textarea value={myAnswer} onChange={e=>setMyAnswer(e.target.value)} placeholder={lang==="sw"?"Andika jibu lako hapa...":"Type your answer here..."} rows={3} style={{width:"100%",background:C.card,border:`1px solid ${C.gold}44`,borderRadius:12,padding:"10px 13px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",resize:"none",outline:"none",marginBottom:8,boxSizing:"border-box"}}/>}
      <button onClick={submit} disabled={loading||isOffline} style={{width:"100%",padding:"12px",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:14,fontFamily:"'Nunito',sans-serif",fontWeight:800,opacity:(loading||isOffline)?0.6:1,marginBottom:14}}>{loading?t("thinking"):mode==="solve"?t("solve_btn"):t("check_btn")}</button>
    </div>
    {loading&&<Spinner/>}
    {result&&<Card><SecTitle>{mode==="solve"?t("solution"):t("review_lbl")}</SecTitle><p style={{color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{result}</p></Card>}
  </div>);
}

// ─── PROGRESS ─────────────────────────────────────────────────────────────────
function ProgressScreen({country,level,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const subjects=[{name:"Mathematics",score:78,color:C.gold},{name:"English",score:85,color:C.green},{name:"Science",score:62,color:C.terracotta},{name:"History",score:90,color:C.amber}];
  return(<div style={{padding:"22px 18px 100px"}}>
    <h2 style={{color:C.text,fontSize:22,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("my_progress")}</h2>
    <p style={{color:C.muted,fontSize:12,margin:"0 0 16px",fontFamily:"'Nunito',sans-serif"}}>{CURRICULA[country].flag} {CURRICULA[country].name} · {level}</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
      {[{l:t("days_streak"),v:"7🔥"},{l:t("mins_week"),v:"320"},{l:t("tests_taken"),v:"12"}].map(s=>(<Card key={s.l} style={{textAlign:"center",padding:"12px 8px"}}><p style={{color:C.text,fontSize:20,margin:"0 0 3px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{s.v}</p><p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s.l}</p></Card>))}
    </div>
    <Card style={{marginBottom:14}}>
      <SecTitle>{t("subject_perf")}</SecTitle>
      {subjects.map(s=>(<div key={s.name} style={{marginBottom:11}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s.name}</span><span style={{color:s.color,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{s.score}%</span></div><div style={{background:C.dim,borderRadius:6,height:7,overflow:"hidden"}}><div style={{width:`${s.score}%`,height:"100%",background:`linear-gradient(90deg,${s.color}88,${s.color})`,borderRadius:6}}/></div></div>))}
    </Card>
    <Card style={{marginBottom:14}}>
      <SecTitle>{t("cached")}</SecTitle>
      {Object.entries(OFFLINE_LESSONS).map(([subj,lessons])=>(<div key={subj} style={{marginBottom:10}}><p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 5px"}}>{subj}</p>{lessons.map(l=>(<div key={l.title.en} style={{background:C.surface,borderRadius:10,padding:"8px 12px",marginBottom:5,border:`1px solid ${C.border}`}}><p style={{color:C.gold,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 3px"}}>{l.title[lang]||l.title.en}</p><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:0}}>{(l.content[lang]||l.content.en).substring(0,100)}...</p></div>))}</div>))}
    </Card>
    <div style={{background:`${C.green}20`,border:`1px solid ${C.green}44`,borderRadius:14,padding:14}}>
      <p style={{color:C.green,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,letterSpacing:1,marginBottom:6}}>{t("weekly_report")}</p>
      <p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",lineHeight:1.5,margin:"0 0 8px"}}>{t("report_desc")}</p>
      <Badge color={C.green}>{t("auto_sent")}</Badge>
    </div>
  </div>);
}

// ─── MPESA MODAL ──────────────────────────────────────────────────────────────
function MpesaModal({plan,onClose,onSuccess,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const [phone,setPhone]=useState("254");
  const [step,setStep]=useState("enter");
  const [err,setErr]=useState("");
  const initiate=()=>{if(phone.length<12){setErr(lang==="sw"?"Ingiza nambari sahihi ya Safaricom e.g. 254712345678":"Enter a valid Safaricom number e.g. 254712345678");return;}setErr("");setStep("processing");setTimeout(()=>setStep("confirm"),2500);};
  const confirm=()=>{setStep("success");setTimeout(()=>{onSuccess(plan);onClose();},2000);};
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:22,width:"100%",maxWidth:360}}>
      {step==="success"?(<div style={{textAlign:"center",padding:"18px 0"}}><div style={{fontSize:52,marginBottom:10}}>✅</div><h3 style={{color:C.green,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:"0 0 6px"}}>{t("pay_confirmed")}</h3><p style={{color:C.muted,fontFamily:"'Nunito',sans-serif",fontSize:12}}>{t("activating")}</p></div>)
      :step==="confirm"?(<div style={{textAlign:"center"}}><div style={{fontSize:44,marginBottom:10}}>📱</div><h3 style={{color:C.text,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:"0 0 6px"}}>{t("check_phone")}</h3><p style={{color:C.muted,fontFamily:"'Nunito',sans-serif",fontSize:12,marginBottom:18}}>{t("stk_sent")} <b style={{color:C.gold}}>{phone}</b>. {t("enter_pin")} <b style={{color:C.gold}}>KES {plan.price.toLocaleString()}</b>.</p><button onClick={confirm} style={{width:"100%",padding:"12px",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.green},#2A8A50)`,color:"#fff",fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800,marginBottom:8}}>{t("confirmed_pin")}</button><button onClick={onClose} style={{width:"100%",padding:"9px",borderRadius:14,border:`1px solid ${C.border}`,cursor:"pointer",background:"transparent",color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{t("cancel")}</button></div>)
      :step==="processing"?(<div style={{textAlign:"center",padding:"18px 0"}}><Spinner/><p style={{color:C.muted,fontFamily:"'Nunito',sans-serif",fontSize:12,marginTop:10}}>{lang==="sw"?"Inatuma ombi kwa":"Sending STK push to"} {phone}...</p></div>)
      :(<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{color:C.text,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:0,fontSize:18}}>{t("mpesa_title")}</h3><button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>×</button></div>
        <div style={{background:`${C.green}20`,border:`1px solid ${C.green}44`,borderRadius:12,padding:"10px 14px",marginBottom:16}}><p style={{color:C.green,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 3px"}}>{plan.name[lang]||plan.name.en}</p><p style={{color:C.text,fontSize:22,fontFamily:"'Nunito',sans-serif",fontWeight:900,margin:0}}>KES {plan.price.toLocaleString()}<span style={{fontSize:12,color:C.muted}}> / {plan.desc[lang]||plan.desc.en}</span></p></div>
        <p style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:"0 0 6px"}}>{t("saf_number")}</p>
        <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} placeholder="254712345678" maxLength={12} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px",color:C.text,fontSize:15,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box",marginBottom:4}}/>
        {err&&<p style={{color:C.terracotta,fontSize:11,fontFamily:"'Nunito',sans-serif",marginBottom:8}}>{err}</p>}
        <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:"0 0 14px"}}>{t("also_accepts")}</p>
        <button onClick={initiate} style={{width:"100%",padding:"12px",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.green},#2A8A50)`,color:"#fff",fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{t("pay_mpesa")}</button>
      </>)}
    </div>
  </div>);
}

// ─── PLANS ────────────────────────────────────────────────────────────────────
function PlansScreen({plan,setPlan,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const [mpesaTarget,setMpesaTarget]=useState(null);
  return(<div style={{padding:"22px 18px 100px"}}>
    {mpesaTarget&&<MpesaModal plan={mpesaTarget} onClose={()=>setMpesaTarget(null)} onSuccess={p=>setPlan(p.id)} lang={lang}/>}
    <h2 style={{color:C.text,fontSize:22,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("plans_title")}</h2>
    <p style={{color:C.muted,fontSize:12,margin:"0 0 16px",fontFamily:"'Nunito',sans-serif"}}>💚 M-Pesa · Airtel Money · T-Kash</p>
    {PLANS.map(p=>(<Card key={p.id} style={{marginBottom:12,border:`1px solid ${plan===p.id?p.color:C.border}`,position:"relative",overflow:"hidden"}}>
      {p.popular&&<div style={{position:"absolute",top:12,right:12,background:C.gold,borderRadius:7,padding:"2px 10px"}}><span style={{color:C.bg,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{t("popular")}</span></div>}
      <p style={{color:p.color,fontSize:15,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{p.name[lang]||p.name.en}</p>
      <p style={{color:C.text,fontSize:20,margin:"0 0 10px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{p.price===0?(lang==="sw"?"Bure":"Free"):`KES ${p.price.toLocaleString()}`}<span style={{fontSize:11,color:C.muted,fontWeight:600}}> {p.price>0?`/ ${p.desc[lang]||p.desc.en}`:""}</span></p>
      <div style={{marginBottom:12}}>{(p.features[lang]||p.features.en).map(f=>(<p key={f} style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:"0 0 3px"}}>✓ {f}</p>))}</div>
      {plan===p.id?(<div style={{background:`${p.color}22`,borderRadius:10,padding:"8px",textAlign:"center"}}><span style={{color:p.color,fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12}}>{t("current_plan")}</span></div>)
      :(<button onClick={()=>p.price===0?setPlan("free"):setMpesaTarget(p)} style={{width:"100%",padding:"10px",borderRadius:12,border:p.price===0?`1px solid ${C.border}`:"none",cursor:"pointer",background:p.price===0?"transparent":`linear-gradient(135deg,${p.color},${p.color}bb)`,color:p.price===0?C.text:C.bg,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{p.price===0?t("free_plan"):t("pay_mpesa")}</button>)}
    </Card>))}
  </div>);
}

// ─── SCHOOL ADMIN ─────────────────────────────────────────────────────────────
function SchoolAdmin({lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const [tab,setTab]=useState("Overview");
  const [aiReport,setAiReport]=useState("");
  const [loadingRep,setLoadingRep]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [newSt,setNewSt]=useState({name:"",grade:"",phone:""});
  const [students,setStudents]=useState([
    {id:1,name:"Amina Hassan",grade:"Form 3",subject:"Mathematics",score:82,status:"Active"},
    {id:2,name:"Brian Otieno",grade:"Grade 8",subject:"Science",score:71,status:"Active"},
    {id:3,name:"Zawadi Kimani",grade:"Grade 9",subject:"English",score:90,status:"Active"},
    {id:4,name:"David Mwangi",grade:"Form 2",subject:"History",score:65,status:"Inactive"},
    {id:5,name:"Fatuma Ali",grade:"Form 3",subject:"Physics",score:58,status:"Active"},
    {id:6,name:"Grace Nekesa",grade:"Grade 7",subject:"Mathematics",score:88,status:"Active"},
  ]);
  const teachers=[{name:"Mr. Kamau",subject:"Mathematics",classes:3,students:95},{name:"Ms. Wanjiku",subject:"English",classes:2,students:62},{name:"Mr. Okonkwo",subject:"Science",classes:4,students:112}];
  const stats={total:students.length,active:students.filter(s=>s.status==="Active").length,avg:Math.round(students.reduce((a,s)=>a+s.score,0)/students.length),teachers:teachers.length};
  const generateReport=async()=>{
    setLoadingRep(true);
    const system=lang==="sw"?"Wewe ni mshauri wa uchambuzi wa shule wa ElimuAI. Toa ripoti fupi ya utendaji wa shule na mapendekezo 3 mahususi. Jibu kwa Kiswahili.":"You are ElimuAI school analytics AI. Generate a concise school performance report with 3 specific recommendations.";
    const reply=await callClaude([{role:"user",content:`School: ${stats.total} students, ${stats.active} active, avg ${stats.avg}%. Students: ${students.map(s=>`${s.name}(${s.grade},${s.score}%)`).join(", ")}`}],system);
    setAiReport(reply||"Error");setLoadingRep(false);
  };
  const addStudent=()=>{if(!newSt.name)return;setStudents(p=>[...p,{id:Date.now(),...newSt,score:0,status:"Active"}]);setNewSt({name:"",grade:"",phone:""});setShowAdd(false);};
  const adminTabs=[{l:"Overview",i:"📊"},{l:"Students",i:"👥"},{l:"Teachers",i:"👨‍🏫"},{l:"Reports",i:"📈"}];
  return(<div style={{padding:"18px 18px 100px"}}>
    {showAdd&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:22,width:"100%",maxWidth:360}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h3 style={{color:C.text,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:0}}>{t("add_student")}</h3><button onClick={()=>setShowAdd(false)} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>×</button></div>
        {["name","grade","phone"].map(f=>(<div key={f} style={{marginBottom:10}}><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px",textTransform:"capitalize"}}>{f}</p><input value={newSt[f]} onChange={e=>setNewSt(p=>({...p,[f]:e.target.value}))} placeholder={f==="name"?"Full name":f==="grade"?"e.g. Form 3":"e.g. 254712..."} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>))}
        <button onClick={addStudent} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>Add ✓</button>
      </div>
    </div>)}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div><h2 style={{color:C.text,fontSize:18,margin:"0 0 2px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>🏫 School Admin</h2><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:0}}>Elimu Academy</p></div>
      <Badge color={C.lime}>School Plan ✓</Badge>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
      {adminTabs.map(tb=>(<button key={tb.l} onClick={()=>setTab(tb.l)} style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,background:tab===tb.l?C.gold:C.card,color:tab===tb.l?C.bg:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{tb.i} {tb.l}</button>))}
    </div>
    {tab==="Overview"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[{l:"Total Students",v:stats.total,c:C.gold},{l:"Active",v:stats.active,c:C.green},{l:"Avg Score",v:`${stats.avg}%`,c:C.amber},{l:"Teachers",v:stats.teachers,c:C.lime}].map(s=>(<Card key={s.l} style={{textAlign:"center"}}><p style={{color:s.c,fontSize:24,margin:"0 0 3px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{s.v}</p><p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s.l}</p></Card>))}
      </div>
      <Card>
        <SecTitle>Subject Performance</SecTitle>
        {[{s:"Mathematics",pct:74},{s:"English",pct:82},{s:"Science",pct:68},{s:"History",pct:78}].map(s=>(<div key={s.s} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s.s}</span><span style={{color:s.pct>=75?C.green:s.pct>=60?C.gold:C.terracotta,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{s.pct}%</span></div><div style={{background:C.dim,borderRadius:6,height:7,overflow:"hidden"}}><div style={{width:`${s.pct}%`,height:"100%",background:`linear-gradient(90deg,${s.pct>=75?C.green:s.pct>=60?C.gold:C.terracotta}88,${s.pct>=75?C.green:s.pct>=60?C.gold:C.terracotta})`,borderRadius:6}}/></div></div>))}
      </Card>
    </>)}
    {tab==="Students"&&(<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><p style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:0}}>{students.length} students</p><button onClick={()=>setShowAdd(true)} style={{padding:"6px 12px",borderRadius:10,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{t("add_student")}</button></div>
      {students.map(s=>(<Card key={s.id} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.green},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{s.name[0]}</div><div><p style={{color:C.text,fontSize:13,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{s.name}</p><p style={{color:C.muted,fontSize:10,margin:0,fontFamily:"'Nunito',sans-serif"}}>{s.grade} · {s.subject}</p></div></div><div style={{textAlign:"right"}}><p style={{color:s.score>=75?C.green:s.score>=60?C.gold:C.terracotta,fontSize:16,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{s.score}%</p><Badge color={s.status==="Active"?C.green:C.muted}>{s.status}</Badge></div></div></Card>))}
    </>)}
    {tab==="Teachers"&&(<>
      {teachers.map(tc=>(<Card key={tc.name} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${C.amber},${C.terracotta})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>👨‍🏫</div><div><p style={{color:C.text,fontSize:13,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{tc.name}</p><p style={{color:C.muted,fontSize:10,margin:0,fontFamily:"'Nunito',sans-serif"}}>{tc.subject} · {tc.students} students</p></div></div></div><div style={{display:"flex",gap:8}}><button style={{flex:1,padding:"6px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>{t("view_perf")}</button><button style={{flex:1,padding:"6px",borderRadius:10,border:`1px solid ${C.gold}44`,background:`${C.gold}11`,color:C.gold,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>{t("msg")}</button></div></Card>))}
    </>)}
    {tab==="Reports"&&(<>
      <Card style={{marginBottom:12}}>
        <SecTitle>{t("ai_insights")}</SecTitle>
        {loadingRep&&<Spinner/>}
        {aiReport&&<p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",lineHeight:1.7,margin:"0 0 10px",whiteSpace:"pre-wrap"}}>{aiReport}</p>}
        {!aiReport&&!loadingRep&&<p style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",fontStyle:"italic",marginBottom:10}}>{lang==="sw"?"Bofya 'Tengeneza' kupata uchambuzi wa AI wa shule yako.":"Click Generate for AI analysis of your school performance."}</p>}
        <button onClick={generateReport} disabled={loadingRep} style={{width:"100%",padding:"10px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,opacity:loadingRep?0.6:1}}>{loadingRep?t("generating"):t("gen_report")}</button>
      </Card>
      <Card>
        <SecTitle>📤 {lang==="sw"?"Hamisha Ripoti":"Export Reports"}</SecTitle>
        {[{l:`📄 ${lang==="sw"?"Ripoti ya Utendaji (PDF)":"Performance Report (PDF)"}`},{l:`📋 ${lang==="sw"?"Muhtasari wa Mahudhurio":"Attendance Summary"}`},{l:`📱 ${lang==="sw"?"Ripoti ya SMS kwa Wazazi":"Parent SMS Report"}`}].map(r=>(<div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`}}><p style={{color:C.text,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:0}}>{r.l}</p><button style={{padding:"4px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.gold,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>{t("export_lbl")}</button></div>))}
      </Card>
    </>)}
  </div>);
}

// ─── TEACHER ─────────────────────────────────────────────────────────────────
function TeacherDash({country,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const [insight,setInsight]=useState("");const [loading,setLoading]=useState(false);
  const classes=[{name:"Form 3A",students:32,avg:74,top:"English",weak:"Mathematics"},{name:"Form 3B",students:28,avg:68,top:"History",weak:"Physics"},{name:"Form 2A",students:35,avg:81,top:"Science",weak:"Kiswahili"}];
  const getInsight=async()=>{setLoading(true);const system=lang==="sw"?"Wewe ni mshauri wa ElimuAI. Toa mapendekezo 3 mahususi ya kufundisha kwa Kiswahili.":"You are ElimuAI. Give 3 specific, actionable teaching strategies.";const reply=await callClaude([{role:"user",content:`Classes: ${classes.map(c=>`${c.name}(avg ${c.avg}%, strong ${c.top}, weak ${c.weak})`).join(", ")}`}],system);setInsight(reply||"Error");setLoading(false);};
  return(<div style={{padding:"22px 18px 100px"}}>
    <h2 style={{color:C.text,fontSize:20,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>👨‍🏫 {lang==="sw"?"Dashibodi ya Mwalimu":"Teacher Dashboard"}</h2>
    <p style={{color:C.muted,fontSize:11,margin:"0 0 14px",fontFamily:"'Nunito',sans-serif"}}>{CURRICULA[country].flag} {CURRICULA[country].name}</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>{[{l:"Classes",v:"3"},{l:"Students",v:"95"},{l:"Avg",v:"74%"}].map(s=>(<Card key={s.l} style={{textAlign:"center",padding:"12px 8px"}}><p style={{color:C.gold,fontSize:22,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{s.v}</p><p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s.l}</p></Card>))}</div>
    {classes.map(c=>(<Card key={c.name} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div><p style={{color:C.text,fontSize:13,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{c.name}</p><p style={{color:C.muted,fontSize:10,margin:0,fontFamily:"'Nunito',sans-serif"}}>{c.students} students</p></div><p style={{color:c.avg>=75?C.green:c.avg>=60?C.gold:C.terracotta,fontSize:22,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{c.avg}%</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Badge color={C.green}>✓ {c.top}</Badge><Badge color={C.terracotta}>⚠ {c.weak}</Badge></div></Card>))}
    <Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><SecTitle>{t("ai_insights")}</SecTitle><button onClick={getInsight} disabled={loading} style={{padding:"4px 12px",borderRadius:8,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800,opacity:loading?0.6:1}}>{loading?"...":t("generate")}</button></div>{loading&&<Spinner/>}{insight?<p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{insight}</p>:<p style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",fontStyle:"italic",margin:0}}>{lang==="sw"?"Bofya Tengeneza kupata maarifa ya AI.":"Click Generate for AI recommendations."}</p>}</Card>
  </div>);
}

// ─── PARENT ───────────────────────────────────────────────────────────────────
function ParentDash({country,setActive,setPlan,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  return(<div style={{padding:"22px 18px 100px"}}>
    <h2 style={{color:C.text,fontSize:20,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>👨‍👩‍👧 {lang==="sw"?"Dashibodi ya Mzazi":"Parent Dashboard"}</h2>
    <p style={{color:C.muted,fontSize:11,margin:"0 0 14px",fontFamily:"'Nunito',sans-serif"}}>{CURRICULA[country].flag} {lang==="sw"?"Fuatilia watoto wako":"Monitor your children's learning"}</p>
    {[{name:"Amina",grade:"Form 3",streak:7,avg:78,active:true},{name:"Brian",grade:"Grade 5",streak:2,avg:65,active:false}].map(child=>(<Card key={child.name} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.terracotta})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{child.name[0]}</div><div><p style={{color:C.text,fontSize:13,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{child.name}</p><p style={{color:C.muted,fontSize:10,margin:0,fontFamily:"'Nunito',sans-serif"}}>{child.grade}</p></div></div><p style={{color:C.gold,fontSize:20,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{child.avg}%</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Badge color={C.gold}>🔥 {child.streak} {t("days")}</Badge><Badge color={child.active?C.green:C.terracotta}>{child.active?(lang==="sw"?"Amefanya leo ✓":"Active today ✓"):(lang==="sw"?"Karibu siku 2":"Inactive 2 days")}</Badge></div></Card>))}
    <div style={{background:`${C.gold}20`,border:`1px solid ${C.gold}44`,borderRadius:14,padding:14,marginBottom:12}}><p style={{color:C.gold,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800,letterSpacing:1,marginBottom:6}}>{t("weekly_report")}</p><p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",lineHeight:1.5,margin:"0 0 8px"}}>{t("report_desc")}</p><Badge color={C.green}>{t("notifications_on")}</Badge></div>
    <button onClick={()=>setActive("Plans")} style={{width:"100%",padding:"11px",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.green},#2A8A50)`,color:"#fff",fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{t("upgrade_mpesa")}</button>
  </div>);
}

// ─── ROLE SELECTOR ────────────────────────────────────────────────────────────
function RoleSelector({onSelect,lang,setLang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,backgroundImage:`radial-gradient(ellipse at 15% 20%, ${C.green}18 0%, transparent 45%), radial-gradient(ellipse at 85% 80%, ${C.gold}12 0%, transparent 45%)`}}>
    <button onClick={()=>setLang(l=>l==="en"?"sw":"en")} style={{position:"absolute",top:20,right:20,background:`${C.teal}22`,border:`1px solid ${C.teal}44`,borderRadius:10,padding:"6px 14px",cursor:"pointer",color:C.teal,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{lang==="en"?"🇰🇪 Kiswahili":"🇬🇧 English"}</button>
    <div style={{fontSize:60,marginBottom:12,filter:`drop-shadow(0 0 24px ${C.gold}44)`}}>🎓</div>
    <h1 style={{color:C.text,fontSize:36,fontFamily:"'Playfair Display',serif",fontWeight:900,textAlign:"center",margin:"0 0 4px",textShadow:`0 0 40px ${C.gold}30`}}>ElimuAI</h1>
    <p style={{color:C.gold,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,letterSpacing:3,textAlign:"center",marginBottom:4}}>{t("motto")}</p>
    <div style={{display:"flex",gap:8,marginBottom:6}}>{"🇰🇪🇹🇿🇺🇬".match(/\p{Emoji_Presentation}/gu)?.map((f,i)=>(<span key={i} style={{fontSize:20}}>{f}</span>))}</div>
    <p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",textAlign:"center",marginBottom:28}}>{t("tagline")}</p>
    <p style={{color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:12}}>{t("who_are_you")}</p>
    {[{role:"student",icon:"🎒",l:t("student"),d:t("student_desc")},{role:"teacher",icon:"👨‍🏫",l:t("teacher"),d:t("teacher_desc")},{role:"parent",icon:"👨‍👩‍👧",l:t("parent"),d:t("parent_desc")},{role:"admin",icon:"🏫",l:t("school_admin"),d:t("admin_desc")}].map(r=>(<button key={r.role} onClick={()=>onSelect(r.role)} style={{width:"100%",maxWidth:360,padding:"13px 16px",borderRadius:14,border:`1px solid ${C.border}`,background:C.card,cursor:"pointer",display:"flex",alignItems:"center",gap:12,marginBottom:10}}><span style={{fontSize:26}}>{r.icon}</span><div style={{textAlign:"left",flex:1}}><p style={{color:C.text,fontSize:14,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{r.l}</p><p style={{color:C.muted,fontSize:11,margin:0,fontFamily:"'Nunito',sans-serif"}}>{r.d}</p></div><span style={{color:C.gold,fontSize:16}}>→</span></button>))}
  </div>);
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function ElimuAI(){
  const [role,setRole]=useState(null);
  const [active,setActive]=useState("Home");
  const [country,setCountry]=useState("Kenya");
  const [level,setLevel]=useState("Grade 9 (JSS)");
  const [isOffline,setIsOffline]=useState(false);
  const [plan,setPlan]=useState("free");
  const [lang,setLang]=useState("en");

  const handleRole=r=>{setRole(r);setActive(r==="admin"?"Overview":r==="teacher"?"Dashboard":r==="parent"?"Dashboard":"Home");};

  if(!role)return <RoleSelector onSelect={handleRole} lang={lang} setLang={setLang}/>;

  const renderScreen=()=>{
    if(role==="admin")return<SchoolAdmin lang={lang}/>;
    if(role==="teacher"){
      if(active==="Admin")return<SchoolAdmin lang={lang}/>;
      if(active==="Rankings")return<LeaderboardScreen lang={lang}/>;
      return<TeacherDash country={country} lang={lang}/>;
    }
    if(role==="parent"){
      if(active==="Plans")return<PlansScreen plan={plan} setPlan={setPlan} lang={lang}/>;
      if(active==="Rankings")return<LeaderboardScreen lang={lang}/>;
      return<ParentDash country={country} setActive={setActive} setPlan={setPlan} lang={lang}/>;
    }
    switch(active){
      case"Home":    return<HomeScreen setActive={setActive} country={country} setCountry={setCountry} level={level} setLevel={setLevel} isOffline={isOffline} plan={plan} lang={lang}/>;
      case"Tutor":   return<TutorScreen country={country} level={level} isOffline={isOffline} lang={lang}/>;
      case"Exams":   return<ExamScreen country={country} level={level} lang={lang}/>;
      case"Homework":return<HomeworkScreen country={country} level={level} isOffline={isOffline} lang={lang}/>;
      case"Rankings":return<LeaderboardScreen lang={lang}/>;
      case"Progress":return<ProgressScreen country={country} level={level} lang={lang}/>;
      default:       return<HomeScreen setActive={setActive} country={country} setCountry={setCountry} level={level} setLevel={setLevel} isOffline={isOffline} plan={plan} lang={lang}/>;
    }
  };

  return(<div style={{background:C.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative",backgroundImage:`radial-gradient(ellipse at top, ${C.green}08 0%, transparent 40%)`}}>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet"/>
    <TopBar lang={lang} setLang={setLang} isOffline={isOffline} setIsOffline={setIsOffline}/>
    <div style={{paddingTop:46,paddingBottom:72}}>{renderScreen()}</div>
    <NavBar active={active} setActive={setActive} role={role} lang={lang}/>
  </div>);
}
