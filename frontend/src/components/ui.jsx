import { C } from "@/theme";

export function Spinner({ color = "text-purple-600", size = 7 }) {
  return (
    <div className="flex gap-1.5 items-center justify-center py-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-full animate-dotPulse" style={{ width: size, height: size, background: color === "text-purple-600" ? "#9333EA" : color, animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

export function Card({ children, className = "", hover = false, onClick, style = {} }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-200 ${onClick ? "cursor-pointer" : ""} ${hover ? "hover:shadow-lg hover:-translate-y-0.5" : ""} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function Badge({ children, color = "#9333EA", className = "" }) {
  return (
    <span className={`text-xs px-3 py-1 rounded-full font-body font-bold inline-block ${className}`} style={{ background: `${color}15`, color }}>
      {children}
    </span>
  );
}

export function SecTitle({ children, color = "#9333EA" }) {
  return (
    <p className="text-xs font-body font-extrabold tracking-widest uppercase mb-3" style={{ color }}>
      {children}
    </p>
  );
}

export function SubjectPills({ subjects, active, setActive }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {subjects.map((s) => (
        <button key={s} onClick={() => setActive(s)} className={`px-3.5 py-1.5 rounded-full border-none cursor-pointer whitespace-nowrap shrink-0 text-xs font-body font-bold transition-all duration-200 ${
          active === s ? "bg-purple-600 text-white" : "bg-slate-50 text-slate-600"
        }`}>
          {s}
        </button>
      ))}
    </div>
  );
}

export function SkeletonLine({ w = "100%", h = 12, r = 6, mb = 8 }) {
  return <div className="animate-skPulse" style={{ width: w, height: h, borderRadius: r, background: "#F1F5F9", marginBottom: mb }} />;
}

export function SkeletonCard({ lines = 3, avatar = false }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-2">
      <div className={`flex gap-2.5 ${avatar ? "items-center" : "items-start"}`}>
        {avatar && <div className="w-[34px] h-[34px] rounded-full bg-slate-100 shrink-0 animate-skPulse" />}
        <div className="flex-1">
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonLine key={i} w={i === 0 ? "60%" : i === lines - 1 ? "40%" : "80%"} h={i === 0 ? 14 : 11} mb={i < lines - 1 ? 8 : 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="mt-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 py-2.5 border-b border-slate-200">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} w={c === 0 ? "30%" : "20%"} h={12} mb={0} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", size = "md", className = "", disabled = false, icon, style = {} }) {
  const base = "inline-flex items-center justify-center gap-2 font-body font-extrabold transition-all duration-200 cursor-pointer";
  const variants = {
    primary: "bg-gradient-primary text-white border-none shadow-md",
    secondary: "bg-gradient-secondary text-white border-none shadow-md",
    accent: "bg-gradient-accent text-white border-none shadow-md",
    outline: "bg-transparent text-purple-600 border-2 border-purple-600",
    ghost: "bg-transparent text-slate-600 border-none",
    white: "bg-white text-purple-600 border-none",
  };
  const sizes = {
    sm: "px-4 py-2 text-[13px] rounded-[10px]",
    md: "px-6 py-3 text-sm rounded-xl",
    lg: "px-8 py-4 text-base rounded-[14px]",
    xl: "px-10 py-[18px] text-lg rounded-2xl",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`} style={style}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

export function SectionTitle({ badge, title, subtitle, center = true }) {
  return (
    <div className={`mb-10 ${center ? "text-center" : "text-left"}`}>
      {badge && (
        <span className="inline-block bg-purple-600/[0.07] text-purple-600 text-[13px] font-extrabold px-[18px] py-1.5 rounded-full font-body mb-3 tracking-wide">
          {badge}
        </span>
      )}
      <h2 className="text-slate-900 text-[clamp(28px,4vw,40px)] font-heading font-black m-0 mb-3 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className={`text-slate-600 text-base font-body font-semibold m-0 max-w-[600px] leading-relaxed ${center ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
