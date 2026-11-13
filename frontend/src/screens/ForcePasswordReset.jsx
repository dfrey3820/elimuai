"use client";
// ============================================================
// ElimuAI — Forced first-login password reset
// Shown when user.must_reset_password is true (accounts created with temporary
// credentials, e.g. network managers/agents provisioned by a super admin).
// Login already enforces email-OTP as a second factor, so after setting a new
// password the account is both password- and 2FA-protected.
// ============================================================
import { useState } from "react";
import { apiPost } from "@/utils/api";
import { clearTokens } from "@/utils/auth";
import { ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, LogOut } from "lucide-react";

export default function ForcePasswordReset({ user, onDone, onLogout }) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (pwd.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pwd !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      await apiPost("/api/auth/force-reset-password", { new_password: pwd });
      onDone?.();
    } catch (e) { setError(e?.message || "Could not set password."); }
    finally { setBusy(false); }
  };

  const logout = () => { if (onLogout) onLogout(); else { clearTokens(); if (typeof window !== "undefined") window.location.assign("/login"); } };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-8 w-full max-w-[440px] shadow-xl border border-slate-100">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mb-4"><ShieldCheck size={24} color="#fff" /></div>
        <h1 className="text-slate-900 text-xl font-heading font-black m-0 mb-1">Set your password</h1>
        <p className="text-slate-500 text-[13px] font-body mb-5">
          Welcome{user?.name ? `, ${user.name}` : ""}. For security, choose a new password before continuing.
          Your account is also protected by an email verification code at every login.
        </p>

        {error && <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-[12px] font-body rounded-xl px-3.5 py-2.5 mb-4"><AlertTriangle size={14} /> {error}</div>}

        <div className="space-y-3.5">
          <div>
            <label className="block text-slate-600 text-[11px] font-body font-bold uppercase tracking-wider mb-1.5">New password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={show ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-[13px] font-body outline-none focus:border-purple-500"
                placeholder="At least 8 characters" />
              <button onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 bg-transparent border-none cursor-pointer p-0">{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </div>
          <div>
            <label className="block text-slate-600 text-[11px] font-body font-bold uppercase tracking-wider mb-1.5">Confirm password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-[13px] font-body outline-none focus:border-purple-500"
                placeholder="Re-enter password" />
            </div>
          </div>
          <button disabled={busy} onClick={submit} className="w-full py-3 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-[14px] font-body font-black shadow-lg shadow-purple-600/25 hover:bg-purple-700 transition-colors disabled:opacity-60">
            {busy ? "Saving…" : "Set password & continue"}
          </button>
          <button onClick={logout} className="w-full py-2 rounded-xl border-none bg-transparent text-slate-400 text-[12px] font-body font-bold cursor-pointer flex items-center justify-center gap-1.5 hover:text-slate-600"><LogOut size={13} /> Sign out</button>
        </div>
      </div>
    </div>
  );
}
