"use client";
import Link from "next/link";
import { GraduationCap, ArrowLeft } from "lucide-react";

export default function LegalPageLayout({ title, subtitle, effectiveDate, version, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <GraduationCap size={24} className="text-purple-600" />
            <span className="text-slate-900 text-lg font-heading font-black">ElimuAI</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-purple-600 text-xs font-body font-bold no-underline hover:text-purple-800 transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </header>

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-violet-700 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-2 mb-3">
            {["\u{1F1F0}\u{1F1EA}", "\u{1F1FA}\u{1F1EC}", "\u{1F1F9}\u{1F1FF}"].map((f, i) => (
              <span key={i} className="text-lg">{f}</span>
            ))}
            <span className="text-purple-200 text-[11px] font-body font-bold ml-1">Kenya · Uganda · Tanzania</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-black m-0 mb-2">{title}</h1>
          <p className="text-purple-200 text-sm font-body m-0 mb-4">{subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <span className="bg-white/15 rounded-lg px-3 py-1 text-white/90 text-[11px] font-body font-bold">
              Effective: {effectiveDate}
            </span>
            <span className="bg-white/15 rounded-lg px-3 py-1 text-white/90 text-[11px] font-body font-bold">
              {version}
            </span>
            <span className="bg-white/15 rounded-lg px-3 py-1 text-white/90 text-[11px] font-body font-bold">
              Venus Unzag Limited
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-10 legal-content">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center pb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <GraduationCap size={20} className="text-purple-600" />
            <span className="text-slate-900 text-sm font-heading font-bold">ElimuAI</span>
            <span className="text-slate-400 text-xs font-body">|</span>
            <span className="text-slate-400 text-xs font-body">Venus Unzag Limited</span>
          </div>
          <p className="text-slate-400 text-xs font-body m-0 mb-1">
            support@elimuai.africa · +254 725 647 575 · elimuai.africa
          </p>
          <p className="text-slate-400 text-[10px] font-body m-0">
            {version} · {effectiveDate} · Governed by the Laws of Kenya, Uganda, and Tanzania
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Link href="/terms" className="text-purple-600 text-xs font-body font-bold no-underline hover:text-purple-800">Terms of Service</Link>
            <Link href="/privacy" className="text-purple-600 text-xs font-body font-bold no-underline hover:text-purple-800">Privacy Policy</Link>
            <Link href="/cookies" className="text-purple-600 text-xs font-body font-bold no-underline hover:text-purple-800">Cookie Notice</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Shared sub-components for legal pages */

export function Section({ number, title, children }) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="text-slate-900 text-lg font-heading font-black m-0 mb-3 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 text-xs font-body font-black flex items-center justify-center shrink-0">{number}</span>
        {title}
      </h2>
      <div className="text-slate-600 text-sm font-body leading-relaxed space-y-3 pl-9">
        {children}
      </div>
    </section>
  );
}

export function SubSection({ id, children }) {
  return (
    <p className="m-0"><span className="text-slate-900 font-bold">{id}</span> {children}</p>
  );
}

export function DataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 my-3">
      <table className="w-full text-left text-[12px] border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map((h) => (
              <th key={h} className="py-2.5 px-3 text-slate-500 font-body font-bold uppercase text-[10px] tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className={`py-2.5 px-3 font-body ${j === 0 ? "text-slate-900 font-bold" : "text-slate-600"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BulletList({ items }) {
  return (
    <ul className="m-0 pl-5 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-slate-600 text-sm font-body leading-relaxed">{item}</li>
      ))}
    </ul>
  );
}
