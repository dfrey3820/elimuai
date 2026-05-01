"use client";
import LegalPageLayout, { Section, SubSection, DataTable, BulletList } from "@/components/LegalPageLayout";
import CookieConsent from "@/components/CookieConsent";

export default function PrivacyPage() {
  return (
    <>
      <LegalPageLayout
        title="Privacy Policy"
        subtitle="Data Protection Notice — How we collect, use, and protect your personal data"
        effectiveDate="1 April 2026"
        version="Version 1.0"
      >
        <Section number="1" title="Introduction">
          <p className="m-0">ElimuAI is an AI-powered personalised learning platform operated by Venus Unzag Limited, a company incorporated under the laws of Kenya (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). We are committed to protecting the privacy and personal data of all users of the ElimuAI platform, website, and mobile application (collectively, &ldquo;the Platform&rdquo;).</p>
          <p className="m-0">This Privacy Policy explains how we collect, use, store, share, and protect your personal data. It applies to all users across Kenya, Uganda, and Tanzania, and has been prepared in compliance with:</p>
          <BulletList items={[
            "The Data Protection Act, 2019 (Kenya) and the Data Protection (General) Regulations, 2021",
            "The Data Protection and Privacy Act, 2019 (Uganda)",
            "The Personal Data Protection Act, 2022 (Tanzania)",
          ]} />
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-3">
            <p className="m-0 text-purple-800 text-sm font-body font-bold">ElimuAI collects and processes data relating to children. We take this responsibility extremely seriously. We only collect the minimum data necessary, we never sell children&rsquo;s data, and we require verified parental or guardian consent before processing any data relating to a child under the age of 18.</p>
          </div>
        </Section>

        <Section number="2" title="Who We Are — Data Controller Details">
          <DataTable
            headers={["Field", "Details"]}
            rows={[
              ["Data Controller", "Venus Unzag Limited"],
              ["Trading Name", "ElimuAI"],
              ["Country of Incorporation", "Kenya"],
              ["Physical Address", "Nairobi, Kenya"],
              ["Email", "support@elimuai.africa"],
              ["Phone", "+254 725 647 575"],
              ["Website", "https://elimuai.africa"],
              ["Data Protection Officer", "Julius — support@elimuai.africa"],
            ]}
          />
        </Section>

        <Section number="3" title="What Personal Data We Collect">
          <p className="m-0 font-bold text-slate-900">3.1 Data We Collect from Parents and Guardians</p>
          <BulletList items={[
            "Full name and email address",
            "Phone number and M-Pesa or card payment details (payment data is processed by M-Pesa Daraja and Stripe — we do not store card numbers)",
            "Country and county of residence",
            "Subscription plan and billing history",
            "Referral code used at sign-up (if applicable)",
          ]} />

          <p className="m-0 font-bold text-slate-900 mt-4">3.2 Data We Collect from Students / Learners</p>
          <BulletList items={[
            "First name and year of study / grade level (provided by parent or guardian)",
            "Learning activity data — subjects accessed, questions asked, quiz scores, time spent on platform",
            "AI interaction logs — questions submitted to the AI tutor and responses received",
            "Progress data — areas of strength and areas requiring improvement",
          ]} />
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-2">
            <p className="m-0 text-emerald-700 text-xs font-body font-bold">We do not collect a child&rsquo;s surname, photograph, location, or contact details. All child accounts are created and managed by a verified parent or guardian.</p>
          </div>

          <p className="m-0 font-bold text-slate-900 mt-4">3.3 Data We Collect from Teachers and School Administrators</p>
          <BulletList items={[
            "Full name, email address, phone number",
            "School name, county, and TSC number (for teachers)",
            "Class and student roster data (for class management features)",
            "Assignment and assessment data created on the platform",
            "Student progress reports accessed through the teacher dashboard",
          ]} />

          <p className="m-0 font-bold text-slate-900 mt-4">3.4 Data We Collect Automatically</p>
          <BulletList items={[
            "Device type, operating system, and browser",
            "IP address and approximate location (country/county level only)",
            "Session data — pages visited, features used, time on platform",
            "Referral and affiliate tracking data (cookie-based, 30-day window for affiliates)",
            "Offline usage logs when the app is used without internet connectivity",
          ]} />
        </Section>

        <Section number="4" title="How We Use Your Personal Data">
          <DataTable
            headers={["Purpose", "Data Used", "Legal Basis"]}
            rows={[
              ["Providing and personalising the learning experience", "Learner activity, AI interaction logs, progress data", "Performance of contract"],
              ["Account creation and management", "Parent/guardian name, email, phone", "Performance of contract"],
              ["Processing subscription payments", "Phone number, payment provider tokens", "Performance of contract"],
              ["Communicating with you about your account", "Email, phone number", "Performance of contract"],
              ["Sending platform updates and new features", "Email address", "Legitimate interests"],
              ["Generating progress reports for parents and teachers", "Learner activity and quiz data", "Performance of contract"],
              ["Improving the AI tutor and platform features", "Anonymised interaction logs", "Legitimate interests"],
              ["Referral and affiliate commission tracking", "Session ID, referral code, subscription data", "Legitimate interests"],
              ["Compliance with legal obligations", "All categories as required", "Legal obligation"],
              ["Fraud prevention and platform security", "IP address, session data", "Legitimate interests"],
            ]}
          />
        </Section>

        <Section number="5" title="Children\u2019s Data — Special Provisions">
          <SubSection id="5.1">ElimuAI is designed to be used by learners from Pre-Primary 1 (PP1) to Grade 9. All learners on the platform are under 18 years of age and are therefore classified as children under applicable data protection laws.</SubSection>
          <SubSection id="5.2">We require a parent or legal guardian to create and manage a child&rsquo;s account. By creating a child account, the parent or guardian provides explicit, verifiable consent for the collection and processing of that child&rsquo;s data as described in this Policy.</SubSection>
          <SubSection id="5.3">We apply the following additional protections to children&rsquo;s data:</SubSection>
          <BulletList items={[
            "We collect only the minimum data necessary for the child to use the platform effectively",
            "We never use children\u2019s data for targeted advertising or profiling for commercial purposes",
            "We never share children\u2019s personal data with third parties for their own marketing",
            "We never sell children\u2019s data under any circumstances",
            "AI interactions by children are monitored for safety and are not used to build individual commercial profiles",
            "Children\u2019s data is stored with enhanced access controls and encryption",
          ]} />
          <SubSection id="5.4">For school accounts, the school acts as a co-data controller for student data within its roster. Schools must ensure they have obtained appropriate parental consent. Parents and guardians may at any time request access to, correction of, or deletion of their child&rsquo;s data by contacting us at support@elimuai.africa. We will respond within 21 days.</SubSection>
        </Section>

        <Section number="6" title="How We Share Your Data">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3">
            <p className="m-0 text-emerald-700 text-sm font-body font-bold">We do not sell your personal data.</p>
          </div>
          <p className="m-0">We share data only in the following limited circumstances:</p>
          <DataTable
            headers={["Recipient", "Data Shared", "Purpose", "Location"]}
            rows={[
              ["Stripe Inc.", "Payment tokenisation data", "Card payment processing", "USA (SCCs)"],
              ["Safaricom PLC (M-Pesa)", "Phone number, transaction ref", "M-Pesa payment processing", "Kenya"],
              ["Anthropic PBC", "Anonymised AI query content", "AI tutor responses", "USA (SCCs)"],
              ["Cloud infrastructure", "Encrypted user & content data", "Platform hosting & storage", "East Africa region"],
              ["Channel partners", "Commission tracking data only", "Commission calculation", "KE / UG / TZ"],
              ["Law enforcement", "As legally required", "Legal compliance", "Jurisdiction-specific"],
            ]}
          />
        </Section>

        <Section number="7" title="Cross-Border Data Transfers">
          <SubSection id="7.1">Some of our service providers are located outside Kenya, Uganda, and Tanzania. Where we transfer personal data outside the originating country, we ensure appropriate safeguards are in place, including:</SubSection>
          <BulletList items={[
            "Standard Contractual Clauses (SCCs) approved by relevant data protection authorities",
            "Adequacy decisions where applicable",
            "Data processing agreements with all third-party processors",
          ]} />
          <SubSection id="7.2">We ensure that any cross-border transfer of children&rsquo;s data is subject to the same or higher level of protection as required under the law of the originating country.</SubSection>
        </Section>

        <Section number="8" title="How Long We Keep Your Data">
          <DataTable
            headers={["Data Category", "Retention Period", "Basis"]}
            rows={[
              ["Active subscriber account data", "Duration of subscription + 2 years", "Contractual obligation"],
              ["Learner activity and progress data", "Duration of subscription + 1 year", "Service delivery"],
              ["AI interaction logs (anonymised)", "3 years (anonymised after 12 months)", "Platform improvement"],
              ["Payment records", "7 years", "Kenyan tax & financial regulations"],
              ["Referral and commission records", "5 years", "Legal and commercial records"],
              ["Deleted account data", "30 days (then permanently deleted)", "Dispute resolution window"],
              ["Teacher/school data", "Duration of subscription + 2 years", "Contractual obligation"],
            ]}
          />
        </Section>

        <Section number="9" title="Your Data Rights">
          <p className="m-0">Depending on your country of residence, you have the following rights regarding your personal data:</p>
          <DataTable
            headers={["Right", "Description", "Available in"]}
            rows={[
              ["Right of Access", "Request a copy of the personal data we hold about you", "KE · UG · TZ"],
              ["Right to Rectification", "Request correction of inaccurate or incomplete data", "KE · UG · TZ"],
              ["Right to Erasure", "Request deletion of your data (subject to legal retention)", "KE · UG · TZ"],
              ["Right to Data Portability", "Receive your data in a structured, machine-readable format", "KE · UG · TZ"],
              ["Right to Object", "Object to processing based on legitimate interests", "KE · UG · TZ"],
              ["Right to Restrict Processing", "Request that we limit how we use your data", "KE · UG · TZ"],
              ["Right to Withdraw Consent", "Withdraw consent at any time without affecting prior processing", "KE · UG · TZ"],
              ["Right to Lodge a Complaint", "Complain to the relevant Data Protection Authority", "KE · UG · TZ"],
            ]}
          />
          <p className="m-0">To exercise any of these rights, submit a request through the ElimuAI app (Settings → Privacy → Data Rights) or email support@elimuai.africa. We will respond within 21 days in Kenya and Uganda, and within 30 days in Tanzania.</p>
        </Section>

        <Section number="10" title="Data Protection Authorities">
          <p className="m-0">If you are not satisfied with how we have handled your data, you may lodge a complaint with the relevant authority:</p>
          <DataTable
            headers={["Country", "Authority", "Website"]}
            rows={[
              ["\u{1F1F0}\u{1F1EA} Kenya", "Office of the Data Protection Commissioner (ODPC)", "www.odpc.go.ke"],
              ["\u{1F1FA}\u{1F1EC} Uganda", "Personal Data Protection Office (PDPO)", "www.pdpo.go.ug"],
              ["\u{1F1F9}\u{1F1FF} Tanzania", "Personal Data Protection Commission (PDPC)", "www.pdpc.go.tz"],
            ]}
          />
        </Section>

        <Section number="11" title="Security">
          <SubSection id="11.1">We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, alteration, or disclosure. These measures include:</SubSection>
          <BulletList items={[
            "Encryption of data in transit (TLS 1.2+) and at rest (AES-256)",
            "Role-based access controls — staff can only access data necessary for their role",
            "Regular security audits and vulnerability assessments",
            "Secure coding practices and penetration testing",
            "Children\u2019s data stored in isolated, access-controlled environments",
          ]} />
          <SubSection id="11.2">In the event of a data breach affecting your personal data, we will notify you and the relevant Data Protection Authority within 72 hours of becoming aware of the breach, in accordance with applicable law.</SubSection>
        </Section>

        <Section number="12" title="Cookies and Tracking">
          <p className="m-0">Please refer to our separate <a href="/cookies" className="text-purple-600 font-bold underline">Cookie and Tracking Notice</a> for detailed information on the cookies and tracking technologies used on the ElimuAI Platform. You can manage your cookie preferences at any time through the cookie consent banner in the app.</p>
        </Section>

        <Section number="13" title="Changes to This Policy">
          <p className="m-0">We may update this Privacy Policy from time to time. When we make material changes, we will notify you via email and an in-app notice at least 14 days before the changes take effect. The updated Policy will always be available at elimuai.africa/privacy. Continued use of the Platform after the effective date constitutes acceptance of the updated Policy.</p>
        </Section>

        <Section number="14" title="Contact Us">
          <DataTable
            headers={["Channel", "Details"]}
            rows={[
              ["Email", "support@elimuai.africa"],
              ["Phone", "+254 725 647 575"],
              ["Address", "Venus Unzag Limited, Nairobi, Kenya"],
              ["Website", "https://elimuai.africa/privacy"],
              ["Data Rights Portal", "In-app: Settings → Privacy → Data Rights"],
            ]}
          />
        </Section>
      </LegalPageLayout>
      <CookieConsent />
    </>
  );
}
