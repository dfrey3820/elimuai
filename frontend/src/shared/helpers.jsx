export function SkeletonLine({ w = "100%", h = 12, r = 6, mb = 8 }) {
  return <div className="animate-skPulse" style={{ width: w, height: h, borderRadius: r, background: "#e2e8f0", marginBottom: mb }} />;
}

export function SkeletonCard({ lines = 3, avatar = false }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-2">
      <div className={`flex gap-2.5 ${avatar ? "items-center" : "items-start"}`}>
        {avatar && <div className="w-[34px] h-[34px] rounded-full bg-slate-100 shrink-0 animate-skPulse" />}
        <div className="flex-1">{Array.from({ length: lines }).map((_, i) => (<SkeletonLine key={i} w={i === 0 ? "60%" : i === lines - 1 ? "40%" : "80%"} h={i === 0 ? 14 : 11} mb={i < lines - 1 ? 8 : 0} />))}</div>
      </div>
    </div>
  );
}
