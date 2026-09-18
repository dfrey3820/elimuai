# ElimuAI Photo Scan Feature — Integration Guide
## Developer Handover Document
### Venus Unzug Limited | July 2026

---

## What Was Built

Two files that together deliver the complete Photo Scan feature:

| File | Type | Purpose |
|---|---|---|
| `PhotoScanTutor.jsx` | React component | Full AI Tutor chat UI with photo capture, mode selector, and streaming response |
| `photoscan_router.py` | FastAPI router | POST /api/photoscan/analyse — receives image, calls Claude vision API, streams SSE back |

---

## How It Works (User Flow)

```
Student taps 📷 button
        ↓
Upload panel opens — camera (mobile) or file picker (desktop)
        ↓
Student takes / selects photo
        ↓
Preview appears with TWO MODE BUTTONS:
  ❓ "Explain this to me"   →  AI reads question, explains concept, walks through solution
  ✅ "Mark my work"         →  AI marks answers, scores work, explains mistakes
        ↓
Student taps "Send to Elimi"
        ↓
Image sent as base64 to POST /api/photoscan/analyse with:
  - image_b64, mime_type, mode, grade, curriculum, subject, language
        ↓
FastAPI calls Claude Opus with CBC/TIE/NCDC-aware system prompt + image
        ↓
Response streams back as SSE → appears word by word in chat bubble
        ↓
Student sees formatted answer with steps, corrections, encouragement
```

---

## Step 1 — Backend Setup

### 1.1 Install dependency
```bash
pip install anthropic --break-system-packages
```

### 1.2 Set environment variable
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# Add to your .env file and Docker compose
```

### 1.3 Register the router in your main FastAPI app
```python
# app/main.py
from app.routers.photoscan_router import router as photoscan_router

app.include_router(photoscan_router)
```

### 1.4 Test the endpoint
```bash
# Health check
curl https://api.elimuai.africa/api/photoscan/health

# Full test with a real image
python3 test_photoscan.py
```

### 1.5 Quick test script
```python
# test_photoscan.py
import httpx, base64, json

with open("test_question.jpg", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

with httpx.stream("POST", "http://localhost:8000/api/photoscan/analyse",
    json={
        "image_b64": b64,
        "mime_type": "image/jpeg",
        "mode": "ask",
        "grade": "Grade 6",
        "curriculum": "CBC",
        "subject": "Mathematics",
        "language": "English",
    }) as r:
    for line in r.iter_lines():
        if line.startswith("data: ") and line != "data: [DONE]":
            chunk = json.loads(line[6:])
            print(chunk.get("text", ""), end="", flush=True)
```

---

## Step 2 — Frontend Setup

### 2.1 Copy the component
```bash
cp PhotoScanTutor.jsx src/components/tutor/PhotoScanTutor.jsx
```

### 2.2 Set the API URL in your .env
```bash
REACT_APP_API_URL=https://api.elimuai.africa
```

### 2.3 Drop the component into your tutor page
```jsx
// src/pages/TutorPage.jsx
import PhotoScanTutor from "../components/tutor/PhotoScanTutor";

export default function TutorPage({ student }) {
  return (
    <div style={{ height: "calc(100vh - 64px)", padding: "0 16px" }}>
      <PhotoScanTutor
        studentGrade={student.grade}        // e.g. "Grade 5"
        curriculum={student.curriculum}     // "CBC" | "TIE" | "NCDC"
        subject={student.currentSubject}    // e.g. "Mathematics"
        language={student.language}         // "English" | "Kiswahili"
      />
    </div>
  );
}
```

### 2.4 Props reference
| Prop | Type | Default | Values |
|---|---|---|---|
| `studentGrade` | string | "Grade 5" | Any grade string e.g. "Grade 3", "Form 2" |
| `curriculum` | string | "CBC" | "CBC" \| "TIE" \| "NCDC" |
| `subject` | string | "Mathematics" | Any subject name |
| `language` | string | "English" | "English" \| "Kiswahili" |

---

## Step 3 — Nginx Configuration (SSE)

SSE requires Nginx buffering to be disabled for the photoscan route.
Add this to your Nginx server block:

```nginx
location /api/photoscan/ {
    proxy_pass         http://fastapi_backend;
    proxy_http_version 1.1;
    proxy_set_header   Connection "";
    proxy_buffering    off;           # CRITICAL for SSE streaming
    proxy_cache        off;
    proxy_read_timeout 120s;          # Allow up to 2 minutes for long responses
    chunked_transfer_encoding on;
}
```

---

## Step 4 — Update the Pricing Page

Once this feature is live and tested, update `elimuai.africa/pricing`:

1. Remove the "Coming Soon" flag from Photo Scan
2. Add it to the Student Pro, 2 Children, and Family plan feature lists
3. Add a short demo GIF or screenshot showing the two modes

Do NOT remove the "Coming Soon" flag until you have:
- [ ] Tested "ask" mode on at least 10 real CBC questions (Maths, English, Science)
- [ ] Tested "mark" mode on at least 10 real completed exercises
- [ ] Confirmed streaming works correctly on both Android Chrome and iOS Safari
- [ ] Confirmed camera capture works on a low-end Android device

---

## Step 5 — Usage Tracking (Recommended)

Add a database record each time the feature is used to monitor adoption and cost:

```sql
-- Add to your migrations
CREATE TABLE photoscan_usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id   UUID REFERENCES subscribers(id),
    mode            VARCHAR(10) NOT NULL,   -- ask | mark
    curriculum      VARCHAR(10) NOT NULL,
    subject         VARCHAR(60),
    grade           VARCHAR(20),
    image_size_kb   INTEGER,
    tokens_used     INTEGER,
    response_ms     INTEGER,               -- time to first token
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photoscan_sub  ON photoscan_usage(subscriber_id);
CREATE INDEX idx_photoscan_date ON photoscan_usage(created_at);
```

```python
# In photoscan_router.py — add tracking after stream completes
await db.execute("""
    INSERT INTO photoscan_usage
      (subscriber_id, mode, curriculum, subject, grade, image_size_kb, tokens_used)
    VALUES (:sub_id, :mode, :curriculum, :subject, :grade, :size_kb, :tokens)
""", {...})
```

---

## Image Size & Quality Guidelines

| Condition | Result | Recommendation |
|---|---|---|
| Good lighting, clear text | ✅ Best results | Standard phone camera, no flash needed |
| Blurry or shaky | ⚠️ Partial read | Prompt student to retake |
| Very small text | ⚠️ May miss details | Ask student to zoom in |
| Dark/shadowed | ❌ Poor results | Move to better light |
| > 5MB | ❌ Rejected | Frontend compresses before upload |

### Frontend image compression (add to PhotoScanTutor.jsx)
```javascript
// Call this before fileToBase64 for large images
async function compressImage(file, maxSizeKB = 1500) {
  if (file.size / 1024 <= maxSizeKB) return file;
  return new Promise(resolve => {
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      const scale = Math.sqrt((maxSizeKB * 1024) / file.size);
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(new File([blob], file.name, { type: "image/jpeg" })), "image/jpeg", 0.85);
    };
    img.src = URL.createObjectURL(file);
  });
}
```

---

## Cost Estimate (Claude Opus)

| Usage | Tokens (approx) | Cost (approx) |
|---|---|---|
| "Ask" mode response | ~600 input + 400 output | ~$0.012 per scan |
| "Mark" mode response | ~600 input + 600 output | ~$0.016 per scan |
| 1,000 scans/month | — | ~$14/month |
| 10,000 scans/month | — | ~$140/month |

Costs are well within reason at current subscriber volumes.
Consider switching the vision model to claude-haiku-4-5-20251001 if cost becomes a concern at scale — quality difference is minimal for standard CBC questions.

---

## File Checklist

- [ ] `PhotoScanTutor.jsx` → `src/components/tutor/`
- [ ] `photoscan_router.py` → `app/routers/`
- [ ] Router registered in `app/main.py`
- [ ] `ANTHROPIC_API_KEY` in `.env` and Docker compose
- [ ] Nginx SSE config updated
- [ ] `photoscan_usage` table migration run
- [ ] End-to-end test passed (ask + mark modes)
- [ ] Pricing page "Coming Soon" flag removed

---

*ElimuAI Photo Scan | Venus Unzag Limited | July 2026*
*Stack: React + FastAPI + Claude Opus Vision + SSE Streaming*
