"use client";
// ============================================================
// ElimuAI — Insurance partner login wrapper
// Routes a logged-in CH6 insurance manager/agent to their own
// InsuranceNetworkDashboard by first resolving their partner record.
// Backend: GET /api/ch6/partners/me
// ============================================================
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import InsuranceNetworkDashboard from "@/screens/InsuranceNetworkDashboard";

const ROLE_MAP = { insurance_manager: "manager", insurance_agent: "agent" };

export default function InsuranceDashboardLogin({ user, onLogout }) {
  const [partner, setPartner] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    apiGet("/api/ch6/partners/me")
      .then((d) => { if (alive) { setPartner(d); setState("ready"); } })
      .catch((e) => { if (alive) { setMsg(e?.message || "Could not load your profile"); setState("error"); } });
    return () => { alive = false; };
  }, []);

  if (state === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 font-body text-sm">Loading your dashboard…</div>;
  }
  if (state === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-slate-700 font-body text-sm max-w-md">{msg}</p>
        <button onClick={onLogout} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-bold cursor-pointer">Logout</button>
      </div>
    );
  }

  const dashRole = ROLE_MAP[user?.role] || "agent";
  return (
    <InsuranceNetworkDashboard
      role={dashRole}
      partnerId={partner?.partner_id}
      networkId={partner?.network_id}
      me={partner}
      onLogout={onLogout}
    />
  );
}
