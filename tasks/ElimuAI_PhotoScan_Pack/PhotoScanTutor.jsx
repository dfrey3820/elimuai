// ============================================================
// ElimuAI Photo Scan — AI Tutor Chat with Photo Capture
// src/components/tutor/PhotoScanTutor.jsx
//
// Integrates seamlessly into the existing AI Tutor chat UI.
// Two modes, one flow:
//   1. Photo to Ask   — student photos a question → AI explains step by step
//   2. Photo to Mark  — student photos their completed work → AI marks and gives feedback
//
// Works on both web (file upload + drag-drop) and mobile (camera capture).
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "https://api.elimuai.africa";

// ── Brand tokens (ElimuAI)
const C = {
  navy:    "#1E3A8A",
  blue:    "#2563EB",
  blueL:   "#DBEAFE",
  green:   "#059669",
  greenL:  "#D1FAE5",
  gold:    "#D97706",
  goldL:   "#FEF3C7",
  red:     "#B91C1C",
  gray:    "#475569",
  lgray:   "#F1F5F9",
  dark:    "#0F172A",
  white:   "#FFFFFF",
};

// ── Helpers
function formatTime(date) {
  return date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Sub-components

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 14px", background: C.lgray, borderRadius: "18px 18px 18px 4px", width: "fit-content" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%", background: C.blue,
          animation: "bounce 1.2s infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

function ModeBadge({ mode }) {
  const cfg = mode === "ask"
    ? { bg: C.blueL,  color: C.blue,  icon: "❓", label: "Asking a question" }
    : { bg: C.greenL, color: C.green, icon: "✅", label: "Marking my work" };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: cfg.bg, color: cfg.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      <span>{cfg.icon}</span> {cfg.label}
    </div>
  );
}

function PhotoMessage({ src, mode, timestamp }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginBottom: 4 }}>
      <ModeBadge mode={mode} />
      <div style={{ position: "relative", maxWidth: 280 }}>
        <img
          src={src}
          alt="Uploaded question"
          style={{ width: "100%", maxWidth: 280, borderRadius: 14, border: `2px solid ${C.blue}`, display: "block" }}
        />
        <div style={{ position: "absolute", bottom: 6, right: 8, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 8 }}>
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
}

function AIMessage({ content, timestamp, isStreaming }) {
  // Render markdown-style formatting
  const formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:2px 5px;border-radius:4px;font-family:monospace;font-size:0.9em">$1</code>')
    .split('\n').join('<br/>');

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
      {/* Avatar */}
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.blue}, ${C.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
        🦁
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 4 }}>
          Elimi — AI Tutor
        </div>
        <div style={{
          background: C.lgray,
          borderRadius: "4px 18px 18px 18px",
          padding: "12px 16px",
          fontSize: 14,
          lineHeight: 1.65,
          color: C.dark,
          position: "relative",
        }}>
          <span dangerouslySetInnerHTML={{ __html: formatted }} />
          {isStreaming && (
            <span style={{ display: "inline-block", width: 2, height: 16, background: C.blue, marginLeft: 2, animation: "blink 1s infinite", verticalAlign: "text-bottom" }} />
          )}
        </div>
        <div style={{ fontSize: 11, color: C.gray, marginTop: 4 }}>{formatTime(timestamp)}</div>
      </div>
    </div>
  );
}

function PhotoUploadArea({ onPhoto, disabled }) {
  const fileRef = useRef();
  const cameraRef = useRef();
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const b64 = await fileToBase64(file);
    onPhoto({ url, b64, mimeType: file.type, file });
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      style={{
        border: `2px dashed ${dragOver ? C.blue : "#CBD5E1"}`,
        borderRadius: 14,
        padding: "20px 16px",
        textAlign: "center",
        background: dragOver ? C.blueL : "#FAFAFA",
        transition: "all 0.2s",
        cursor: disabled ? "not-allowed" : "default",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 4 }}>
        Drop a photo here, or choose one below
      </div>
      <div style={{ fontSize: 12, color: C.gray, marginBottom: 14 }}>
        Photo a question to get help, or photo your completed work to be marked
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {/* Camera — mobile primary */}
        <button
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: C.blue, color: "#fff", border: "none",
            borderRadius: 50, padding: "9px 20px", fontSize: 13, fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
            boxShadow: `0 4px 14px ${C.blue}44`,
          }}
        >
          📷 Take Photo
        </button>
        {/* File upload — desktop primary */}
        <button
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "#fff", color: C.blue, border: `2px solid ${C.blue}`,
            borderRadius: 50, padding: "9px 20px", fontSize: 13, fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          🖼️ Upload Image
        </button>
      </div>

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        style={{ display: "none" }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept="image/*"
        style={{ display: "none" }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}

function PhotoPreview({ photo, mode, onModeChange, onSend, onCancel, sending }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1px solid #E2E8F0`, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
      {/* Preview image */}
      <div style={{ position: "relative", background: C.dark }}>
        <img src={photo.url} alt="Preview" style={{ width: "100%", maxHeight: 240, objectFit: "contain", display: "block" }} />
        <button onClick={onCancel} style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ✕
        </button>
      </div>

      {/* Mode selection */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: 10, letterSpacing: 0.5 }}>
          WHAT WOULD YOU LIKE ELIMI TO DO?
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button
            onClick={() => onModeChange("ask")}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: `2px solid ${mode === "ask" ? C.blue : "#E2E8F0"}`,
              background: mode === "ask" ? C.blueL : "#fff", color: mode === "ask" ? C.blue : C.gray,
              fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
            }}
          >
            ❓ Explain this to me
          </button>
          <button
            onClick={() => onModeChange("mark")}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: `2px solid ${mode === "mark" ? C.green : "#E2E8F0"}`,
              background: mode === "mark" ? C.greenL : "#fff", color: mode === "mark" ? C.green : C.gray,
              fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
            }}
          >
            ✅ Mark my work
          </button>
        </div>

        {/* Mode context */}
        <div style={{ background: mode === "ask" ? C.blueL : C.greenL, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: mode === "ask" ? C.blue : C.green, marginBottom: 14 }}>
          {mode === "ask"
            ? "Elimi will read the question, explain the concept, and walk you through the solution step by step."
            : "Elimi will check your answers, tell you what is correct, identify mistakes, and explain how to fix them."
          }
        </div>

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={sending}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 50, border: "none",
            background: sending ? "#94A3B8" : `linear-gradient(135deg, ${C.blue}, ${C.navy})`,
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: sending ? "not-allowed" : "pointer",
            boxShadow: sending ? "none" : `0 4px 14px ${C.blue}44`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {sending ? (
            <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Elimi is thinking...</>
          ) : (
            <><span>{mode === "ask" ? "❓" : "✅"}</span> Send to Elimi</>
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function PhotoScanTutor({ studentGrade = "Grade 5", curriculum = "CBC", subject = "Mathematics", language = "English" }) {
  const [messages, setMessages] = useState([
    {
      id: 1, role: "ai", timestamp: new Date(),
      content: `**Habari! I'm Elimi, your AI tutor.** 🦁\n\nYou can ask me anything about your ${subject} work — type your question, or use the 📷 button to take a photo of a question or your completed work and I will help you right away.\n\nNiko hapa kukusaidia! I am here to help you.`,
      isStreaming: false,
    }
  ]);
  const [photo, setPhoto] = useState(null);
  const [mode, setMode] = useState("ask");
  const [textInput, setTextInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const messagesEndRef = useRef();
  const textRef = useRef();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (msg) => setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }]);

  const updateLastAI = (content, isStreaming) => {
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 && m.role === "ai" ? { ...m, content, isStreaming } : m));
  };

  const sendPhoto = async () => {
    if (!photo || sending) return;
    setSending(true);
    setShowUpload(false);

    // Add photo bubble
    addMessage({ role: "user-photo", photo: photo.url, mode, timestamp: new Date() });
    // Add typing placeholder
    addMessage({ role: "ai", content: "", isStreaming: true, timestamp: new Date() });

    try {
      const res = await fetch(`${API_BASE}/api/photoscan/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_b64: photo.b64,
          mime_type: photo.mimeType,
          mode,
          grade: studentGrade,
          curriculum,
          subject,
          language,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE lines
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) { accumulated += parsed.text; updateLastAI(accumulated, true); }
            } catch { /* partial chunk */ }
          }
        }
      }
      updateLastAI(accumulated, false);
    } catch (err) {
      updateLastAI(`Sorry, something went wrong. Please try again. (${err.message})`, false);
    }

    setSending(false);
    setPhoto(null);
    setMode("ask");
  };

  const sendText = async () => {
    if (!textInput.trim() || sending) return;
    const userText = textInput.trim();
    setTextInput("");
    setSending(true);

    addMessage({ role: "user", content: userText, timestamp: new Date() });
    addMessage({ role: "ai", content: "", isStreaming: true, timestamp: new Date() });

    try {
      const res = await fetch(`${API_BASE}/api/tutor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, grade: studentGrade, curriculum, subject, language }),
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) { accumulated += parsed.text; updateLastAI(accumulated, true); }
            } catch { /* partial */ }
          }
        }
      }
      updateLastAI(accumulated, false);
    } catch (err) {
      updateLastAI(`Sorry, something went wrong. Please try again.`, false);
    }
    setSending(false);
  };

  return (
    <>
      <style>{`
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        @keyframes blink  { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ps-msg { animation: fadeUp 0.25s ease; }
        .ps-input:focus { outline: none; border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .ps-send:hover:not(:disabled) { background: #1d4ed8 !important; }
        .ps-cam:hover:not(:disabled) { background: #f1f5f9 !important; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: 680, margin: "0 auto", fontFamily: "Arial, sans-serif", background: "#F8FAFC", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>

        {/* ── Header ── */}
        <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🦁</div>
          <div>
            <div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Elimi — AI Tutor</div>
            <div style={{ fontSize: 12, color: "#93C5FD" }}>{subject} · {studentGrade} · {curriculum} · {language} & Kiswahili</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.2)", borderRadius: 20, padding: "4px 12px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981" }} />
            <span style={{ fontSize: 12, color: "#A7F3D0", fontWeight: 600 }}>Online</span>
          </div>
        </div>

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map(msg => (
            <div key={msg.id} className="ps-msg">
              {msg.role === "ai" && (
                msg.content === "" && msg.isStreaming
                  ? <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.blue},${C.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🦁</div>
                      <TypingIndicator />
                    </div>
                  : <AIMessage content={msg.content} timestamp={msg.timestamp} isStreaming={msg.isStreaming} />
              )}
              {msg.role === "user" && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ maxWidth: "75%" }}>
                    <div style={{ background: `linear-gradient(135deg,${C.blue},${C.navy})`, color: "#fff", borderRadius: "18px 18px 4px 18px", padding: "11px 15px", fontSize: 14, lineHeight: 1.55 }}>{msg.content}</div>
                    <div style={{ fontSize: 11, color: C.gray, textAlign: "right", marginTop: 4 }}>{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              )}
              {msg.role === "user-photo" && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ maxWidth: "75%" }}>
                    <PhotoMessage src={msg.photo} mode={msg.mode} timestamp={msg.timestamp} />
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Photo upload panel ── */}
        {showUpload && !photo && (
          <div style={{ padding: "0 16px 12px", animation: "fadeUp 0.2s ease" }}>
            <PhotoUploadArea onPhoto={(p) => { setPhoto(p); }} disabled={sending} />
          </div>
        )}

        {/* ── Photo preview + mode selector ── */}
        {photo && (
          <div style={{ padding: "0 16px 12px", animation: "fadeUp 0.2s ease" }}>
            <PhotoPreview photo={photo} mode={mode} onModeChange={setMode} onSend={sendPhoto} onCancel={() => { setPhoto(null); setShowUpload(false); }} sending={sending} />
          </div>
        )}

        {/* ── Text input bar ── */}
        <div style={{ padding: "12px 16px 16px", background: "#fff", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, alignItems: "flex-end" }}>
          {/* Camera/upload toggle */}
          <button
            className="ps-cam"
            onClick={() => { setShowUpload(v => !v); setPhoto(null); }}
            disabled={sending}
            title="Photo scan"
            style={{
              width: 42, height: 42, borderRadius: 12, border: `2px solid ${showUpload ? C.blue : "#E2E8F0"}`,
              background: showUpload ? C.blueL : "#fff", fontSize: 20, cursor: sending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s",
            }}
          >
            📷
          </button>

          {/* Text input */}
          <textarea
            ref={textRef}
            className="ps-input"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            disabled={sending || !!photo}
            placeholder={photo ? "Choose a mode and send your photo above…" : "Ask Elimi anything… (or 📷 to scan a photo)"}
            rows={1}
            style={{
              flex: 1, border: "2px solid #E2E8F0", borderRadius: 12, padding: "10px 14px",
              fontSize: 14, resize: "none", fontFamily: "Arial, sans-serif", lineHeight: 1.5,
              color: C.dark, background: "#FAFAFA", transition: "all 0.15s",
              maxHeight: 120, overflowY: "auto",
            }}
          />

          {/* Send */}
          <button
            className="ps-send"
            onClick={sendText}
            disabled={sending || !textInput.trim() || !!photo}
            style={{
              width: 42, height: 42, borderRadius: 12, border: "none",
              background: (sending || !textInput.trim() || !!photo) ? "#94A3B8" : C.blue,
              color: "#fff", fontSize: 18, cursor: (sending || !textInput.trim() || !!photo) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s",
              boxShadow: (sending || !textInput.trim()) ? "none" : `0 4px 12px ${C.blue}44`,
            }}
          >
            ➤
          </button>
        </div>
      </div>
    </>
  );
}
