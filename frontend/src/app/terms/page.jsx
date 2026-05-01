"use client";
import LegalPageLayout, { Section, SubSection, DataTable, BulletList } from "@/components/LegalPageLayout";
import CookieConsent from "@/components/CookieConsent";

export default function TermsPage() {
  return (
    <>
      <LegalPageLayout
        title="Terms of Service"
        subtitle="User Agreement governing your use of the ElimuAI Platform"
        effectiveDate="1 April 2026"
        version="Version 1.0"
      >
        <Section number="1" title="Introduction & Acceptance">
          <p className="m-0">These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the ElimuAI platform, website, and mobile application (&ldquo;the Platform&rdquo;) operated by Venus Unzag Limited (&ldquo;ElimuAI&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).</p>
          <p className="m-0">By creating an account or using the Platform, you agree to be bound by these Terms.</p>
          <p className="m-0">ElimuAI is an educational platform designed for learners aged 3–15 (PP1 to Grade 9). If you are signing up on behalf of a child, you confirm that you are the child&rsquo;s parent or legal guardian and that you accept these Terms on their behalf.</p>
        </Section>

        <Section number="2" title="Definitions">
          <DataTable
            headers={["Term", "Definition"]}
            rows={[
              ["\u201cPlatform\u201d", "The ElimuAI website (elimuai.africa), mobile app, and all related services"],
              ["\u201cAccount Holder\u201d", "The parent, guardian, teacher, or school administrator who creates and manages an account"],
              ["\u201cLearner\u201d", "The student using the ElimuAI learning tools, always under supervision of an Account Holder"],
              ["\u201cSchool Account\u201d", "An institutional account for up to 40 teachers at a single school"],
              ["\u201cSubscription\u201d", "A paid plan (individual or school) that grants access to ElimuAI\u2019s full features"],
              ["\u201cContent\u201d", "All materials, notes, quizzes, AI tutor responses, and resources on the Platform"],
              ["\u201cAI Tutor\u201d", "The AI-powered learning assistant embedded in the Platform"],
            ]}
          />
        </Section>

        <Section number="3" title="Account Registration">
          <SubSection id="3.1">To use the Platform, you must create an account by providing accurate, current, and complete information. You agree to keep your account information updated at all times.</SubSection>
          <SubSection id="3.2">You must be at least 18 years of age to create an account. Learner accounts for children are created and managed by a parent, guardian, teacher, or school administrator.</SubSection>
          <SubSection id="3.3">You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately at support@elimuai.africa if you suspect unauthorised access to your account.</SubSection>
          <SubSection id="3.4">You may not share your account credentials with others or allow multiple persons to use the same account unless you are a teacher or school administrator using a school account for classroom management purposes.</SubSection>
        </Section>

        <Section number="4" title="Subscriptions & Payments">
          <p className="m-0 font-bold text-slate-900">4.1 Individual Plans</p>
          <DataTable
            headers={["Plan", "Price", "Coverage"]}
            rows={[
              ["1st Child", "KES 299 / month", "One learner account"],
              ["2 Children", "KES 499 / month", "Two learner accounts"],
              ["3+ Children", "KES 699 / month", "Three or more learner accounts"],
              ["Free Trial", "KES 0 / 14 days", "Full access, no payment required"],
            ]}
          />
          <SubSection id="4.2">The School Plan is priced at KES 15,000 per term and covers up to 40 teachers at one school. School plans are invoiced and paid on a per-term basis.</SubSection>
          <SubSection id="4.3">Payments are processed via M-Pesa (Safaricom Daraja) or card (Stripe). By providing payment details, you authorise ElimuAI to charge your chosen payment method for the subscription fee on a recurring monthly or termly basis.</SubSection>
          <SubSection id="4.4">All prices are quoted in Kenya Shillings (KES). For subscribers in Uganda and Tanzania, the equivalent local currency amount will be displayed at checkout based on the prevailing exchange rate.</SubSection>
          <SubSection id="4.5">Subscriptions are prepaid and non-refundable except where required by applicable law. If you cancel your subscription, you will retain access to the Platform until the end of your current billing period.</SubSection>
          <SubSection id="4.6">ElimuAI reserves the right to change subscription prices with 30 days written notice to Account Holders. Price changes will not affect your current billing period.</SubSection>
        </Section>

        <Section number="5" title="Free Trial">
          <SubSection id="5.1">New users are eligible for a 14-day free trial with full access to the Platform. No payment information is required to start the trial.</SubSection>
          <SubSection id="5.2">At the end of the trial period, you will be prompted to subscribe to continue accessing the Platform. If you do not subscribe, your account will be downgraded to a limited free tier or deactivated.</SubSection>
          <SubSection id="5.3">Free trials are limited to one per household or institution.</SubSection>
        </Section>

        <Section number="6" title="Acceptable Use">
          <SubSection id="6.1">You agree to use the Platform only for its intended educational purpose. You must not:</SubSection>
          <BulletList items={[
            "Use the Platform for any unlawful, harmful, or fraudulent purpose",
            "Attempt to reverse-engineer, copy, or scrape any content or AI model from the Platform",
            "Submit any content to the AI Tutor that is abusive, sexually explicit, violent, or otherwise inappropriate",
            "Attempt to circumvent any security or access control mechanism on the Platform",
            "Use automated bots or scripts to access the Platform",
            "Share your login credentials or referral codes in a manner that violates these Terms",
            "Impersonate ElimuAI, Venus Unzag Limited, or any other user",
          ]} />
          <SubSection id="6.2">ElimuAI reserves the right to suspend or terminate any account that violates these Terms without prior notice and without refund.</SubSection>
        </Section>

        <Section number="7" title="AI Tutor — Important Limitations">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
            <p className="m-0 text-amber-800 text-sm font-body font-bold">The ElimuAI AI Tutor is a learning tool, not a substitute for qualified teaching. Responses are generated by artificial intelligence and may occasionally contain errors. Always encourage learners to verify important information with their teacher.</p>
          </div>
          <SubSection id="7.1">The AI Tutor is designed to assist learners with curriculum-aligned content from PP1 to Grade 9 across the CBC (Kenya), TIE (Uganda), and NCDC (Tanzania) frameworks.</SubSection>
          <SubSection id="7.2">ElimuAI makes reasonable efforts to ensure AI Tutor responses are accurate and age-appropriate, but we do not guarantee the accuracy, completeness, or fitness for any particular purpose of AI-generated content.</SubSection>
          <SubSection id="7.3">We monitor AI interactions for safety and appropriateness. Interactions that violate our content policies may result in account suspension.</SubSection>
        </Section>

        <Section number="8" title="Intellectual Property">
          <SubSection id="8.1">All content on the ElimuAI Platform — including curriculum notes, quizzes, AI responses, design, code, and branding — is owned by Venus Unzag Limited or licensed to us. All rights reserved.</SubSection>
          <SubSection id="8.2">You are granted a limited, non-exclusive, non-transferable licence to access and use the Platform for personal educational purposes only. This licence does not permit you to download, copy, redistribute, or commercialise any Platform content.</SubSection>
          <SubSection id="8.3">Content created by teachers on the Platform (e.g. custom assignments) remains the intellectual property of the teacher, but ElimuAI is granted a licence to host and display it within the Platform.</SubSection>
        </Section>

        <Section number="9" title="Privacy & Data Protection">
          <p className="m-0">Your use of the Platform is subject to our <a href="/privacy" className="text-purple-600 font-bold underline">Privacy Policy</a> and <a href="/cookies" className="text-purple-600 font-bold underline">Cookie Notice</a>, which are incorporated into these Terms by reference. By using the Platform, you consent to the collection and use of your data as described in those documents.</p>
        </Section>

        <Section number="10" title="School Accounts — Additional Terms">
          <SubSection id="10.1">The school administrator who creates a School Account is the Account Holder and is responsible for ensuring that all teachers and students using the account comply with these Terms.</SubSection>
          <SubSection id="10.2">Schools are responsible for obtaining parental consent from students&rsquo; parents or guardians before enrolling students on the Platform, in compliance with applicable data protection laws.</SubSection>
          <SubSection id="10.3">School Accounts are licensed to a single school. Sharing a School Account across multiple schools or institutions is not permitted.</SubSection>
          <SubSection id="10.4">ElimuAI is not responsible for the content of assignments or assessments created by teachers on the Platform. Schools assume full responsibility for ensuring teacher-generated content is appropriate and curriculum-compliant.</SubSection>
        </Section>

        <Section number="11" title="Termination">
          <SubSection id="11.1">You may cancel your account at any time through the Platform settings or by emailing support@elimuai.africa. Cancellation takes effect at the end of your current billing period.</SubSection>
          <SubSection id="11.2">ElimuAI may suspend or terminate your account immediately if you breach these Terms, fail to pay subscription fees, or engage in conduct that harms the Platform or its users.</SubSection>
          <SubSection id="11.3">Upon termination, your access to the Platform ceases. Your data is retained for the periods described in our Privacy Policy, after which it is permanently deleted.</SubSection>
        </Section>

        <Section number="12" title="Limitation of Liability">
          <SubSection id="12.1">To the maximum extent permitted by applicable law, ElimuAI&rsquo;s total liability to you for any claim arising from your use of the Platform shall not exceed the total subscription fees paid by you in the three months preceding the claim.</SubSection>
          <SubSection id="12.2">ElimuAI is not liable for: indirect, incidental, or consequential losses; loss of learning outcomes; interruption of service due to circumstances beyond our control (including internet outages, power failures, or force majeure events).</SubSection>
          <SubSection id="12.3">Nothing in these Terms limits liability for death or personal injury caused by negligence, fraud, or any liability that cannot be excluded by law.</SubSection>
        </Section>

        <Section number="13" title="Governing Law & Dispute Resolution">
          <SubSection id="13.1">These Terms are governed by the laws of Kenya. For users in Uganda and Tanzania, applicable local consumer protection laws apply in addition to Kenyan law.</SubSection>
          <SubSection id="13.2">Disputes shall first be subject to good faith negotiation. If unresolved within 14 days, disputes shall be referred to mediation in Nairobi, Kenya. If mediation fails, disputes shall be resolved by the courts of Kenya.</SubSection>
        </Section>

        <Section number="14" title="Changes to These Terms">
          <p className="m-0">We may update these Terms from time to time. Material changes will be notified via email and in-app notice at least 14 days before taking effect. Continued use of the Platform after the effective date constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section number="15" title="Contact">
          <DataTable
            headers={["Channel", "Details"]}
            rows={[
              ["Email", "support@elimuai.africa"],
              ["Phone", "+254 725 647 575"],
              ["Address", "Venus Unzag Limited, Nairobi, Kenya"],
              ["Terms URL", "https://elimuai.africa/terms"],
            ]}
          />
        </Section>
      </LegalPageLayout>
      <CookieConsent />
    </>
  );
}
