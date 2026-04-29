import { C, font } from "@/theme";

export function Spinner({ color = C.primary, size = 7 }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", justifyContent: "center", padding: "10px 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: "50%", background: color, animation: `dotPulse 1s ease-in-out ${i * 0.15}s infinite` }} />
      ))}
    </div>
  );
}

export function Card({ children, style = {}, hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 20,
        boxShadow: C.shadow,
        transition: "all 0.2s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = C.shadowLg;
          e.currentTarget.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = C.shadow;
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {children}
    </div>
  );
}

export function Badge({ children, color = C.primary, style = {} }) {
  return (
    <span style={{
      background: `${color}15`,
      color,
      fontSize: 12,
      padding: "4px 12px",
      borderRadius: 20,
      fontFamily: font.body,
      fontWeight: 700,
      display: "inline-block",
      ...style,
    }}>
      {children}
    </span>
  );
}

export function SecTitle({ children, color = C.primary }) {
  return (
    <p style={{
      color,
      fontSize: 12,
      fontFamily: font.body,
      fontWeight: 800,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      margin: "0 0 12px",
    }}>
      {children}
    </p>
  );
}

export function SubjectPills({ subjects, active, setActive }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
      {subjects.map((s) => (
        <button key={s} onClick={() => setActive(s)} style={{
          padding: "6px 14px",
          borderRadius: 20,
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          background: active === s ? C.primary : C.surface,
          color: active === s ? C.white : C.textSecondary,
          fontSize: 12,
          fontFamily: font.body,
          fontWeight: 700,
          transition: "all 0.2s",
        }}>
          {s}
        </button>
      ))}
    </div>
  );
}

export function SkeletonLine({ w = "100%", h = 12, r = 6, mb = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: C.borderLight, marginBottom: mb, animation: "pulse 1.4s ease-in-out infinite" }} />;
}

export function SkeletonCard({ lines = 3, avatar = false }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: avatar ? "center" : "flex-start" }}>
        {avatar && <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.borderLight, flexShrink: 0, animation: "pulse 1.4s ease-in-out infinite" }} />}
        <div style={{ flex: 1 }}>
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
    <div style={{ marginTop: 8 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} w={c === 0 ? "30%" : "20%"} h={12} mb={0} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", size = "md", style = {}, disabled = false, icon }) {
  const variants = {
    primary: { background: C.gradientPrimary, color: C.white, border: "none" },
    secondary: { background: C.gradientSecondary, color: C.white, border: "none" },
    accent: { background: C.gradientAccent, color: C.white, border: "none" },
    outline: { background: "transparent", color: C.primary, border: `2px solid ${C.primary}` },
    ghost: { background: "transparent", color: C.textSecondary, border: "none" },
    white: { background: C.white, color: C.primary, border: "none" },
  };
  const sizes = {
    sm: { padding: "8px 16px", fontSize: 13, borderRadius: 10 },
    md: { padding: "12px 24px", fontSize: 14, borderRadius: 12 },
    lg: { padding: "16px 32px", fontSize: 16, borderRadius: 14 },
    xl: { padding: "18px 40px", fontSize: 18, borderRadius: 16 },
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...v, ...s,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: font.body,
      fontWeight: 800,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      transition: "all 0.2s ease",
      opacity: disabled ? 0.6 : 1,
      boxShadow: variant === "primary" || variant === "secondary" ? C.shadowMd : "none",
      ...style,
    }}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

export function SectionTitle({ badge, title, subtitle, center = true }) {
  return (
    <div style={{ textAlign: center ? "center" : "left", marginBottom: 40 }}>
      {badge && (
        <span style={{
          display: "inline-block",
          background: `${C.primary}12`,
          color: C.primary,
          fontSize: 13,
          fontWeight: 800,
          padding: "6px 18px",
          borderRadius: 20,
          fontFamily: font.body,
          marginBottom: 12,
          letterSpacing: 0.5,
        }}>
          {badge}
        </span>
      )}
      <h2 style={{
        color: C.text,
        fontSize: "clamp(28px, 4vw, 40px)",
        fontFamily: font.heading,
        fontWeight: 900,
        margin: "0 0 12px",
        lineHeight: 1.2,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{
          color: C.textSecondary,
          fontSize: 16,
          fontFamily: font.body,
          fontWeight: 600,
          margin: 0,
          maxWidth: 600,
          marginLeft: center ? "auto" : 0,
          marginRight: center ? "auto" : 0,
          lineHeight: 1.6,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
