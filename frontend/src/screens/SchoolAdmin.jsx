"use client";
import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { C } from "@/theme";
import { translations } from "@/i18n/translations";
import { apiPost, apiGet, apiDelete } from "@/utils/api";
import { hasAuthToken, getAuthHeader, getAuthToken } from "@/utils/auth";
import { CURRICULA } from "@/data/constants";
import { Spinner, Card, Badge, SecTitle } from "@/components/ui";
import { inputCls, btnPrimary, btnAccent } from "@/shared/constants";
import { SkeletonLine, SkeletonCard } from "@/shared/helpers";
import HomeScreen from "@/screens/HomeScreen";
import TutorScreen from "@/screens/TutorScreen";
import ExamScreen from "@/screens/ExamScreen";
import LeaderboardScreen from "@/screens/LeaderboardScreen";
import ProgressScreen from "@/screens/ProgressScreen";
import PlansScreen from "@/screens/PlansScreen";
import {
  Home, Bot, FileText, BookOpen, BarChart3, Trophy, CreditCard,
  GraduationCap, Users, User, Heart, Settings, MessageSquare,
  LogOut, Menu, X, Send, Clock, CheckCircle, Flame, Star, Target,
  ArrowLeft, Smartphone, Receipt, Tag, UserPlus,
  Shield, Key, Mail, Download, TrendingUp, Award,
  Zap, Plus, Edit3, Trash2,
  ChevronRight, AlertTriangle,
  Search, Rocket,
} from "lucide-react";
const SettingsIcon = Settings;

const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_BASE_URL || "") : "";

function SchoolAdmin({ lang, user, onLogout, country, setCountry, level, setLevel, isOffline, plan, setPlan }) {
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;
  const isSuperAdmin = user?.role === "super_admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isParent = user?.role === "parent";
  const isStudentRole = isStudent;
  const [tab, setTab] = useState(isStudentRole ? "Home" : "Overview");
  const [aiReport, setAiReport] = useState("");
  const [loadingRep, setLoadingRep] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newSt, setNewSt] = useState({ name: "", grade: "", phone: "" });
  const [students, setStudents] = useState([
    { id: 1, name: "Amina Hassan", grade: "Form 3", subject: "Mathematics", score: 82, status: "Active" },
    { id: 2, name: "Brian Otieno", grade: "Grade 8", subject: "Science", score: 71, status: "Active" },
    { id: 3, name: "Zawadi Kimani", grade: "Grade 9", subject: "English", score: 90, status: "Active" },
    { id: 4, name: "David Mwangi", grade: "Form 2", subject: "History", score: 65, status: "Inactive" },
    { id: 5, name: "Fatuma Ali", grade: "Form 3", subject: "Physics", score: 58, status: "Active" },
    { id: 6, name: "Grace Nekesa", grade: "Grade 7", subject: "Mathematics", score: 88, status: "Active" },
  ]);
  const [schoolStats, setSchoolStats] = useState(null);
  const [studentsPage, setStudentsPage] = useState(1);
  const teachers = [
    { name: "Mr. Kamau", subject: "Mathematics", classes: 3, students: 95 },
    { name: "Ms. Wanjiku", subject: "English", classes: 2, students: 62 },
    { name: "Mr. Okonkwo", subject: "Science", classes: 4, students: 112 },
  ];
  const stats = {
    total: schoolStats?.student_count ?? students.length,
    active: students.filter((s) => s.status === "Active").length,
    avg: Math.round(schoolStats?.avg_score ?? students.reduce((a, s) => a + s.score, 0) / Math.max(1, students.length)),
    teachers: schoolStats?.teacher_count ?? teachers.length,
  };
  useEffect(() => {
    let alive = true;
    if (!hasAuthToken() || !user?.school_id) return;
    apiGet(`/api/schools/${user.school_id}/stats`).then((d) => { if (alive) setSchoolStats(d?.school || null); }).catch(() => {});
    apiGet(`/api/schools/${user.school_id}/students`).then((d) => {
      if (!alive) return;
      if (Array.isArray(d?.students) && d.students.length) {
        const mapped = d.students.map((s) => ({ id: s.id, name: s.name, grade: s.grade_level, subject: s.subject || "", score: Math.round(s.avg_score || 0), status: s.last_login ? (Date.now() - new Date(s.last_login).getTime() < 30 * 24 * 60 * 60 * 1000 ? "Active" : "Inactive") : "Inactive" }));
        setStudents(mapped);
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [user?.school_id]);
  const generateReport = async () => {
    setLoadingRep(true);
    try {
      const payload = isTeacher
        ? { classData: { students: realStudents.length ? realStudents : students, role: "teacher", teacher: user?.name } }
        : { classData: { stats, students, teachers } };
      const data = await apiPost("/api/ai/school-insights", payload); setAiReport(data?.insights || "");
    }
    catch (err) { setAiReport(err?.status === 401 ? (lang === "sw" ? "Tafadhali ingia." : "Please sign in.") : (err?.message || "Error")); }
    finally { setLoadingRep(false); }
  };
  const addStudent = () => { if (!newSt.name) return; setStudents((p) => [...p, { id: Date.now(), ...newSt, score: 0, status: "Active" }]); setNewSt({ name: "", grade: "", phone: "" }); setShowAdd(false); };

  const [transactions, setTransactions] = useState([]); const [txTotal, setTxTotal] = useState(0); const [txPage, setTxPage] = useState(1); const [txFilter, setTxFilter] = useState(""); const [txLoading, setTxLoading] = useState(false); const [txSearch, setTxSearch] = useState("");
  const [smsLogs, setSmsLogs] = useState([]); const [smsTotal, setSmsTotal] = useState(0); const [smsPage, setSmsPage] = useState(1); const [smsFilter, setSmsFilter] = useState(""); const [smsLoading, setSmsLoading] = useState(false); const [smsSearch, setSmsSearch] = useState("");
  const [dashStats, setDashStats] = useState(null); const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => { if (!hasAuthToken() || user?.role !== "super_admin") return; setLoadingAdmin(true); apiGet("/api/admin/dashboard").then((d) => setDashStats(d)).catch(() => {}).finally(() => setLoadingAdmin(false)); }, [user?.role]);
  useEffect(() => { if (!hasAuthToken() || tab !== "Transactions") return; setTxLoading(true); const params = { page: txPage, limit: 20 }; if (txFilter) params.status = txFilter; if (txSearch) params.search = txSearch; apiGet("/api/admin/transactions", params).then((d) => { setTransactions(d?.transactions || []); setTxTotal(d?.total || 0); }).catch(() => {}).finally(() => setTxLoading(false)); }, [tab, txPage, txFilter, txSearch]);
  useEffect(() => { if (!hasAuthToken() || tab !== "SMS Logs") return; setSmsLoading(true); const params = { page: smsPage, limit: 20 }; if (smsFilter) params.status = smsFilter; if (smsSearch) params.search = smsSearch; apiGet("/api/admin/sms-logs", params).then((d) => { setSmsLogs(d?.sms_logs || []); setSmsTotal(d?.total || 0); }).catch(() => {}).finally(() => setSmsLoading(false)); }, [tab, smsPage, smsFilter, smsSearch]);

  const [settings, setSettings] = useState({}); const [settingsLoading, setSettingsLoading] = useState(false); const [settingsSaved, setSettingsSaved] = useState(false); const [settingsTab, setSettingsTab] = useState("mpesa");
  const [adminUsers, setAdminUsers] = useState([]); const [usersTotal, setUsersTotal] = useState(0); const [usersPage, setUsersPage] = useState(1); const [usersRoleFilter, setUsersRoleFilter] = useState(""); const [resetMsg, setResetMsg] = useState(""); const [usersLoading, setUsersLoading] = useState(false); const [usersSearch, setUsersSearch] = useState("");
  const [showResetPw, setShowResetPw] = useState(null); const [resetPwInput, setResetPwInput] = useState(""); const [resetPwSaving, setResetPwSaving] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false); const [createUserForm, setCreateUserForm] = useState({ name: "", email: "", phone: "", password: "", role: "student", country: "KE", grade_level: "" }); const [createUserMsg, setCreateUserMsg] = useState(""); const [createUserSaving, setCreateUserSaving] = useState(false);
  const [viewUserLoading, setViewUserLoading] = useState(false); const [viewUserData, setViewUserData] = useState(null); const [userDetailTab, setUserDetailTab] = useState("overview");
  const [adminActionMsg, setAdminActionMsg] = useState(""); const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({ plan: "basic", days: "30" }); const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [credForm, setCredForm] = useState({ email: "", phone: "" }); const [showCredModal, setShowCredModal] = useState(false);
  const adminAction = async (url, method, body, successMsg) => {
    setAdminActionLoading(true); setAdminActionMsg("");
    try {
      const r = await fetch(`${API_BASE}${url}`, { method, headers: { "Content-Type": "application/json", ...getAuthHeader() }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const d = await r.json();
      if (r.ok) { setAdminActionMsg(d.message || successMsg || "Done!"); if (viewUserData?.user) openUserDetail(viewUserData.user.id); }
      else setAdminActionMsg(d.error || "Failed");
    } catch { setAdminActionMsg("Request failed"); } finally { setAdminActionLoading(false); setTimeout(() => setAdminActionMsg(""), 4000); }
  };
  const [coupons, setCoupons] = useState([]); const [couponsTotal, setCouponsTotal] = useState(0); const [couponsPage, setCouponsPage] = useState(1); const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false); const [editCoupon, setEditCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({ code: "", description: "", type: "percentage", value: "", min_amount: "", max_discount: "", applicable_plans: [], applicable_cycles: [], max_uses: "", max_uses_per_user: "1", starts_at: "", expires_at: "" });
  const [couponSaving, setCouponSaving] = useState(false); const [couponMsg, setCouponMsg] = useState("");

  // Teacher onboarding state
  const [showAddTeachers, setShowAddTeachers] = useState(false);
  const [bulkTeachers, setBulkTeachers] = useState([{ name: "", email: "", subject: "" }]);
  const [onboardTeacherResult, setOnboardTeacherResult] = useState(null);
  const [onboardTeacherLoading, setOnboardTeacherLoading] = useState(false);
  const [realTeachers, setRealTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersPage, setTeachersPage] = useState(1);

  // Student onboarding state (teacher flow)
  const [showAddStudentsWizard, setShowAddStudentsWizard] = useState(false);
  const [bulkStudents, setBulkStudents] = useState([{ name: "", email: "" }]);
  const [onboardStudentResult, setOnboardStudentResult] = useState(null);
  const [onboardStudentLoading, setOnboardStudentLoading] = useState(false);
  const [realStudents, setRealStudents] = useState([]);
  const [realStudentsLoading, setRealStudentsLoading] = useState(false);
  const [realStudentsPage, setRealStudentsPage] = useState(1);

  // Class rankings state
  const [rankingsPeriod, setRankingsPeriod] = useState("weekly");
  const [rankings, setRankings] = useState([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [schoolRankings, setSchoolRankings] = useState(null);
  const [schoolRankingsLoading, setSchoolRankingsLoading] = useState(false);
  const [rankingsSubTab, setRankingsSubTab] = useState("students");

  // Parent state
  const [parentChildren, setParentChildren] = useState([]);
  const [parentChildrenLoading, setParentChildrenLoading] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childForm, setChildForm] = useState({ name: "", email: "", gradeLevel: "" });
  const [addChildLoading, setAddChildLoading] = useState(false);
  const [addChildMsg, setAddChildMsg] = useState("");
  const [selectedChild, setSelectedChild] = useState(0);

  // Fetch parent children
  useEffect(() => {
    if (!hasAuthToken() || !isParent) return;
    setParentChildrenLoading(true);
    apiGet("/api/users/children").then((d) => setParentChildren(d?.children || [])).catch(() => {}).finally(() => setParentChildrenLoading(false));
  }, [isParent]);

  const handleAddChild = async () => {
    if (!childForm.name || !childForm.email) { setAddChildMsg("Name and email are required"); return; }
    setAddChildLoading(true); setAddChildMsg("");
    try {
      const d = await apiPost("/api/users/onboard-child", childForm);
      if (d?.child) {
        setChildForm({ name: "", email: "", gradeLevel: "" });
        setShowAddChild(false);
        setAddChildMsg("");
        apiGet("/api/users/children").then((r) => setParentChildren(r?.children || [])).catch(() => {});
      }
    } catch (err) {
      setAddChildMsg(err?.message || "Failed to add child");
    } finally { setAddChildLoading(false); }
  };

  useEffect(() => {
    if (!hasAuthToken() || tab !== "Rankings") return;
    if (isTeacher) {
      setRankingsLoading(true);
      const params = { scope: "school", period: rankingsPeriod, limit: 100 };
      if (user?.school_id) params.scopeId = user.school_id;
      apiGet("/api/leaderboard", params).then((d) => setRankings(d?.leaderboard || [])).catch(() => setRankings([])).finally(() => setRankingsLoading(false));
    } else {
      setSchoolRankingsLoading(true);
      apiGet("/api/leaderboard/school-rankings", { period: rankingsPeriod }).then((d) => setSchoolRankings(d)).catch(() => setSchoolRankings(null)).finally(() => setSchoolRankingsLoading(false));
    }
  }, [tab, rankingsPeriod, user?.school_id]);

  useEffect(() => {
    if (!hasAuthToken() || isParent || isStudent || (tab !== "Teachers" && tab !== "Overview")) return;
    setTeachersLoading(true);
    apiGet("/api/onboarding/teachers").then((d) => setRealTeachers(d?.teachers || [])).catch(() => {}).finally(() => setTeachersLoading(false));
  }, [tab, isParent, isStudent]);

  const handleOnboardTeachers = async () => {
    const valid = bulkTeachers.filter((t) => t.name.trim() && t.email.trim());
    if (!valid.length) return;
    setOnboardTeacherLoading(true);
    setOnboardTeacherResult(null);
    try {
      const data = await apiPost("/api/onboarding/teachers", { teachers: valid });
      setOnboardTeacherResult(data);
      if (data?.created?.length) {
        setBulkTeachers([{ name: "", email: "", subject: "" }]);
        apiGet("/api/onboarding/teachers").then((d) => setRealTeachers(d?.teachers || [])).catch(() => {});
      }
    } catch (err) {
      setOnboardTeacherResult({ message: err?.message || "Failed", created: [], errors: [{ reason: err?.message }] });
    } finally {
      setOnboardTeacherLoading(false);
    }
  };

  // Load students for teacher
  useEffect(() => {
    if (!hasAuthToken() || (tab !== "Students" && tab !== "Overview")) return;
    if (!isTeacher && !isSuperAdmin && user?.role !== "admin") return;
    setRealStudentsLoading(true);
    apiGet("/api/onboarding/students").then((d) => setRealStudents(d?.students || [])).catch(() => {}).finally(() => setRealStudentsLoading(false));
  }, [tab]);

  const handleOnboardStudents = async () => {
    const valid = bulkStudents.filter((s) => s.name.trim() && s.email.trim());
    if (!valid.length) return;
    setOnboardStudentLoading(true);
    setOnboardStudentResult(null);
    try {
      const data = await apiPost("/api/onboarding/students", { students: valid });
      setOnboardStudentResult(data);
      if (data?.created?.length) {
        setBulkStudents([{ name: "", email: "" }]);
        apiGet("/api/onboarding/students").then((d) => setRealStudents(d?.students || [])).catch(() => {});
      }
    } catch (err) {
      setOnboardStudentResult({ message: err?.message || "Failed", created: [], errors: [{ reason: err?.message }] });
    } finally {
      setOnboardStudentLoading(false);
    }
  };

  const loadCoupons = () => { setCouponsLoading(true); apiGet("/api/coupons/admin", { page: couponsPage, limit: 20 }).then((d) => { setCoupons(d?.coupons || []); setCouponsTotal(d?.total || 0); }).catch(() => {}).finally(() => setCouponsLoading(false)); };
  useEffect(() => { if (!hasAuthToken() || tab !== "Coupons") return; loadCoupons(); }, [tab, couponsPage]);
  const saveCoupon = async () => {
    if (!couponForm.code || !couponForm.value) { setCouponMsg("Code and value required"); return; }
    setCouponSaving(true); setCouponMsg("");
    try {
      const payload = { ...couponForm, value: parseFloat(couponForm.value), min_amount: couponForm.min_amount ? parseFloat(couponForm.min_amount) : 0, max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null, max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses) : null, max_uses_per_user: couponForm.max_uses_per_user ? parseInt(couponForm.max_uses_per_user) : 1 };
      if (editCoupon) { await fetch(`${API_BASE}/api/coupons/admin/${editCoupon.id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify(payload) }); }
      else { await apiPost("/api/coupons/admin", payload); }
      setShowCouponForm(false); setEditCoupon(null); setCouponForm({ code: "", description: "", type: "percentage", value: "", min_amount: "", max_discount: "", applicable_plans: [], applicable_cycles: [], max_uses: "", max_uses_per_user: "1", starts_at: "", expires_at: "" });
      loadCoupons(); setCouponMsg(editCoupon ? "Coupon updated!" : "Coupon created!"); setTimeout(() => setCouponMsg(""), 3000);
    } catch (e) { setCouponMsg(e?.message || "Failed"); } finally { setCouponSaving(false); }
  };
  const deleteCoupon = async (id) => { if (!confirm("Delete this coupon?")) return; try { await fetch(`${API_BASE}/api/coupons/admin/${id}`, { method: "DELETE", headers: { ...getAuthHeader() } }); loadCoupons(); } catch {} };
  const toggleCouponActive = async (c) => { try { await fetch(`${API_BASE}/api/coupons/admin/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify({ is_active: !c.is_active }) }); loadCoupons(); } catch {} };

  useEffect(() => { if (!hasAuthToken() || tab !== "Settings") return; setSettingsLoading(true); apiGet("/api/admin/settings").then((d) => setSettings(d?.settings || {})).catch(() => {}).finally(() => setSettingsLoading(false)); }, [tab]);
  useEffect(() => { if (!hasAuthToken() || tab !== "Users") return; setUsersLoading(true); const params = { page: usersPage, limit: 20 }; if (usersRoleFilter) params.role = usersRoleFilter; if (usersSearch) params.search = usersSearch; apiGet("/api/admin/users", params).then((d) => { setAdminUsers(d?.users || []); setUsersTotal(d?.total || 0); }).catch(() => {}).finally(() => setUsersLoading(false)); }, [tab, usersPage, usersRoleFilter, usersSearch]);

  const saveSettings = async () => { setSettingsSaved(false); try { await fetch(`${API_BASE}/api/admin/settings`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify(settings) }); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 3000); } catch {} };
  const resetPassword = async (uid, newPassword) => { setResetMsg(""); setResetPwSaving(true); try { const body = newPassword ? { newPassword } : {}; const d = await apiPost(`/api/admin/users/${uid}/reset-password`, body); setResetMsg(d?.message || (d?.tempPassword ? `Password reset to: ${d.tempPassword}` : "Password changed")); setShowResetPw(null); setResetPwInput(""); } catch (e) { setResetMsg(e?.message || "Failed"); } finally { setResetPwSaving(false); } };
  const toggleActive = async (uid) => { try { const r = await fetch(`${API_BASE}/api/admin/users/${uid}/toggle-active`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeader() } }); const d = await r.json(); if (d?.user) setAdminUsers((p) => p.map((u) => u.id === uid ? { ...u, is_active: d.user.is_active } : u)); } catch {} };
  const changeRole = async (uid, role) => { try { const r = await fetch(`${API_BASE}/api/admin/users/${uid}/role`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify({ role }) }); const d = await r.json(); if (d?.user) setAdminUsers((p) => p.map((u) => u.id === uid ? { ...u, role: d.user.role } : u)); } catch {} };
  const createUser = async () => {
    if (!createUserForm.name || !createUserForm.email || !createUserForm.password) { setCreateUserMsg("Name, email and password required"); return; }
    if (createUserForm.password.length < 8) { setCreateUserMsg("Password must be at least 8 characters"); return; }
    setCreateUserSaving(true); setCreateUserMsg("");
    try {
      const d = await apiPost("/api/admin/users", createUserForm);
      if (d?.user) { setCreateUserMsg(""); setShowCreateUser(false); setCreateUserForm({ name: "", email: "", phone: "", password: "", role: "student", country: "KE", grade_level: "" }); setUsersPage(1); setUsersRoleFilter(""); setUsersLoading(true); apiGet("/api/admin/users", { page: 1, limit: 20 }).then((r) => { setAdminUsers(r?.users || []); setUsersTotal(r?.total || 0); }).catch(() => {}).finally(() => setUsersLoading(false)); }
    } catch (e) { setCreateUserMsg(e?.message || "Failed to create user"); } finally { setCreateUserSaving(false); }
  };

  const openUserDetail = async (uid) => {
    setViewUserLoading(true); setViewUserData(null); setTab("UserDetail"); setUserDetailTab("overview");
    try {
      const d = await apiGet(`/api/admin/users/${uid}`);
      setViewUserData(d);
    } catch { setViewUserData(null); } finally { setViewUserLoading(false); }
  };

  // Profile state
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "", language: "", grade_level: "", curriculum: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  useEffect(() => { if (user) setProfileForm({ name: user.name || "", email: user.email || "", phone: user.phone || "", language: user.language || "", grade_level: user.grade_level || "", curriculum: user.curriculum || "" }); }, [user]);
  const saveProfile = async () => {
    setProfileSaving(true); setProfileMsg("");
    try {
      const d = await fetch(`${API_BASE}/api/users/profile`, { method: "PATCH", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify(profileForm) });
      const r = await d.json();
      if (r?.user) { setProfileMsg("Profile updated!"); setTimeout(() => setProfileMsg(""), 3000); }
      else { setProfileMsg(r?.error || "Failed"); }
    } catch { setProfileMsg("Failed to save"); } finally { setProfileSaving(false); }
  };
  const changeOwnPassword = async () => {
    if (pwForm.newPw.length < 8) { setPwMsg("Password must be at least 8 characters"); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg("Passwords do not match"); return; }
    setPwSaving(true); setPwMsg("");
    try {
      const d = await apiPost("/api/auth/change-password", { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      if (d?.message) { setPwMsg("Password changed!"); setPwForm({ current: "", newPw: "", confirm: "" }); setTimeout(() => setPwMsg(""), 3000); }
      else { setPwMsg(d?.error || "Failed"); }
    } catch (e) { setPwMsg(e?.message || "Failed to change password"); } finally { setPwSaving(false); }
  };

  const sidebarItems = isSuperAdmin
    ? [{ l: "Overview", icon: BarChart3 }, { l: "Transactions", icon: CreditCard }, { l: "SMS Logs", icon: Smartphone },
       { l: "Users", icon: Users }, { l: "Students", icon: GraduationCap }, { l: "Teachers", icon: BookOpen },
       { l: "Coupons", icon: Tag }, { l: "Settings", icon: SettingsIcon }, { l: "Reports", icon: TrendingUp }]
    : isTeacher
    ? [{ l: "Overview", icon: BarChart3 }, { l: "Students", icon: GraduationCap }, { l: "Rankings", icon: Trophy }, { l: "AI Insights", icon: Zap }, { l: "Billing", icon: CreditCard }, { l: "Reports", icon: TrendingUp }]
    : isStudent
    ? [{ l: "Home", icon: Home }, { l: "Tutor", icon: Bot }, { l: "Exams", icon: FileText }, { l: "Rankings", icon: Trophy }, { l: "Progress", icon: BarChart3 }, { l: "Billing", icon: CreditCard }]
    : isParent
    ? [{ l: "Overview", icon: BarChart3 }, { l: "Children", icon: Heart }, { l: "Billing", icon: CreditCard }, { l: "Reports", icon: TrendingUp }]
    : [{ l: "Overview", icon: BarChart3 }, { l: "Teachers", icon: BookOpen }, { l: "Students", icon: GraduationCap }, { l: "Rankings", icon: Trophy }, { l: "Billing", icon: CreditCard }, { l: "Reports", icon: TrendingUp }];
  const [sideOpen, setSideOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => { const h = () => { const m = window.innerWidth < 768; setIsMobile(m); if (!m) setSideOpen(false); }; window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const sideW = 220;

  const filterBtn = (active, label) => `px-3 py-1 rounded-full border-none cursor-pointer text-[10px] font-body font-extrabold ${active ? "bg-purple-600 text-white" : "bg-slate-50 text-slate-400"}`;
  const pagBtn = (disabled) => `px-3.5 py-1.5 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-[11px] cursor-pointer ${disabled ? "opacity-40" : ""}`;

  // Standardized table styles
  const thCls = "text-slate-500 text-[10px] font-body font-bold uppercase tracking-wider px-4 py-3 border-b border-slate-200 text-left whitespace-nowrap";
  const tdCls = "px-4 py-3 text-slate-700 text-[12px] font-body whitespace-nowrap";
  const trCls = "border-b border-slate-50 even:bg-slate-50/50 hover:bg-purple-50/30 transition-colors";
  const tblFilterBtn = (active) => `px-3 py-1.5 rounded-full border-none cursor-pointer text-[11px] font-body font-bold transition-all ${active ? "bg-purple-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`;
  const searchBox = (value, onChange, placeholder) => (
    <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={value} onChange={onChange} placeholder={placeholder || "Search..."} className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-body outline-none w-full max-w-[260px] focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" /></div>
  );
  const tblSkeleton = (cols, rows = 5) => Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="border-b border-slate-50">{Array.from({ length: cols }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded-full animate-pulse" style={{ width: `${50 + ((i + j) % 4) * 12}%` }} /></td>))}</tr>
  ));

  return (
    <div className="flex min-h-screen relative bg-slate-50">
      {isMobile && sideOpen && <div onClick={() => setSideOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]" />}
      {/* Sidebar - Dark modern design */}
      <div className="bg-slate-900 py-5 shrink-0 fixed top-0 bottom-0 z-[100] overflow-y-auto flex flex-col shadow-2xl transition-[left] duration-300 ease-in-out" style={{ width: sideW, left: isMobile && !sideOpen ? -sideW : 0 }}>
        <div className="px-5 pb-5 flex justify-between items-start border-b border-white/10 mb-2">
          <div>
            <h2 className="text-white text-base m-0 mb-1 font-heading font-black flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25"><GraduationCap size={16} color="#fff" /></div> ElimuAI</h2>
            <p className="text-purple-300/60 text-[9px] m-0 font-body tracking-widest uppercase">{isSuperAdmin ? "Admin Portal" : isTeacher ? "Teacher Portal" : isStudent ? "Student Portal" : isParent ? "Parent Portal" : "School Portal"}</p>
          </div>
          {isMobile && <button onClick={() => setSideOpen(false)} className="bg-transparent border-none text-white/50 cursor-pointer p-0 hover:text-white"><X size={20} /></button>}
        </div>
        <div className="px-2 flex-1">
          {sidebarItems.map((s) => { const Icon = s.icon; return (
            <button key={s.l} onClick={() => { setTab(s.l); if (isMobile) setSideOpen(false); }} className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 border-none cursor-pointer text-[13px] font-body text-left rounded-xl mb-0.5 transition-all duration-200 ${tab === s.l ? "bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/25" : "bg-transparent text-slate-400 font-medium hover:bg-white/5 hover:text-white"}`}>
              <Icon size={17} /> {s.l}
            </button>);
          })}
        </div>
        <div className="px-4 pt-4 border-t border-white/10 mt-2">
          {user && <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-black shrink-0 shadow-lg shadow-purple-500/25">{(user.name || user.email || "A")[0].toUpperCase()}</div>
            <div className="min-w-0"><p className="text-white text-xs mb-0 mt-0 font-body font-bold overflow-hidden text-ellipsis whitespace-nowrap">{user.name || "Admin"}</p><p className="text-slate-500 text-[9px] m-0 font-body overflow-hidden text-ellipsis whitespace-nowrap">{user.email || ""}</p></div>
          </div>}
          <button onClick={onLogout} className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl border border-red-500/20 cursor-pointer bg-red-500/10 text-red-400 text-xs font-body font-bold hover:bg-red-500/20 transition-colors"><LogOut size={14} /> Logout</button>
        </div>
      </div>
      {/* Main content */}
      <div className={`flex-1 min-w-0 ${isMobile ? "ml-0 px-4 pt-0 pb-10" : "px-8 pt-0 pb-16"}`} style={{ marginLeft: isMobile ? 0 : sideW }}>
        {/* Top Header Bar */}
        <div className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 -mx-4 px-4 py-3 mb-5 ${!isMobile ? "-mx-8 px-8" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobile && <button onClick={() => setSideOpen(true)} className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"><Menu size={18} /></button>}
              <div>
                <h2 className="text-slate-900 text-lg m-0 font-heading font-black">{tab}</h2>
                {!isMobile && <p className="text-slate-400 text-[11px] m-0 font-body">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>}
              </div>
            </div>
            <div className="relative">
              <button onClick={() => setProfileOpen((p) => !p)} className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 cursor-pointer transition-colors">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">{(user?.name || user?.email || "A")[0].toUpperCase()}</div>
                {!isMobile && <div className="text-left"><p className="text-slate-900 text-[12px] font-body font-bold m-0 leading-tight">{user?.name || "Admin"}</p><p className="text-slate-400 text-[9px] font-body m-0 leading-tight">{user?.role || "admin"}</p></div>}
                <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 ${profileOpen ? "rotate-90" : ""}`} />
              </button>
              {profileOpen && <>
                <div className="fixed inset-0 z-[998]" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 z-[999] overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-slate-900 text-[13px] font-body font-bold m-0">{user?.name || "Admin"}</p>
                    <p className="text-slate-400 text-[11px] font-body m-0">{user?.email || ""}</p>
                  </div>
                  <div className="py-1.5">
                    <button onClick={() => { setProfileOpen(false); setTab("Profile"); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 border-none bg-transparent text-slate-700 text-[12px] font-body cursor-pointer hover:bg-slate-50 transition-colors text-left"><User size={15} className="text-slate-400" /> Profile</button>
                    {isSuperAdmin && <button onClick={() => { setProfileOpen(false); setTab("Settings"); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 border-none bg-transparent text-slate-700 text-[12px] font-body cursor-pointer hover:bg-slate-50 transition-colors text-left"><SettingsIcon size={15} className="text-slate-400" /> Settings</button>}
                    <button onClick={() => { setProfileOpen(false); onLogout(); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 border-none bg-transparent text-red-500 text-[12px] font-body font-bold cursor-pointer hover:bg-red-50 transition-colors text-left"><LogOut size={15} /> Logout</button>
                  </div>
                </div>
              </>}
            </div>
          </div>
        </div>

        {/* Add Student Modal */}
        {showAdd && <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-5">
          <div className="bg-white border border-slate-200 rounded-[20px] p-[22px] w-full max-w-[360px] shadow-xl">
            <div className="flex justify-between mb-3.5"><h3 className="text-slate-900 font-heading font-black m-0">{t("add_student")}</h3><button onClick={() => setShowAdd(false)} className="bg-transparent border-none text-slate-400 cursor-pointer"><X size={20} /></button></div>
            {["name", "grade", "phone"].map((f) => (<div key={f} className="mb-2.5"><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0 capitalize">{f}</p><input value={newSt[f]} onChange={(e) => setNewSt((p) => ({ ...p, [f]: e.target.value }))} placeholder={f === "name" ? "Full name" : f === "grade" ? "e.g. Form 3" : "e.g. 254712..."} className={inputCls} /></div>))}
            <button onClick={addStudent} className={`${btnPrimary}`}><CheckCircle size={16} /> Add</button>
          </div>
        </div>}

        {/* ONBOARDING WIZARD for school admins */}
        {!isSuperAdmin && !isTeacher && !isStudent && !isParent && !realTeachers.length && !teachersLoading && !localStorage.getItem("elimu_onboard_dismissed") && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md text-center">
              <div className="w-20 h-20 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center mx-auto mb-5 shadow-sm"><Rocket size={36} className="text-purple-600" /></div>
              <p className="text-purple-600 text-[11px] font-body font-black uppercase tracking-widest m-0 mb-2">{lang === "sw" ? "Hatua ya 1 kati ya 2" : "Step 1 of 2"}</p>
              <h3 className="text-slate-900 text-2xl font-heading font-black m-0 mb-2">{lang === "sw" ? "Karibu! Tuanze." : "Welcome! Let\u2019s get started."}</h3>
              <p className="text-slate-500 text-[14px] font-body m-0 mb-6 leading-relaxed">{lang === "sw" ? "Ongeza walimu wako ili waanze kutumia ElimuAI na wanafunzi wao." : "Add your teachers so they can start using ElimuAI with their students."}</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => { setTab("Teachers"); setShowAddTeachers(true); }} className="py-3 px-6 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[14px] font-body font-black shadow-lg shadow-purple-600/25 hover:shadow-xl hover:bg-purple-700 transition-all duration-200 flex items-center gap-2"><UserPlus size={18} /> {lang === "sw" ? "Ongeza Walimu" : "Add Teachers Now"}</button>
                <button onClick={() => { localStorage.setItem("elimu_onboard_dismissed", "1"); }} className="py-3 px-5 rounded-xl border border-slate-200 bg-white text-slate-500 text-[13px] font-body font-bold cursor-pointer hover:bg-slate-50 transition-colors">{lang === "sw" ? "Baadaye" : "I\u2019ll do this later"}</button>
              </div>
            </div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {tab === "Overview" && (isSuperAdmin || isTeacher || realTeachers.length > 0 || teachersLoading) && (<>
          {/* Hero welcome banner */}
          <div className="bg-purple-700 rounded-2xl p-6 mb-6 shadow-xl shadow-purple-600/15 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
            <div className="relative z-10">
              <p className="text-purple-200 text-xs font-body mb-1 mt-0">Welcome back,</p>
              <h3 className="text-white text-xl font-heading font-black m-0 mb-1">{user?.name || "Admin"}</h3>
              <p className="text-purple-200/80 text-[11px] font-body m-0">Here&apos;s what&apos;s happening with your platform today.</p>
            </div>
          </div>

          {loadingAdmin && <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 mb-6">{[0,1,2,3,4,5].map((i) => (<div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><SkeletonLine w="50%" h={28} mb={8} /><SkeletonLine w="70%" h={10} mb={0} /></div>))}</div>}
          {dashStats && (<>
            {/* Main stat cards with gradients */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 mb-6">
              {[
                { l: "Total Users", v: dashStats.users?.total_users || 0, icon: Users, iconBg: "bg-purple-600", shadow: "shadow-purple-500/20", bg: "bg-purple-50" },
                { l: "Students", v: dashStats.users?.students || 0, icon: GraduationCap, iconBg: "bg-emerald-500", shadow: "shadow-emerald-500/20", bg: "bg-emerald-50" },
                { l: "Teachers", v: dashStats.users?.teachers || 0, icon: BookOpen, iconBg: "bg-violet-500", shadow: "shadow-violet-500/20", bg: "bg-violet-50" },
                { l: "Paid Users", v: dashStats.users?.paid_users || 0, icon: Star, iconBg: "bg-amber-500", shadow: "shadow-amber-500/20", bg: "bg-amber-50" },
                { l: "Revenue (KES)", v: Number(dashStats.payments?.total_revenue || 0).toLocaleString(), icon: CreditCard, iconBg: "bg-indigo-500", shadow: "shadow-indigo-500/20", bg: "bg-indigo-50" },
                { l: "Active Users", v: dashStats.users?.active_users || 0, icon: Zap, iconBg: "bg-cyan-500", shadow: "shadow-cyan-500/20", bg: "bg-cyan-50" },
              ].map((s) => { const Icon = s.icon; return (
                <div key={s.l} className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:${s.shadow} transition-all duration-300 hover:-translate-y-0.5`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shadow-lg ${s.shadow}`}><Icon size={18} color="#fff" /></div>
                  </div>
                  <p className="text-slate-900 text-2xl mb-0.5 mt-0 font-body font-black">{s.v}</p>
                  <p className="text-slate-400 text-[10px] m-0 font-body font-semibold uppercase tracking-wide">{s.l}</p>
                </div>);
              })}
            </div>
            {/* Payments + SMS summary side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center"><CreditCard size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">Payments</h4></div>
                <div className="grid grid-cols-2 gap-3">
                  {[{ l: "Total", v: dashStats.payments?.total || 0, color: "text-slate-900" }, { l: "Completed", v: dashStats.payments?.completed || 0, color: "text-emerald-500" }, { l: "Pending", v: dashStats.payments?.pending || 0, color: "text-amber-500" }, { l: "Failed", v: dashStats.payments?.failed || 0, color: "text-red-500" }].map((s) => (
                    <div key={s.l} className="bg-slate-50 rounded-xl p-3"><p className={`text-xl mb-0.5 mt-0 font-body font-black ${s.color}`}>{s.v}</p><p className="text-slate-400 text-[9px] m-0 font-body font-bold uppercase">{s.l}</p></div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"><Smartphone size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">SMS Messages</h4></div>
                <div className="grid grid-cols-3 gap-3">
                  {[{ l: "Total Sent", v: dashStats.sms?.total || 0, color: "text-slate-900" }, { l: "Delivered", v: dashStats.sms?.sent || 0, color: "text-emerald-500" }, { l: "Failed", v: dashStats.sms?.failed || 0, color: "text-red-500" }].map((s) => (
                    <div key={s.l} className="bg-slate-50 rounded-xl p-3 text-center"><p className={`text-xl mb-0.5 mt-0 font-body font-black ${s.color}`}>{s.v}</p><p className="text-slate-400 text-[9px] m-0 font-body font-bold uppercase">{s.l}</p></div>
                  ))}
                </div>
              </div>
            </div>
          </>)}
          {!dashStats && !loadingAdmin && <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 mb-6">
              {[
                { l: "Total Students", v: stats.total, icon: GraduationCap, iconBg: "bg-purple-600", shadow: "shadow-purple-500/20" },
                { l: "Active", v: stats.active, icon: Zap, iconBg: "bg-emerald-500", shadow: "shadow-emerald-500/20" },
                { l: "Avg Score", v: `${stats.avg}%`, icon: TrendingUp, iconBg: "bg-violet-500", shadow: "shadow-violet-500/20" },
                { l: "Teachers", v: stats.teachers, icon: BookOpen, iconBg: "bg-amber-500", shadow: "shadow-amber-500/20" },
              ].map((s) => { const Icon = s.icon; return (
                <div key={s.l} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shadow-lg ${s.shadow} mb-3`}><Icon size={18} color="#fff" /></div>
                  <p className="text-slate-900 text-2xl mb-0.5 mt-0 font-body font-black">{s.v}</p>
                  <p className="text-slate-400 text-[10px] m-0 font-body font-semibold uppercase tracking-wide">{s.l}</p>
                </div>);
              })}
            </div>
          </>}
        </>)}

        {/* TRANSACTIONS TAB */}
        {tab === "Transactions" && (<>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center"><CreditCard size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{txTotal} Transactions</h4></div>
                {searchBox(txSearch, (e) => { setTxSearch(e.target.value); setTxPage(1); }, "Search by name, email, ref...")}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {["", "completed", "pending", "failed"].map((f) => (<button key={f || "all"} onClick={() => { setTxFilter(f); setTxPage(1); }} className={tblFilterBtn(txFilter === f)}>{f || "All"}</button>))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80">
                  <tr><th className={thCls}>User</th><th className={thCls}>Amount</th><th className={thCls}>Status</th><th className={thCls}>Plan</th><th className={thCls}>Method</th><th className={thCls}>Date</th><th className={thCls}>Receipt</th></tr>
                </thead>
                <tbody>
                  {txLoading && tblSkeleton(7)}
                  {!txLoading && transactions.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 text-xs font-body py-10">No transactions found</td></tr>}
                  {!txLoading && transactions.map((tx) => (
                    <tr key={tx.id} className={trCls}>
                      <td className={tdCls}><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">{(tx.user_name || "?")[0]}</div><div><p className="text-slate-900 text-[12px] font-body font-bold m-0">{tx.user_name || "Unknown"}</p><p className="text-slate-400 text-[10px] font-body m-0">{tx.user_email || tx.phone_number}</p></div></div></td>
                      <td className={`${tdCls} text-slate-900 font-bold`}>KES {Number(tx.amount).toLocaleString()}</td>
                      <td className={tdCls}><Badge color={tx.status === "completed" ? C.accent : tx.status === "pending" ? C.gold : C.error}>{tx.status}</Badge></td>
                      <td className={tdCls}>{tx.plan}</td>
                      <td className={tdCls}>{tx.method}</td>
                      <td className={`${tdCls} text-slate-400`}>{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className={`${tdCls} text-emerald-600 text-[10px]`}>{tx.mpesa_receipt || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!txLoading && <div className="flex justify-between items-center p-4 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] font-body">{txTotal} record{txTotal !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2.5">
                <button disabled={txPage <= 1} onClick={() => setTxPage((p) => p - 1)} className={pagBtn(txPage <= 1)}>Prev</button>
                <span className="text-slate-400 text-[11px] font-body">Page {txPage} of {Math.max(1, Math.ceil(txTotal / 20))}</span>
                <button disabled={txPage * 20 >= txTotal} onClick={() => setTxPage((p) => p + 1)} className={pagBtn(txPage * 20 >= txTotal)}>Next</button>
              </div>
            </div>}
          </div>
        </>)}

        {/* SMS LOGS TAB */}
        {tab === "SMS Logs" && (<>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center"><Smartphone size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{smsTotal} Messages</h4></div>
                {searchBox(smsSearch, (e) => { setSmsSearch(e.target.value); setSmsPage(1); }, "Search by recipient...")}
              </div>
              <div className="flex gap-1.5">
                {["", "sent", "failed"].map((f) => (<button key={f || "all"} onClick={() => { setSmsFilter(f); setSmsPage(1); }} className={tblFilterBtn(smsFilter === f)}>{f || "All"}</button>))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80">
                  <tr><th className={thCls}>Recipient</th><th className={`${thCls} min-w-[200px]`}>Message</th><th className={thCls}>Status</th><th className={thCls}>Provider</th><th className={thCls}>Date</th></tr>
                </thead>
                <tbody>
                  {smsLoading && tblSkeleton(5)}
                  {!smsLoading && smsLogs.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 text-xs font-body py-10">No SMS logs found</td></tr>}
                  {!smsLoading && smsLogs.map((sm) => (
                    <tr key={sm.id} className={trCls}>
                      <td className={tdCls}><p className="text-slate-900 text-[12px] font-body font-bold m-0">{sm.recipient}</p></td>
                      <td className={`${tdCls} !whitespace-normal max-w-[300px]`}><p className="text-slate-500 text-[11px] font-body m-0 leading-snug line-clamp-2">{sm.message}</p></td>
                      <td className={tdCls}><Badge color={sm.status === "sent" ? C.accent : C.error}>{sm.status}</Badge></td>
                      <td className={`${tdCls} text-slate-400`}>{sm.provider}</td>
                      <td className={`${tdCls} text-slate-400`}>{new Date(sm.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!smsLoading && <div className="flex justify-between items-center p-4 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] font-body">{smsTotal} record{smsTotal !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2.5">
                <button disabled={smsPage <= 1} onClick={() => setSmsPage((p) => p - 1)} className={pagBtn(smsPage <= 1)}>Prev</button>
                <span className="text-slate-400 text-[11px] font-body">Page {smsPage} of {Math.max(1, Math.ceil(smsTotal / 20))}</span>
                <button disabled={smsPage * 20 >= smsTotal} onClick={() => setSmsPage((p) => p + 1)} className={pagBtn(smsPage * 20 >= smsTotal)}>Next</button>
              </div>
            </div>}
          </div>
        </>)}

        {/* STUDENTS TAB */}
        {tab === "Students" && (isSuperAdmin || isTeacher || realTeachers.length > 0) && (<>
          {/* Student onboarding wizard for teachers with no students */}
          {isTeacher && !realStudents.length && !realStudentsLoading && (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="w-full max-w-md text-center">
                <div className="w-20 h-20 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center mx-auto mb-5 shadow-sm"><GraduationCap size={36} className="text-purple-600" /></div>
                <p className="text-purple-600 text-[11px] font-body font-black uppercase tracking-widest m-0 mb-2">{lang === "sw" ? "Anza Hapa" : "Get Started"}</p>
                <h3 className="text-slate-900 text-2xl font-heading font-black m-0 mb-2">{lang === "sw" ? "Ongeza Wanafunzi Wako" : "Add Your Students"}</h3>
                <p className="text-slate-500 text-[14px] font-body m-0 mb-6 leading-relaxed">{lang === "sw" ? "Ongeza wanafunzi wako ili waanze kujifunza na ElimuAI." : "Add your students so they can start learning with ElimuAI."}</p>
                <button onClick={() => setShowAddStudentsWizard(true)} className="py-3 px-6 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[14px] font-body font-black shadow-lg shadow-purple-600/25 hover:shadow-xl hover:bg-purple-700 transition-all duration-200 flex items-center gap-2 mx-auto"><UserPlus size={18} /> {lang === "sw" ? "Ongeza Wanafunzi" : "Add Students Now"}</button>
              </div>
            </div>
          )}

          {/* Students table (show when students exist or for non-teacher roles) */}
          {(!isTeacher || realStudents.length > 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center"><GraduationCap size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{isTeacher ? realStudents.length : students.length} Students</h4></div>
                <button onClick={() => isTeacher ? setShowAddStudentsWizard(true) : setShowAdd(true)} className="py-2 px-4 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[11px] font-body font-bold shadow-sm shadow-purple-600/25 hover:shadow-lg transition-shadow flex items-center gap-1.5"><UserPlus size={14} /> {lang === "sw" ? "Ongeza Wanafunzi" : "Add Students"}</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80">
                  <tr><th className={thCls}>Student</th><th className={thCls}>Email</th><th className={thCls}>Grade</th><th className={thCls}>Status</th><th className={thCls}>Joined</th></tr>
                </thead>
                <tbody>
                  {realStudentsLoading && tblSkeleton(5, 3)}
                  {!realStudentsLoading && (isTeacher ? realStudents : students).slice((realStudentsPage - 1) * 20, realStudentsPage * 20).map((s) => (
                    <tr key={s.id} className={trCls}>
                      <td className={tdCls}><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">{(s.name || "?")[0]}</div><p className="text-slate-900 text-[12px] font-body font-bold m-0">{s.name}</p></div></td>
                      <td className={tdCls}>{s.email || "—"}</td>
                      <td className={tdCls}>{s.grade_level || s.grade || "—"}</td>
                      <td className={tdCls}><Badge color={s.email_verified || s.status === "Active" ? C.accent : C.gold}>{s.email_verified ? (lang === "sw" ? "Amethibitishwa" : "Verified") : s.status === "Active" ? "Active" : (lang === "sw" ? "Anasubiri" : "Pending")}</Badge></td>
                      <td className={`${tdCls} text-slate-400`}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => { const allStudents = isTeacher ? realStudents : students; return <div className="flex justify-between items-center p-4 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] font-body">{allStudents.length} record{allStudents.length !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2.5">
                <button disabled={realStudentsPage <= 1} onClick={() => setRealStudentsPage((p) => p - 1)} className={pagBtn(realStudentsPage <= 1)}>Prev</button>
                <span className="text-slate-400 text-[11px] font-body">Page {realStudentsPage} of {Math.max(1, Math.ceil(allStudents.length / 20))}</span>
                <button disabled={realStudentsPage * 20 >= allStudents.length} onClick={() => setRealStudentsPage((p) => p + 1)} className={pagBtn(realStudentsPage * 20 >= allStudents.length)}>Next</button>
              </div>
            </div>; })()}
          </div>
          )}

          {/* Add Students Wizard Modal */}
          {showAddStudentsWizard && (
            <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-5 overflow-y-auto">
              <div className="bg-white border border-slate-200 rounded-[20px] p-[22px] w-full max-w-[480px] max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex justify-between mb-1"><h3 className="text-slate-900 font-heading font-black m-0">{lang === "sw" ? "Ongeza Wanafunzi" : "Onboard Students"}</h3><button onClick={() => { setShowAddStudentsWizard(false); setOnboardStudentResult(null); }} className="bg-transparent border-none text-slate-400 cursor-pointer"><X size={20} /></button></div>
                <p className="text-slate-400 text-[11px] font-body mb-4 mt-0">{lang === "sw" ? "Wanafunzi watapokea barua pepe ya karibu na vyeti vya kuingia." : "Students will receive a welcome email with login credentials."}</p>

                {bulkStudents.map((st, i) => (
                  <div key={i} className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex gap-2 mb-2">
                      <input value={st.name} onChange={(e) => { const arr = [...bulkStudents]; arr[i].name = e.target.value; setBulkStudents(arr); }} placeholder={lang === "sw" ? "Jina Kamili" : "Full Name"} className={`w-full ${inputCls}`} />
                      {bulkStudents.length > 1 && <button onClick={() => setBulkStudents((p) => p.filter((_, j) => j !== i))} className="bg-transparent border-none text-red-400 cursor-pointer shrink-0"><X size={16} /></button>}
                    </div>
                    <input value={st.email} onChange={(e) => { const arr = [...bulkStudents]; arr[i].email = e.target.value; setBulkStudents(arr); }} placeholder="Email" className={`w-full ${inputCls}`} />
                  </div>
                ))}
                <button onClick={() => setBulkStudents((p) => [...p, { name: "", email: "" }])} className="text-purple-600 text-xs font-body font-extrabold bg-transparent border-none cursor-pointer mb-4 flex items-center gap-1"><Plus size={14} /> {lang === "sw" ? "Ongeza Mstari" : "Add Row"}</button>

                {onboardStudentResult && (
                  <div className={`rounded-xl p-3 mb-3 ${onboardStudentResult.created?.length ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-red-200"}`}>
                    <p className={`text-xs font-body font-extrabold m-0 mb-1 ${onboardStudentResult.created?.length ? "text-emerald-600" : "text-red-500"}`}>{onboardStudentResult.message}</p>
                    {onboardStudentResult.created?.map((c) => <p key={c.email} className="text-emerald-600 text-[10px] font-body m-0">{c.name} — {c.emailSent ? (lang === "sw" ? "Barua pepe imetumwa" : "Email sent") : (lang === "sw" ? "Barua pepe haijatumwa" : "Email not sent")}</p>)}
                    {onboardStudentResult.skipped?.map((s) => <p key={s.email} className="text-yellow-600 text-[10px] font-body m-0">{s.email}: {s.reason}</p>)}
                    {onboardStudentResult.errors?.map((e, i) => <p key={i} className="text-red-500 text-[10px] font-body m-0">{e.email || ""}: {e.reason}</p>)}
                  </div>
                )}

                <button onClick={handleOnboardStudents} disabled={onboardStudentLoading} className={`${btnAccent} ${onboardStudentLoading ? "opacity-60" : ""}`}>
                  {onboardStudentLoading ? <Spinner color="#fff" size={6} /> : <><Mail size={16} /> {lang === "sw" ? "Ongeza na Tuma Barua Pepe" : "Add & Send Welcome Emails"}</>}
                </button>
              </div>
            </div>
          )}
        </>)}

        {/* TEACHERS TAB */}
        {tab === "Teachers" && (<>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center"><BookOpen size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{realTeachers.length || teachers.length} {lang === "sw" ? "Walimu" : "Teachers"}</h4></div>
                <button onClick={() => setShowAddTeachers(true)} className="py-2 px-4 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[11px] font-body font-bold shadow-sm shadow-purple-600/25 hover:shadow-lg transition-shadow flex items-center gap-1.5"><UserPlus size={14} /> {lang === "sw" ? "Ongeza Walimu" : "Onboard Teachers"}</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80">
                  <tr><th className={thCls}>Teacher</th><th className={thCls}>Email / Subject</th><th className={thCls}>Students</th><th className={thCls}>Status</th><th className={thCls}>Actions</th></tr>
                </thead>
                <tbody>
                  {teachersLoading && tblSkeleton(5, 3)}
                  {!teachersLoading && (realTeachers.length > 0 ? realTeachers : teachers).slice((teachersPage - 1) * 20, teachersPage * 20).map((tc) => (
                    <tr key={tc.id || tc.name} className={trCls}>
                      <td className={tdCls}><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0"><BookOpen size={14} color="#fff" /></div><p className="text-slate-900 text-[12px] font-body font-bold m-0">{tc.name}</p></div></td>
                      <td className={tdCls}>{tc.email || tc.subject}</td>
                      <td className={tdCls}>{tc.students || "—"}</td>
                      <td className={tdCls}><Badge color={tc.email_verified ? C.accent : C.gold}>{tc.email_verified ? (lang === "sw" ? "Amethibitishwa" : "Verified") : (lang === "sw" ? "Hajaamilishwa" : "Pending")}</Badge></td>
                      <td className={tdCls}><div className="flex gap-1.5"><button className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-500 text-[10px] font-body font-bold cursor-pointer hover:bg-slate-50 transition-colors">{t("view_perf")}</button><button className="py-1.5 px-2.5 rounded-lg border border-purple-600/20 bg-purple-50 text-purple-600 text-[10px] font-body font-bold cursor-pointer hover:bg-purple-100 transition-colors">{t("msg")}</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => { const allTeachers = realTeachers.length > 0 ? realTeachers : teachers; return <div className="flex justify-between items-center p-4 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] font-body">{allTeachers.length} record{allTeachers.length !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2.5">
                <button disabled={teachersPage <= 1} onClick={() => setTeachersPage((p) => p - 1)} className={pagBtn(teachersPage <= 1)}>Prev</button>
                <span className="text-slate-400 text-[11px] font-body">Page {teachersPage} of {Math.max(1, Math.ceil(allTeachers.length / 20))}</span>
                <button disabled={teachersPage * 20 >= allTeachers.length} onClick={() => setTeachersPage((p) => p + 1)} className={pagBtn(teachersPage * 20 >= allTeachers.length)}>Next</button>
              </div>
            </div>; })()}

          {/* Add Teachers Modal */}
          {showAddTeachers && (
            <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-5 overflow-y-auto">
              <div className="bg-white border border-slate-200 rounded-[20px] p-[22px] w-full max-w-[480px] max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex justify-between mb-1"><h3 className="text-slate-900 font-heading font-black m-0">{lang === "sw" ? "Ongeza Walimu" : "Onboard Teachers"}</h3><button onClick={() => { setShowAddTeachers(false); setOnboardTeacherResult(null); }} className="bg-transparent border-none text-slate-400 cursor-pointer"><X size={20} /></button></div>
                <p className="text-slate-400 text-[11px] font-body mb-4 mt-0">{lang === "sw" ? "Walimu watapokea barua pepe ya karibu na vyeti vya kuingia." : "Teachers will receive a welcome email with login credentials."}</p>

                {bulkTeachers.map((tc, i) => (
                  <div key={i} className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex gap-2 mb-2">
                      <input value={tc.name} onChange={(e) => { const arr = [...bulkTeachers]; arr[i].name = e.target.value; setBulkTeachers(arr); }} placeholder={lang === "sw" ? "Jina" : "Full Name"} className={`w-full ${inputCls}`} />
                      {bulkTeachers.length > 1 && <button onClick={() => setBulkTeachers((p) => p.filter((_, j) => j !== i))} className="bg-transparent border-none text-red-400 cursor-pointer shrink-0"><X size={16} /></button>}
                    </div>
                    <div className="flex gap-2">
                      <input value={tc.email} onChange={(e) => { const arr = [...bulkTeachers]; arr[i].email = e.target.value; setBulkTeachers(arr); }} placeholder="Email" className={`w-full ${inputCls}`} />
                      <input value={tc.subject} onChange={(e) => { const arr = [...bulkTeachers]; arr[i].subject = e.target.value; setBulkTeachers(arr); }} placeholder={lang === "sw" ? "Somo" : "Subject"} className={`w-2/5 ${inputCls}`} />
                    </div>
                  </div>
                ))}
                <button onClick={() => setBulkTeachers((p) => [...p, { name: "", email: "", subject: "" }])} className="text-purple-600 text-xs font-body font-extrabold bg-transparent border-none cursor-pointer mb-4 flex items-center gap-1"><Plus size={14} /> {lang === "sw" ? "Ongeza Mstari" : "Add Row"}</button>

                {onboardTeacherResult && (
                  <div className={`rounded-xl p-3 mb-3 ${onboardTeacherResult.created?.length ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-red-200"}`}>
                    <p className={`text-xs font-body font-extrabold m-0 mb-1 ${onboardTeacherResult.created?.length ? "text-emerald-600" : "text-red-500"}`}>{onboardTeacherResult.message}</p>
                    {onboardTeacherResult.created?.map((c) => <p key={c.email} className="text-emerald-600 text-[10px] font-body m-0">{c.name} — {c.emailSent ? (lang === "sw" ? "Barua pepe imetumwa" : "Email sent") : (lang === "sw" ? "Barua pepe haijatumwa" : "Email not sent")}</p>)}
                    {onboardTeacherResult.skipped?.map((s) => <p key={s.email} className="text-yellow-600 text-[10px] font-body m-0">{s.email}: {s.reason}</p>)}
                    {onboardTeacherResult.errors?.map((e, i) => <p key={i} className="text-red-500 text-[10px] font-body m-0">{e.email || ""}: {e.reason}</p>)}
                  </div>
                )}

                <button onClick={handleOnboardTeachers} disabled={onboardTeacherLoading} className={`${btnAccent} ${onboardTeacherLoading ? "opacity-60" : ""}`}>
                  {onboardTeacherLoading ? <Spinner color="#fff" size={6} /> : <><Mail size={16} /> {lang === "sw" ? "Ongeza na Tuma Barua Pepe" : "Add & Send Welcome Emails"}</>}
                </button>
              </div>
            </div>
          )}
          </div>
        </>)}

        {/* RANKINGS TAB (Teacher) */}
        {tab === "Rankings" && isTeacher && (<>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center"><Trophy size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{lang === "sw" ? "Viwango vya Darasa" : "Class Rankings"}</h4></div>
                <div className="flex gap-1.5">
                  {[{ k: "weekly", l: lang === "sw" ? "Wiki" : "Weekly" }, { k: "monthly", l: lang === "sw" ? "Mwezi" : "Monthly" }, { k: "all_time", l: lang === "sw" ? "Jumla" : "All Time" }].map((p) => (
                    <button key={p.k} onClick={() => setRankingsPeriod(p.k)} className={`px-3.5 py-1.5 rounded-full border-none cursor-pointer text-[11px] font-body font-bold transition-all ${rankingsPeriod === p.k ? "bg-purple-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{p.l}</button>
                  ))}
                </div>
              </div>
            </div>

            {rankingsLoading && <div className="p-8 text-center"><Spinner /></div>}

            {!rankingsLoading && rankings.length === 0 && (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3"><Trophy size={28} className="text-amber-500" /></div>
                <h4 className="text-slate-900 text-base font-heading font-black m-0 mb-1">{lang === "sw" ? "Hakuna data bado" : "No rankings yet"}</h4>
                <p className="text-slate-400 text-[12px] font-body m-0 max-w-xs mx-auto">{lang === "sw" ? "Wanafunzi wako wataonekana hapa wanapotumia ElimuAI." : "Your students will appear here as they use ElimuAI and earn XP."}</p>
              </div>
            )}

            {!rankingsLoading && rankings.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80">
                    <tr><th className={thCls}>#</th><th className={thCls}>{lang === "sw" ? "Mwanafunzi" : "Student"}</th><th className={thCls}>XP</th><th className={thCls}>{lang === "sw" ? "Mfululizo" : "Streak"}</th><th className={thCls}>{lang === "sw" ? "Majaribio" : "Tests"}</th><th className={thCls}>{lang === "sw" ? "Wastani" : "Avg Score"}</th></tr>
                  </thead>
                  <tbody>
                    {rankings.map((r, idx) => (
                      <tr key={r.id} className={`${trCls} ${r.is_current_user ? "bg-purple-50/50" : ""}`}>
                        <td className={tdCls}>
                          {idx === 0 ? <span className="text-lg">🥇</span> : idx === 1 ? <span className="text-lg">🥈</span> : idx === 2 ? <span className="text-lg">🥉</span> : <span className="text-slate-400 text-[12px] font-body font-bold">{idx + 1}</span>}
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-purple-600"}`}>{(r.name || "?")[0]}</div>
                            <div>
                              <p className="text-slate-900 text-[12px] font-body font-bold m-0">{r.name}</p>
                              {r.grade_level && <p className="text-slate-400 text-[10px] font-body m-0">{r.grade_level}</p>}
                            </div>
                          </div>
                        </td>
                        <td className={tdCls}><span className="text-purple-600 font-bold">{Number(r.xp || 0).toLocaleString()}</span></td>
                        <td className={tdCls}><span className="flex items-center gap-1 text-orange-500 font-bold"><Flame size={13} /> {r.streak || 0}</span></td>
                        <td className={tdCls}>{r.tests_taken || 0}</td>
                        <td className={tdCls}>{r.avg_score ? `${Math.round(Number(r.avg_score))}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>)}

        {/* RANKINGS TAB (School Admin) */}
        {tab === "Rankings" && !isTeacher && (<>
          {/* Period filter + sub-tabs */}
          <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
            <div className="flex gap-1.5">
              {[{ k: "students", l: lang === "sw" ? "Wanafunzi" : "Students", icon: GraduationCap }, { k: "teachers", l: lang === "sw" ? "Walimu" : "Teachers", icon: BookOpen }].map((st) => {
                const Icon = st.icon;
                return <button key={st.k} onClick={() => setRankingsSubTab(st.k)} className={`px-4 py-2 rounded-xl border-none cursor-pointer text-[12px] font-body font-bold transition-all flex items-center gap-1.5 ${rankingsSubTab === st.k ? "bg-purple-600 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}><Icon size={14} /> {st.l}</button>;
              })}
            </div>
            <div className="flex gap-1.5">
              {[{ k: "weekly", l: lang === "sw" ? "Wiki" : "Weekly" }, { k: "monthly", l: lang === "sw" ? "Mwezi" : "Monthly" }, { k: "all_time", l: lang === "sw" ? "Jumla" : "All Time" }].map((p) => (
                <button key={p.k} onClick={() => setRankingsPeriod(p.k)} className={`px-3.5 py-1.5 rounded-full border-none cursor-pointer text-[11px] font-body font-bold transition-all ${rankingsPeriod === p.k ? "bg-purple-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{p.l}</button>
              ))}
            </div>
          </div>

          {schoolRankingsLoading && <div className="p-8 text-center"><Spinner /></div>}

          {!schoolRankingsLoading && rankingsSubTab === "students" && (<>
            {/* Student Rankings Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center"><Trophy size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{lang === "sw" ? "Viwango vya Wanafunzi" : "Student Rankings"} — {rankingsPeriod === "weekly" ? (lang === "sw" ? "Wiki Hii" : "This Week") : rankingsPeriod === "monthly" ? (lang === "sw" ? "Mwezi Huu" : "This Month") : (lang === "sw" ? "Jumla" : "All Time")}</h4></div>
              </div>
              {(!schoolRankings?.studentRankings?.length) ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3"><Trophy size={28} className="text-amber-500" /></div>
                  <h4 className="text-slate-900 text-base font-heading font-black m-0 mb-1">{lang === "sw" ? "Hakuna data bado" : "No rankings yet"}</h4>
                  <p className="text-slate-400 text-[12px] font-body m-0">{lang === "sw" ? "Wanafunzi wataonekana hapa wanapotumia ElimuAI." : "Students will appear here as they use ElimuAI."}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80">
                      <tr><th className={thCls}>#</th><th className={thCls}>{lang === "sw" ? "Mwanafunzi" : "Student"}</th><th className={thCls}>XP</th><th className={thCls}>{lang === "sw" ? "Mfululizo" : "Streak"}</th><th className={thCls}>{lang === "sw" ? "Majaribio" : "Tests"}</th><th className={thCls}>{lang === "sw" ? "Wastani" : "Avg Score"}</th></tr>
                    </thead>
                    <tbody>
                      {schoolRankings.studentRankings.map((r, idx) => (
                        <tr key={r.id} className={trCls}>
                          <td className={tdCls}>{idx === 0 ? <span className="text-lg">🥇</span> : idx === 1 ? <span className="text-lg">🥈</span> : idx === 2 ? <span className="text-lg">🥉</span> : <span className="text-slate-400 text-[12px] font-body font-bold">{idx + 1}</span>}</td>
                          <td className={tdCls}><div className="flex items-center gap-2.5"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-purple-600"}`}>{(r.name || "?")[0]}</div><div><p className="text-slate-900 text-[12px] font-body font-bold m-0">{r.name}</p>{r.grade_level && <p className="text-slate-400 text-[10px] font-body m-0">{r.grade_level}</p>}</div></div></td>
                          <td className={tdCls}><span className="text-purple-600 font-bold">{Number(r.xp || 0).toLocaleString()}</span></td>
                          <td className={tdCls}><span className="flex items-center gap-1 text-orange-500 font-bold"><Flame size={13} /> {r.streak || 0}</span></td>
                          <td className={tdCls}>{r.tests_taken || 0}</td>
                          <td className={tdCls}>{r.avg_score ? `${Math.round(Number(r.avg_score))}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>)}

          {!schoolRankingsLoading && rankingsSubTab === "teachers" && (<>
            {/* Teacher Comparison Charts */}
            {(!schoolRankings?.teacherRankings?.length) ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3"><BookOpen size={28} className="text-violet-500" /></div>
                <h4 className="text-slate-900 text-base font-heading font-black m-0 mb-1">{lang === "sw" ? "Hakuna data bado" : "No teacher data yet"}</h4>
                <p className="text-slate-400 text-[12px] font-body m-0">{lang === "sw" ? "Ongeza walimu na wanafunzi ili kuona uchambuzi." : "Onboard teachers and students to see comparisons."}</p>
              </div>
            ) : (<>
              {/* Teacher Ranking Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-5">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center"><Award size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{lang === "sw" ? "Walimu kwa Utendaji" : "Teachers by Performance"}</h4></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80">
                      <tr><th className={thCls}>#</th><th className={thCls}>{lang === "sw" ? "Mwalimu" : "Teacher"}</th><th className={thCls}>{lang === "sw" ? "Wanafunzi" : "Students"}</th><th className={thCls}>{lang === "sw" ? "Wastani XP" : "Avg XP"}</th><th className={thCls}>{lang === "sw" ? "Wastani Alama" : "Avg Score"}</th><th className={thCls}>{lang === "sw" ? "Majaribio" : "Total Tests"}</th><th className={thCls}>{lang === "sw" ? "Wastani Mfululizo" : "Avg Streak"}</th></tr>
                    </thead>
                    <tbody>
                      {schoolRankings.teacherRankings.map((t, idx) => (
                        <tr key={t.teacher_id} className={trCls}>
                          <td className={tdCls}>{idx === 0 ? <span className="text-lg">🥇</span> : idx === 1 ? <span className="text-lg">🥈</span> : idx === 2 ? <span className="text-lg">🥉</span> : <span className="text-slate-400 text-[12px] font-body font-bold">{idx + 1}</span>}</td>
                          <td className={tdCls}><div className="flex items-center gap-2.5"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-purple-600"}`}>{(t.teacher_name || "?")[0]}</div><p className="text-slate-900 text-[12px] font-body font-bold m-0">{t.teacher_name}</p></div></td>
                          <td className={tdCls}>{t.student_count}</td>
                          <td className={tdCls}><span className="text-purple-600 font-bold">{Number(t.avg_xp || 0).toLocaleString()}</span></td>
                          <td className={tdCls}><span className={`font-bold ${Number(t.avg_score) >= 70 ? "text-emerald-600" : Number(t.avg_score) >= 50 ? "text-amber-500" : "text-red-500"}`}>{t.avg_score ? `${t.avg_score}%` : "—"}</span></td>
                          <td className={tdCls}>{t.total_tests}</td>
                          <td className={tdCls}><span className="flex items-center gap-1 text-orange-500 font-bold"><Flame size={13} /> {t.avg_streak || 0}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bar Chart: Avg XP per Teacher */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <div className="flex items-center gap-2 mb-4"><div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center"><BarChart3 size={13} color="#fff" /></div><h4 className="text-slate-900 text-[13px] font-heading font-black m-0">{lang === "sw" ? "Wastani XP kwa Mwalimu" : "Avg XP per Teacher"}</h4></div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={schoolRankings.teacherRankings.map((t) => ({ name: t.teacher_name?.split(" ")[0] || "?", xp: Number(t.avg_xp || 0) }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      <Bar dataKey="xp" fill="#9333ea" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar Chart: Avg Score per Teacher */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <div className="flex items-center gap-2 mb-4"><div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center"><TrendingUp size={13} color="#fff" /></div><h4 className="text-slate-900 text-[13px] font-heading font-black m-0">{lang === "sw" ? "Wastani Alama kwa Mwalimu" : "Avg Score per Teacher"}</h4></div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={schoolRankings.teacherRankings.map((t) => ({ name: t.teacher_name?.split(" ")[0] || "?", score: Number(t.avg_score || 0) }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                      <Bar dataKey="score" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar Chart: Teacher Comparison */}
              {schoolRankings.teacherRankings.length >= 2 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <div className="flex items-center gap-2 mb-4"><div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center"><Target size={13} color="#fff" /></div><h4 className="text-slate-900 text-[13px] font-heading font-black m-0">{lang === "sw" ? "Ulinganisho wa Walimu" : "Teacher Comparison"}</h4></div>
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={[
                      { metric: lang === "sw" ? "XP" : "Avg XP", ...Object.fromEntries(schoolRankings.teacherRankings.slice(0, 5).map((t) => [t.teacher_name?.split(" ")[0], Number(t.avg_xp || 0)])) },
                      { metric: lang === "sw" ? "Alama" : "Avg Score", ...Object.fromEntries(schoolRankings.teacherRankings.slice(0, 5).map((t) => [t.teacher_name?.split(" ")[0], Number(t.avg_score || 0)])) },
                      { metric: lang === "sw" ? "Majaribio" : "Tests", ...Object.fromEntries(schoolRankings.teacherRankings.slice(0, 5).map((t) => [t.teacher_name?.split(" ")[0], Number(t.total_tests || 0)])) },
                      { metric: lang === "sw" ? "Mfululizo" : "Streak", ...Object.fromEntries(schoolRankings.teacherRankings.slice(0, 5).map((t) => [t.teacher_name?.split(" ")[0], Number(t.avg_streak || 0)])) },
                      { metric: lang === "sw" ? "Wanafunzi" : "Students", ...Object.fromEntries(schoolRankings.teacherRankings.slice(0, 5).map((t) => [t.teacher_name?.split(" ")[0], Number(t.student_count || 0)])) },
                    ]}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} />
                      <PolarRadiusAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      {schoolRankings.teacherRankings.slice(0, 5).map((t, i) => (
                        <Radar key={t.teacher_id} name={t.teacher_name?.split(" ")[0]} dataKey={t.teacher_name?.split(" ")[0]} stroke={["#9333ea", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"][i]} fill={["#9333ea", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"][i]} fillOpacity={0.15} strokeWidth={2} />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>)}
          </>)}
        </>)}

        {/* AI INSIGHTS TAB (Teacher) */}
        {tab === "AI Insights" && isTeacher && (<>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center"><Zap size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{lang === "sw" ? "Maarifa ya AI ya Ufundishaji" : "AI Teaching Insights"}</h4></div>
              <p className="text-slate-400 text-[11px] font-body m-0 mt-1">{lang === "sw" ? "Pata mapendekezo ya AI kuhusu wanafunzi wako na jinsi ya kuboresha ufundishaji." : "Get AI-powered recommendations about your students and how to improve your teaching."}</p>
            </div>
            <div className="p-5">
              {aiReport && <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4"><p className="text-slate-800 text-[13px] font-body leading-relaxed m-0 whitespace-pre-wrap">{aiReport}</p></div>}
              {!aiReport && !loadingRep && (
                <div className="text-center py-6 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4"><Zap size={32} className="text-violet-500" /></div>
                  <h4 className="text-slate-900 text-base font-heading font-black m-0 mb-2">{lang === "sw" ? "Bofya Tengeneza kupata mapendekezo ya AI" : "Click Generate for AI Recommendations"}</h4>
                  <p className="text-slate-400 text-[12px] font-body m-0 mb-0 max-w-sm mx-auto leading-relaxed">{lang === "sw" ? "AI itachambua data ya wanafunzi wako na kukupa mapendekezo ya kuboresha ufundishaji, maeneo dhaifu, na mikakati." : "AI will analyze your student data and provide personalized teaching recommendations, identify weak areas, and suggest improvement strategies."}</p>
                </div>
              )}
              {loadingRep && <div className="flex items-center justify-center gap-3 bg-violet-50 rounded-xl p-5 mb-4"><Spinner /><p className="text-violet-600 text-[13px] font-body font-bold m-0">{lang === "sw" ? "AI inachambua data yako..." : "AI is analyzing your data..."}</p></div>}
              <button onClick={generateReport} disabled={loadingRep} className={`w-full py-3 rounded-xl border-none cursor-pointer bg-violet-500 text-white text-sm font-body font-bold shadow-lg shadow-violet-500/25 hover:shadow-xl hover:bg-violet-600 transition-all flex items-center justify-center gap-2 ${loadingRep ? "opacity-60" : ""}`}><Zap size={16} /> {loadingRep ? (lang === "sw" ? "Inatengeneza..." : "Generating...") : aiReport ? (lang === "sw" ? "Tengeneza Tena" : "Regenerate Insights") : (lang === "sw" ? "Tengeneza Maarifa ya AI" : "Generate AI Insights")}</button>
            </div>
          </div>

          {realStudents.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"><Users size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{lang === "sw" ? "Muhtasari wa Wanafunzi" : "Student Summary"}</h4></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-purple-50 rounded-xl p-3 text-center"><p className="text-purple-600 text-xl font-body font-black m-0">{realStudents.length}</p><p className="text-slate-400 text-[9px] font-body font-bold uppercase m-0">{lang === "sw" ? "Jumla" : "Total"}</p></div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-emerald-600 text-xl font-body font-black m-0">{realStudents.filter((s) => s.email_verified).length}</p><p className="text-slate-400 text-[9px] font-body font-bold uppercase m-0">{lang === "sw" ? "Wamethibitishwa" : "Verified"}</p></div>
                <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-amber-600 text-xl font-body font-black m-0">{realStudents.filter((s) => !s.email_verified).length}</p><p className="text-slate-400 text-[9px] font-body font-bold uppercase m-0">{lang === "sw" ? "Wanasubiri" : "Pending"}</p></div>
                <div className="bg-violet-50 rounded-xl p-3 text-center"><p className="text-violet-600 text-xl font-body font-black m-0">{realStudents.filter((s) => s.last_login && (Date.now() - new Date(s.last_login).getTime() < 7 * 24 * 60 * 60 * 1000)).length}</p><p className="text-slate-400 text-[9px] font-body font-bold uppercase m-0">{lang === "sw" ? "Hai Wiki Hii" : "Active This Week"}</p></div>
              </div>
            </div>
          )}
        </>)}

        {/* STUDENT TABS */}
        {isStudent && tab === "Home" && <HomeScreen setActive={setTab} country={country} setCountry={setCountry} level={level} setLevel={setLevel} isOffline={isOffline} plan={plan} lang={lang} user={user} />}
        {isStudent && tab === "Tutor" && <TutorScreen country={country} level={level} isOffline={isOffline} lang={lang} user={user} />}
        {isStudent && tab === "Exams" && <ExamScreen country={country} level={level} lang={lang} user={user} />}
        {isStudent && tab === "Rankings" && <LeaderboardScreen lang={lang} user={user} />}
        {isStudent && tab === "Progress" && <ProgressScreen country={country} level={level} lang={lang} user={user} />}

        {/* PARENT OVERVIEW TAB */}
        {tab === "Overview" && isParent && (<>
          <div className="bg-purple-700 rounded-2xl p-6 mb-6 shadow-xl shadow-purple-600/15 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="relative z-10">
              <p className="text-purple-200 text-xs font-body mb-1 mt-0">{lang === "sw" ? "Karibu tena," : "Welcome back,"}</p>
              <h3 className="text-white text-xl font-heading font-black m-0 mb-1">{user?.name || (lang === "sw" ? "Mzazi" : "Parent")}</h3>
              <p className="text-purple-200/80 text-[11px] font-body m-0">{lang === "sw" ? "Fuatilia maendeleo ya watoto wako." : "Monitor your children's learning progress."}</p>
            </div>
          </div>
          {parentChildrenLoading && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">{[0,1,2].map((i) => (<div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><SkeletonLine w="60%" h={16} mb={8} /><SkeletonLine w="80%" h={10} mb={4} /><SkeletonLine w="40%" h={10} mb={0} /></div>))}</div>}
          {!parentChildrenLoading && parentChildren.length === 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4"><Heart size={28} className="text-purple-400" /></div>
              <h4 className="text-slate-900 text-base font-heading font-black m-0 mb-2">{lang === "sw" ? "Bado hujasajili mtoto" : "No children added yet"}</h4>
              <p className="text-slate-400 text-xs font-body mb-4">{lang === "sw" ? "Ongeza watoto wako ili ufuatilie maendeleo yao." : "Add your children to start monitoring their progress."}</p>
              <button onClick={() => { setTab("Children"); setShowAddChild(true); }} className="py-2.5 px-5 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-xs font-body font-bold shadow-sm hover:shadow-lg transition-shadow flex items-center gap-2 mx-auto"><Plus size={14} /> {lang === "sw" ? "Ongeza Mtoto" : "Add Child"}</button>
            </div>
          )}
          {!parentChildrenLoading && parentChildren.length > 0 && (<>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[
                { l: lang === "sw" ? "Watoto" : "Children", v: parentChildren.length, icon: Heart, iconBg: "bg-purple-600", shadow: "shadow-purple-500/20" },
                { l: lang === "sw" ? "Wastani Alama" : "Avg Score", v: `${parentChildren.length ? Math.round(parentChildren.reduce((a, c) => a + (c.avg_score || 0), 0) / parentChildren.length) : 0}%`, icon: TrendingUp, iconBg: "bg-emerald-500", shadow: "shadow-emerald-500/20" },
                { l: lang === "sw" ? "Wastani XP" : "Total XP", v: parentChildren.reduce((a, c) => a + (c.xp || 0), 0), icon: Star, iconBg: "bg-amber-500", shadow: "shadow-amber-500/20" },
              ].map((s) => { const Icon = s.icon; return (
                <div key={s.l} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shadow-lg ${s.shadow} mb-3`}><Icon size={18} color="#fff" /></div>
                  <p className="text-slate-900 text-2xl mb-0.5 mt-0 font-body font-black">{s.v}</p>
                  <p className="text-slate-400 text-[10px] m-0 font-body font-semibold uppercase tracking-wide">{s.l}</p>
                </div>);
              })}
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-slate-900 text-sm font-heading font-black m-0 mb-4">{lang === "sw" ? "Watoto Wako" : "Your Children"}</h4>
              {parentChildren.map((child, i) => (
                <div key={child.id || i} onClick={() => { setSelectedChild(i); setTab("Children"); }} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">{(child.name || "?")[0]}</div>
                  <div className="flex-1">
                    <p className="text-slate-900 text-sm font-body font-bold m-0">{child.name}</p>
                    <p className="text-slate-400 text-[10px] font-body m-0">{child.grade_level || child.gradeLevel || (lang === "sw" ? "Darasa halijulikani" : "Grade not set")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-purple-600 text-sm font-body font-black m-0">{child.xp || 0} XP</p>
                    <p className="text-slate-400 text-[10px] font-body m-0">{lang === "sw" ? "Alama" : "Score"}: {child.avg_score || 0}%</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              ))}
            </div>
          </>)}
        </>)}

        {/* PARENT CHILDREN TAB */}
        {tab === "Children" && isParent && (<>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-slate-900 text-lg font-heading font-black m-0">{lang === "sw" ? "Watoto Wako" : "Your Children"}</h3>
            <button onClick={() => setShowAddChild(true)} className="py-2 px-4 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-xs font-body font-bold shadow-sm hover:shadow-lg transition-shadow flex items-center gap-1.5"><Plus size={14} /> {lang === "sw" ? "Ongeza Mtoto" : "Add Child"}</button>
          </div>

          {showAddChild && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-5">
              <div className="flex justify-between mb-3.5"><h4 className="text-slate-900 font-heading font-black m-0">{lang === "sw" ? "Ongeza Mtoto" : "Add Child"}</h4><button onClick={() => { setShowAddChild(false); setAddChildMsg(""); }} className="bg-transparent border-none text-slate-400 cursor-pointer"><X size={20} /></button></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">{lang === "sw" ? "Jina *" : "Name *"}</p><input value={childForm.name} onChange={(e) => setChildForm((p) => ({ ...p, name: e.target.value }))} placeholder={lang === "sw" ? "Jina la mtoto" : "Child's name"} className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">{lang === "sw" ? "Barua pepe *" : "Email *"}</p><input value={childForm.email} onChange={(e) => setChildForm((p) => ({ ...p, email: e.target.value }))} placeholder={lang === "sw" ? "Barua pepe ya mtoto" : "Child's email"} className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">{lang === "sw" ? "Darasa" : "Grade Level"}</p><input value={childForm.gradeLevel} onChange={(e) => setChildForm((p) => ({ ...p, gradeLevel: e.target.value }))} placeholder="e.g. Grade 5" className={inputCls} /></div>
              </div>
              {addChildMsg && <p className={`text-xs font-body mb-3 mt-0 ${addChildMsg.includes("required") || addChildMsg.includes("Failed") ? "text-red-500" : "text-emerald-500"}`}>{addChildMsg}</p>}
              <button onClick={handleAddChild} disabled={addChildLoading} className={`py-2.5 px-5 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-xs font-body font-bold shadow-sm hover:shadow-lg transition-shadow flex items-center gap-2 ${addChildLoading ? "opacity-60" : ""}`}><UserPlus size={14} /> {addChildLoading ? (lang === "sw" ? "Inaongeza..." : "Adding...") : (lang === "sw" ? "Ongeza" : "Add Child")}</button>
            </div>
          )}

          {parentChildrenLoading && <div className="space-y-3">{[0,1,2].map((i) => (<div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"><SkeletonLine w="50%" h={16} mb={6} /><SkeletonLine w="70%" h={10} mb={0} /></div>))}</div>}

          {!parentChildrenLoading && parentChildren.length === 0 && !showAddChild && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4"><Heart size={28} className="text-purple-400" /></div>
              <h4 className="text-slate-900 text-base font-heading font-black m-0 mb-2">{lang === "sw" ? "Bado hujasajili mtoto" : "No children added yet"}</h4>
              <p className="text-slate-400 text-xs font-body mb-4">{lang === "sw" ? "Bonyeza kitufe hapo juu kuongeza mtoto wako." : "Click the button above to add your first child."}</p>
            </div>
          )}

          {!parentChildrenLoading && parentChildren.length > 0 && (
            <div className="space-y-4">
              {parentChildren.map((child, i) => (
                <div key={child.id || i} className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${selectedChild === i ? "border-purple-300 shadow-lg shadow-purple-100" : "border-slate-100"}`}>
                  <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => setSelectedChild(selectedChild === i ? -1 : i)}>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold">{(child.name || "?")[0]}</div>
                    <div className="flex-1">
                      <p className="text-slate-900 text-sm font-body font-bold m-0">{child.name}</p>
                      <p className="text-slate-400 text-[10px] font-body m-0">{child.email} · {child.grade_level || child.gradeLevel || (lang === "sw" ? "Darasa halijulikani" : "Grade not set")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-600 text-lg font-body font-black m-0">{child.xp || 0} <span className="text-[10px] text-slate-400">XP</span></p>
                    </div>
                  </div>
                  {selectedChild === i && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                      {[
                        { l: lang === "sw" ? "Alama" : "Avg Score", v: `${child.avg_score || 0}%`, color: "text-emerald-600" },
                        { l: lang === "sw" ? "Majaribio" : "Tests", v: child.total_tests || 0, color: "text-violet-600" },
                        { l: lang === "sw" ? "Mfululizo" : "Streak", v: `${child.streak || 0}🔥`, color: "text-amber-600" },
                        { l: lang === "sw" ? "Insha" : "Last Active", v: child.last_login ? new Date(child.last_login).toLocaleDateString() : "—", color: "text-slate-600" },
                      ].map((s) => (
                        <div key={s.l} className="bg-slate-50 rounded-xl p-3 text-center">
                          <p className={`text-lg font-body font-black m-0 mb-0.5 ${s.color}`}>{s.v}</p>
                          <p className="text-slate-400 text-[9px] font-body font-bold uppercase m-0">{s.l}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* PARENT BILLING TAB */}
        {tab === "Billing" && !isSuperAdmin && (
          <PlansScreen plan={plan} setPlan={setPlan} lang={lang} user={user} />
        )}

        {/* PARENT REPORTS TAB */}
        {tab === "Reports" && isParent && (<>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
            <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center"><TrendingUp size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{lang === "sw" ? "Uchambuzi wa AI" : "AI Insights"}</h4></div>
            {loadingRep && <Spinner />}
            {aiReport && <p className="text-slate-900 text-xs font-body leading-relaxed mb-4 mt-0 whitespace-pre-wrap bg-slate-50 rounded-xl p-4">{aiReport}</p>}
            {!aiReport && !loadingRep && <p className="text-slate-400 text-[11px] font-body italic mb-4 bg-slate-50 rounded-xl p-4">{lang === "sw" ? "Pata uchambuzi wa AI kuhusu maendeleo ya watoto wako." : "Get AI-powered insights about your children's learning progress."}</p>}
            <button onClick={generateReport} disabled={loadingRep} className={`py-2.5 px-5 rounded-xl border-none cursor-pointer bg-violet-500 text-white text-xs font-body font-bold shadow-sm shadow-violet-500/25 hover:shadow-lg transition-shadow flex items-center gap-2 ${loadingRep ? "opacity-60" : ""}`}><Zap size={14} /> {loadingRep ? (lang === "sw" ? "Inatengeneza..." : "Generating...") : (lang === "sw" ? "Tengeneza Ripoti" : "Generate Report")}</button>
          </div>
          {parentChildren.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center"><FileText size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{lang === "sw" ? "Muhtasari wa Watoto" : "Children Summary"}</h4></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-slate-200">
                    <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2 pr-4">{lang === "sw" ? "Jina" : "Name"}</th>
                    <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2 pr-4">{lang === "sw" ? "Darasa" : "Grade"}</th>
                    <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2 pr-4">XP</th>
                    <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2 pr-4">{lang === "sw" ? "Alama" : "Score"}</th>
                    <th className="text-slate-400 text-[10px] font-body font-bold uppercase pb-2">{lang === "sw" ? "Mfululizo" : "Streak"}</th>
                  </tr></thead>
                  <tbody>
                    {parentChildren.map((child, i) => (
                      <tr key={child.id || i} className="border-b border-slate-50">
                        <td className="py-2.5 pr-4 text-slate-900 text-xs font-body font-bold">{child.name}</td>
                        <td className="py-2.5 pr-4 text-slate-500 text-xs font-body">{child.grade_level || child.gradeLevel || "—"}</td>
                        <td className="py-2.5 pr-4 text-purple-600 text-xs font-body font-bold">{child.xp || 0}</td>
                        <td className="py-2.5 pr-4 text-emerald-600 text-xs font-body font-bold">{child.avg_score || 0}%</td>
                        <td className="py-2.5 text-amber-600 text-xs font-body font-bold">{child.streak || 0}🔥</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>)}

        {/* REPORTS TAB */}
        {tab === "Reports" && (isSuperAdmin || isTeacher || realTeachers.length > 0) && (<>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
            <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center"><TrendingUp size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{t("ai_insights")}</h4></div>
            {loadingRep && <Spinner />}
            {aiReport && <p className="text-slate-900 text-xs font-body leading-relaxed mb-4 mt-0 whitespace-pre-wrap bg-slate-50 rounded-xl p-4">{aiReport}</p>}
            {!aiReport && !loadingRep && <p className="text-slate-400 text-[11px] font-body italic mb-4 bg-slate-50 rounded-xl p-4">{lang === "sw" ? "Bofya 'Tengeneza' kupata uchambuzi wa AI." : "Click Generate for AI-powered analysis of your platform data."}</p>}
            <button onClick={generateReport} disabled={loadingRep} className={`py-2.5 px-5 rounded-xl border-none cursor-pointer bg-violet-500 text-white text-xs font-body font-bold shadow-sm shadow-violet-500/25 hover:shadow-lg transition-shadow flex items-center gap-2 ${loadingRep ? "opacity-60" : ""}`}><Zap size={14} /> {loadingRep ? t("generating") : t("gen_report")}</button>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center"><FileText size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{lang === "sw" ? "Hamisha Ripoti" : "Export Reports"}</h4></div>
            {[lang === "sw" ? "Ripoti ya Utendaji (PDF)" : "Performance Report (PDF)", lang === "sw" ? "Muhtasari wa Mahudhurio" : "Attendance Summary", lang === "sw" ? "Ripoti ya SMS kwa Wazazi" : "Parent SMS Report"].map((r) => (<div key={r} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-b-0"><p className="text-slate-900 text-xs font-body font-bold m-0">{r}</p><button className="py-1.5 px-4 rounded-xl border border-slate-200 bg-slate-50 text-purple-600 text-[10px] font-body font-bold cursor-pointer flex items-center gap-1.5 hover:bg-purple-50 transition-colors"><Download size={12} /> {t("export_lbl")}</button></div>))}
          </div>
        </>)}

        {/* PROFILE TAB */}
        {tab === "Profile" && (<>
          <div className={`grid gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-[280px_1fr]"}`}>
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center self-start">
              <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">{(user?.name || user?.email || "A")[0].toUpperCase()}</div>
              <h3 className="text-slate-900 text-base font-heading font-black m-0">{user?.name || "Admin"}</h3>
              <p className="text-slate-400 text-[11px] font-body mt-1 mb-2">{user?.email || ""}</p>
              <Badge color={C.primary}>{user?.role || "admin"}</Badge>
              <div className="mt-4 pt-4 border-t border-slate-100 text-left space-y-2.5">
                {user?.phone && <div className="flex items-center gap-2 text-slate-500 text-[11px] font-body"><Smartphone size={13} className="text-slate-400" /> {user.phone}</div>}
                {user?.plan && <div className="flex items-center gap-2 text-slate-500 text-[11px] font-body"><CreditCard size={13} className="text-slate-400" /> Plan: <span className="font-bold text-slate-700 capitalize">{user.plan}</span></div>}
                {user?.streak_days != null && <div className="flex items-center gap-2 text-slate-500 text-[11px] font-body"><Flame size={13} className="text-orange-400" /> {user.streak_days} day streak</div>}
                {user?.total_xp != null && <div className="flex items-center gap-2 text-slate-500 text-[11px] font-body"><Star size={13} className="text-amber-400" /> {Number(user.total_xp).toLocaleString()} XP</div>}
              </div>
            </div>
            {/* Edit Forms */}
            <div className="space-y-5">
              {/* Personal Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center"><User size={14} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">Personal Information</h4></div>
                <div className="p-5">
                  {profileMsg && <p className={`text-[11px] font-body font-bold mb-3 mt-0 px-2.5 py-1.5 rounded-lg ${profileMsg.includes("updated") ? "text-emerald-500 bg-emerald-50" : "text-red-500 bg-rose-50"}`}>{profileMsg}</p>}
                  <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Full Name</p><input value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" className={inputCls} /></div>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Email</p><input type="email" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} placeholder="your@email.com" className={inputCls} /></div>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Phone</p><input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+254..." className={inputCls} /></div>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Language</p><select value={profileForm.language} onChange={(e) => setProfileForm((p) => ({ ...p, language: e.target.value }))} className={inputCls}><option value="">Select</option><option value="en">English</option><option value="sw">Swahili</option></select></div>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Grade Level</p><input value={profileForm.grade_level} onChange={(e) => setProfileForm((p) => ({ ...p, grade_level: e.target.value }))} placeholder="e.g. Grade 5" className={inputCls} /></div>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Curriculum</p><select value={profileForm.curriculum} onChange={(e) => setProfileForm((p) => ({ ...p, curriculum: e.target.value }))} className={inputCls}><option value="">Select</option>{Object.entries(CURRICULA).map(([k, v]) => (<option key={k} value={v.curriculum}>{v.name}</option>))}</select></div>
                  </div>
                  <button onClick={saveProfile} disabled={profileSaving} className={`py-2.5 px-5 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-xs font-body font-bold shadow-sm shadow-purple-600/25 hover:shadow-lg transition-shadow flex items-center gap-2 mt-4 ${profileSaving ? "opacity-60" : ""}`}><CheckCircle size={14} /> {profileSaving ? "Saving..." : "Save Changes"}</button>
                </div>
              </div>
              {/* Change Password */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center"><Key size={14} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">Change Password</h4></div>
                <div className="p-5">
                  {pwMsg && <p className={`text-[11px] font-body font-bold mb-3 mt-0 px-2.5 py-1.5 rounded-lg ${pwMsg.includes("changed") ? "text-emerald-500 bg-emerald-50" : "text-red-500 bg-rose-50"}`}>{pwMsg}</p>}
                  <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Current Password</p><input type="password" value={pwForm.current} onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))} placeholder="••••••••" className={inputCls} /></div>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">New Password</p><input type="password" value={pwForm.newPw} onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))} placeholder="Min 8 characters" className={inputCls} /></div>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Confirm New Password</p><input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} placeholder="Re-enter password" className={inputCls} /></div>
                  </div>
                  <button onClick={changeOwnPassword} disabled={pwSaving} className={`py-2.5 px-5 rounded-xl border-none cursor-pointer bg-amber-500 text-white text-xs font-body font-bold shadow-sm shadow-amber-500/25 hover:shadow-lg transition-shadow flex items-center gap-2 mt-4 ${pwSaving ? "opacity-60" : ""}`}><Shield size={14} /> {pwSaving ? "Saving..." : "Update Password"}</button>
                </div>
              </div>
              {/* Delete / Deactivate Account */}
              <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center"><Trash2 size={14} color="#fff" /></div><h4 className="text-red-600 text-sm font-heading font-black m-0">Delete Account</h4></div>
                <div className="p-5">
                  {!showDeleteAccount ? (
                    <div>
                      <p className="text-slate-500 text-xs font-body leading-relaxed m-0 mb-3">Permanently delete your account and all associated data. This action cannot be undone. Your learning progress, AI conversations, and payment history will be removed after a 30-day grace period.</p>
                      <button onClick={() => setShowDeleteAccount(true)} className="py-2.5 px-5 rounded-xl border border-red-200 cursor-pointer bg-red-50 text-red-600 text-xs font-body font-bold hover:bg-red-100 transition-colors flex items-center gap-2"><Trash2 size={14} /> Delete My Account</button>
                    </div>
                  ) : (
                    <div>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-red-700 text-xs font-body font-bold m-0 mb-1">This is permanent and irreversible</p>
                            <p className="text-red-600 text-[11px] font-body m-0 leading-relaxed">Your account will be deactivated immediately and all personal data will be anonymised. You will be logged out and will not be able to recover this account.</p>
                          </div>
                        </div>
                      </div>
                      {deleteMsg && <p className={`text-[11px] font-body font-bold mb-3 mt-0 px-2.5 py-1.5 rounded-lg ${deleteMsg.includes("success") ? "text-emerald-500 bg-emerald-50" : "text-red-500 bg-rose-50"}`}>{deleteMsg}</p>}
                      <div className="space-y-3">
                        <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Type &quot;DELETE&quot; to confirm</p><input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder='Type DELETE' className={inputCls} /></div>
                        <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Enter your password</p><input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Your current password" className={inputCls} /></div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button onClick={async () => {
                          if (deleteConfirmText !== "DELETE") { setDeleteMsg("Please type DELETE to confirm"); return; }
                          if (!deletePassword) { setDeleteMsg("Password is required"); return; }
                          setDeleteSaving(true); setDeleteMsg("");
                          try {
                            await apiDelete("/api/auth/account", { password: deletePassword });
                            setDeleteMsg("Account deleted successfully. Logging out...");
                            setTimeout(() => onLogout(), 2000);
                          } catch (err) { setDeleteMsg(err.message || "Failed to delete account"); }
                          setDeleteSaving(false);
                        }} disabled={deleteSaving || deleteConfirmText !== "DELETE" || !deletePassword} className={`py-2.5 px-5 rounded-xl border-none cursor-pointer bg-red-600 text-white text-xs font-body font-bold shadow-sm shadow-red-600/25 hover:shadow-lg transition-shadow flex items-center gap-2 ${deleteSaving || deleteConfirmText !== "DELETE" || !deletePassword ? "opacity-40 cursor-not-allowed" : ""}`}><Trash2 size={14} /> {deleteSaving ? "Deleting..." : "Permanently Delete Account"}</button>
                        <button onClick={() => { setShowDeleteAccount(false); setDeletePassword(""); setDeleteConfirmText(""); setDeleteMsg(""); }} className="py-2.5 px-5 rounded-xl border border-slate-200 bg-transparent text-slate-500 text-xs font-body font-bold cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>)}

        {/* SETTINGS TAB */}
        {tab === "Settings" && (<>
          {settingsLoading && <Spinner />}
          {!settingsLoading && (<>
            <div className="flex gap-0 min-h-[400px] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className={`shrink-0 bg-slate-50 border-r border-slate-200 overflow-hidden ${isMobile ? "w-[54px]" : "w-[180px]"}`}>
                {[{ id: "mpesa", icon: CreditCard, l: "M-Pesa" }, { id: "sms", icon: Smartphone, l: "SMS (AT)" }, { id: "billing", icon: Receipt, l: "Billing Plans" }, { id: "email", icon: Mail, l: "Email (SMTP)" }].map((s) => { const Icon = s.icon; return (
                  <button key={s.id} onClick={() => setSettingsTab(s.id)} className={`flex items-center gap-2.5 w-full border-none cursor-pointer text-left border-b border-b-slate-100 ${isMobile ? "py-3.5 px-2 text-[9px]" : "py-3.5 px-4 text-xs"} font-body transition-colors ${settingsTab === s.id ? "bg-white text-purple-600 font-bold border-l-[3px] border-l-purple-600" : "bg-transparent text-slate-400 font-semibold border-l-[3px] border-l-transparent hover:bg-white/60"}`}>
                    <Icon size={isMobile ? 16 : 18} /> {!isMobile && s.l}
                  </button>);
                })}
              </div>
              <div className={`flex-1 min-w-0 overflow-y-auto ${isMobile ? "p-4" : "p-6"}`}>
                {settingsTab === "mpesa" && (<>
                  <SecTitle>M-Pesa Configuration</SecTitle>
                  <div className="mb-2.5"><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Environment</p>
                    <select value={settings.mpesa_environment || "sandbox"} onChange={(e) => setSettings((p) => ({ ...p, mpesa_environment: e.target.value }))} className={inputCls}><option value="sandbox">Sandbox (Testing)</option><option value="production">Production (Live)</option></select>
                  </div>
                  {[{ k: "mpesa_consumer_key", l: "Consumer Key", p: "Enter M-Pesa consumer key" }, { k: "mpesa_consumer_secret", l: "Consumer Secret", p: "Enter M-Pesa consumer secret" }, { k: "mpesa_shortcode", l: "Business Shortcode", p: "e.g. 174379" }, { k: "mpesa_passkey", l: "Passkey", p: "Enter M-Pesa passkey" }, { k: "mpesa_callback_url", l: "Callback URL", p: "e.g. https://elimuai.africa/api/payments/mpesa/callback" }].map((f) => (<div key={f.k} className="mb-2.5"><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">{f.l}</p><input value={settings[f.k] || ""} onChange={(e) => setSettings((p) => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} type={f.k.includes("secret") || f.k.includes("passkey") ? "password" : "text"} className={inputCls} /></div>))}
                </>)}
                {settingsTab === "sms" && (<>
                  <SecTitle>Africa&apos;s Talking (SMS)</SecTitle>
                  <div className="mb-2.5"><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Environment</p>
                    <select value={settings.at_environment || "sandbox"} onChange={(e) => setSettings((p) => ({ ...p, at_environment: e.target.value }))} className={inputCls}><option value="sandbox">Sandbox (Testing)</option><option value="production">Production (Live)</option></select>
                  </div>
                  {[{ k: "at_api_key", l: "API Key", p: "Enter API key" }, { k: "at_username", l: "Username", p: "e.g. sandbox" }, { k: "at_sender_id", l: "Sender ID (optional)", p: "e.g. ElimuAI" }].map((f) => (<div key={f.k} className="mb-2.5"><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">{f.l}</p><input value={settings[f.k] || ""} onChange={(e) => setSettings((p) => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} type={f.k.includes("key") ? "password" : "text"} className={inputCls} /></div>))}
                </>)}
                {settingsTab === "billing" && (<>
                  <SecTitle>Trial & Billing Plans</SecTitle>
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-3 mb-3">
                    <div><p className="text-slate-900 text-[13px] font-body font-extrabold m-0">Billing System</p><p className="text-slate-400 text-[10px] font-body mt-0.5 mb-0">Enable or disable payment gate</p></div>
                    <div onClick={() => setSettings((p) => ({ ...p, billing_enabled: p.billing_enabled === "false" ? "true" : "false" }))} className={`w-11 h-6 rounded-xl cursor-pointer relative transition-colors duration-200 ${settings.billing_enabled === "false" ? "bg-slate-100" : "bg-emerald-500"}`}><div className="w-5 h-5 rounded-[10px] bg-white absolute top-[2px] shadow-sm transition-[left] duration-200" style={{ left: settings.billing_enabled === "false" ? 2 : 22 }} /></div>
                  </div>
                  <div className="mb-2.5"><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Free Trial Days</p><input value={settings.trial_days || ""} onChange={(e) => setSettings((p) => ({ ...p, trial_days: e.target.value }))} placeholder="e.g. 7" type="number" className={inputCls} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ role: "school", label: "School", ak: "school_subscription_amount", dk: "school_subscription_days" }, { role: "teacher", label: "Teacher", ak: "teacher_subscription_amount", dk: "teacher_subscription_days" }, { role: "parent", label: "Parent", ak: "parent_subscription_amount", dk: "parent_subscription_days" }, { role: "student", label: "Student", ak: "student_subscription_amount", dk: "student_subscription_days" }].map((p) => (<div key={p.role} className="bg-slate-50 rounded-[10px] p-2.5">
                      <p className="text-purple-600 text-[11px] font-body font-extrabold mb-1.5 mt-0">{p.label}</p>
                      <p className="text-slate-400 text-[9px] font-body font-bold mb-[3px] mt-0">Monthly (KES)</p>
                      <input value={settings[p.ak] || ""} onChange={(e) => setSettings((s) => ({ ...s, [p.ak]: e.target.value }))} type="number" placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg py-[7px] px-2.5 text-slate-900 text-xs font-body outline-none box-border mb-1" />
                      <p className="text-slate-400 text-[9px] font-body font-bold mb-[3px] mt-0">Duration (days)</p>
                      <input value={settings[p.dk] || ""} onChange={(e) => setSettings((s) => ({ ...s, [p.dk]: e.target.value }))} type="number" placeholder="30" className="w-full bg-white border border-slate-200 rounded-lg py-[7px] px-2.5 text-slate-900 text-xs font-body outline-none box-border" />
                    </div>))}
                  </div>
                  <div className="mt-2.5">
                    <p className="text-slate-400 text-[10px] font-body font-bold mb-1.5 mt-0">Billing Cycle Discounts (%)</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ k: "billing_quarterly_discount", l: "Quarterly" }, { k: "billing_semi_annual_discount", l: "Semi-Annual" }, { k: "billing_annual_discount", l: "Annual" }].map((d) => (<div key={d.k}><p className="text-slate-400 text-[9px] font-body font-bold mb-[3px] mt-0">{d.l}</p><input value={settings[d.k] || ""} onChange={(e) => setSettings((s) => ({ ...s, [d.k]: e.target.value }))} type="number" placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg py-[7px] px-2.5 text-slate-900 text-xs font-body outline-none box-border" /></div>))}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-[10px] p-2.5 mt-2"><p className="text-purple-600 text-[10px] font-body font-bold m-0">Users get {settings.trial_days || 7} free trial days. They can choose monthly, quarterly ({settings.billing_quarterly_discount || 10}% off), semi-annual ({settings.billing_semi_annual_discount || 15}% off), or annual ({settings.billing_annual_discount || 20}% off) billing.</p></div>
                </>)}
                {settingsTab === "email" && (<>
                  <SecTitle>Email (SMTP)</SecTitle>
                  {[{ k: "smtp_host", l: "SMTP Host", p: "e.g. smtp.gmail.com" }, { k: "smtp_port", l: "SMTP Port", p: "587" }, { k: "smtp_user", l: "SMTP User / Email", p: "e.g. noreply@elimuai.africa" }, { k: "smtp_pass", l: "SMTP Password", p: "Enter password", secret: true }, { k: "smtp_from_name", l: "From Name", p: "e.g. ElimuAI" }, { k: "smtp_from_email", l: "From Email", p: "e.g. noreply@elimuai.africa" }].map((f) => (<div key={f.k} className="mb-2.5"><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">{f.l}</p><input value={settings[f.k] || ""} onChange={(e) => setSettings((p) => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} type={f.secret ? "password" : "text"} className={inputCls} /></div>))}
                  <div className="bg-emerald-50 rounded-[10px] p-2.5"><p className="text-emerald-500 text-[10px] font-body font-bold m-0 flex items-center gap-1"><Mail size={12} /> Configure SMTP for invoice emails and payment confirmations.</p></div>
                </>)}
              </div>
            </div>
            <button onClick={saveSettings} className="py-2.5 px-5 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-xs font-body font-bold shadow-sm shadow-purple-600/25 hover:shadow-lg transition-shadow flex items-center gap-2 mt-5"><CheckCircle size={16} /> Save Settings</button>
            {settingsSaved && <p className="text-emerald-500 text-xs font-body font-bold text-center mt-3 mb-0 flex items-center justify-center gap-1"><CheckCircle size={14} /> Settings saved!</p>}
          </>)}
        </>)}

        {/* USERS TAB */}
        {tab === "Users" && (<>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center"><Users size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{usersTotal} Users</h4></div>
                <div className="flex items-center gap-2 flex-wrap">
                  {searchBox(usersSearch, (e) => { setUsersSearch(e.target.value); setUsersPage(1); }, "Search by name, email...")}
                  <button onClick={() => { setCreateUserMsg(""); setShowCreateUser(true); }} className="py-2 px-4 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[11px] font-body font-bold shadow-sm shadow-purple-600/25 hover:shadow-lg transition-shadow shrink-0 flex items-center gap-1.5"><Plus size={14} /> Create User</button>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {["", "student", "teacher", "parent", "admin", "super_admin"].map((f) => (<button key={f || "all"} onClick={() => { setUsersRoleFilter(f); setUsersPage(1); }} className={tblFilterBtn(usersRoleFilter === f)}>{f || "All"}</button>))}
              </div>
            </div>
            {resetMsg && <p className="text-emerald-500 text-[11px] font-body font-bold mx-5 mt-3 mb-0 px-2.5 py-1.5 bg-emerald-50 rounded-lg">{resetMsg}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80">
                  <tr><th className={thCls}>User</th><th className={thCls}>Contact</th><th className={thCls}>Role</th><th className={thCls}>Plan</th><th className={thCls}>XP</th><th className={thCls}>Status</th><th className={thCls}>Actions</th></tr>
                </thead>
                <tbody>
                  {usersLoading && tblSkeleton(7)}
                  {!usersLoading && adminUsers.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 text-xs font-body py-10">No users found</td></tr>}
                  {!usersLoading && adminUsers.map((u) => (
                    <tr key={u.id} className={`${trCls} cursor-pointer`} onClick={() => openUserDetail(u.id)}>
                      <td className={tdCls}><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">{(u.name || "?")[0]}</div><p className="text-slate-900 text-[12px] font-body font-bold m-0">{u.name}</p></div></td>
                      <td className={tdCls}><p className="text-slate-500 text-[11px] font-body m-0">{u.email || u.phone || "—"}</p></td>
                      <td className={tdCls} onClick={(e) => e.stopPropagation()}><select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-slate-700 text-[10px] font-body outline-none cursor-pointer">{["student", "teacher", "parent", "admin", "super_admin"].map((r) => (<option key={r} value={r}>{r}</option>))}</select></td>
                      <td className={`${tdCls} text-slate-400`}>{u.plan}</td>
                      <td className={`${tdCls} text-slate-900 font-bold`}>{u.total_xp || 0}</td>
                      <td className={tdCls}><Badge color={u.is_active ? C.accent : C.error}>{u.is_active ? "Active" : "Inactive"}</Badge></td>
                      <td className={tdCls}><div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleActive(u.id)} className={`py-1 px-2.5 rounded-lg text-[10px] font-body font-bold cursor-pointer border transition-colors ${u.is_active ? "border-red-500/20 bg-rose-50 text-red-500 hover:bg-red-100" : "border-emerald-500/20 bg-emerald-50 text-emerald-500 hover:bg-emerald-100"}`}>{u.is_active ? "Deactivate" : "Activate"}</button>
                        <button onClick={() => { setShowResetPw(u); setResetPwInput(""); setResetMsg(""); }} className="py-1 px-2.5 rounded-lg border border-purple-600/20 bg-purple-50 text-purple-600 text-[10px] font-body font-bold cursor-pointer flex items-center gap-1 hover:bg-purple-100 transition-colors"><Key size={10} /> Password</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!usersLoading && <div className="flex justify-between items-center p-4 border-t border-slate-100">
              <span className="text-slate-400 text-[11px] font-body">{usersTotal} record{usersTotal !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2.5">
                <button disabled={usersPage <= 1} onClick={() => setUsersPage((p) => p - 1)} className={pagBtn(usersPage <= 1)}>Prev</button>
                <span className="text-slate-400 text-[11px] font-body">Page {usersPage} of {Math.max(1, Math.ceil(usersTotal / 20))}</span>
                <button disabled={usersPage * 20 >= usersTotal} onClick={() => setUsersPage((p) => p + 1)} className={pagBtn(usersPage * 20 >= usersTotal)}>Next</button>
              </div>
            </div>}
          </div>
          {/* Change Password Modal */}
          {showResetPw && <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-5">
            <div className="bg-white border border-slate-200 rounded-[20px] p-[22px] w-full max-w-[380px] shadow-xl">
              <div className="flex justify-between mb-3.5"><h3 className="text-slate-900 font-heading font-black m-0">Change Password</h3><button onClick={() => setShowResetPw(null)} className="bg-transparent border-none text-slate-400 cursor-pointer"><X size={20} /></button></div>
              <p className="text-slate-400 text-[11px] font-body mb-3 mt-0">User: <strong className="text-slate-900">{showResetPw.name}</strong> ({showResetPw.email})</p>
              <p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">New Password *</p>
              <input type="password" value={resetPwInput} onChange={(e) => setResetPwInput(e.target.value)} placeholder="Min 8 characters" className={`${inputCls} mb-3`} />
              <button onClick={() => { if (resetPwInput.length < 8) { setResetMsg("Password must be at least 8 characters"); return; } resetPassword(showResetPw.id, resetPwInput); }} disabled={resetPwSaving} className={`${btnPrimary} ${resetPwSaving ? "opacity-60" : ""}`}>{resetPwSaving ? "Saving..." : "Set New Password"}</button>
            </div>
          </div>}
          {/* Create User Modal */}
          {showCreateUser && <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-5 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-[20px] p-[22px] w-full max-w-[440px] max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex justify-between mb-3.5"><h3 className="text-slate-900 font-heading font-black m-0">Create User</h3><button onClick={() => setShowCreateUser(false)} className="bg-transparent border-none text-slate-400 cursor-pointer"><X size={20} /></button></div>
              {createUserMsg && <p className="text-red-500 text-[11px] font-body font-bold mb-2 mt-0 px-2.5 py-1.5 bg-rose-50 rounded-lg">{createUserMsg}</p>}
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2"><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Full Name *</p><input value={createUserForm.name} onChange={(e) => setCreateUserForm((p) => ({ ...p, name: e.target.value }))} placeholder="John Doe" className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Email *</p><input type="email" value={createUserForm.email} onChange={(e) => setCreateUserForm((p) => ({ ...p, email: e.target.value }))} placeholder="user@example.com" className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Phone</p><input value={createUserForm.phone} onChange={(e) => setCreateUserForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+254..." className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Password *</p><input type="password" value={createUserForm.password} onChange={(e) => setCreateUserForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min 8 chars" className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Role *</p><select value={createUserForm.role} onChange={(e) => setCreateUserForm((p) => ({ ...p, role: e.target.value }))} className={inputCls}>{["student", "teacher", "parent", "admin", "super_admin"].map((r) => (<option key={r} value={r}>{r}</option>))}</select></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Country</p><input value={createUserForm.country} onChange={(e) => setCreateUserForm((p) => ({ ...p, country: e.target.value }))} placeholder="KE" className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Grade Level</p><input value={createUserForm.grade_level} onChange={(e) => setCreateUserForm((p) => ({ ...p, grade_level: e.target.value }))} placeholder="e.g. Grade 5" className={inputCls} /></div>
              </div>
              <button onClick={createUser} disabled={createUserSaving} className={`${btnPrimary} mt-3.5 ${createUserSaving ? "opacity-60" : ""}`}>{createUserSaving ? "Creating..." : "Create User"}</button>
            </div>
          </div>}
        </>)}

        {/* USER DETAIL PAGE */}
        {tab === "UserDetail" && (<>
          <button onClick={() => setTab("Users")} className="flex items-center gap-1.5 text-purple-600 text-[12px] font-body font-bold mb-4 bg-transparent border-none cursor-pointer hover:text-purple-800 transition-colors p-0"><ArrowLeft size={16} /> Back to Users</button>
          {viewUserLoading && <Spinner />}
          {!viewUserLoading && viewUserData?.user && (() => { const u = viewUserData.user; const detailTabs = [{ id: "overview", l: "Overview", icon: User }, { id: "transactions", l: "Transactions", icon: CreditCard }, { id: "subscriptions", l: "Subscriptions", icon: Receipt }, { id: "ai", l: "AI Usage", icon: Bot }, { id: "admin", l: "Admin Actions", icon: Shield }]; if (u.school_id && viewUserData.schoolMembers) detailTabs.push({ id: "school", l: "School", icon: School }); return (<>
            {/* User Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">{(u.name || "?")[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-900 text-lg font-heading font-black m-0">{u.name}</h3>
                  <p className="text-slate-400 text-[12px] font-body m-0 mt-0.5">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge color={C.primary}>{u.role}</Badge>
                    <Badge color={u.is_active ? C.accent : C.error}>{u.is_active ? "Active" : "Inactive"}</Badge>
                    <Badge color={C.secondary}>{u.plan || "free"}</Badge>
                    {u.country && <Badge color="#64748b">{u.country}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => { setShowResetPw(u); setResetPwInput(""); setResetMsg(""); }} className="py-1.5 px-3 rounded-lg border border-purple-600/20 bg-purple-50 text-purple-600 text-[10px] font-body font-bold cursor-pointer flex items-center gap-1 hover:bg-purple-100 transition-colors"><Key size={12} /> Reset Password</button>
                  <button onClick={() => toggleActive(u.id)} className={`py-1.5 px-3 rounded-lg text-[10px] font-body font-bold cursor-pointer border transition-colors ${u.is_active ? "border-red-500/20 bg-rose-50 text-red-500 hover:bg-red-100" : "border-emerald-500/20 bg-emerald-50 text-emerald-500 hover:bg-emerald-100"}`}>{u.is_active ? "Deactivate" : "Activate"}</button>
                </div>
              </div>
              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-100">
                {[
                  { l: "Total XP", v: Number(u.total_xp || 0).toLocaleString(), icon: Star, c: "bg-amber-500" },
                  { l: "Streak", v: `${u.streak_days || 0} days`, icon: Flame, c: "bg-orange-500" },
                  { l: "Grade", v: u.grade_level || "—", icon: GraduationCap, c: "bg-purple-600" },
                  { l: "Joined", v: u.created_at ? new Date(u.created_at).toLocaleDateString() : "—", icon: Clock, c: "bg-slate-500" },
                ].map((s) => { const Icon = s.icon; return (
                  <div key={s.l} className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${s.c} flex items-center justify-center shrink-0`}><Icon size={14} color="#fff" /></div>
                    <div><p className="text-slate-900 text-sm font-body font-black m-0">{s.v}</p><p className="text-slate-400 text-[9px] font-body m-0">{s.l}</p></div>
                  </div>);
                })}
              </div>
            </div>
            {/* Sub-tabs */}
            <div className="flex gap-1.5 mb-5 flex-wrap">
              {detailTabs.map((t) => { const Icon = t.icon; return (
                <button key={t.id} onClick={() => setUserDetailTab(t.id)} className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-[11px] font-body font-bold cursor-pointer border transition-colors ${userDetailTab === t.id ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"}`}><Icon size={14} /> {t.l}</button>
              ); })}
            </div>

            {/* OVERVIEW SUB-TAB */}
            {userDetailTab === "overview" && (<div className="space-y-5">
              {/* Account Details */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><User size={14} className="text-purple-600" /> Account Details</h4></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 p-5">
                  {[
                    { l: "Curriculum", v: u.curriculum || "—" },
                    { l: "Language", v: u.language === "sw" ? "Swahili" : "English" },
                    { l: "Email Verified", v: u.email_verified ? "Yes" : "No" },
                    { l: "Phone Verified", v: u.phone_verified ? "Yes" : "No" },
                    { l: "Plan Expires", v: u.plan_expires ? new Date(u.plan_expires).toLocaleDateString() : "—" },
                    { l: "Trial Expires", v: u.trial_expires ? new Date(u.trial_expires).toLocaleDateString() : "—" },
                    { l: "Last Login", v: u.last_login ? new Date(u.last_login).toLocaleString() : "Never" },
                    { l: "User ID", v: u.id?.slice(0, 8) + "..." },
                  ].map((f) => (<div key={f.l}><p className="text-slate-400 text-[9px] font-body font-bold m-0 uppercase tracking-wider">{f.l}</p><p className="text-slate-900 text-[12px] font-body font-bold m-0 mt-0.5">{f.v}</p></div>))}
                </div>
              </div>
              {/* Subject Scores */}
              {viewUserData.subjects?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><BookOpen size={14} className="text-purple-600" /> Subject Scores</h4></div>
                  <div className="flex gap-2.5 flex-wrap p-5">
                    {viewUserData.subjects.map((s, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl px-4 py-3 min-w-[130px]">
                        <p className="text-slate-900 text-[11px] font-body font-bold m-0">{s.subject_name}</p>
                        <p className="text-purple-600 text-xl font-heading font-black m-0 mt-0.5">{Number(s.avg_score).toFixed(0)}%</p>
                        <p className="text-slate-400 text-[9px] font-body m-0">{s.attempts} attempt{s.attempts !== 1 ? "s" : ""}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Recent Activity */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><Clock size={14} className="text-purple-600" /> Recent Activity</h4></div>
                {viewUserData.activity?.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {viewUserData.activity.map((a, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold ${a.activity_type === "exam" ? "bg-violet-500" : a.activity_type === "tutor" ? "bg-purple-500" : a.activity_type === "homework" ? "bg-amber-500" : "bg-emerald-500"}`}>{a.activity_type?.[0]?.toUpperCase()}</div>
                          <div>
                            <p className="text-slate-900 text-[12px] font-body font-bold m-0">{a.subject_name || a.activity_type}</p>
                            <p className="text-slate-400 text-[10px] font-body m-0">{a.activity_type} · {a.duration_mins}min · +{a.xp_earned} XP</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {a.score != null && <p className="text-slate-900 text-[13px] font-body font-bold m-0">{Number(a.score).toFixed(0)}%</p>}
                          <p className="text-slate-400 text-[9px] font-body m-0">{a.logged_date ? new Date(a.logged_date).toLocaleDateString() : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-[11px] font-body text-center py-8">No activity recorded yet.</p>}
              </div>
            </div>)}

            {/* TRANSACTIONS SUB-TAB */}
            {userDetailTab === "transactions" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><CreditCard size={14} className="text-purple-600" /> Payments ({viewUserData.payments?.length || 0})</h4></div>
                {viewUserData.payments?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80"><tr><th className={thCls}>Amount</th><th className={thCls}>Plan</th><th className={thCls}>Cycle</th><th className={thCls}>Method</th><th className={thCls}>Phone</th><th className={thCls}>Receipt</th><th className={thCls}>Status</th><th className={thCls}>Date</th></tr></thead>
                      <tbody>
                        {viewUserData.payments.map((p, i) => (
                          <tr key={i} className={trCls}>
                            <td className={`${tdCls} font-bold`}>{p.currency || "KES"} {Number(p.amount).toLocaleString()}</td>
                            <td className={`${tdCls} capitalize`}>{p.plan || "—"}</td>
                            <td className={`${tdCls} capitalize`}>{p.billing_cycle || "—"}</td>
                            <td className={`${tdCls} capitalize`}>{p.method || "—"}</td>
                            <td className={tdCls}>{p.phone_number || "—"}</td>
                            <td className={tdCls}><span className="text-purple-600 text-[10px] font-mono">{p.mpesa_receipt || "—"}</span></td>
                            <td className={tdCls}><Badge color={p.status === "completed" ? C.accent : p.status === "pending" ? C.secondary : C.error}>{p.status}</Badge></td>
                            <td className={tdCls}>{new Date(p.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-slate-400 text-[11px] font-body text-center py-8">No payments found.</p>}
              </div>
            )}

            {/* SUBSCRIPTIONS SUB-TAB */}
            {userDetailTab === "subscriptions" && (<div className="space-y-5">
              {/* Current Plan */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><Shield size={14} className="text-purple-600" /> Current Subscription</h4></div>
                <div className="p-5">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="bg-purple-600 text-white rounded-xl px-5 py-4 min-w-[160px]">
                      <p className="text-white/70 text-[10px] font-body m-0 uppercase tracking-wider">Current Plan</p>
                      <p className="text-white text-xl font-heading font-black m-0 mt-0.5 capitalize">{u.plan || "Free"}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[12px] font-body"><span className="text-slate-400 w-28">Plan Expires:</span><span className="text-slate-900 font-bold">{u.plan_expires ? new Date(u.plan_expires).toLocaleDateString() : "—"}</span></div>
                      <div className="flex items-center gap-2 text-[12px] font-body"><span className="text-slate-400 w-28">Trial Expires:</span><span className="text-slate-900 font-bold">{u.trial_expires ? new Date(u.trial_expires).toLocaleDateString() : "—"}</span></div>
                      <div className="flex items-center gap-2 text-[12px] font-body"><span className="text-slate-400 w-28">Status:</span><Badge color={u.is_active ? C.accent : C.error}>{u.is_active ? "Active" : "Inactive"}</Badge></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Invoices */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><Receipt size={14} className="text-purple-600" /> Invoices ({viewUserData.invoices?.length || 0})</h4></div>
                {viewUserData.invoices?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80"><tr><th className={thCls}>Invoice #</th><th className={thCls}>Plan</th><th className={thCls}>Cycle</th><th className={thCls}>Amount</th><th className={thCls}>Period</th><th className={thCls}>Due</th><th className={thCls}>Coupon</th><th className={thCls}>Status</th></tr></thead>
                      <tbody>
                        {viewUserData.invoices.map((inv, i) => (
                          <tr key={i} className={trCls}>
                            <td className={tdCls}><span className="text-purple-600 text-[11px] font-mono font-bold">{inv.invoice_number}</span></td>
                            <td className={`${tdCls} capitalize`}>{inv.plan}</td>
                            <td className={`${tdCls} capitalize`}>{inv.billing_cycle}</td>
                            <td className={`${tdCls} font-bold`}>{inv.currency || "KES"} {Number(inv.amount).toLocaleString()}{inv.coupon_discount > 0 ? <span className="text-emerald-500 text-[9px] block">-{Number(inv.coupon_discount).toLocaleString()} discount</span> : ""}</td>
                            <td className={tdCls}><span className="text-[10px]">{inv.period_start ? new Date(inv.period_start).toLocaleDateString() : ""} – {inv.period_end ? new Date(inv.period_end).toLocaleDateString() : ""}</span></td>
                            <td className={tdCls}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td>
                            <td className={tdCls}>{inv.coupon_code ? <span className="text-violet-600 text-[10px] font-mono font-bold">{inv.coupon_code}</span> : "—"}</td>
                            <td className={tdCls}><Badge color={inv.status === "paid" ? C.accent : inv.status === "pending" ? C.secondary : C.error}>{inv.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-slate-400 text-[11px] font-body text-center py-8">No invoices found.</p>}
              </div>
            </div>)}

            {/* AI USAGE SUB-TAB */}
            {userDetailTab === "ai" && (<div className="space-y-5">
              {/* AI Stats */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><Bot size={14} className="text-purple-600" /> AI Usage Summary</h4></div>
                <div className="grid grid-cols-3 gap-3 p-5">
                  {[
                    { l: "Total Sessions", v: Number(viewUserData.aiStats?.total_sessions || 0).toLocaleString(), icon: MessageSquare, c: "bg-purple-500" },
                    { l: "Total Messages", v: Number(viewUserData.aiStats?.total_messages || 0).toLocaleString(), icon: Send, c: "bg-violet-500" },
                    { l: "AI XP Earned", v: Number(viewUserData.aiStats?.total_ai_xp || 0).toLocaleString(), icon: Zap, c: "bg-amber-500" },
                  ].map((s) => { const Icon = s.icon; return (
                    <div key={s.l} className="bg-slate-50 rounded-xl p-4 text-center">
                      <div className={`w-10 h-10 rounded-xl ${s.c} flex items-center justify-center mx-auto mb-2`}><Icon size={18} color="#fff" /></div>
                      <p className="text-slate-900 text-lg font-heading font-black m-0">{s.v}</p>
                      <p className="text-slate-400 text-[9px] font-body m-0">{s.l}</p>
                    </div>);
                  })}
                </div>
              </div>
              {/* AI Sessions List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><Clock size={14} className="text-purple-600" /> Recent AI Sessions ({viewUserData.aiSessions?.length || 0})</h4></div>
                {viewUserData.aiSessions?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80"><tr><th className={thCls}>Type</th><th className={thCls}>Language</th><th className={thCls}>Messages</th><th className={thCls}>XP Earned</th><th className={thCls}>Started</th><th className={thCls}>Last Active</th></tr></thead>
                      <tbody>
                        {viewUserData.aiSessions.map((s, i) => (
                          <tr key={i} className={trCls}>
                            <td className={tdCls}><Badge color={s.type === "tutor" ? C.primary : s.type === "exam_help" ? C.purple : C.accent}>{s.type}</Badge></td>
                            <td className={`${tdCls} uppercase`}>{s.language}</td>
                            <td className={`${tdCls} font-bold`}>{s.message_count}</td>
                            <td className={`${tdCls} font-bold text-amber-600`}>+{s.xp_earned}</td>
                            <td className={tdCls}>{new Date(s.created_at).toLocaleDateString()}</td>
                            <td className={tdCls}>{new Date(s.updated_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-slate-400 text-[11px] font-body text-center py-8">No AI sessions found.</p>}
              </div>
            </div>)}

            {/* ADMIN ACTIONS SUB-TAB */}
            {userDetailTab === "admin" && (<div className="space-y-5">
              {adminActionMsg && <div className={`px-4 py-2.5 rounded-xl text-[12px] font-body font-bold ${adminActionMsg.includes("Failed") || adminActionMsg.includes("failed") || adminActionMsg.includes("error") || adminActionMsg.includes("Error") ? "bg-rose-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>{adminActionMsg}</div>}
              {/* Upgrade / Cancel Subscription */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><CreditCard size={14} className="text-purple-600" /> Manage Subscription</h4></div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4 bg-slate-50 rounded-xl p-3">
                    <div><p className="text-slate-400 text-[9px] font-body font-bold m-0 uppercase">Current Plan</p><p className="text-slate-900 text-sm font-body font-black m-0 capitalize">{u.plan || "free"}</p></div>
                    <div><p className="text-slate-400 text-[9px] font-body font-bold m-0 uppercase">Expires</p><p className="text-slate-900 text-sm font-body font-black m-0">{u.plan_expires ? new Date(u.plan_expires).toLocaleDateString() : "—"}</p></div>
                  </div>
                  <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Plan</p><select value={upgradeForm.plan} onChange={(e) => setUpgradeForm((p) => ({ ...p, plan: e.target.value }))} className={inputCls}>{["free", "basic", "premium", "enterprise"].map((p) => (<option key={p} value={p}>{p}</option>))}</select></div>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Duration (days)</p><input type="number" value={upgradeForm.days} onChange={(e) => setUpgradeForm((p) => ({ ...p, days: e.target.value }))} placeholder="30" className={inputCls} /></div>
                    <div className="flex items-end gap-2">
                      <button onClick={() => adminAction(`/api/admin/users/${u.id}/subscription`, "PUT", upgradeForm, "Subscription upgraded!")} disabled={adminActionLoading} className="py-2.5 px-4 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[11px] font-body font-bold shadow-sm hover:shadow-lg transition-shadow flex items-center gap-1.5"><TrendingUp size={13} /> Upgrade</button>
                      <button onClick={() => { if (confirm("Cancel this user's subscription?")) adminAction(`/api/admin/users/${u.id}/subscription`, "DELETE", null, "Subscription cancelled"); }} disabled={adminActionLoading} className="py-2.5 px-4 rounded-xl border border-red-500/20 bg-rose-50 text-red-500 text-[11px] font-body font-bold cursor-pointer hover:bg-red-100 transition-colors flex items-center gap-1.5"><X size={13} /> Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Reset Credentials */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><Key size={14} className="text-amber-600" /> Reset Credentials</h4></div>
                <div className="p-5">
                  <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Email</p><input type="email" value={credForm.email || u.email || ""} onChange={(e) => setCredForm((p) => ({ ...p, email: e.target.value }))} placeholder="user@email.com" className={inputCls} /></div>
                    <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Phone</p><input value={credForm.phone || u.phone || ""} onChange={(e) => setCredForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+254..." className={inputCls} /></div>
                    <div className="flex items-end gap-2">
                      <button onClick={() => adminAction(`/api/admin/users/${u.id}/reset-credentials`, "PUT", { email: credForm.email || u.email, phone: credForm.phone || u.phone }, "Credentials updated!")} disabled={adminActionLoading} className="py-2.5 px-4 rounded-xl border-none cursor-pointer bg-amber-500 text-white text-[11px] font-body font-bold shadow-sm hover:shadow-lg transition-shadow flex items-center gap-1.5"><CheckCircle size={13} /> Update</button>
                      <button onClick={() => { setShowResetPw(u); setResetPwInput(""); setResetMsg(""); }} className="py-2.5 px-4 rounded-xl border border-purple-600/20 bg-purple-50 text-purple-600 text-[11px] font-body font-bold cursor-pointer hover:bg-purple-100 transition-colors flex items-center gap-1.5"><Key size={13} /> Password</button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Verification & 2FA */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><Shield size={14} className="text-emerald-600" /> Verification & 2FA</h4></div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                    <div><p className="text-slate-900 text-[12px] font-body font-bold m-0">Email Verification</p><p className="text-slate-400 text-[10px] font-body m-0 mt-0.5">{u.email || "No email"} — {u.email_verified ? "Verified" : "Not verified"}</p></div>
                    <button onClick={() => adminAction(`/api/admin/users/${u.id}/send-verification`, "POST", { type: "email" }, "Email verified!")} disabled={adminActionLoading || u.email_verified} className={`py-1.5 px-3 rounded-lg text-[10px] font-body font-bold cursor-pointer border transition-colors ${u.email_verified ? "border-emerald-500/20 bg-emerald-50 text-emerald-500" : "border-purple-600/20 bg-purple-50 text-purple-600 hover:bg-purple-100"}`}>{u.email_verified ? <><CheckCircle size={11} /> Verified</> : <><Mail size={11} /> Verify</>}</button>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                    <div><p className="text-slate-900 text-[12px] font-body font-bold m-0">Phone Verification</p><p className="text-slate-400 text-[10px] font-body m-0 mt-0.5">{u.phone || "No phone"} — {u.phone_verified ? "Verified" : "Not verified"}</p></div>
                    <button onClick={() => adminAction(`/api/admin/users/${u.id}/send-verification`, "POST", { type: "phone" }, "Phone verified!")} disabled={adminActionLoading || u.phone_verified} className={`py-1.5 px-3 rounded-lg text-[10px] font-body font-bold cursor-pointer border transition-colors ${u.phone_verified ? "border-emerald-500/20 bg-emerald-50 text-emerald-500" : "border-purple-600/20 bg-purple-50 text-purple-600 hover:bg-purple-100"}`}>{u.phone_verified ? <><CheckCircle size={11} /> Verified</> : <><Smartphone size={11} /> Verify</>}</button>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                    <div><p className="text-slate-900 text-[12px] font-body font-bold m-0">Two-Factor Authentication</p><p className="text-slate-400 text-[10px] font-body m-0 mt-0.5">{u.email_verified ? "2FA is enabled" : "2FA is disabled"}</p></div>
                    <button onClick={() => adminAction(`/api/admin/users/${u.id}/2fa`, "PUT", { enabled: !u.email_verified }, u.email_verified ? "2FA disabled" : "2FA enabled!")} disabled={adminActionLoading} className={`py-1.5 px-3 rounded-lg text-[10px] font-body font-bold cursor-pointer border transition-colors flex items-center gap-1 ${u.email_verified ? "border-red-500/20 bg-rose-50 text-red-500 hover:bg-red-100" : "border-emerald-500/20 bg-emerald-50 text-emerald-500 hover:bg-emerald-100"}`}><Shield size={11} /> {u.email_verified ? "Disable" : "Enable"}</button>
                  </div>
                </div>
              </div>
            </div>)}

            {/* SCHOOL SUB-TAB */}
            {userDetailTab === "school" && viewUserData.school && (<div className="space-y-5">
              {/* School Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><School size={14} className="text-purple-600" /> {viewUserData.school.name}</h4></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 p-5">
                  {[
                    { l: "Country", v: viewUserData.school.country || "—" },
                    { l: "County", v: viewUserData.school.county || "—" },
                    { l: "Curriculum", v: viewUserData.school.curriculum || "—" },
                    { l: "Plan", v: viewUserData.school.plan || "free" },
                    { l: "Plan Expires", v: viewUserData.school.plan_expires ? new Date(viewUserData.school.plan_expires).toLocaleDateString() : "—" },
                    { l: "Status", v: viewUserData.school.is_active ? "Active" : "Inactive" },
                  ].map((f) => (<div key={f.l}><p className="text-slate-400 text-[9px] font-body font-bold m-0 uppercase tracking-wider">{f.l}</p><p className="text-slate-900 text-[12px] font-body font-bold m-0 mt-0.5 capitalize">{f.v}</p></div>))}
                </div>
              </div>
              {/* Teachers */}
              {(() => { const teachers = (viewUserData.schoolMembers || []).filter((m) => m.role === "teacher"); return teachers.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><BookOpen size={14} className="text-emerald-500" /> Teachers ({teachers.length})</h4></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80"><tr><th className={thCls}>Name</th><th className={thCls}>Contact</th><th className={thCls}>XP</th><th className={thCls}>Streak</th><th className={thCls}>Last Login</th><th className={thCls}>Status</th></tr></thead>
                      <tbody>
                        {teachers.map((m) => (
                          <tr key={m.id} className={`${trCls} cursor-pointer`} onClick={() => openUserDetail(m.id)}>
                            <td className={tdCls}><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{(m.name || "?")[0]}</div><p className="text-slate-900 text-[11px] font-body font-bold m-0">{m.name}</p></div></td>
                            <td className={tdCls}><p className="text-slate-500 text-[10px] font-body m-0">{m.email || m.phone || "—"}</p></td>
                            <td className={`${tdCls} font-bold`}>{m.total_xp || 0}</td>
                            <td className={tdCls}>{m.streak_days || 0}d</td>
                            <td className={tdCls}>{m.last_login ? new Date(m.last_login).toLocaleDateString() : "Never"}</td>
                            <td className={tdCls}><Badge color={m.is_active ? C.accent : C.error}>{m.is_active ? "Active" : "Inactive"}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ); })()}
              {/* Students */}
              {(() => { const students = (viewUserData.schoolMembers || []).filter((m) => m.role === "student"); return students.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100"><h4 className="text-slate-900 text-[13px] font-heading font-black m-0 flex items-center gap-2"><GraduationCap size={14} className="text-purple-600" /> Students ({students.length})</h4></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/80"><tr><th className={thCls}>Name</th><th className={thCls}>Contact</th><th className={thCls}>Grade</th><th className={thCls}>XP</th><th className={thCls}>Streak</th><th className={thCls}>Last Login</th><th className={thCls}>Status</th></tr></thead>
                      <tbody>
                        {students.map((m) => (
                          <tr key={m.id} className={`${trCls} cursor-pointer`} onClick={() => openUserDetail(m.id)}>
                            <td className={tdCls}><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{(m.name || "?")[0]}</div><p className="text-slate-900 text-[11px] font-body font-bold m-0">{m.name}</p></div></td>
                            <td className={tdCls}><p className="text-slate-500 text-[10px] font-body m-0">{m.email || m.phone || "—"}</p></td>
                            <td className={tdCls}>{m.grade_level || "—"}</td>
                            <td className={`${tdCls} font-bold`}>{m.total_xp || 0}</td>
                            <td className={tdCls}>{m.streak_days || 0}d</td>
                            <td className={tdCls}>{m.last_login ? new Date(m.last_login).toLocaleDateString() : "Never"}</td>
                            <td className={tdCls}><Badge color={m.is_active ? C.accent : C.error}>{m.is_active ? "Active" : "Inactive"}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ); })()}
              {!(viewUserData.schoolMembers || []).length && <p className="text-slate-400 text-[11px] font-body text-center py-8 bg-white rounded-2xl shadow-sm border border-slate-100">No other members found in this school.</p>}
            </div>)}
          </>); })()}
          {!viewUserLoading && !viewUserData?.user && <p className="text-red-500 text-xs font-body text-center py-10">Failed to load user details.</p>}
        </>)}

        {/* COUPONS TAB */}
        {tab === "Coupons" && (<>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center"><Tag size={15} color="#fff" /></div><h4 className="text-slate-900 text-sm font-heading font-black m-0">{couponsTotal} Coupons</h4></div>
                <button onClick={() => { setEditCoupon(null); setCouponForm({ code: "", description: "", type: "percentage", value: "", min_amount: "", max_discount: "", applicable_plans: [], applicable_cycles: [], max_uses: "", max_uses_per_user: "1", starts_at: "", expires_at: "" }); setShowCouponForm(true); }} className="py-2 px-4 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[11px] font-body font-bold shadow-sm shadow-purple-600/25 hover:shadow-lg transition-shadow flex items-center gap-1.5"><Plus size={14} /> New Coupon</button>
              </div>
            </div>
          {couponMsg && <p className="text-emerald-500 text-[11px] font-body font-bold mx-5 mt-3 mb-0 px-2.5 py-1.5 bg-emerald-50 rounded-lg">{couponMsg}</p>}
          {/* Coupon Form Modal */}
          {showCouponForm && <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-5 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-[20px] p-[22px] w-full max-w-[440px] max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex justify-between mb-3.5"><h3 className="text-slate-900 font-heading font-black m-0">{editCoupon ? "Edit Coupon" : "Create Coupon"}</h3><button onClick={() => setShowCouponForm(false)} className="bg-transparent border-none text-slate-400 cursor-pointer"><X size={20} /></button></div>
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Code *</p><input value={couponForm.code} onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. SAVE20" className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Type</p><select value={couponForm.type} onChange={(e) => setCouponForm((p) => ({ ...p, type: e.target.value }))} className={inputCls}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (KES)</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Value * {couponForm.type === "percentage" ? "(%)" : "(KES)"}</p><input value={couponForm.value} onChange={(e) => setCouponForm((p) => ({ ...p, value: e.target.value }))} type="number" placeholder={couponForm.type === "percentage" ? "e.g. 20" : "e.g. 500"} className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Max Discount (KES)</p><input value={couponForm.max_discount} onChange={(e) => setCouponForm((p) => ({ ...p, max_discount: e.target.value }))} type="number" placeholder="Optional cap" className={inputCls} /></div>
              </div>
              <div className="mt-2"><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Description</p><input value={couponForm.description} onChange={(e) => setCouponForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Back to school promo" className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Min Amount (KES)</p><input value={couponForm.min_amount} onChange={(e) => setCouponForm((p) => ({ ...p, min_amount: e.target.value }))} type="number" placeholder="0" className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Max Uses (total)</p><input value={couponForm.max_uses} onChange={(e) => setCouponForm((p) => ({ ...p, max_uses: e.target.value }))} type="number" placeholder="Unlimited" className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Max Per User</p><input value={couponForm.max_uses_per_user} onChange={(e) => setCouponForm((p) => ({ ...p, max_uses_per_user: e.target.value }))} type="number" placeholder="1" className={inputCls} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Applicable Plans</p><div className="flex gap-1 flex-wrap">{["student", "teacher", "parent", "school"].map((p) => (<button key={p} onClick={() => setCouponForm((f) => ({ ...f, applicable_plans: f.applicable_plans.includes(p) ? f.applicable_plans.filter((x) => x !== p) : [...f.applicable_plans, p] }))} className={`py-1 px-2 rounded-lg text-[9px] font-body font-bold cursor-pointer border ${couponForm.applicable_plans.includes(p) ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-200 bg-transparent text-slate-400"}`}>{p}</button>))}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Start Date</p><input value={couponForm.starts_at} onChange={(e) => setCouponForm((p) => ({ ...p, starts_at: e.target.value }))} type="datetime-local" className={`${inputCls} text-xs`} /></div>
                <div><p className="text-slate-400 text-[10px] font-body font-bold mb-1 mt-0">Expiry Date</p><input value={couponForm.expires_at} onChange={(e) => setCouponForm((p) => ({ ...p, expires_at: e.target.value }))} type="datetime-local" className={`${inputCls} text-xs`} /></div>
              </div>
              <button onClick={saveCoupon} disabled={couponSaving} className={`${btnPrimary} mt-3.5 ${couponSaving ? "opacity-60" : ""}`}>{couponSaving ? "Saving..." : (editCoupon ? "Update Coupon" : "Create Coupon")}</button>
            </div>
          </div>}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                <tr><th className={thCls}>Code</th><th className={thCls}>Type</th><th className={thCls}>Value</th><th className={thCls}>Uses</th><th className={thCls}>Plans</th><th className={thCls}>Expires</th><th className={thCls}>Status</th><th className={thCls}>Actions</th></tr>
              </thead>
              <tbody>
                {couponsLoading && tblSkeleton(8, 4)}
                {!couponsLoading && coupons.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 text-xs font-body py-10">No coupons yet. Create your first promo code!</td></tr>}
                {!couponsLoading && coupons.map((c) => (
                  <tr key={c.id} className={trCls}>
                    <td className={tdCls}><div><p className="text-purple-600 text-[12px] font-body font-black tracking-wider m-0">{c.code}</p>{c.description && <p className="text-slate-400 text-[10px] font-body m-0 mt-0.5">{c.description}</p>}</div></td>
                    <td className={`${tdCls} capitalize`}>{c.type}</td>
                    <td className={`${tdCls} text-slate-900 font-bold`}>{c.type === "percentage" ? `${Number(c.value)}%` : `KES ${Number(c.value).toLocaleString()}`}{c.max_discount ? <span className="text-slate-400 text-[9px] block">max KES {Number(c.max_discount).toLocaleString()}</span> : ""}</td>
                    <td className={tdCls}>{c.times_used || 0}{c.max_uses ? `/${c.max_uses}` : ""}</td>
                    <td className={tdCls}>{c.applicable_plans?.length ? c.applicable_plans.join(", ") : "All"}</td>
                    <td className={tdCls}>{c.expires_at ? <span className={new Date(c.expires_at) < new Date() ? "text-red-500" : "text-slate-400"}>{new Date(c.expires_at).toLocaleDateString()}</span> : "—"}</td>
                    <td className={tdCls}><Badge color={c.is_active ? C.accent : C.error}>{c.is_active ? "Active" : "Inactive"}</Badge></td>
                    <td className={tdCls}><div className="flex gap-1.5">
                      <button onClick={() => toggleCouponActive(c)} className={`py-1 px-2.5 rounded-lg text-[10px] font-body font-bold cursor-pointer border transition-colors ${c.is_active ? "border-red-500/20 bg-rose-50 text-red-500 hover:bg-red-100" : "border-emerald-500/20 bg-emerald-50 text-emerald-500 hover:bg-emerald-100"}`}>{c.is_active ? "Off" : "On"}</button>
                      <button onClick={() => { setEditCoupon(c); setCouponForm({ code: c.code, description: c.description || "", type: c.type, value: String(Number(c.value)), min_amount: c.min_amount ? String(Number(c.min_amount)) : "", max_discount: c.max_discount ? String(Number(c.max_discount)) : "", applicable_plans: c.applicable_plans || [], applicable_cycles: c.applicable_cycles || [], max_uses: c.max_uses ? String(c.max_uses) : "", max_uses_per_user: c.max_uses_per_user ? String(c.max_uses_per_user) : "1", starts_at: c.starts_at ? new Date(c.starts_at).toISOString().slice(0, 16) : "", expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : "" }); setShowCouponForm(true); }} className="py-1 px-2.5 rounded-lg border border-purple-600/20 bg-purple-50 text-purple-600 text-[10px] font-body font-bold cursor-pointer hover:bg-purple-100 transition-colors"><Edit3 size={10} /></button>
                      <button onClick={() => deleteCoupon(c.id)} className="py-1 px-2.5 rounded-lg border border-red-500/20 bg-rose-50 text-red-500 text-[10px] font-body font-bold cursor-pointer hover:bg-red-100 transition-colors"><Trash2 size={10} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!couponsLoading && <div className="flex justify-between items-center p-4 border-t border-slate-100">
            <span className="text-slate-400 text-[11px] font-body">{couponsTotal} record{couponsTotal !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2.5">
              <button disabled={couponsPage <= 1} onClick={() => setCouponsPage((p) => p - 1)} className={pagBtn(couponsPage <= 1)}>Prev</button>
              <span className="text-slate-400 text-[11px] font-body">Page {couponsPage} of {Math.max(1, Math.ceil(couponsTotal / 20))}</span>
              <button disabled={couponsPage * 20 >= couponsTotal} onClick={() => setCouponsPage((p) => p + 1)} className={pagBtn(couponsPage * 20 >= couponsTotal)}>Next</button>
            </div>
          </div>}
          </div>
        </>)}
      </div>
    </div>
  );
}

export default SchoolAdmin;
