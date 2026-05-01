"use client";
import LegalPageLayout, { Section, SubSection, DataTable, BulletList } from "@/components/LegalPageLayout";
import CookieConsent from "@/components/CookieConsent";

export default function CookiesPage() {
  return (
    <>
      <LegalPageLayout
        title="Cookie & Tracking Notice"
        subtitle="How ElimuAI uses cookies, localStorage, and tracking technologies"
        effectiveDate="1 April 2026"
        version="Version 1.0"
      >
        <Section number="1" title="What This Notice Covers">
          <p className="m-0">This Cookie and Tracking Notice explains the cookies, localStorage, session storage, and tracking technologies used by the ElimuAI Platform (elimuai.africa) operated by Venus Unzag Limited. It applies to all users across Kenya, Uganda, and Tanzania.</p>
        </Section>

        <Section number="2" title="What Are Cookies and Tracking Technologies?">
          <p className="m-0">Cookies are small text files placed on your device when you visit a website. We also use localStorage and sessionStorage (browser-based storage) and server-side session tracking. These technologies help us operate the Platform, remember your preferences, track referrals, and improve the user experience.</p>
        </Section>

        <Section number="3" title="Cookies and Technologies We Use">
          <DataTable
            headers={["Name / Type", "Category", "Purpose", "Duration"]}
            rows={[
              ["elimuai_session", "Essential", "Maintains your login session", "Session"],
              ["elimuai_ref", "Functional", "Stores referral code for commission attribution", "30 days"],
              ["elimuai_session_id", "Functional", "Anonymous session ID for referral tracking", "12 months"],
              ["elimuai_cookie_consent", "Essential", "Records your cookie consent choice", "12 months"],
              ["elimuai_prefs", "Functional", "Stores language and display preferences", "12 months"],
              ["_stripe_mid / _stripe_sid", "Essential", "Stripe fraud prevention for card payments", "1 year / Session"],
              ["Offline cache (SW)", "Essential", "Caches content for offline use via Service Worker", "Until cleared"],
              ["Analytics (anonymised)", "Analytics", "Anonymised usage statistics", "13 months"],
            ]}
          />
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-3">
            <p className="m-0 text-purple-800 text-sm font-body font-bold">We do not use advertising cookies or tracking pixels. We do not share tracking data with advertising networks. ElimuAI is an ad-free platform.</p>
          </div>
        </Section>

        <Section number="4" title="Cookie Categories Explained">
          <SubSection id="4.1" title="Essential Cookies">
            <p className="m-0">Necessary for the Platform to function. They enable core features such as login, payment security, and offline content access. You cannot opt out of essential cookies while using the Platform.</p>
          </SubSection>
          <SubSection id="4.2" title="Functional Cookies">
            <p className="m-0">Enhance your experience by remembering your preferences and enabling referral tracking for our channel partner programme. You can opt out, but some features may be affected.</p>
          </SubSection>
          <SubSection id="4.3" title="Analytics Cookies">
            <p className="m-0">We use anonymised analytics to understand how users interact with the Platform. No personally identifiable information is included in analytics data. You can opt out without affecting Platform functionality.</p>
          </SubSection>
        </Section>

        <Section number="5" title="Children and Cookies">
          <p className="m-0">Where a child uses the Platform under a parent or guardian&rsquo;s account, the following protections apply:</p>
          <BulletList items={[
            "We do not place advertising or profiling cookies on a child\u2019s device",
            "Referral tracking cookies are associated with the parent\u2019s account, not the child\u2019s",
            "Analytics data from children\u2019s sessions is aggregated and anonymised",
            "Parents can clear all tracking data from Settings \u2192 Privacy \u2192 Clear Tracking Data",
          ]} />
        </Section>

        <Section number="6" title="Managing Your Cookie Preferences">
          <p className="m-0">You can update your cookie preferences at any time:</p>
          <BulletList items={[
            "In-app: Settings \u2192 Privacy \u2192 Cookie Preferences",
            "Browser settings: Clear cookies and localStorage through your browser (this will log you out)",
            "Cookie consent banner: Click \u201cEssential Only\u201d to reject non-essential cookies",
          ]} />
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
            <p className="m-0 text-amber-700 text-xs font-body font-bold">Note: Clearing essential cookies or localStorage will log you out and may affect your offline cached content.</p>
          </div>
        </Section>

        <Section number="7" title="Referral & Affiliate Tracking">
          <p className="m-0">When you visit ElimuAI via a referral link, a referral code is stored in localStorage (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-purple-600 text-xs">elimuai_ref</code>) for up to 30 days. This tracking:</p>
          <BulletList items={[
            "Does not track your activity on other websites",
            "Does not identify you personally",
            "Expires automatically after 30 days or after you subscribe",
            "Can be removed by rejecting functional cookies or clearing localStorage",
          ]} />
        </Section>

        <Section number="8" title="Third-Party Technologies">
          <DataTable
            headers={["Provider", "Purpose", "Client Cookies?"]}
            rows={[
              ["Stripe", "Secure card payments — fraud prevention cookies", "Yes (_stripe_mid, _stripe_sid)"],
              ["Anthropic", "AI Tutor responses — server-side only", "No"],
              ["Safaricom (M-Pesa)", "M-Pesa payments — server-side only", "No"],
            ]}
          />
        </Section>

        <Section number="9" title="Changes to This Notice">
          <p className="m-0">We may update this Cookie Notice when we add or change tracking technologies. Material updates will be notified via the in-app cookie consent banner and email at least 14 days before taking effect.</p>
        </Section>

        <Section number="10" title="Contact">
          <DataTable
            headers={["Channel", "Details"]}
            rows={[
              ["Email", "support@elimuai.africa"],
              ["Phone", "+254 725 647 575"],
              ["Address", "Venus Unzag Limited, Nairobi, Kenya"],
              ["Cookie Notice URL", "https://elimuai.africa/cookies"],
            ]}
          />
        </Section>
      </LegalPageLayout>
      <CookieConsent />
    </>
  );
}
