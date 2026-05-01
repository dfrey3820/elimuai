"use client";
import { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Shield } from "lucide-react";

const STORAGE_KEY = "elimuai_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {}
  }, []);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() })); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Shield size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="text-slate-900 text-sm font-body font-bold m-0">Cookie & Tracking Notice</p>
                <p className="text-slate-400 text-[10px] font-body m-0">ElimuAI · Venus Unzag Limited</p>
              </div>
            </div>
            <button onClick={accept} className="bg-transparent border-none text-slate-400 cursor-pointer hover:text-slate-600 p-1" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Summary */}
          <div className="px-5 pb-3">
            <p className="text-slate-600 text-xs font-body leading-relaxed m-0 mb-3">
              ElimuAI uses essential cookies and localStorage to keep you logged in, store your preferences, and enable offline learning. We also use anonymised analytics to improve the platform. <strong>We do not use advertising cookies or tracking pixels.</strong> ElimuAI is ad-free.
            </p>

            {/* Expand/collapse full notice */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-purple-600 text-[11px] font-body font-bold bg-transparent border-none cursor-pointer flex items-center gap-1 p-0 mb-3 hover:text-purple-800"
            >
              {expanded ? "Hide full notice" : "Read full Cookie & Tracking Notice"}
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expanded && (
              <div className="max-h-[50vh] overflow-y-auto bg-slate-50 rounded-xl p-4 mb-3 text-slate-700 text-[11px] font-body leading-relaxed space-y-3 border border-slate-100">
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider m-0">Effective: 1 April 2026 · Version 1.0</p>
                <p className="text-slate-400 text-[9px] m-0">Venus Unzag Limited · Kenya · Uganda · Tanzania</p>

                <h4 className="text-slate-900 text-xs font-bold m-0 pt-2">1. What This Notice Covers</h4>
                <p className="m-0">This Cookie and Tracking Notice explains the cookies, localStorage, session storage, and tracking technologies used by the ElimuAI Platform (elimuai.africa) operated by Venus Unzag Limited. It applies to all users across Kenya, Uganda, and Tanzania.</p>

                <h4 className="text-slate-900 text-xs font-bold m-0 pt-2">2. What Are Cookies and Tracking Technologies?</h4>
                <p className="m-0">Cookies are small text files placed on your device when you visit a website. We also use localStorage and sessionStorage (browser-based storage) and server-side session tracking. These technologies help us operate the Platform, remember your preferences, track referrals, and improve the user experience.</p>

                <h4 className="text-slate-900 text-xs font-bold m-0 pt-2">3. Cookies and Technologies We Use</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-1.5 pr-2 text-slate-500 font-bold">Name / Type</th>
                        <th className="text-left py-1.5 pr-2 text-slate-500 font-bold">Category</th>
                        <th className="text-left py-1.5 pr-2 text-slate-500 font-bold">Purpose</th>
                        <th className="text-left py-1.5 pr-2 text-slate-500 font-bold">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["elimuai_session", "Essential", "Maintains your login session", "Session"],
                        ["elimuai_ref", "Functional", "Stores referral code for commission attribution", "30 days"],
                        ["elimuai_session_id", "Functional", "Anonymous session ID for referral tracking", "12 months"],
                        ["elimuai_cookie_consent", "Essential", "Records your cookie consent choice", "12 months"],
                        ["elimuai_prefs", "Functional", "Stores language and display preferences", "12 months"],
                        ["_stripe_mid / _stripe_sid", "Essential", "Stripe fraud prevention for card payments", "1 year / Session"],
                        ["Offline cache (SW)", "Essential", "Caches content for offline use", "Until cleared"],
                        ["Analytics (anonymised)", "Analytics", "Anonymised usage statistics", "13 months"],
                      ].map(([name, cat, purpose, dur]) => (
                        <tr key={name} className="border-b border-slate-100">
                          <td className="py-1.5 pr-2 text-slate-900 font-bold">{name}</td>
                          <td className="py-1.5 pr-2"><span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${cat === "Essential" ? "bg-purple-100 text-purple-700" : cat === "Functional" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>{cat}</span></td>
                          <td className="py-1.5 pr-2 text-slate-600">{purpose}</td>
                          <td className="py-1.5 text-slate-500">{dur}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="m-0 text-slate-500 italic">We do not use advertising cookies or tracking pixels. We do not share tracking data with advertising networks. ElimuAI is an ad-free platform.</p>

                <h4 className="text-slate-900 text-xs font-bold m-0 pt-2">4. Cookie Categories Explained</h4>
                <p className="m-0"><strong>4.1 Essential Cookies</strong> — Necessary for the Platform to function. They enable core features such as login, payment security, and offline content access. You cannot opt out of essential cookies while using the Platform.</p>
                <p className="m-0"><strong>4.2 Functional Cookies</strong> — Enhance your experience by remembering your preferences and enabling referral tracking for our channel partner programme. You can opt out, but some features may be affected.</p>
                <p className="m-0"><strong>4.3 Analytics Cookies</strong> — We use anonymised analytics to understand how users interact with the Platform. No personally identifiable information is included. You can opt out without affecting functionality.</p>

                <h4 className="text-slate-900 text-xs font-bold m-0 pt-2">5. Children and Cookies</h4>
                <p className="m-0">Where a child uses the Platform under a parent or guardian's account: we do not place advertising or profiling cookies on a child's device; referral tracking cookies are associated with the parent's account; analytics data from children's sessions is aggregated and anonymised; parents can clear all tracking data from Settings → Privacy → Clear Tracking Data.</p>

                <h4 className="text-slate-900 text-xs font-bold m-0 pt-2">6. Managing Your Cookie Preferences</h4>
                <p className="m-0">You can update your cookie preferences at any time from Settings → Privacy → Cookie Preferences within the app. You can also clear browser cookies and localStorage through your browser settings, but this will log you out.</p>

                <h4 className="text-slate-900 text-xs font-bold m-0 pt-2">7. Referral & Affiliate Tracking</h4>
                <p className="m-0">When you visit ElimuAI via a referral link, a referral code is stored in localStorage (elimuai_ref) for up to 30 days. This tracking does not track your activity on other websites, does not identify you personally, and expires automatically after 30 days or after you subscribe. You can opt out by rejecting functional cookies.</p>

                <h4 className="text-slate-900 text-xs font-bold m-0 pt-2">8. Third-Party Technologies</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead><tr className="border-b border-slate-200">
                      <th className="text-left py-1.5 pr-2 text-slate-500 font-bold">Provider</th>
                      <th className="text-left py-1.5 pr-2 text-slate-500 font-bold">Purpose</th>
                    </tr></thead>
                    <tbody>
                      {[
                        ["Stripe", "Secure card payments — fraud prevention cookies"],
                        ["Anthropic", "AI Tutor responses — server-side only, no client tracking"],
                        ["Safaricom (M-Pesa)", "M-Pesa payments — server-side only, no client cookies"],
                      ].map(([prov, purpose]) => (
                        <tr key={prov} className="border-b border-slate-100">
                          <td className="py-1.5 pr-2 text-slate-900 font-bold">{prov}</td>
                          <td className="py-1.5 text-slate-600">{purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 className="text-slate-900 text-xs font-bold m-0 pt-2">9. Changes to This Notice</h4>
                <p className="m-0">We may update this Cookie Notice when we add or change tracking technologies. Material updates will be notified via the in-app cookie consent banner and email.</p>

                <h4 className="text-slate-900 text-xs font-bold m-0 pt-2">10. Contact</h4>
                <p className="m-0">Email: support@elimuai.africa · Phone: +254 725 647 575</p>
                <p className="m-0">Cookie Notice URL: <a href="https://elimuai.africa/cookies" className="text-purple-600 underline">elimuai.africa/cookies</a></p>
                <p className="text-slate-400 text-[9px] m-0 pt-2">Version 1.0 · Effective April 2026 · Governed by the Laws of Kenya, Uganda, and Tanzania</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={accept}
                className="flex-1 py-2.5 rounded-xl border-none cursor-pointer bg-purple-600 text-white text-xs font-body font-bold shadow-sm shadow-purple-600/25 hover:shadow-lg transition-all"
              >
                Accept All
              </button>
              <button
                onClick={accept}
                className="py-2.5 px-4 rounded-xl border border-slate-200 bg-transparent text-slate-600 text-xs font-body font-bold cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Essential Only
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
