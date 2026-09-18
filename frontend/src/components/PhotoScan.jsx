"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Image as ImageIcon, HelpCircle, CheckCircle2, X, Send, Loader2 } from "lucide-react";
import { getAuthHeader } from "@/utils/auth";
import { Card } from "@/components/ui";

// Base URL rules match /utils/api.js: NEXT_PUBLIC_API_BASE_URL in the browser,
// empty string otherwise (nginx handles the /api/* proxy).
const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_BASE_URL || "")
  : "";

const MAX_RAW_BYTES = 5 * 1024 * 1024;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Downscale large images in-browser so the base64 payload stays below MAX_RAW_BYTES.
async function ensureCompressed(file) {
  if (file.size <= MAX_RAW_BYTES * 0.9) return file;
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      const scale = Math.sqrt((MAX_RAW_BYTES * 0.75) / file.size);
      canvas.width = Math.max(320, Math.floor(img.width * scale));
      canvas.height = Math.max(320, Math.floor(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name || "photo.jpg", { type: "image/jpeg" }) : file),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export default function PhotoScan({ subject = "General", lang = "en", locked = false, onLockedError, onComplete }) {
  const t = (en, sw) => (lang === "sw" ? sw : en);
  const cameraRef = useRef();
  const fileRef = useRef();
  const [photo, setPhoto] = useState(null);
  const [mode, setMode] = useState("ask");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const pickFile = async (file) => {
    if (!file || !file.type?.startsWith("image/")) return;
    const compressed = await ensureCompressed(file);
    const b64 = await fileToBase64(compressed);
    setPhoto({ url: URL.createObjectURL(compressed), b64, mimeType: compressed.type || "image/jpeg" });
    setResult("");
    setError("");
  };

  const reset = () => {
    if (photo?.url) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    setResult("");
    setError("");
  };

  const send = async () => {
    if (!photo || sending) return;
    if (locked) { onLockedError?.(); return; }
    setSending(true);
    setResult("");
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/ai/photoscan/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        credentials: "include",
        body: JSON.stringify({
          image_b64: photo.b64,
          mime_type: photo.mimeType,
          mode,
          subject,
        }),
      });

      if (res.status === 402) {
        setError(t("Your free trial has ended. Activate a plan to use Photo Scan.",
                    "Kipindi cha bure kimeisha. Amilisha mpango ili kutumia Photo Scan."));
        onLockedError?.();
        return;
      }
      if (res.status === 401) {
        setError(t("Please sign in to use Photo Scan.", "Tafadhali ingia ili kutumia Photo Scan."));
        return;
      }
      if (!res.ok || !res.body) {
        let msg = t("Something went wrong. Please try again.", "Hitilafu imetokea. Tafadhali jaribu tena.");
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch { /* not JSON */ }
        setError(msg);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const line = raw.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              setResult(accumulated);
            }
          } catch { /* partial */ }
        }
      }
      onComplete?.({ mode, text: accumulated });
    } catch (err) {
      setError(err?.message || t("Network error. Please try again.", "Hitilafu ya mtandao. Jaribu tena."));
    } finally {
      setSending(false);
    }
  };

  // Cleanup blob URL on unmount.
  useEffect(() => () => { if (photo?.url) URL.revokeObjectURL(photo.url); }, [photo?.url]);

  return (
    <Card className="mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Camera size={18} className="text-purple-600" />
        <p className="text-slate-900 text-sm font-body font-extrabold m-0">
          {t("Photo Scan", "Piga Picha")}
        </p>
      </div>

      {!photo && (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50">
          <div className="text-3xl mb-1">📷</div>
          <p className="text-slate-900 text-[13px] font-body font-extrabold m-0 mb-1">
            {t("Snap or upload a photo", "Piga au pakia picha")}
          </p>
          <p className="text-slate-500 text-[11px] font-body m-0 mb-3">
            {t("Photograph a question to get help, or your finished work to be marked.",
               "Piga picha ya swali kupata msaada, au kazi yako kumaliza kukaguliwa.")}
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={locked}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-body font-extrabold border-none cursor-pointer ${locked ? "bg-slate-300 text-white cursor-not-allowed" : "bg-gradient-primary text-white"}`}
            >
              <Camera size={14} /> {t("Take Photo", "Piga Picha")}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={locked}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-body font-extrabold border-2 border-purple-600 bg-white cursor-pointer ${locked ? "opacity-60 cursor-not-allowed" : "text-purple-600"}`}
            >
              <ImageIcon size={14} /> {t("Upload Image", "Pakia Picha")}
            </button>
          </div>
          <input
            ref={cameraRef} type="file" accept="image/*" capture="environment"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
          />
          <input
            ref={fileRef} type="file" accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
          />
        </div>
      )}

      {photo && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
          <div className="relative bg-slate-900">
            <img src={photo.url} alt="Preview" className="w-full max-h-60 object-contain block" />
            <button
              type="button"
              onClick={reset}
              disabled={sending}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white border-none cursor-pointer flex items-center justify-center"
              aria-label={t("Remove", "Ondoa")}
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-3">
            <p className="text-slate-500 text-[10px] font-body font-extrabold tracking-wider mb-2 uppercase m-0">
              {t("What should Elimi do?", "Elimi afanye nini?")}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setMode("ask")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-body font-extrabold cursor-pointer border-2 transition-colors ${mode === "ask" ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-200 bg-white text-slate-500"}`}
              >
                <HelpCircle size={14} /> {t("Explain this", "Nieleze hii")}
              </button>
              <button
                type="button"
                onClick={() => setMode("mark")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-body font-extrabold cursor-pointer border-2 transition-colors ${mode === "mark" ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-white text-slate-500"}`}
              >
                <CheckCircle2 size={14} /> {t("Mark my work", "Kagua kazi yangu")}
              </button>
            </div>

            <div className={`rounded-lg px-3 py-2 mb-3 text-[11px] font-body ${mode === "ask" ? "bg-purple-50 text-purple-600" : "bg-emerald-50 text-emerald-600"}`}>
              {mode === "ask"
                ? t("Elimi will read the question, explain the concept, and walk you through the solution step by step.",
                    "Elimi atasoma swali, aeleze wazo kuu, na akuongoze hatua kwa hatua.")
                : t("Elimi will check your answers, tell you what is correct, identify mistakes, and explain how to fix them.",
                    "Elimi atakagua majibu yako, atakuambia yaliyo sahihi, atatambua makosa, na kueleza jinsi ya kuyarekebisha.")
              }
            </div>

            <button
              type="button"
              onClick={send}
              disabled={sending || locked}
              className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-[13px] font-body font-extrabold border-none text-white cursor-pointer ${sending || locked ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-primary"}`}
            >
              {sending
                ? <><Loader2 size={14} className="animate-spin" /> {t("Elimi is thinking…", "Elimi anafikiri…")}</>
                : <><Send size={14} /> {t("Send to Elimi", "Tuma kwa Elimi")}</>}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 border border-red-200 px-3 py-2 text-red-500 text-[12px] font-body font-extrabold">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-purple-600 text-[10px] font-body font-extrabold tracking-wider mb-1 uppercase m-0">
            {mode === "ask" ? t("Elimi's explanation", "Maelezo ya Elimi") : t("Elimi's marking", "Ukaguzi wa Elimi")}
          </p>
          <p className="text-slate-900 text-[13px] font-body leading-relaxed m-0 whitespace-pre-wrap">
            {result}
          </p>
        </div>
      )}
    </Card>
  );
}
