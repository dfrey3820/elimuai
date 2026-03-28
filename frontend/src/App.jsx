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
    sign_in:"Sign In",sign_out:"Sign Out",sign_up:"Create Account",
    auth_login:"Login",auth_register:"Register",
    email_or_phone:"Email or Phone",full_name:"Full Name",password:"Password",role_label:"Role",
    have_account:"Already have an account?",no_account:"New here?",
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
    sign_in:"Ingia",sign_out:"Toka",sign_up:"Fungua Akaunti",
    auth_login:"Ingia",auth_register:"Jisajili",
    email_or_phone:"Barua pepe au simu",full_name:"Jina Kamili",password:"Nenosiri",role_label:"Jukumu",
    have_account:"Una akaunti tayari?",no_account:"Mgeni?",
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
const COUNTRY_CODE={Kenya:"KE",Tanzania:"TZ",Uganda:"UG"};
const COUNTRY_NAME={KE:"Kenya",TZ:"Tanzania",UG:"Uganda"};
const API_BASE=import.meta.env.VITE_API_BASE_URL||"";
const AUTH_TOKEN_KEYS=["accessToken","token","jwt","access_token"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Spinner(){return(<div style={{display:"flex",gap:5,alignItems:"center",justifyContent:"center",padding:"10px 0"}}>{[0,1,2].map(i=>(<div key={i} style={{width:7,height:7,borderRadius:"50%",background:C.gold,animation:`elb 1s ease-in-out ${i*0.15}s infinite`}}/>))}<style>{`@keyframes elb{0%,80%,100%{transform:scale(0.4);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style></div>);}
function SkeletonLine({w="100%",h=12,r=6,mb=8}){return<div style={{width:w,height:h,borderRadius:r,background:C.dim,marginBottom:mb,animation:"skPulse 1.4s ease-in-out infinite"}}/>}
function SkeletonCard({lines=3,avatar=false}){return(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:8}}><style>{`@keyframes skPulse{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}`}</style><div style={{display:"flex",gap:10,alignItems:avatar?"center":"flex-start"}}>{avatar&&<div style={{width:34,height:34,borderRadius:"50%",background:C.dim,flexShrink:0,animation:"skPulse 1.4s ease-in-out infinite"}}/>}<div style={{flex:1}}>{Array.from({length:lines}).map((_,i)=>(<SkeletonLine key={i} w={i===0?"60%":i===lines-1?"40%":"80%"} h={i===0?14:11} mb={i<lines-1?8:0}/>))}</div></div></div>);}
function SkeletonTable({rows=5,cols=4}){return(<div style={{marginTop:8}}><style>{`@keyframes skPulse{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}`}</style>{Array.from({length:rows}).map((_,r)=>(<div key={r} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>{Array.from({length:cols}).map((_,c)=>(<SkeletonLine key={c} w={c===0?"30%":"20%"} h={12} mb={0}/>))}</div>))}</div>);}
function Card({children,style={}}){return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,...style}}>{children}</div>;}
function Badge({children,color=C.gold}){return <span style={{background:`${color}22`,color,fontSize:11,padding:"3px 10px",borderRadius:10,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{children}</span>;}
function SecTitle({children}){return <p style={{color:C.gold,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,letterSpacing:1.5,textTransform:"uppercase",margin:"0 0 12px"}}>{children}</p>;}
function SubjectPills({subjects,active,setActive}){return(<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>{subjects.map(s=>(<button key={s} onClick={()=>setActive(s)} style={{padding:"4px 12px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,background:active===s?C.gold:C.card,color:active===s?C.bg:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s}</button>))}</div>);}

function getAuthHeader(){
  const token=AUTH_TOKEN_KEYS.map(k=>localStorage.getItem(k)).find(Boolean);
  return token?{Authorization:`Bearer ${token}`}:{};
}

function hasAuthToken(){
  return AUTH_TOKEN_KEYS.some(k=>localStorage.getItem(k));
}

async function apiPost(path,body){
  const r=await fetch(`${API_BASE}${path}`,{
    method:"POST",
    headers:{"Content-Type":"application/json",...getAuthHeader()},
    credentials:"include",
    body:JSON.stringify(body),
  });
  const isJson=r.headers.get("content-type")?.includes("application/json");
  const data=isJson?await r.json():null;
  if(!r.ok){
    const validationMsg=Array.isArray(data?.errors)
      ? data.errors.map(e=>e.msg).filter(Boolean).join(", ")
      : null;
    const err=new Error(data?.error||validationMsg||`Request failed (${r.status})`);
    err.status=r.status;
    err.data=data;
    throw err;
  }
  return data;
}

async function apiGet(path,params){
  const qs=params?new URLSearchParams(Object.entries(params).filter(([,v])=>v!=null&&v!=="")).toString():"";
  const url=qs?`${API_BASE}${path}?${qs}`:`${API_BASE}${path}`;
  const r=await fetch(url,{
    headers:{...getAuthHeader()},
    credentials:"include",
  });
  const isJson=r.headers.get("content-type")?.includes("application/json");
  const data=isJson?await r.json():null;
  if(!r.ok){
    const validationMsg=Array.isArray(data?.errors)
      ? data.errors.map(e=>e.msg).filter(Boolean).join(", ")
      : null;
    const err=new Error(data?.error||validationMsg||`Request failed (${r.status})`);
    err.status=r.status;
    err.data=data;
    throw err;
  }
  return data;
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
function TopBar({lang,setLang,isOffline,setIsOffline,user,onAuthOpen,onLogout}){
  const t=k=>T[lang]?.[k]||T.en[k];
  return(<div style={{position:"fixed",top:0,left:0,right:0,maxWidth:480,margin:"0 auto",zIndex:150,background:`${C.surface}f0`,borderBottom:`1px solid ${C.border}`,padding:"6px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <span style={{color:C.gold,fontSize:14,fontFamily:"'Nunito',sans-serif",fontWeight:900,letterSpacing:1}}>⚡ ElimuAI</span>
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      {hasAuthToken()
        ?(<button onClick={onLogout} style={{background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:8,padding:"3px 10px",cursor:"pointer",color:C.red,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{t("sign_out")}</button>)
        :(<button onClick={onAuthOpen} style={{background:`${C.gold}22`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"3px 10px",cursor:"pointer",color:C.gold,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{t("sign_in")}</button>)
      }
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
function HomeScreen({setActive,country,setCountry,level,setLevel,isOffline,plan,lang,user}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const hour=new Date().getHours();
  const greet=hour<12?t("greeting_morning"):hour<17?t("greeting_afternoon"):t("greeting_evening");
  const [summary,setSummary]=useState(null);
  useEffect(()=>{
    let alive=true;
    if(isOffline||!hasAuthToken()) return;
    apiGet("/api/progress/summary").then(d=>{if(alive)setSummary(d);}).catch(()=>{});
    return()=>{alive=false;};
  },[isOffline,user?.id]);
  const planLabel=(user?.plan||plan||"free").toUpperCase();
  const streakDays=summary?.streak ?? 7;
  const weekMins=summary?.weekMins ?? 320;
  return(<div style={{padding:"24px 20px 100px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div>
        <p style={{color:C.muted,fontSize:12,margin:0,fontFamily:"'Nunito',sans-serif"}}>{CURRICULA[country].flag} {CURRICULA[country].name}</p>
        <h1 style={{color:C.text,fontSize:24,margin:"2px 0 0",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("greeting")} 🌅</h1>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{background:`${C.green}22`,border:`1px solid ${C.green}44`,borderRadius:10,padding:"4px 10px"}}>
          <span style={{color:C.green,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{planLabel==="FREE"?"FREE":planLabel+" ✓"}</span>
        </div>
      </div>
    </div>
    <CurriculumPicker country={country} setCountry={setCountry} level={level} setLevel={setLevel}/>
    <div style={{background:`linear-gradient(135deg,${C.gold}22,${C.amber}11)`,border:`1px solid ${C.gold}44`,borderRadius:16,padding:"14px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><p style={{color:C.gold,fontSize:10,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:800,letterSpacing:1}}>{t("streak").toUpperCase()}</p><p style={{color:C.text,fontSize:28,margin:"4px 0 0",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{streakDays} {t("days")} 🔥</p></div>
      <div style={{textAlign:"right"}}><p style={{color:C.muted,fontSize:10,margin:0,fontFamily:"'Nunito',sans-serif"}}>{t("mins_week")}</p><p style={{color:C.text,fontSize:20,margin:"2px 0 0",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{weekMins}</p></div>
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
function TutorScreen({country,level,isOffline,lang,user}){
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
    try{
      const data=await apiPost("/api/ai/tutor",{messages:history,subject});
      const reply=data?.reply||"";
      setMsgs(p=>[...p,{role:"assistant",text:reply||(lang==="sw"?"Samahani, tatizo la mtandao. Jaribu tena!":"Sorry, connection issue. Please try again!")}]);
    }catch(err){
      const msg=err?.status===401
        ?(lang==="sw"?"Tafadhali ingia ili kutumia AI.":"Please sign in to use AI.")
        :(err?.message||(lang==="sw"?"Samahani, tatizo la mtandao. Jaribu tena!":"Sorry, connection issue. Please try again!"));
      setMsgs(p=>[...p,{role:"assistant",text:msg}]);
    }finally{
      setLoading(false);
    }
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
function ExamScreen({country,level,lang,user}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const curr=CURRICULA[country];
  const [mode,setMode]=useState("browse");
  const [paper,setPaper]=useState(null);
  const [papers,setPapers]=useState(curr.papers);
  const [qs,setQs]=useState([]);
  const [ans,setAns]=useState({});
  const [loading,setLoading]=useState(false);
  const [time,setTime]=useState(0);
  const [results,setResults]=useState(null);
  const timerRef=useRef();
  useEffect(()=>{
    let alive=true;
    if(!hasAuthToken()) return;
    const curriculum=curr.curriculum;
    const countryCode=COUNTRY_CODE[country];
    apiGet("/api/exams/papers",{country:countryCode,curriculum,level}).then(d=>{
      if(!alive) return;
      if(Array.isArray(d?.papers)&&d.papers.length){
        const mapped=d.papers.map(p=>({
          id:p.id,
          title:(lang==="sw"&&p.title_sw)?p.title_sw:p.title,
          subject:p.subject_name||p.subject||"Subject",
          year:p.year,
          level:p.grade_level||level,
          subject_id:p.subject_id,
        }));
        setPapers(mapped);
      }
    }).catch(()=>{});
    return()=>{alive=false;};
  },[country,level,lang,user?.id]);
  useEffect(()=>{
    setPapers(curr.papers);
  },[country]);
  useEffect(()=>{if(mode==="practice"&&time>0){timerRef.current=setInterval(()=>setTime(t=>{if(t<=1){clearInterval(timerRef.current);doSubmit();return 0;}return t-1;}),1000);}return()=>clearInterval(timerRef.current);},[mode]);
  const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const startPractice=async(p)=>{
    setPaper(p);setLoading(true);
    try{
      const data=await apiPost("/api/ai/generate-questions",{paperId:p.id,subject:p.subject,gradeLevel:p.level,year:p.year,count:5});
      const questions=Array.isArray(data?.questions)?data.questions:[];
      if(!questions.length) throw new Error("No questions");
      setQs(questions);setAns({});setTime(5*60);setMode("practice");
    }catch{
      alert(lang==="sw"?"Haikuweza kutengeneza maswali. Jaribu tena!":"Couldn't generate questions. Try again!");
    }finally{
      setLoading(false);
    }
  };
  const doSubmit=()=>{
    clearInterval(timerRef.current);
    let score=0;qs.forEach((q,i)=>{if(ans[i]===q.answer)score++;});
    const total=qs.length;
    const pct=Math.round(score/total*100);
    const timeTakenSecs=Math.max(0,5*60-time);
    setResults({score,total,pct});
    if(hasAuthToken()){
      apiPost("/api/exams/attempts",{pastPaperId:paper?.id||null,questions:qs,answers:ans,score,total,timeTakenSecs}).catch(()=>{});
      if(paper?.subject_id){
        apiPost("/api/progress/log",{activityType:"exam_complete",subjectId:paper.subject_id,score:pct,durationMins:Math.round(timeTakenSecs/60)}).catch(()=>{});
      }
    }
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
    {papers.map(p=>(<Card key={p.id} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><p style={{color:C.text,fontSize:13,margin:"0 0 3px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{p.title}</p><p style={{color:C.muted,fontSize:11,margin:0,fontFamily:"'Nunito',sans-serif"}}>{p.level} • {p.year} • 5 Qs • 5 min</p></div><button onClick={()=>startPractice(p)} disabled={loading} style={{padding:"7px 14px",borderRadius:10,border:"none",cursor:"pointer",flexShrink:0,marginLeft:10,background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,opacity:loading?0.6:1}}>{loading?"...":t("start")}</button></div></Card>))}
  </div>);
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function LeaderboardScreen({lang,user}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const [scope,setScope]=useState("global");
  const [period,setPeriod]=useState("weekly");
  const [entries,setEntries]=useState(LEADERBOARD_MOCK);
  const [userEntry,setUserEntry]=useState(LEADERBOARD_MOCK.find(e=>e.is_current));
  useEffect(()=>{
    let alive=true;
    const periodParam=period==="all_time"?"all_time":period;
    apiGet("/api/leaderboard",{scope,period:periodParam,limit:50}).then(d=>{
      if(!alive) return;
      const rows=d?.leaderboard;
      if(Array.isArray(rows)&&rows.length){
        const mapped=rows.map(r=>({
          rank:r.rank||0,
          name:r.name||"Student",
          xp:r.xp||0,
          streak:r.streak||0,
          tests:r.tests_taken||0,
          country:r.country||"KE",
          is_current:!!r.is_current_user,
          avatar:(r.name||"S").slice(0,1).toUpperCase(),
        }));
        setEntries(mapped);
        const current=mapped.find(e=>e.is_current);
        if(current) setUserEntry(current);
        else if(d?.userRank){
          setUserEntry({
            rank:d.userRank.rank||0,
            name:lang==="sw"?"Wewe":"You",
            xp:d.userRank.xp||0,
            streak:d.userRank.streak||0,
            tests:0,
            country:user?.country||"KE",
            is_current:true,
            avatar:"Y",
          });
        }
      }
    }).catch(()=>{});
    return()=>{alive=false;};
  },[scope,period,lang,user?.country]);
  const displayEntries=entries.length?entries:LEADERBOARD_MOCK;
  const displayUser=userEntry||LEADERBOARD_MOCK.find(e=>e.is_current);
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
    {displayUser&&<div style={{background:`linear-gradient(135deg,${C.gold}22,${C.amber}11)`,border:`1px solid ${C.gold}44`,borderRadius:14,padding:"12px 16px",marginBottom:14}}>
      <SecTitle>{t("your_rank")}</SecTitle>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.amber})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:C.bg,fontFamily:"'Nunito',sans-serif"}}>{displayUser.avatar||"Y"}</div>
          <div><p style={{color:C.text,fontSize:14,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{displayUser.name|| (lang==="sw"?"Wewe":"You")}</p><p style={{color:C.muted,fontSize:11,margin:0,fontFamily:"'Nunito',sans-serif"}}>🔥 {displayUser.streak} {t("days")} · 📝 {displayUser.tests}</p></div>
        </div>
        <div style={{textAlign:"right"}}>
          <p style={{color:C.gold,fontSize:26,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:900}}>#{displayUser.rank}</p>
          <p style={{color:C.muted,fontSize:11,margin:"2px 0 0",fontFamily:"'Nunito',sans-serif"}}>{displayUser.xp} XP</p>
        </div>
      </div>
    </div>}
    {/* Top learners */}
    <SecTitle>{t("top_learners")}</SecTitle>
    {displayEntries.map((e,idx)=>(<div key={e.rank} style={{background:e.is_current?`${C.gold}18`:C.card,border:`1px solid ${e.is_current?C.gold:C.border}`,borderRadius:12,padding:"11px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10,animation:`fadeIn 0.3s ease ${idx*0.04}s both`}}>
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
function HomeworkScreen({country,level,isOffline,lang,user}){
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
    try{
      const data=await apiPost("/api/ai/homework",{question,studentAnswer:myAnswer,mode,subject});
      const reply=data?.reply||"";
      setResult(reply||(lang==="sw"?"Hitilafu ya mtandao. Jaribu tena!":"Connection error. Try again!"));
    }catch(err){
      const msg=err?.status===401
        ?(lang==="sw"?"Tafadhali ingia ili kutumia AI.":"Please sign in to use AI.")
        :(err?.message||(lang==="sw"?"Hitilafu ya mtandao. Jaribu tena!":"Connection error. Try again!"));
      setResult(msg);
    }finally{
      setLoading(false);
    }
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
function ProgressScreen({country,level,lang,user}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const curriculum=CURRICULA[country].curriculum;
  const [summary,setSummary]=useState(null);
  const [offlineLessons,setOfflineLessons]=useState(null);
  useEffect(()=>{
    let alive=true;
    if(!hasAuthToken()) return;
    apiGet("/api/progress/summary").then(d=>{if(alive)setSummary(d);}).catch(()=>{});
    return()=>{alive=false;};
  },[user?.id]);
  useEffect(()=>{
    let alive=true;
    apiGet("/api/curriculum/offline-lessons",{level,curriculum,lang}).then(d=>{if(alive)setOfflineLessons(d?.lessons||[]);}).catch(()=>{});
    return()=>{alive=false;};
  },[level,curriculum,lang]);
  const subjects=summary?.subjects?.length
    ? summary.subjects.map(s=>({name:s.name,score:Math.round(s.avg_score||0),color:C.gold}))
    : [{name:"Mathematics",score:78,color:C.gold},{name:"English",score:85,color:C.green},{name:"Science",score:62,color:C.terracotta},{name:"History",score:90,color:C.amber}];
  const streakVal=summary?.streak ?? 7;
  const weekMins=summary?.weekMins ?? 320;
  const testsTaken=summary?.recentActivity?.filter(a=>a.activity_type?.includes("exam")).length ?? 12;
  return(<div style={{padding:"22px 18px 100px"}}>
    <h2 style={{color:C.text,fontSize:22,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("my_progress")}</h2>
    <p style={{color:C.muted,fontSize:12,margin:"0 0 16px",fontFamily:"'Nunito',sans-serif"}}>{CURRICULA[country].flag} {CURRICULA[country].name} · {level}</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
      {[{l:t("days_streak"),v:`${streakVal}🔥`},{l:t("mins_week"),v:`${weekMins}`},{l:t("tests_taken"),v:`${testsTaken}`}].map(s=>(<Card key={s.l} style={{textAlign:"center",padding:"12px 8px"}}><p style={{color:C.text,fontSize:20,margin:"0 0 3px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{s.v}</p><p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s.l}</p></Card>))}
    </div>
    <Card style={{marginBottom:14}}>
      <SecTitle>{t("subject_perf")}</SecTitle>
      {subjects.map(s=>(<div key={s.name} style={{marginBottom:11}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s.name}</span><span style={{color:s.color,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{s.score}%</span></div><div style={{background:C.dim,borderRadius:6,height:7,overflow:"hidden"}}><div style={{width:`${s.score}%`,height:"100%",background:`linear-gradient(90deg,${s.color}88,${s.color})`,borderRadius:6}}/></div></div>))}
    </Card>
    <Card style={{marginBottom:14}}>
      <SecTitle>{t("cached")}</SecTitle>
      {offlineLessons?.length
        ? (<div style={{marginBottom:10}}><p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 5px"}}>{lang==="sw"?"Masomo":"Lessons"}</p>{offlineLessons.map(l=>(<div key={l.id} style={{background:C.surface,borderRadius:10,padding:"8px 12px",marginBottom:5,border:`1px solid ${C.border}`}}><p style={{color:C.gold,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 3px"}}>{l.title}</p><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:0}}>{l.content.substring(0,100)}...</p></div>))}</div>)
        : Object.entries(OFFLINE_LESSONS).map(([subj,lessons])=>(<div key={subj} style={{marginBottom:10}}><p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 5px"}}>{subj}</p>{lessons.map(l=>(<div key={l.title.en} style={{background:C.surface,borderRadius:10,padding:"8px 12px",marginBottom:5,border:`1px solid ${C.border}`}}><p style={{color:C.gold,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 3px"}}>{l.title[lang]||l.title.en}</p><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:0}}>{(l.content[lang]||l.content.en).substring(0,100)}...</p></div>))}</div>))}
    </Card>
    <div style={{background:`${C.green}20`,border:`1px solid ${C.green}44`,borderRadius:14,padding:14}}>
      <p style={{color:C.green,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,letterSpacing:1,marginBottom:6}}>{t("weekly_report")}</p>
      <p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",lineHeight:1.5,margin:"0 0 8px"}}>{t("report_desc")}</p>
      <Badge color={C.green}>{t("auto_sent")}</Badge>
    </div>
  </div>);
}

// ─── BILLING SCREEN (Paywall after trial expires) ─────────────────────────────
function BillingScreen({user,lang,onPaid}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const [subInfo,setSubInfo]=useState(null);
  const [phone,setPhone]=useState(user?.phone||"254");
  const [step,setStep]=useState("choose"); // choose|enter|processing|polling|success|error
  const [err,setErr]=useState("");
  const [paymentId,setPaymentId]=useState(null);
  const [cycle,setCycle]=useState("monthly");
  const [invoices,setInvoices]=useState([]);
  const [showInvoices,setShowInvoices]=useState(false);
  const [couponCode,setCouponCode]=useState("");
  const [couponResult,setCouponResult]=useState(null);
  const [couponLoading,setCouponLoading]=useState(false);
  const [couponErr,setCouponErr]=useState("");
  const pollRef=useRef(null);

  const userRole=(user?.role==="admin"||user?.role==="super_admin")?"school":(user?.role||"student");

  useEffect(()=>{
    apiGet("/api/payments/subscription-info").then(d=>setSubInfo(d)).catch(()=>setSubInfo(null));
    if(hasAuthToken())apiGet("/api/payments/invoices").then(d=>setInvoices(d?.invoices||[])).catch(()=>{});
  },[]);

  useEffect(()=>{return()=>{if(pollRef.current)clearInterval(pollRef.current);};},[]);

  const pricing=subInfo?.pricing?.[userRole];
  const selected=pricing?.[cycle];
  const baseAmount=selected?.total||subInfo?.plans?.[userRole]?.amount||299;
  const couponDiscount=couponResult?.discount||0;
  const amount=couponResult?.finalAmount!=null?couponResult.finalAmount:baseAmount;
  const savings=selected?.savings||0;
  const discount=selected?.discount||0;

  const validateCoupon=async()=>{
    if(!couponCode.trim()){setCouponErr(lang==="sw"?"Ingiza msimbo wa punguzo":"Enter a coupon code");return;}
    setCouponLoading(true);setCouponErr("");setCouponResult(null);
    try{
      const data=await apiPost("/api/coupons/validate",{code:couponCode.trim(),plan:userRole,billing_cycle:cycle,amount:baseAmount});
      setCouponResult(data);
    }catch(e){setCouponErr(e?.message||"Invalid coupon");setCouponResult(null);}finally{setCouponLoading(false);}
  };

  // Re-validate coupon when cycle changes
  useEffect(()=>{if(couponResult&&couponCode)validateCoupon();},[cycle]);

  const CYCLE_LABELS={
    monthly:{en:"Monthly",sw:"Kila Mwezi",months:1},
    quarterly:{en:"Quarterly",sw:"Kila Robo Mwaka",months:3},
    semi_annual:{en:"Semi-Annual",sw:"Kila Nusu Mwaka",months:6},
    annual:{en:"Annual",sw:"Kila Mwaka",months:12},
  };

  const initiatePay=async()=>{
    const cleanPhone=phone.replace(/\D/g,"");
    if(!/^254\d{9}$/.test(cleanPhone)){setErr(lang==="sw"?"Ingiza namba sahihi ya Safaricom e.g. 254712345678":"Enter a valid Safaricom number e.g. 254712345678");return;}
    setErr("");setStep("processing");
    try{
      const payload={plan:userRole,phone:cleanPhone,billing_cycle:cycle};
      if(couponCode.trim())payload.coupon_code=couponCode.trim();
      const data=await apiPost("/api/payments/mpesa/initiate",payload);
      if(data?.paymentId){
        setPaymentId(data.paymentId);
        setStep("polling");
        let attempts=0;
        pollRef.current=setInterval(async()=>{
          attempts++;
          try{
            const st=await apiGet(`/api/payments/status/${data.paymentId}`);
            if(st?.payment?.status==="completed"){
              clearInterval(pollRef.current);pollRef.current=null;
              setStep("success");
              // Refresh invoices
              apiGet("/api/payments/invoices").then(d=>setInvoices(d?.invoices||[])).catch(()=>{});
              setTimeout(()=>onPaid(),2500);
            }else if(st?.payment?.status==="failed"){
              clearInterval(pollRef.current);pollRef.current=null;
              setStep("error");setErr(lang==="sw"?"Malipo yameshindikana. Jaribu tena.":"Payment failed. Please try again.");
            }else if(attempts>=24){
              clearInterval(pollRef.current);pollRef.current=null;
              setStep("error");setErr(lang==="sw"?"Muda umekwisha. Jaribu tena.":"Payment timed out. Please try again.");
            }
          }catch{if(attempts>=24){clearInterval(pollRef.current);pollRef.current=null;setStep("error");setErr("Payment check failed.");}}
        },5000);
      }
    }catch(e){
      setStep("error");setErr(e?.message||(lang==="sw"?"Ombi limeshindikana":"Payment initiation failed"));
    }
  };

  const downloadInvoice=(inv)=>{
    const token=localStorage.getItem("elimuai_token");
    window.open(`/api/payments/invoices/${inv.id}/pdf?token=${token}`,"_blank");
  };

  const emailInvoice=async(inv)=>{
    try{
      const res=await apiPost(`/api/payments/invoices/${inv.id}/email`);
      alert(res?.message||"Invoice emailed!");
    }catch(e){alert(e?.message||"Failed to email invoice");}
  };

  return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,backgroundImage:`radial-gradient(ellipse at 15% 20%, ${C.gold}18 0%, transparent 45%), radial-gradient(ellipse at 85% 80%, ${C.green}12 0%, transparent 45%)`}}>
    <div style={{width:"100%",maxWidth:440}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:52,marginBottom:8}}>{step==="success"?"✅":step==="error"?"⚠️":"💳"}</div>
        <h1 style={{color:C.text,fontSize:24,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:"0 0 6px"}}>{step==="success"?(lang==="sw"?"Malipo Yamekubaliwa!":"Payment Confirmed!"):(lang==="sw"?"Kipindi chako cha Bure Kimeisha":"Your Free Trial Has Ended")}</h1>
        {step!=="success"&&<p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",margin:0}}>{lang==="sw"?"Chagua mpango na lipa kuendelea":"Choose a billing plan to continue"}</p>}
      </div>

      {step==="success"?(<Card style={{textAlign:"center",padding:24}}><p style={{color:C.green,fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 8px"}}>🎉 {lang==="sw"?"Akaunti yako imeamilishwa!":"Your account is now active!"}</p><p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",margin:0}}>{lang==="sw"?"Inaelekeza...":"Redirecting..."}</p></Card>)

      :step==="polling"?(<Card style={{textAlign:"center",padding:24}}><Spinner/><p style={{color:C.gold,fontSize:14,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"12px 0 6px"}}>📱 {lang==="sw"?"Angalia simu yako":"Check your phone"}</p><p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",margin:"0 0 8px"}}>{lang==="sw"?"Ingiza PIN yako ya M-Pesa kwenye simu":"Enter your M-Pesa PIN on your phone"}</p><p style={{color:C.text,fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:900}}>KES {amount.toLocaleString()}</p><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:"8px 0 0"}}>{lang==="sw"?"Inasubiri uthibitisho...":"Waiting for confirmation..."}</p></Card>)

      :step==="processing"?(<Card style={{textAlign:"center",padding:24}}><Spinner/><p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",margin:"10px 0 0"}}>{lang==="sw"?"Inatuma ombi kwa":"Sending STK push to"} {phone}...</p></Card>)

      :(<>
        {/* Billing Cycle Selector */}
        <Card style={{marginBottom:14}}>
          <p style={{color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 10px"}}>{lang==="sw"?"Chagua Mpango wa Malipo":"Choose Billing Cycle"}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {Object.entries(CYCLE_LABELS).map(([key,val])=>{
              const cp=pricing?.[key];
              const isActive=cycle===key;
              return(<button key={key} onClick={()=>setCycle(key)} style={{padding:"10px 8px",borderRadius:12,border:`2px solid ${isActive?C.gold:C.border}`,background:isActive?`${C.gold}15`:C.surface,cursor:"pointer",textAlign:"center",position:"relative",overflow:"hidden"}}>
                {cp?.discount>0&&<div style={{position:"absolute",top:0,right:0,background:C.green,borderRadius:"0 10px 0 8px",padding:"2px 8px"}}><span style={{color:"#fff",fontSize:8,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>-{cp.discount}%</span></div>}
                <p style={{color:isActive?C.gold:C.text,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 4px"}}>{val[lang]||val.en}</p>
                <p style={{color:isActive?C.text:C.muted,fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:900,margin:"0 0 2px"}}>KES {(cp?.total||amount).toLocaleString()}</p>
                {cp?.savings>0&&<p style={{color:C.green,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:0}}>{lang==="sw"?"Okoa":"Save"} KES {cp.savings.toLocaleString()}</p>}
                {!cp?.savings&&<p style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif",margin:0}}>{val.months} {lang==="sw"?"mwezi":"month"}{val.months>1?"s":""}</p>}
              </button>);
            })}
          </div>
        </Card>

        {/* Price Summary */}
        <Card style={{marginBottom:14}}>
          <div style={{background:`${C.gold}15`,borderRadius:12,padding:14,marginBottom:14,textAlign:"center"}}>
            <p style={{color:C.gold,fontSize:28,fontFamily:"'Nunito',sans-serif",fontWeight:900,margin:"0 0 4px"}}>KES {amount.toLocaleString()}<span style={{fontSize:12,color:C.muted,fontWeight:600}}> / {CYCLE_LABELS[cycle]?.[lang]||CYCLE_LABELS[cycle]?.en||cycle}</span></p>
            {discount>0&&<p style={{color:C.green,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>💰 {discount}% {lang==="sw"?"punguzo":"discount"} — {lang==="sw"?"unaokoa":"you save"} KES {savings.toLocaleString()}</p>}
            {couponDiscount>0&&<p style={{color:C.green,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>🎟️ Coupon: -{lang==="sw"?"KES":"KES"} {couponDiscount.toLocaleString()}</p>}
            <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:0}}>{userRole.charAt(0).toUpperCase()+userRole.slice(1)} {lang==="sw"?"mpango":"plan"} · {CYCLE_LABELS[cycle]?.months||1} {lang==="sw"?"mwezi":"month"}{(CYCLE_LABELS[cycle]?.months||1)>1?"s":""}</p>
          </div>
          <div style={{marginBottom:12}}>
            {[lang==="sw"?"✓ AI Tutor bila kikomo":"✓ Unlimited AI Tutor",lang==="sw"?"✓ Mitihani ya zamani":"✓ Past paper exams",lang==="sw"?"✓ Ripoti za kila wiki":"✓ Weekly progress reports",lang==="sw"?"✓ Ankara kwa email":"✓ Invoice emailed to you",lang==="sw"?"✓ Masomo ya nje ya mtandao":"✓ Offline lessons"].map(f=>(<p key={f} style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",margin:"0 0 6px"}}>{f}</p>))}
          </div>
        </Card>

        {/* Coupon Code */}
        <Card style={{marginBottom:14}}>
          <p style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 6px"}}>🎟️ {lang==="sw"?"Msimbo wa Punguzo":"Coupon Code"}</p>
          <div style={{display:"flex",gap:8}}>
            <input value={couponCode} onChange={e=>{setCouponCode(e.target.value.toUpperCase());if(couponResult){setCouponResult(null);setCouponErr("");}}} placeholder={lang==="sw"?"e.g. SAVE20":"e.g. SAVE20"} style={{flex:1,background:C.surface,border:`1px solid ${couponResult?C.green:C.border}`,borderRadius:12,padding:"10px 14px",color:C.text,fontSize:14,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/>
            <button onClick={validateCoupon} disabled={couponLoading} style={{padding:"10px 16px",borderRadius:12,border:"none",cursor:"pointer",background:C.card,color:C.gold,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,flexShrink:0,opacity:couponLoading?0.6:1}}>{couponLoading?"...":(lang==="sw"?"Thibitisha":"Apply")}</button>
          </div>
          {couponResult&&<p style={{color:C.green,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"6px 0 0"}}>✅ {couponResult.coupon.description||couponResult.coupon.code}: {couponResult.coupon.type==="percentage"?`${couponResult.coupon.value}%`:`KES ${couponResult.coupon.value.toLocaleString()}`} {lang==="sw"?"punguzo":"off"} — {lang==="sw"?"unaokoa":"you save"} KES {couponResult.discount.toLocaleString()}</p>}
          {couponErr&&<p style={{color:C.terracotta,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:"6px 0 0"}}>{couponErr}</p>}
        </Card>

        {/* Phone Input */}
        <Card style={{marginBottom:14}}>
          <p style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 6px"}}>{lang==="sw"?"Namba ya Safaricom":"Safaricom Number"}</p>
          <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} placeholder="254712345678" maxLength={12} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",color:C.text,fontSize:16,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box",marginBottom:4}}/>
          {err&&<p style={{color:C.terracotta,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:"4px 0 0"}}>{err}</p>}
          <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:"4px 0 0"}}>{lang==="sw"?"Utapokea STK push kwenye simu yako":"You'll receive an STK push on your phone"}</p>
        </Card>

        <button onClick={initiatePay} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.green},#2A8A50)`,color:"#fff",fontSize:15,fontFamily:"'Nunito',sans-serif",fontWeight:800,marginBottom:10}}>💰 {lang==="sw"?"Lipa":"Pay"} KES {amount.toLocaleString()} {lang==="sw"?"na M-Pesa":"with M-Pesa"}</button>

        {step==="error"&&<button onClick={()=>{setStep("choose");setErr("");}} style={{width:"100%",padding:"10px",borderRadius:12,border:`1px solid ${C.border}`,cursor:"pointer",background:"transparent",color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:10}}>{lang==="sw"?"Jaribu tena":"Try Again"}</button>}

        {/* Invoices Section */}
        {invoices.length>0&&(<>
          <button onClick={()=>setShowInvoices(!showInvoices)} style={{width:"100%",padding:"10px",borderRadius:12,border:`1px solid ${C.border}`,cursor:"pointer",background:C.surface,color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:8}}>🧾 {showInvoices?(lang==="sw"?"Ficha Ankara":"Hide Invoices"):(lang==="sw"?"Ona Ankara":"View Invoices")} ({invoices.length})</button>
          {showInvoices&&invoices.map(inv=>(<Card key={inv.id} style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div>
                <p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:0}}>#{inv.invoice_number}</p>
                <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:0}}>{new Date(inv.created_at).toLocaleDateString()} · {(inv.billing_cycle||"monthly").replace("_"," ")}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{color:C.text,fontSize:14,fontFamily:"'Nunito',sans-serif",fontWeight:900,margin:0}}>KES {Number(inv.amount).toLocaleString()}</p>
                <span style={{fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:800,padding:"1px 8px",borderRadius:6,background:inv.status==="paid"?`${C.green}22`:inv.status==="pending"?`${C.gold}22`:`${C.red}22`,color:inv.status==="paid"?C.green:inv.status==="pending"?C.gold:C.red}}>{inv.status.toUpperCase()}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>downloadInvoice(inv)} style={{flex:1,padding:"6px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.gold,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>📄 PDF</button>
              <button onClick={()=>emailInvoice(inv)} style={{flex:1,padding:"6px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.teal,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>📧 Email</button>
            </div>
          </Card>))}
        </>)}
      </>)}
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
function PlansScreen({plan,setPlan,lang,user}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const [mpesaTarget,setMpesaTarget]=useState(null);
  const [subInfo,setSubInfo]=useState(null);
  const [cycle,setCycle]=useState("monthly");
  const [invoices,setInvoices]=useState([]);

  const userRole=(user?.role==="admin"||user?.role==="super_admin")?"school":(user?.role||"student");

  useEffect(()=>{
    apiGet("/api/payments/subscription-info").then(d=>setSubInfo(d)).catch(()=>{});
    if(hasAuthToken())apiGet("/api/payments/invoices").then(d=>setInvoices(d?.invoices||[])).catch(()=>{});
  },[]);

  const CYCLE_LABELS={monthly:{en:"Monthly",sw:"Kila Mwezi"},quarterly:{en:"Quarterly",sw:"Robo Mwaka"},semi_annual:{en:"Semi-Annual",sw:"Nusu Mwaka"},annual:{en:"Annual",sw:"Kila Mwaka"}};

  return(<div style={{padding:"22px 18px 100px"}}>
    {mpesaTarget&&<MpesaModal plan={mpesaTarget} onClose={()=>setMpesaTarget(null)} onSuccess={p=>setPlan(p.id)} lang={lang}/>}
    <h2 style={{color:C.text,fontSize:22,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>{t("plans_title")}</h2>
    <p style={{color:C.muted,fontSize:12,margin:"0 0 12px",fontFamily:"'Nunito',sans-serif"}}>💚 M-Pesa · Airtel Money · T-Kash</p>

    {/* Cycle Toggle */}
    <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
      {Object.entries(CYCLE_LABELS).map(([key,val])=>{
        const pricing=subInfo?.pricing?.[userRole]?.[key];
        return(<button key={key} onClick={()=>setCycle(key)} style={{flex:1,minWidth:70,padding:"6px 4px",borderRadius:10,border:`1px solid ${cycle===key?C.gold:C.border}`,background:cycle===key?`${C.gold}15`:"transparent",cursor:"pointer",textAlign:"center"}}>
          <p style={{color:cycle===key?C.gold:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:0}}>{val[lang]||val.en}</p>
          {pricing?.discount>0&&<p style={{color:C.green,fontSize:8,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:0}}>-{pricing.discount}%</p>}
        </button>);
      })}
    </div>

    {PLANS.map(p=>{
      const pricing=subInfo?.pricing?.[p.id==="family"?"parent":p.id]?.[cycle];
      const displayPrice=pricing?.total||p.price*({"monthly":1,"quarterly":3,"semi_annual":6,"annual":12}[cycle]||1);
      return(<Card key={p.id} style={{marginBottom:12,border:`1px solid ${plan===p.id?p.color:C.border}`,position:"relative",overflow:"hidden"}}>
      {p.popular&&<div style={{position:"absolute",top:12,right:12,background:C.gold,borderRadius:7,padding:"2px 10px"}}><span style={{color:C.bg,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{t("popular")}</span></div>}
      <p style={{color:p.color,fontSize:15,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{p.name[lang]||p.name.en}</p>
      <p style={{color:C.text,fontSize:20,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{p.price===0?(lang==="sw"?"Bure":"Free"):`KES ${displayPrice.toLocaleString()}`}<span style={{fontSize:11,color:C.muted,fontWeight:600}}> {p.price>0?`/ ${CYCLE_LABELS[cycle]?.[lang]||cycle}`:""}</span></p>
      {pricing?.savings>0&&<p style={{color:C.green,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 8px"}}>💰 {lang==="sw"?"Okoa":"Save"} KES {pricing.savings.toLocaleString()}</p>}
      <div style={{marginBottom:12}}>{(p.features[lang]||p.features.en).map(f=>(<p key={f} style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:"0 0 3px"}}>✓ {f}</p>))}</div>
      {plan===p.id?(<div style={{background:`${p.color}22`,borderRadius:10,padding:"8px",textAlign:"center"}}><span style={{color:p.color,fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:12}}>{t("current_plan")}</span></div>)
      :(<button onClick={()=>p.price===0?setPlan("free"):setMpesaTarget(p)} style={{width:"100%",padding:"10px",borderRadius:12,border:p.price===0?`1px solid ${C.border}`:"none",cursor:"pointer",background:p.price===0?"transparent":`linear-gradient(135deg,${p.color},${p.color}bb)`,color:p.price===0?C.text:C.bg,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{p.price===0?t("free_plan"):t("pay_mpesa")}</button>)}
    </Card>);})}

    {/* User Invoices */}
    {invoices.length>0&&(<>
      <h3 style={{color:C.text,fontSize:16,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:"20px 0 10px"}}>🧾 {lang==="sw"?"Ankara Zako":"Your Invoices"}</h3>
      {invoices.map(inv=>(<Card key={inv.id} style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div>
            <p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:0}}>#{inv.invoice_number}</p>
            <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:0}}>{new Date(inv.created_at).toLocaleDateString()} · {(inv.billing_cycle||"monthly").replace("_"," ")}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:900,margin:0}}>KES {Number(inv.amount).toLocaleString()}</p>
            <span style={{fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:800,padding:"1px 8px",borderRadius:6,background:inv.status==="paid"?`${C.green}22`:`${C.gold}22`,color:inv.status==="paid"?C.green:C.gold}}>{inv.status.toUpperCase()}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>window.open(`/api/payments/invoices/${inv.id}/pdf`,"_blank")} style={{flex:1,padding:"5px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.gold,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>📄 Download PDF</button>
          <button onClick={async()=>{try{const r=await apiPost(`/api/payments/invoices/${inv.id}/email`);alert(r?.message||"Sent!");}catch(e){alert(e?.message||"Failed");}}} style={{flex:1,padding:"5px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.teal,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>📧 Email Invoice</button>
        </div>
      </Card>))}
    </>)}
  </div>);
}

// ─── SCHOOL ADMIN ─────────────────────────────────────────────────────────────
function SchoolAdmin({lang,user,onLogout}){
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
  const [schoolStats,setSchoolStats]=useState(null);
  const teachers=[{name:"Mr. Kamau",subject:"Mathematics",classes:3,students:95},{name:"Ms. Wanjiku",subject:"English",classes:2,students:62},{name:"Mr. Okonkwo",subject:"Science",classes:4,students:112}];
  const stats={
    total:schoolStats?.student_count ?? students.length,
    active:students.filter(s=>s.status==="Active").length,
    avg:Math.round((schoolStats?.avg_score ?? (students.reduce((a,s)=>a+s.score,0)/Math.max(1,students.length)))),
    teachers:schoolStats?.teacher_count ?? teachers.length
  };
  useEffect(()=>{
    let alive=true;
    if(!hasAuthToken()||!user?.school_id) return;
    apiGet(`/api/schools/${user.school_id}/stats`).then(d=>{if(alive)setSchoolStats(d?.school||null);}).catch(()=>{});
    apiGet(`/api/schools/${user.school_id}/students`).then(d=>{
      if(!alive) return;
      if(Array.isArray(d?.students)&&d.students.length){
        const mapped=d.students.map(s=>({
          id:s.id,
          name:s.name,
          grade:s.grade_level,
          subject:s.subject||"",
          score:Math.round(s.avg_score||0),
          status:s.last_login?((Date.now()-new Date(s.last_login).getTime())<30*24*60*60*1000?"Active":"Inactive"):"Inactive",
        }));
        setStudents(mapped);
      }
    }).catch(()=>{});
    return()=>{alive=false;};
  },[user?.school_id]);
  const generateReport=async()=>{
    setLoadingRep(true);
    try{
      const data=await apiPost("/api/ai/school-insights",{classData:{stats,students,teachers}});
      setAiReport(data?.insights||"");
    }catch(err){
      const msg=err?.status===401
        ?(lang==="sw"?"Tafadhali ingia ili kutumia AI.":"Please sign in to use AI.")
        :(err?.message||"Error");
      setAiReport(msg);
    }finally{
      setLoadingRep(false);
    }
  };
  const addStudent=()=>{if(!newSt.name)return;setStudents(p=>[...p,{id:Date.now(),...newSt,score:0,status:"Active"}]);setNewSt({name:"",grade:"",phone:""});setShowAdd(false);};
  const [transactions,setTransactions]=useState([]);const [txTotal,setTxTotal]=useState(0);const [txPage,setTxPage]=useState(1);const [txFilter,setTxFilter]=useState("");const [txLoading,setTxLoading]=useState(false);
  const [smsLogs,setSmsLogs]=useState([]);const [smsTotal,setSmsTotal]=useState(0);const [smsPage,setSmsPage]=useState(1);const [smsFilter,setSmsFilter]=useState("");const [smsLoading,setSmsLoading]=useState(false);
  const [dashStats,setDashStats]=useState(null);const [loadingAdmin,setLoadingAdmin]=useState(false);
  useEffect(()=>{
    if(!hasAuthToken()) return;
    setLoadingAdmin(true);
    apiGet("/api/admin/dashboard").then(d=>setDashStats(d)).catch(()=>{}).finally(()=>setLoadingAdmin(false));
  },[]);
  useEffect(()=>{
    if(!hasAuthToken()||tab!=="Transactions") return;
    setTxLoading(true);
    const params={page:txPage,limit:20};if(txFilter)params.status=txFilter;
    apiGet("/api/admin/transactions",params).then(d=>{setTransactions(d?.transactions||[]);setTxTotal(d?.total||0);}).catch(()=>{}).finally(()=>setTxLoading(false));
  },[tab,txPage,txFilter]);
  useEffect(()=>{
    if(!hasAuthToken()||tab!=="SMS Logs") return;
    setSmsLoading(true);
    const params={page:smsPage,limit:20};if(smsFilter)params.status=smsFilter;
    apiGet("/api/admin/sms-logs",params).then(d=>{setSmsLogs(d?.sms_logs||[]);setSmsTotal(d?.total||0);}).catch(()=>{}).finally(()=>setSmsLoading(false));
  },[tab,smsPage,smsFilter]);
  // Settings state
  const [settings,setSettings]=useState({});const [settingsLoading,setSettingsLoading]=useState(false);const [settingsSaved,setSettingsSaved]=useState(false);const [settingsTab,setSettingsTab]=useState("mpesa");
  // User management state
  const [adminUsers,setAdminUsers]=useState([]);const [usersTotal,setUsersTotal]=useState(0);const [usersPage,setUsersPage]=useState(1);const [usersRoleFilter,setUsersRoleFilter]=useState("");const [resetMsg,setResetMsg]=useState("");const [usersLoading,setUsersLoading]=useState(false);
  const [showResetPw,setShowResetPw]=useState(null);const [resetPwInput,setResetPwInput]=useState("");const [resetPwSaving,setResetPwSaving]=useState(false);
  const [showCreateUser,setShowCreateUser]=useState(false);const [createUserForm,setCreateUserForm]=useState({name:"",email:"",phone:"",password:"",role:"student",country:"KE",grade_level:""});const [createUserMsg,setCreateUserMsg]=useState("");const [createUserSaving,setCreateUserSaving]=useState(false);
  // Coupon management state
  const [coupons,setCoupons]=useState([]);const [couponsTotal,setCouponsTotal]=useState(0);const [couponsPage,setCouponsPage]=useState(1);const [couponsLoading,setCouponsLoading]=useState(false);
  const [showCouponForm,setShowCouponForm]=useState(false);const [editCoupon,setEditCoupon]=useState(null);
  const [couponForm,setCouponForm]=useState({code:"",description:"",type:"percentage",value:"",min_amount:"",max_discount:"",applicable_plans:[],applicable_cycles:[],max_uses:"",max_uses_per_user:"1",starts_at:"",expires_at:""});
  const [couponSaving,setCouponSaving]=useState(false);const [couponMsg,setCouponMsg]=useState("");
  const loadCoupons=()=>{
    setCouponsLoading(true);
    apiGet("/api/coupons/admin",{page:couponsPage,limit:20}).then(d=>{setCoupons(d?.coupons||[]);setCouponsTotal(d?.total||0);}).catch(()=>{}).finally(()=>setCouponsLoading(false));
  };
  useEffect(()=>{if(!hasAuthToken()||tab!=="Coupons")return;loadCoupons();},[tab,couponsPage]);
  const saveCoupon=async()=>{
    if(!couponForm.code||!couponForm.value){setCouponMsg("Code and value required");return;}
    setCouponSaving(true);setCouponMsg("");
    try{
      const payload={...couponForm,value:parseFloat(couponForm.value),min_amount:couponForm.min_amount?parseFloat(couponForm.min_amount):0,max_discount:couponForm.max_discount?parseFloat(couponForm.max_discount):null,max_uses:couponForm.max_uses?parseInt(couponForm.max_uses):null,max_uses_per_user:couponForm.max_uses_per_user?parseInt(couponForm.max_uses_per_user):1};
      if(editCoupon){await fetch(`${API_BASE}/api/coupons/admin/${editCoupon.id}`,{method:"PUT",headers:{"Content-Type":"application/json",...getAuthHeader()},body:JSON.stringify(payload)});}
      else{await apiPost("/api/coupons/admin",payload);}
      setShowCouponForm(false);setEditCoupon(null);setCouponForm({code:"",description:"",type:"percentage",value:"",min_amount:"",max_discount:"",applicable_plans:[],applicable_cycles:[],max_uses:"",max_uses_per_user:"1",starts_at:"",expires_at:""});
      loadCoupons();setCouponMsg(editCoupon?"Coupon updated!":"Coupon created!");setTimeout(()=>setCouponMsg(""),3000);
    }catch(e){setCouponMsg(e?.message||"Failed to save coupon");}finally{setCouponSaving(false);}
  };
  const deleteCoupon=async(id)=>{
    if(!confirm("Delete this coupon?"))return;
    try{await fetch(`${API_BASE}/api/coupons/admin/${id}`,{method:"DELETE",headers:{...getAuthHeader()}});loadCoupons();}catch{}
  };
  const toggleCouponActive=async(c)=>{
    try{await fetch(`${API_BASE}/api/coupons/admin/${c.id}`,{method:"PUT",headers:{"Content-Type":"application/json",...getAuthHeader()},body:JSON.stringify({is_active:!c.is_active})});loadCoupons();}catch{}
  };
  useEffect(()=>{
    if(!hasAuthToken()||tab!=="Settings") return;
    setSettingsLoading(true);
    apiGet("/api/admin/settings").then(d=>setSettings(d?.settings||{})).catch(()=>{}).finally(()=>setSettingsLoading(false));
  },[tab]);
  useEffect(()=>{
    if(!hasAuthToken()||tab!=="Users") return;
    setUsersLoading(true);
    const params={page:usersPage,limit:20};if(usersRoleFilter)params.role=usersRoleFilter;
    apiGet("/api/admin/users",params).then(d=>{setAdminUsers(d?.users||[]);setUsersTotal(d?.total||0);}).catch(()=>{}).finally(()=>setUsersLoading(false));
  },[tab,usersPage,usersRoleFilter]);
  const saveSettings=async()=>{
    setSettingsSaved(false);
    try{
      await fetch(`${API_BASE}/api/admin/settings`,{method:"PUT",headers:{"Content-Type":"application/json",...getAuthHeader()},body:JSON.stringify(settings)});
      setSettingsSaved(true);setTimeout(()=>setSettingsSaved(false),3000);
    }catch{}
  };
  const resetPassword=async(uid,newPassword)=>{
    setResetMsg("");setResetPwSaving(true);
    try{
      const body=newPassword?{newPassword}:{};
      const d=await apiPost(`/api/admin/users/${uid}/reset-password`,body);
      setResetMsg(d?.message||(d?.tempPassword?`Password reset to: ${d.tempPassword}`:"Password changed"));
      setShowResetPw(null);setResetPwInput("");
    }catch(e){setResetMsg(e?.message||"Failed");}finally{setResetPwSaving(false);}
  };
  const toggleActive=async(uid)=>{
    try{
      const r=await fetch(`${API_BASE}/api/admin/users/${uid}/toggle-active`,{method:"PUT",headers:{"Content-Type":"application/json",...getAuthHeader()}});
      const d=await r.json();
      if(d?.user)setAdminUsers(p=>p.map(u=>u.id===uid?{...u,is_active:d.user.is_active}:u));
    }catch{}
  };
  const changeRole=async(uid,role)=>{
    try{
      const r=await fetch(`${API_BASE}/api/admin/users/${uid}/role`,{method:"PUT",headers:{"Content-Type":"application/json",...getAuthHeader()},body:JSON.stringify({role})});
      const d=await r.json();
      if(d?.user)setAdminUsers(p=>p.map(u=>u.id===uid?{...u,role:d.user.role}:u));
    }catch{}
  };
  const createUser=async()=>{
    if(!createUserForm.name||!createUserForm.email||!createUserForm.password){setCreateUserMsg("Name, email and password required");return;}
    if(createUserForm.password.length<8){setCreateUserMsg("Password must be at least 8 characters");return;}
    setCreateUserSaving(true);setCreateUserMsg("");
    try{
      const d=await apiPost("/api/admin/users",createUserForm);
      if(d?.user){setCreateUserMsg("");setShowCreateUser(false);setCreateUserForm({name:"",email:"",phone:"",password:"",role:"student",country:"KE",grade_level:""});setUsersPage(1);setUsersRoleFilter("");
        setUsersLoading(true);apiGet("/api/admin/users",{page:1,limit:20}).then(r=>{setAdminUsers(r?.users||[]);setUsersTotal(r?.total||0);}).catch(()=>{}).finally(()=>setUsersLoading(false));
      }
    }catch(e){setCreateUserMsg(e?.message||"Failed to create user");}finally{setCreateUserSaving(false);}
  };
  const sidebarItems=[{l:"Overview",i:"📊"},{l:"Transactions",i:"💰"},{l:"SMS Logs",i:"📱"},{l:"Users",i:"👤"},{l:"Students",i:"👥"},{l:"Teachers",i:"👨‍🏫"},{l:"Coupons",i:"🎟️"},{l:"Settings",i:"⚙️"},{l:"Reports",i:"📈"}];
  const [sideOpen,setSideOpen]=useState(false);
  const [isMobile,setIsMobile]=useState(typeof window!=="undefined"&&window.innerWidth<768);
  useEffect(()=>{
    const h=()=>{const m=window.innerWidth<768;setIsMobile(m);if(!m)setSideOpen(false);};
    window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);
  },[]);
  const sideW=220;
  return(<div style={{display:"flex",minHeight:"100vh",position:"relative"}}>
    {/* Mobile overlay */}
    {isMobile&&sideOpen&&<div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:99}}/>}
    {/* Sidebar */}
    <div style={{width:sideW,background:C.surface,borderRight:`1px solid ${C.border}`,padding:"18px 0",flexShrink:0,position:"fixed",top:0,bottom:0,left:isMobile&&!sideOpen?-sideW:0,zIndex:100,overflowY:"auto",transition:"left 0.25s ease",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"0 16px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><h2 style={{color:C.gold,fontSize:16,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>⚡ ElimuAI</h2><p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif"}}>Admin Portal</p></div>
        {isMobile&&<button onClick={()=>setSideOpen(false)} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer",padding:0}}>✕</button>}
      </div>
      {sidebarItems.map(s=>(<button key={s.l} onClick={()=>{setTab(s.l);if(isMobile)setSideOpen(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"10px 16px",border:"none",cursor:"pointer",background:tab===s.l?`${C.gold}22`:"transparent",color:tab===s.l?C.gold:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:tab===s.l?800:600,textAlign:"left",borderLeft:tab===s.l?`3px solid ${C.gold}`:"3px solid transparent"}}><span style={{fontSize:16}}>{s.i}</span>{s.l}</button>))}
      <div style={{padding:"16px",marginTop:"auto",borderTop:`1px solid ${C.border}`}}>
        {user&&<p style={{color:C.muted,fontSize:10,margin:"0 0 8px",fontFamily:"'Nunito',sans-serif",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>👤 {user.name||user.email}</p>}
        <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"8px 12px",borderRadius:10,border:"none",cursor:"pointer",background:`${C.red}18`,color:C.red,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>🚪 Logout</button>
      </div>
    </div>
    {/* Main content */}
    <div style={{marginLeft:isMobile?0:sideW,flex:1,padding:isMobile?"14px 12px 40px":"24px 32px 60px",minWidth:0}}>
    {/* Mobile header with hamburger */}
    {isMobile&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <button onClick={()=>setSideOpen(true)} style={{background:"none",border:"none",color:C.gold,fontSize:24,cursor:"pointer",padding:0}}>☰</button>
      <h2 style={{color:C.text,fontSize:18,margin:0,fontFamily:"'Playfair Display',serif",fontWeight:900}}>🏫 {tab}</h2>
      <Badge color={C.lime} style={{marginLeft:"auto"}}>Admin ✓</Badge>
    </div>}
    {!isMobile&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div><h2 style={{color:C.text,fontSize:20,margin:"0 0 2px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>🏫 {tab}</h2></div>
      <Badge color={C.lime}>Admin ✓</Badge>
    </div>}
    {showAdd&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:22,width:"100%",maxWidth:360}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h3 style={{color:C.text,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:0}}>{t("add_student")}</h3><button onClick={()=>setShowAdd(false)} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>×</button></div>
        {["name","grade","phone"].map(f=>(<div key={f} style={{marginBottom:10}}><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px",textTransform:"capitalize"}}>{f}</p><input value={newSt[f]} onChange={e=>setNewSt(p=>({...p,[f]:e.target.value}))} placeholder={f==="name"?"Full name":f==="grade"?"e.g. Form 3":"e.g. 254712..."} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>))}
        <button onClick={addStudent} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>Add ✓</button>
      </div>
    </div>)}
    {tab==="Overview"&&(<>
      {loadingAdmin&&(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:14}}>{[0,1,2,3,4,5].map(i=>(<div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,textAlign:"center"}}><SkeletonLine w="50%" h={22} mb={6}/><SkeletonLine w="70%" h={9} mb={0}/></div>))}<style>{`@keyframes skPulse{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}`}</style></div>)}
      {dashStats&&(<>
        <Card style={{marginBottom:14}}>
          <SecTitle>Platform Overview</SecTitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
            {[{l:"Total Users",v:dashStats.users?.total_users||0,c:C.gold},{l:"Students",v:dashStats.users?.students||0,c:C.green},{l:"Teachers",v:dashStats.users?.teachers||0,c:C.amber},{l:"Paid Users",v:dashStats.users?.paid_users||0,c:C.lime},{l:"Revenue (KES)",v:Number(dashStats.payments?.total_revenue||0).toLocaleString(),c:C.gold},{l:"Active",v:dashStats.users?.active_users||0,c:C.teal}].map(s=>(<div key={s.l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14,textAlign:"center"}}><p style={{color:s.c,fontSize:22,margin:"0 0 4px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{s.v}</p><p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:700,textTransform:"uppercase"}}>{s.l}</p></div>))}
          </div>
        </Card>
        <Card style={{marginBottom:14}}>
          <SecTitle>Payments Summary</SecTitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10}}>
            {[{l:"Total",v:dashStats.payments?.total||0,c:C.gold},{l:"Completed",v:dashStats.payments?.completed||0,c:C.green},{l:"Pending",v:dashStats.payments?.pending||0,c:C.amber},{l:"Failed",v:dashStats.payments?.failed||0,c:C.red}].map(s=>(<div key={s.l} style={{textAlign:"center"}}><p style={{color:s.c,fontSize:22,margin:"0 0 4px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{s.v}</p><p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s.l}</p></div>))}
          </div>
        </Card>
        <Card>
          <SecTitle>SMS Summary</SecTitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10}}>
            {[{l:"Total Sent",v:dashStats.sms?.total||0,c:C.gold},{l:"Delivered",v:dashStats.sms?.sent||0,c:C.green},{l:"Failed",v:dashStats.sms?.failed||0,c:C.red}].map(s=>(<div key={s.l} style={{textAlign:"center"}}><p style={{color:s.c,fontSize:22,margin:"0 0 4px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{s.v}</p><p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s.l}</p></div>))}
          </div>
        </Card>
      </>)}
      {!dashStats&&!loadingAdmin&&(<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:14}}>
          {[{l:"Total Students",v:stats.total,c:C.gold},{l:"Active",v:stats.active,c:C.green},{l:"Avg Score",v:`${stats.avg}%`,c:C.amber},{l:"Teachers",v:stats.teachers,c:C.lime}].map(s=>(<Card key={s.l} style={{textAlign:"center"}}><p style={{color:s.c,fontSize:24,margin:"0 0 3px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{s.v}</p><p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:700}}>{s.l}</p></Card>))}
        </div>
      </>)}
    </>)}
    {tab==="Transactions"&&(<>
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        {["","completed","pending","failed"].map(f=>(<button key={f||"all"} onClick={()=>{setTxFilter(f);setTxPage(1);}} style={{padding:"4px 12px",borderRadius:20,border:"none",cursor:"pointer",background:txFilter===f?C.gold:C.card,color:txFilter===f?C.bg:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{f||"All"}</button>))}
      </div>
      <p style={{color:C.muted,fontSize:10,margin:"0 0 8px",fontFamily:"'Nunito',sans-serif"}}>{txTotal} transactions</p>
      {txLoading&&[0,1,2,3,4].map(i=>(<SkeletonCard key={i} lines={3}/>))}
      {!txLoading&&transactions.length===0&&<p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",textAlign:"center",padding:20}}>No transactions found</p>}
      {!txLoading&&transactions.map(tx=>(<Card key={tx.id} style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><p style={{color:C.text,fontSize:13,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{tx.user_name||"Unknown"}</p><p style={{color:C.muted,fontSize:10,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif"}}>{tx.user_email||tx.phone_number}</p><p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif"}}>{tx.reference}</p></div>
          <div style={{textAlign:"right"}}><p style={{color:C.gold,fontSize:15,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:900}}>KES {Number(tx.amount).toLocaleString()}</p><Badge color={tx.status==="completed"?C.green:tx.status==="pending"?C.amber:C.red}>{tx.status}</Badge></div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
          <span style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif"}}>{tx.plan} · {tx.method}</span>
          <span style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif"}}>{new Date(tx.created_at).toLocaleString()}</span>
        </div>
        {tx.mpesa_receipt&&<p style={{color:C.green,fontSize:9,margin:"4px 0 0",fontFamily:"'Nunito',sans-serif"}}>Receipt: {tx.mpesa_receipt}</p>}
      </Card>))}
      {!txLoading&&txTotal>20&&(<div style={{display:"flex",justifyContent:"center",gap:10,marginTop:10}}>
        <button disabled={txPage<=1} onClick={()=>setTxPage(p=>p-1)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:11,cursor:"pointer",opacity:txPage<=1?0.4:1}}>← Prev</button>
        <span style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",alignSelf:"center"}}>Page {txPage}</span>
        <button disabled={txPage*20>=txTotal} onClick={()=>setTxPage(p=>p+1)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:11,cursor:"pointer",opacity:txPage*20>=txTotal?0.4:1}}>Next →</button>
      </div>)}
    </>)}
    {tab==="SMS Logs"&&(<>
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        {["","sent","failed"].map(f=>(<button key={f||"all"} onClick={()=>{setSmsFilter(f);setSmsPage(1);}} style={{padding:"4px 12px",borderRadius:20,border:"none",cursor:"pointer",background:smsFilter===f?C.gold:C.card,color:smsFilter===f?C.bg:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{f||"All"}</button>))}
      </div>
      <p style={{color:C.muted,fontSize:10,margin:"0 0 8px",fontFamily:"'Nunito',sans-serif"}}>{smsTotal} SMS messages</p>
      {smsLoading&&[0,1,2,3,4].map(i=>(<SkeletonCard key={i} lines={2}/>))}
      {!smsLoading&&smsLogs.length===0&&<p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",textAlign:"center",padding:20}}>No SMS logs found</p>}
      {!smsLoading&&smsLogs.map(sm=>(<Card key={sm.id} style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}><p style={{color:C.text,fontSize:12,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>📞 {sm.recipient}</p><p style={{color:C.muted,fontSize:10,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",lineHeight:1.4,wordBreak:"break-word"}}>{sm.message}</p></div>
          <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><Badge color={sm.status==="sent"?C.green:C.red}>{sm.status}</Badge></div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
          <span style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif"}}>{sm.provider}</span>
          <span style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif"}}>{new Date(sm.created_at).toLocaleString()}</span>
        </div>
      </Card>))}
      {!smsLoading&&smsTotal>20&&(<div style={{display:"flex",justifyContent:"center",gap:10,marginTop:10}}>
        <button disabled={smsPage<=1} onClick={()=>setSmsPage(p=>p-1)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:11,cursor:"pointer",opacity:smsPage<=1?0.4:1}}>← Prev</button>
        <span style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",alignSelf:"center"}}>Page {smsPage}</span>
        <button disabled={smsPage*20>=smsTotal} onClick={()=>setSmsPage(p=>p+1)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:11,cursor:"pointer",opacity:smsPage*20>=smsTotal?0.4:1}}>Next →</button>
      </div>)}
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
    {tab==="Settings"&&(<>
      {settingsLoading&&<Spinner/>}
      {!settingsLoading&&(<>
        <div style={{display:"flex",gap:0,minHeight:400}}>
        {/* Vertical tabs */}
        <div style={{width:isMobile?54:180,flexShrink:0,background:C.surface,borderRadius:"14px 0 0 14px",border:`1px solid ${C.border}`,borderRight:"none",overflow:"hidden"}}>
          {[{id:"mpesa",i:"💳",l:"M-Pesa"},{id:"sms",i:"📱",l:"SMS (AT)"},{id:"billing",i:"💰",l:"Billing Plans"},{id:"email",i:"📧",l:"Email (SMTP)"}].map(s=>(<button key={s.id} onClick={()=>setSettingsTab(s.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:isMobile?"12px 6px":"12px 16px",border:"none",cursor:"pointer",background:settingsTab===s.id?`${C.gold}18`:"transparent",color:settingsTab===s.id?C.gold:C.muted,fontSize:isMobile?9:12,fontFamily:"'Nunito',sans-serif",fontWeight:settingsTab===s.id?800:600,textAlign:"left",borderLeft:settingsTab===s.id?`3px solid ${C.gold}`:"3px solid transparent",borderBottom:`1px solid ${C.border}22`}}><span style={{fontSize:isMobile?16:18}}>{s.i}</span>{!isMobile&&s.l}</button>))}
        </div>
        {/* Tab content */}
        <div style={{flex:1,background:C.card,borderRadius:"0 14px 14px 0",border:`1px solid ${C.border}`,padding:isMobile?14:22,minWidth:0,overflowY:"auto"}}>

        {settingsTab==="mpesa"&&(<>
          <SecTitle>M-Pesa Configuration</SecTitle>
          <div style={{marginBottom:10}}>
            <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Environment</p>
            <select value={settings.mpesa_environment||"sandbox"} onChange={e=>setSettings(p=>({...p,mpesa_environment:e.target.value}))} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}>
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production (Live)</option>
            </select>
          </div>
          {[{k:"mpesa_consumer_key",l:"Consumer Key",p:"Enter M-Pesa consumer key"},{k:"mpesa_consumer_secret",l:"Consumer Secret",p:"Enter M-Pesa consumer secret"},{k:"mpesa_shortcode",l:"Business Shortcode (PayBill)",p:"e.g. 174379"},{k:"mpesa_passkey",l:"Passkey",p:"Enter M-Pesa passkey"},{k:"mpesa_callback_url",l:"Callback URL",p:"e.g. https://elimuai.africa/api/payments/mpesa/callback"}].map(f=>(<div key={f.k} style={{marginBottom:10}}><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>{f.l}</p><input value={settings[f.k]||""} onChange={e=>setSettings(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} type={f.k.includes("secret")||f.k.includes("passkey")?"password":"text"} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>))}
        </>)}

        {settingsTab==="sms"&&(<>
          <SecTitle>Africa's Talking (SMS)</SecTitle>
          <div style={{marginBottom:10}}>
            <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Environment</p>
            <select value={settings.at_environment||"sandbox"} onChange={e=>setSettings(p=>({...p,at_environment:e.target.value}))} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}>
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production (Live)</option>
            </select>
          </div>
          {[{k:"at_api_key",l:"API Key",p:"Enter Africa's Talking API key"},{k:"at_username",l:"Username",p:"e.g. sandbox or your_username"},{k:"at_sender_id",l:"Sender ID (optional)",p:"e.g. ElimuAI"}].map(f=>(<div key={f.k} style={{marginBottom:10}}><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>{f.l}</p><input value={settings[f.k]||""} onChange={e=>setSettings(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} type={f.k.includes("key")?"password":"text"} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>))}
        </>)}

        {settingsTab==="billing"&&(<>
          <SecTitle>Trial & Billing Plans</SecTitle>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:`${C.dim}55`,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
            <div><p style={{color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:0}}>Billing System</p><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",margin:"2px 0 0"}}>Enable or disable the payment/subscription gate for users</p></div>
            <div onClick={()=>setSettings(p=>({...p,billing_enabled:p.billing_enabled==="false"?"true":"false"}))} style={{width:44,height:24,borderRadius:12,background:settings.billing_enabled==="false"?C.dim:C.green,cursor:"pointer",position:"relative",transition:"background 0.2s"}}><div style={{width:20,height:20,borderRadius:10,background:"#fff",position:"absolute",top:2,left:settings.billing_enabled==="false"?2:22,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/></div>
          </div>
          <div style={{marginBottom:10}}><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Free Trial Days</p><input value={settings.trial_days||""} onChange={e=>setSettings(p=>({...p,trial_days:e.target.value}))} placeholder="e.g. 7" type="number" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{role:"school",label:"🏫 School",ak:"school_subscription_amount",dk:"school_subscription_days"},{role:"teacher",label:"👨‍🏫 Teacher",ak:"teacher_subscription_amount",dk:"teacher_subscription_days"},{role:"parent",label:"👨‍👩‍👧 Parent",ak:"parent_subscription_amount",dk:"parent_subscription_days"},{role:"student",label:"🎒 Student",ak:"student_subscription_amount",dk:"student_subscription_days"}].map(p=>(<div key={p.role} style={{background:`${C.dim}55`,borderRadius:10,padding:10}}>
              <p style={{color:C.gold,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,margin:"0 0 6px"}}>{p.label}</p>
              <p style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 3px"}}>Monthly Amount (KES)</p>
              <input value={settings[p.ak]||""} onChange={e=>setSettings(s=>({...s,[p.ak]:e.target.value}))} type="number" placeholder="0" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box",marginBottom:4}}/>
              <p style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 3px"}}>Base Duration (days)</p>
              <input value={settings[p.dk]||""} onChange={e=>setSettings(s=>({...s,[p.dk]:e.target.value}))} type="number" placeholder="30" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/>
            </div>))}
          </div>
          <div style={{marginTop:10}}>
            <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 6px"}}>Billing Cycle Discounts (%)</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{k:"billing_quarterly_discount",l:"Quarterly"},{k:"billing_semi_annual_discount",l:"Semi-Annual"},{k:"billing_annual_discount",l:"Annual"}].map(d=>(<div key={d.k}><p style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 3px"}}>{d.l}</p><input value={settings[d.k]||""} onChange={e=>setSettings(s=>({...s,[d.k]:e.target.value}))} type="number" placeholder="0" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>))}
            </div>
          </div>
          <div style={{background:`${C.gold}15`,borderRadius:10,padding:10,marginTop:8}}><p style={{color:C.gold,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:0}}>ℹ Users get {settings.trial_days||7} free trial days. They can choose monthly, quarterly ({settings.billing_quarterly_discount||10}% off), semi-annual ({settings.billing_semi_annual_discount||15}% off), or annual ({settings.billing_annual_discount||20}% off) billing.</p></div>
        </>)}

        {settingsTab==="email"&&(<>
          <SecTitle>Email (SMTP)</SecTitle>
          {[{k:"smtp_host",l:"SMTP Host",p:"e.g. smtp.gmail.com"},{k:"smtp_port",l:"SMTP Port",p:"587"},{k:"smtp_user",l:"SMTP User / Email",p:"e.g. noreply@elimuai.africa"},{k:"smtp_pass",l:"SMTP Password",p:"Enter SMTP password",secret:true},{k:"smtp_from_name",l:"From Name",p:"e.g. ElimuAI"},{k:"smtp_from_email",l:"From Email",p:"e.g. noreply@elimuai.africa"}].map(f=>(<div key={f.k} style={{marginBottom:10}}><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>{f.l}</p><input value={settings[f.k]||""} onChange={e=>setSettings(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} type={f.secret?"password":"text"} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>))}
          <div style={{background:`${C.teal}15`,borderRadius:10,padding:10}}><p style={{color:C.teal,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:0}}>📧 Configure SMTP to enable invoice emails and payment confirmations. Works with Gmail, SendGrid, Mailgun, etc.</p></div>
        </>)}

        </div>
        </div>
        <button onClick={saveSettings} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:14,fontFamily:"'Nunito',sans-serif",fontWeight:800,marginTop:14}}>💾 Save Settings</button>
        {settingsSaved&&<p style={{color:C.green,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:700,textAlign:"center",margin:"10px 0"}}>✅ Settings saved successfully!</p>}
      </>)}
    </>)}
    {tab==="Users"&&(<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {["","student","teacher","parent","admin","super_admin"].map(f=>(<button key={f||"all"} onClick={()=>{setUsersRoleFilter(f);setUsersPage(1);}} style={{padding:"4px 12px",borderRadius:20,border:"none",cursor:"pointer",background:usersRoleFilter===f?C.gold:C.card,color:usersRoleFilter===f?C.bg:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{f||"All"}</button>))}
        </div>
        <button onClick={()=>{setCreateUserMsg("");setShowCreateUser(true);}} style={{padding:"6px 12px",borderRadius:10,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,flexShrink:0}}>+ Create User</button>
      </div>
      <p style={{color:C.muted,fontSize:10,margin:"0 0 8px",fontFamily:"'Nunito',sans-serif"}}>{usersTotal} users</p>
      {resetMsg&&<p style={{color:C.green,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 8px",padding:"6px 10px",background:`${C.green}11`,borderRadius:8}}>{resetMsg}</p>}
      {usersLoading&&[0,1,2,3,4].map(i=>(<SkeletonCard key={i} lines={2} avatar/>))}
      {!usersLoading&&adminUsers.length===0&&<p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",textAlign:"center",padding:20}}>No users found</p>}
      {!usersLoading&&adminUsers.map(u=>(<Card key={u.id} style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.green},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{(u.name||"?")[0]}</div>
            <div>
              <p style={{color:C.text,fontSize:13,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{u.name}</p>
              <p style={{color:C.muted,fontSize:10,margin:0,fontFamily:"'Nunito',sans-serif"}}>{u.email||u.phone||"—"}</p>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <Badge color={u.is_active?C.green:C.red}>{u.is_active?"Active":"Inactive"}</Badge>
            <p style={{color:C.muted,fontSize:9,margin:"4px 0 0",fontFamily:"'Nunito',sans-serif"}}>{u.plan} plan · {u.total_xp||0} XP</p>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <select value={u.role} onChange={e=>changeRole(u.id,e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 8px",color:C.text,fontSize:10,fontFamily:"'Nunito',sans-serif",outline:"none"}}>
            {["student","teacher","parent","admin","super_admin"].map(r=>(<option key={r} value={r}>{r}</option>))}
          </select>
          <button onClick={()=>toggleActive(u.id)} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${u.is_active?C.red:C.green}44`,background:`${u.is_active?C.red:C.green}11`,color:u.is_active?C.red:C.green,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>{u.is_active?"Deactivate":"Activate"}</button>
          <button onClick={()=>{setShowResetPw(u);setResetPwInput("");setResetMsg("");}} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${C.amber}44`,background:`${C.amber}11`,color:C.amber,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>🔑 Change Password</button>
        </div>
      </Card>))}
      {!usersLoading&&usersTotal>20&&(<div style={{display:"flex",justifyContent:"center",gap:10,marginTop:10}}>
        <button disabled={usersPage<=1} onClick={()=>setUsersPage(p=>p-1)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:11,cursor:"pointer",opacity:usersPage<=1?0.4:1}}>← Prev</button>
        <span style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",alignSelf:"center"}}>Page {usersPage}</span>
        <button disabled={usersPage*20>=usersTotal} onClick={()=>setUsersPage(p=>p+1)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:11,cursor:"pointer",opacity:usersPage*20>=usersTotal?0.4:1}}>Next →</button>
      </div>)}
      {/* Change Password Modal */}
      {showResetPw&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:22,width:"100%",maxWidth:380}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h3 style={{color:C.text,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:0}}>Change Password</h3><button onClick={()=>setShowResetPw(null)} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>×</button></div>
          <p style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:"0 0 12px"}}>User: <strong style={{color:C.text}}>{showResetPw.name}</strong> ({showResetPw.email})</p>
          <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>New Password *</p>
          <input type="password" value={resetPwInput} onChange={e=>setResetPwInput(e.target.value)} placeholder="Min 8 characters" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
          <button onClick={()=>{if(resetPwInput.length<8){setResetMsg("Password must be at least 8 characters");return;}resetPassword(showResetPw.id,resetPwInput);}} disabled={resetPwSaving} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:14,fontFamily:"'Nunito',sans-serif",fontWeight:800,opacity:resetPwSaving?0.6:1}}>{resetPwSaving?"Saving...":"Set New Password"}</button>
        </div>
      </div>)}
      {/* Create User Modal */}
      {showCreateUser&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:22,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h3 style={{color:C.text,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:0}}>Create User</h3><button onClick={()=>setShowCreateUser(false)} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>×</button></div>
          {createUserMsg&&<p style={{color:C.red,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 8px",padding:"6px 10px",background:`${C.red}11`,borderRadius:8}}>{createUserMsg}</p>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{gridColumn:"1/-1"}}><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Full Name *</p><input value={createUserForm.name} onChange={e=>setCreateUserForm(p=>({...p,name:e.target.value}))} placeholder="John Doe" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Email *</p><input type="email" value={createUserForm.email} onChange={e=>setCreateUserForm(p=>({...p,email:e.target.value}))} placeholder="user@example.com" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Phone</p><input value={createUserForm.phone} onChange={e=>setCreateUserForm(p=>({...p,phone:e.target.value}))} placeholder="+254..." style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Password *</p><input type="password" value={createUserForm.password} onChange={e=>setCreateUserForm(p=>({...p,password:e.target.value}))} placeholder="Min 8 chars" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Role *</p><select value={createUserForm.role} onChange={e=>setCreateUserForm(p=>({...p,role:e.target.value}))} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}>{["student","teacher","parent","admin","super_admin"].map(r=>(<option key={r} value={r}>{r}</option>))}</select></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Country</p><input value={createUserForm.country} onChange={e=>setCreateUserForm(p=>({...p,country:e.target.value}))} placeholder="KE" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Grade Level</p><input value={createUserForm.grade_level} onChange={e=>setCreateUserForm(p=>({...p,grade_level:e.target.value}))} placeholder="e.g. Grade 5" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
          </div>
          <button onClick={createUser} disabled={createUserSaving} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:14,fontFamily:"'Nunito',sans-serif",fontWeight:800,marginTop:14,opacity:createUserSaving?0.6:1}}>{createUserSaving?"Creating...":"Create User"}</button>
        </div>
      </div>)}
    </>)}
    {tab==="Coupons"&&(<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <p style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:0}}>{couponsTotal} coupons</p>
        <button onClick={()=>{setEditCoupon(null);setCouponForm({code:"",description:"",type:"percentage",value:"",min_amount:"",max_discount:"",applicable_plans:[],applicable_cycles:[],max_uses:"",max_uses_per_user:"1",starts_at:"",expires_at:""});setShowCouponForm(true);}} style={{padding:"6px 12px",borderRadius:10,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>+ New Coupon</button>
      </div>
      {couponMsg&&<p style={{color:C.green,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 8px",padding:"6px 10px",background:`${C.green}11`,borderRadius:8}}>{couponMsg}</p>}
      {/* Coupon Form Modal */}
      {showCouponForm&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:22,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h3 style={{color:C.text,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:0}}>{editCoupon?"Edit Coupon":"Create Coupon"}</h3><button onClick={()=>setShowCouponForm(false)} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>×</button></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Code *</p><input value={couponForm.code} onChange={e=>setCouponForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="e.g. SAVE20" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Type</p><select value={couponForm.type} onChange={e=>setCouponForm(p=>({...p,type:e.target.value}))} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount (KES)</option></select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Value * {couponForm.type==="percentage"?"(%)":"(KES)"}</p><input value={couponForm.value} onChange={e=>setCouponForm(p=>({...p,value:e.target.value}))} type="number" placeholder={couponForm.type==="percentage"?"e.g. 20":"e.g. 500"} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Max Discount (KES)</p><input value={couponForm.max_discount} onChange={e=>setCouponForm(p=>({...p,max_discount:e.target.value}))} type="number" placeholder="Optional cap" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
          </div>
          <div style={{marginTop:8}}><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Description</p><input value={couponForm.description} onChange={e=>setCouponForm(p=>({...p,description:e.target.value}))} placeholder="e.g. Back to school promo" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Min Amount (KES)</p><input value={couponForm.min_amount} onChange={e=>setCouponForm(p=>({...p,min_amount:e.target.value}))} type="number" placeholder="0" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Max Uses (total)</p><input value={couponForm.max_uses} onChange={e=>setCouponForm(p=>({...p,max_uses:e.target.value}))} type="number" placeholder="Unlimited" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Max Per User</p><input value={couponForm.max_uses_per_user} onChange={e=>setCouponForm(p=>({...p,max_uses_per_user:e.target.value}))} type="number" placeholder="1" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Applicable Plans</p><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{["student","teacher","parent","school"].map(p=>(<button key={p} onClick={()=>setCouponForm(f=>({...f,applicable_plans:f.applicable_plans.includes(p)?f.applicable_plans.filter(x=>x!==p):[...f.applicable_plans,p]}))} style={{padding:"4px 8px",borderRadius:8,border:`1px solid ${couponForm.applicable_plans.includes(p)?C.gold:C.border}`,background:couponForm.applicable_plans.includes(p)?`${C.gold}22`:"transparent",color:couponForm.applicable_plans.includes(p)?C.gold:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>{p}</button>))}</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Start Date</p><input value={couponForm.starts_at} onChange={e=>setCouponForm(p=>({...p,starts_at:e.target.value}))} type="datetime-local" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
            <div><p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>Expiry Date</p><input value={couponForm.expires_at} onChange={e=>setCouponForm(p=>({...p,expires_at:e.target.value}))} type="datetime-local" style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/></div>
          </div>
          <button onClick={saveCoupon} disabled={couponSaving} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800,marginTop:14,opacity:couponSaving?0.6:1}}>{couponSaving?"Saving...":(editCoupon?"Update Coupon":"Create Coupon")} ✓</button>
        </div>
      </div>)}
      {couponsLoading&&[0,1,2,3].map(i=>(<SkeletonCard key={i} lines={2}/>))}
      {!couponsLoading&&coupons.length===0&&<p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",textAlign:"center",padding:20}}>No coupons yet. Create your first promo code!</p>}
      {!couponsLoading&&coupons.map(c=>(<Card key={c.id} style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><p style={{color:C.gold,fontSize:16,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:900,letterSpacing:1}}>{c.code}</p><Badge color={c.is_active?C.green:C.red}>{c.is_active?"Active":"Inactive"}</Badge></div>
            {c.description&&<p style={{color:C.muted,fontSize:10,margin:"2px 0 0",fontFamily:"'Nunito',sans-serif"}}>{c.description}</p>}
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{color:C.text,fontSize:16,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{c.type==="percentage"?`${Number(c.value)}%`:`KES ${Number(c.value).toLocaleString()}`}</p>
            <p style={{color:C.muted,fontSize:9,margin:0,fontFamily:"'Nunito',sans-serif"}}>{c.type==="percentage"?"off":"discount"}{c.max_discount?` (max KES ${Number(c.max_discount).toLocaleString()})`:""}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
          <span style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif"}}>Used: {c.times_used||0}{c.max_uses?`/${c.max_uses}`:""}</span>
          {c.applicable_plans&&c.applicable_plans.length>0&&<span style={{color:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif"}}>Plans: {c.applicable_plans.join(", ")}</span>}
          {c.expires_at&&<span style={{color:new Date(c.expires_at)<new Date()?C.red:C.muted,fontSize:9,fontFamily:"'Nunito',sans-serif"}}>Expires: {new Date(c.expires_at).toLocaleDateString()}</span>}
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>toggleCouponActive(c)} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${c.is_active?C.red:C.green}44`,background:`${c.is_active?C.red:C.green}11`,color:c.is_active?C.red:C.green,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>{c.is_active?"Deactivate":"Activate"}</button>
          <button onClick={()=>{setEditCoupon(c);setCouponForm({code:c.code,description:c.description||"",type:c.type,value:String(Number(c.value)),min_amount:c.min_amount?String(Number(c.min_amount)):"",max_discount:c.max_discount?String(Number(c.max_discount)):"",applicable_plans:c.applicable_plans||[],applicable_cycles:c.applicable_cycles||[],max_uses:c.max_uses?String(c.max_uses):"",max_uses_per_user:c.max_uses_per_user?String(c.max_uses_per_user):"1",starts_at:c.starts_at?new Date(c.starts_at).toISOString().slice(0,16):"",expires_at:c.expires_at?new Date(c.expires_at).toISOString().slice(0,16):""});setShowCouponForm(true);}} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${C.gold}44`,background:`${C.gold}11`,color:C.gold,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>✏️ Edit</button>
          <button onClick={()=>deleteCoupon(c.id)} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${C.red}44`,background:`${C.red}11`,color:C.red,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>🗑️ Delete</button>
        </div>
      </Card>))}
      {!couponsLoading&&couponsTotal>20&&(<div style={{display:"flex",justifyContent:"center",gap:10,marginTop:10}}>
        <button disabled={couponsPage<=1} onClick={()=>setCouponsPage(p=>p-1)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:11,cursor:"pointer",opacity:couponsPage<=1?0.4:1}}>← Prev</button>
        <span style={{color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",alignSelf:"center"}}>Page {couponsPage}</span>
        <button disabled={couponsPage*20>=couponsTotal} onClick={()=>setCouponsPage(p=>p+1)} style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:11,cursor:"pointer",opacity:couponsPage*20>=couponsTotal?0.4:1}}>Next →</button>
      </div>)}
    </>)}
  </div></div>);
}

// ─── TEACHER ─────────────────────────────────────────────────────────────────
function TeacherDash({country,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const [insight,setInsight]=useState("");const [loading,setLoading]=useState(false);
  const classes=[{name:"Form 3A",students:32,avg:74,top:"English",weak:"Mathematics"},{name:"Form 3B",students:28,avg:68,top:"History",weak:"Physics"},{name:"Form 2A",students:35,avg:81,top:"Science",weak:"Kiswahili"}];
  const getInsight=async()=>{
    setLoading(true);
    try{
      const data=await apiPost("/api/ai/school-insights",{classData:{classes}});
      setInsight(data?.insights||"");
    }catch(err){
      const msg=err?.status===401
        ?(lang==="sw"?"Tafadhali ingia ili kutumia AI.":"Please sign in to use AI.")
        :(err?.message||"Error");
      setInsight(msg);
    }finally{
      setLoading(false);
    }
  };
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
  const [children,setChildren]=useState([
    {name:"Amina",grade:"Form 3",streak:7,avg:78,active:true},
    {name:"Brian",grade:"Grade 5",streak:2,avg:65,active:false}
  ]);
  useEffect(()=>{
    let alive=true;
    if(!hasAuthToken()) return;
    apiGet("/api/users/children").then(d=>{
      if(!alive) return;
      if(Array.isArray(d?.children)&&d.children.length){
        const mapped=d.children.map(c=>({
          name:c.name,
          grade:c.grade_level||"",
          streak:c.streak_days||0,
          avg:Math.round(c.total_xp?Math.min(100,c.total_xp/10):0),
          active:(c.today_sessions||0)>0,
        }));
        setChildren(mapped);
      }
    }).catch(()=>{});
    return()=>{alive=false;};
  },[user?.id]);
  return(<div style={{padding:"22px 18px 100px"}}>
    <h2 style={{color:C.text,fontSize:20,margin:"0 0 4px",fontFamily:"'Playfair Display',serif",fontWeight:900}}>👨‍👩‍👧 {lang==="sw"?"Dashibodi ya Mzazi":"Parent Dashboard"}</h2>
    <p style={{color:C.muted,fontSize:11,margin:"0 0 14px",fontFamily:"'Nunito',sans-serif"}}>{CURRICULA[country].flag} {lang==="sw"?"Fuatilia watoto wako":"Monitor your children's learning"}</p>
    {children.map(child=>(<Card key={child.name} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.terracotta})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{child.name[0]}</div><div><p style={{color:C.text,fontSize:13,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{child.name}</p><p style={{color:C.muted,fontSize:10,margin:0,fontFamily:"'Nunito',sans-serif"}}>{child.grade}</p></div></div><p style={{color:C.gold,fontSize:20,margin:0,fontFamily:"'Nunito',sans-serif",fontWeight:900}}>{child.avg}%</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Badge color={C.gold}>🔥 {child.streak} {t("days")}</Badge><Badge color={child.active?C.green:C.terracotta}>{child.active?(lang==="sw"?"Amefanya leo ✓":"Active today ✓"):(lang==="sw"?"Karibu siku 2":"Inactive 2 days")}</Badge></div></Card>))}
    <div style={{background:`${C.gold}20`,border:`1px solid ${C.gold}44`,borderRadius:14,padding:14,marginBottom:12}}><p style={{color:C.gold,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:800,letterSpacing:1,marginBottom:6}}>{t("weekly_report")}</p><p style={{color:C.text,fontSize:12,fontFamily:"'Nunito',sans-serif",lineHeight:1.5,margin:"0 0 8px"}}>{t("report_desc")}</p><Badge color={C.green}>{t("notifications_on")}</Badge></div>
    <button onClick={()=>setActive("Plans")} style={{width:"100%",padding:"11px",borderRadius:14,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.green},#2A8A50)`,color:"#fff",fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{t("upgrade_mpesa")}</button>
  </div>);
}

// ─── ROLE SELECTOR ────────────────────────────────────────────────────────────
function RoleSelector({onSelect,lang,setLang,onAuthOpen}){
  const t=k=>T[lang]?.[k]||T.en[k];
  return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,backgroundImage:`radial-gradient(ellipse at 15% 20%, ${C.green}18 0%, transparent 45%), radial-gradient(ellipse at 85% 80%, ${C.gold}12 0%, transparent 45%)`}}>
    <button onClick={()=>setLang(l=>l==="en"?"sw":"en")} style={{position:"absolute",top:20,right:20,background:`${C.teal}22`,border:`1px solid ${C.teal}44`,borderRadius:10,padding:"6px 14px",cursor:"pointer",color:C.teal,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{lang==="en"?"🇰🇪 Kiswahili":"🇬🇧 English"}</button>
    {!hasAuthToken()&&<button onClick={onAuthOpen} style={{position:"absolute",top:20,left:20,background:`${C.gold}22`,border:`1px solid ${C.gold}44`,borderRadius:10,padding:"6px 14px",cursor:"pointer",color:C.gold,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{t("sign_in")}</button>}
    <div style={{fontSize:60,marginBottom:12,filter:`drop-shadow(0 0 24px ${C.gold}44)`}}>🎓</div>
    <h1 style={{color:C.text,fontSize:36,fontFamily:"'Playfair Display',serif",fontWeight:900,textAlign:"center",margin:"0 0 4px",textShadow:`0 0 40px ${C.gold}30`}}>ElimuAI</h1>
    <p style={{color:C.gold,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:800,letterSpacing:3,textAlign:"center",marginBottom:4}}>{t("motto")}</p>
    <div style={{display:"flex",gap:8,marginBottom:6}}>{"🇰🇪🇹🇿🇺🇬".match(/\p{Emoji_Presentation}/gu)?.map((f,i)=>(<span key={i} style={{fontSize:20}}>{f}</span>))}</div>
    <p style={{color:C.muted,fontSize:12,fontFamily:"'Nunito',sans-serif",textAlign:"center",marginBottom:28}}>{t("tagline")}</p>
    <p style={{color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:700,marginBottom:12}}>{t("who_are_you")}</p>
    {[{role:"student",icon:"🎒",l:t("student"),d:t("student_desc")},{role:"teacher",icon:"👨‍🏫",l:t("teacher"),d:t("teacher_desc")},{role:"parent",icon:"👨‍👩‍👧",l:t("parent"),d:t("parent_desc")},{role:"admin",icon:"🏫",l:t("school_admin"),d:t("admin_desc")}].map(r=>(<button key={r.role} onClick={()=>onSelect(r.role)} style={{width:"100%",maxWidth:360,padding:"13px 16px",borderRadius:14,border:`1px solid ${C.border}`,background:C.card,cursor:"pointer",display:"flex",alignItems:"center",gap:12,marginBottom:10}}><span style={{fontSize:26}}>{r.icon}</span><div style={{textAlign:"left",flex:1}}><p style={{color:C.text,fontSize:14,margin:"0 0 2px",fontFamily:"'Nunito',sans-serif",fontWeight:800}}>{r.l}</p><p style={{color:C.muted,fontSize:11,margin:0,fontFamily:"'Nunito',sans-serif"}}>{r.d}</p></div><span style={{color:C.gold,fontSize:16}}>→</span></button>))}
  </div>);
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({open,mode,setMode,onClose,onSuccess,country,level,lang}){
  const t=k=>T[lang]?.[k]||T.en[k];
  const [name,setName]=useState("");
  const [identifier,setIdentifier]=useState("");
  const [password,setPassword]=useState("");
  const [role,setRole]=useState("student");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{if(open){setError("");}},[open,mode]);
  if(!open) return null;
  const submit=async()=>{
    if(loading) return;
    const trimmedId=identifier.trim();
    const trimmedName=name.trim();
    const isEmail=trimmedId.includes("@");
    const phoneDigits=trimmedId.replace(/\\D/g,"");
    const invalidEmail=isEmail && !/^\S+@\S+\.\S+$/.test(trimmedId);
    const invalidPhone=!isEmail && (phoneDigits.length<10 || phoneDigits.length>15);
    setLoading(true);setError("");
    try{
      if(mode==="login"){
        if(!trimmedId||!password){
          setError(lang==="sw"?"Tafadhali jaza taarifa zote.":"Please fill in all fields.");
          return;
        }
        const data=await apiPost("/api/auth/login",{identifier:trimmedId,password});
        onSuccess(data?.user,data);
      }else{
        if(!trimmedName||!trimmedId||!password){
          setError(lang==="sw"?"Tafadhali jaza taarifa zote.":"Please fill in all fields.");
          return;
        }
        if(invalidEmail){
          setError(lang==="sw"?"Barua pepe si sahihi.":"Please enter a valid email address.");
          return;
        }
        if(!isEmail&&invalidPhone){
          setError(lang==="sw"?"Namba ya simu si sahihi.":"Please enter a valid phone number.");
          return;
        }
        const payload={
          name:trimmedName,
          password,
          role,
          country:COUNTRY_CODE[country]||"KE",
          language:lang,
          grade_level:level,
          curriculum:CURRICULA[country]?.curriculum||"CBC"
        };
        if(isEmail) payload.email=trimmedId;
        else payload.phone=phoneDigits;
        const data=await apiPost("/api/auth/register",payload);
        onSuccess(data?.user,data);
      }
      onClose();
    }catch(err){
      setError(err?.message||"Error");
    }finally{
      setLoading(false);
    }
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:22,width:"100%",maxWidth:360}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{color:C.text,fontFamily:"'Playfair Display',serif",fontWeight:900,margin:0,fontSize:18}}>{mode==="login"?t("auth_login"):t("auth_register")}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>×</button>
        </div>
        {mode==="register"&&(
          <div style={{marginBottom:10}}>
            <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>{t("full_name")}</p>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder={t("full_name")} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/>
          </div>
        )}
        <div style={{marginBottom:10}}>
          <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>{t("email_or_phone")}</p>
          <input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={t("email_or_phone")} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:10}}>
          <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>{t("password")}</p>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={t("password")} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}/>
        </div>
        {mode==="register"&&(
          <div style={{marginBottom:10}}>
            <p style={{color:C.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,margin:"0 0 4px"}}>{t("role_label")}</p>
            <select value={role} onChange={e=>setRole(e.target.value)} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,fontFamily:"'Nunito',sans-serif",outline:"none",boxSizing:"border-box"}}>
              <option value="student">{t("student")}</option>
              <option value="teacher">{t("teacher")}</option>
              <option value="parent">{t("parent")}</option>
            </select>
          </div>
        )}
        {error&&<p style={{color:C.terracotta,fontSize:11,fontFamily:"'Nunito',sans-serif",margin:"6px 0"}}>{error}</p>}
        <button onClick={submit} disabled={loading} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${C.gold},${C.amber})`,color:C.bg,fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:800,opacity:loading?0.7:1}}>{mode==="login"?t("sign_in"):t("sign_up")}</button>
        <div style={{marginTop:10,textAlign:"center"}}>
          {mode==="login"
            ?(<button onClick={()=>setMode("register")} style={{background:"none",border:"none",color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",cursor:"pointer"}}>{t("no_account")} {t("sign_up")}</button>)
            :(<button onClick={()=>setMode("login")} style={{background:"none",border:"none",color:C.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",cursor:"pointer"}}>{t("have_account")} {t("sign_in")}</button>)
          }
        </div>
      </div>
    </div>
  );
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
  const [user,setUser]=useState(null);
  const [authOpen,setAuthOpen]=useState(false);
  const [authMode,setAuthMode]=useState("login");

  useEffect(()=>{
    let alive=true;
    if(!hasAuthToken()) return;
    apiGet("/api/users/profile").then(d=>{if(alive)setUser(d?.user||null);}).catch(()=>{});
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    if(user?.plan) setPlan(user.plan);
    if(user?.language) setLang(user.language);
    if(user?.country && COUNTRY_NAME[user.country]) setCountry(COUNTRY_NAME[user.country]);
    if(user?.grade_level) setLevel(user.grade_level);
    if(user?.role && !role){
      const r=user.role;
      setRole(r==='super_admin'?'admin':r);
      if(r==='admin'||r==='super_admin') setActive('Overview');
      else if(r==='teacher'||r==='parent') setActive('Dashboard');
      else setActive('Home');
    }
  },[user?.plan,user?.language,user?.country,user?.grade_level,user?.role]);

  const handleAuthSuccess=(u,data)=>{
    if(data?.accessToken) localStorage.setItem("accessToken",data.accessToken);
    if(data?.refreshToken) localStorage.setItem("refreshToken",data.refreshToken);
    if(u) setUser(u);
    if(u?.role){
      const r=u.role;
      setRole(r==='super_admin'?'admin':r);
      if(r==='admin'||r==='super_admin') setActive('Overview');
      else if(r==='teacher'||r==='parent') setActive('Dashboard');
      else setActive('Home');
    }
  };
  const handleLogout=()=>{
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setRole(null);
  };

  const handleRole=r=>{setRole(r);setActive(r==="admin"||r==="super_admin"?"Overview":r==="teacher"?"Dashboard":r==="parent"?"Dashboard":"Home");};

  if(!role)return (<>
    <RoleSelector onSelect={handleRole} lang={lang} setLang={setLang} onAuthOpen={()=>{setAuthMode("login");setAuthOpen(true);}}/>
    <AuthModal open={authOpen} mode={authMode} setMode={setAuthMode} onClose={()=>setAuthOpen(false)} onSuccess={handleAuthSuccess} country={country} level={level} lang={lang}/>
  </>);

  const renderScreen=()=>{
    if(role==="admin")return<SchoolAdmin lang={lang} user={user} onLogout={handleLogout}/>;
    if(role==="teacher"){
      if(active==="Admin")return<SchoolAdmin lang={lang} user={user}/>;
      if(active==="Rankings")return<LeaderboardScreen lang={lang} user={user}/>;
      return<TeacherDash country={country} lang={lang}/>;
    }
    if(role==="parent"){
      if(active==="Plans")return<PlansScreen plan={plan} setPlan={setPlan} lang={lang} user={user}/>;
      if(active==="Rankings")return<LeaderboardScreen lang={lang} user={user}/>;
      return<ParentDash country={country} setActive={setActive} setPlan={setPlan} lang={lang}/>;
    }
    switch(active){
      case"Home":    return<HomeScreen setActive={setActive} country={country} setCountry={setCountry} level={level} setLevel={setLevel} isOffline={isOffline} plan={plan} lang={lang} user={user}/>;
      case"Tutor":   return<TutorScreen country={country} level={level} isOffline={isOffline} lang={lang} user={user}/>;
      case"Exams":   return<ExamScreen country={country} level={level} lang={lang} user={user}/>;
      case"Homework":return<HomeworkScreen country={country} level={level} isOffline={isOffline} lang={lang} user={user}/>;
      case"Rankings":return<LeaderboardScreen lang={lang} user={user}/>;
      case"Progress":return<ProgressScreen country={country} level={level} lang={lang} user={user}/>;
      default:       return<HomeScreen setActive={setActive} country={country} setCountry={setCountry} level={level} setLevel={setLevel} isOffline={isOffline} plan={plan} lang={lang} user={user}/>;
    }
  };

  // Trial/subscription gate: check if user must pay
  const isTrialExpired=user&&user.trial_expires&&new Date(user.trial_expires)<new Date();
  const hasPaidPlan=user&&user.plan&&user.plan!=="free"&&user.plan_expires&&new Date(user.plan_expires)>new Date();
  const isExempt=role==="admin"||role==="teacher";
  const [billingEnabled,setBillingEnabled]=useState(true);
  useEffect(()=>{apiGet("/api/payments/subscription-info").then(d=>{if(d&&typeof d.billingEnabled!=="undefined")setBillingEnabled(d.billingEnabled);}).catch(()=>{});},[user]);
  const mustPay=billingEnabled&&user&&isTrialExpired&&!hasPaidPlan&&!isExempt;

  const handlePaymentDone=()=>{
    // Refresh user profile to get updated plan
    apiGet("/api/users/profile").then(d=>{if(d?.user)setUser(d.user);}).catch(()=>{});
  };

  if(mustPay)return<BillingScreen user={user} lang={lang} onPaid={handlePaymentDone}/>;

  const isAdmin=role==="admin";

  return(<div style={{background:C.bg,minHeight:"100vh",...(isAdmin?{}:{maxWidth:480,margin:"0 auto"}),position:"relative",backgroundImage:`radial-gradient(ellipse at top, ${C.green}08 0%, transparent 40%)`}}>
    {!isAdmin&&<TopBar lang={lang} setLang={setLang} isOffline={isOffline} setIsOffline={setIsOffline} user={user} onAuthOpen={()=>{setAuthMode("login");setAuthOpen(true);}} onLogout={handleLogout}/>}
    <div style={isAdmin?{}:{paddingTop:46,paddingBottom:72}}>{renderScreen()}</div>
    {!isAdmin&&<NavBar active={active} setActive={setActive} role={role} lang={lang}/>}
    <AuthModal open={authOpen} mode={authMode} setMode={setAuthMode} onClose={()=>setAuthOpen(false)} onSuccess={handleAuthSuccess} country={country} level={level} lang={lang}/>
  </div>);
}
