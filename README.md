# ElimuAI 🎓
### AI-Powered Learning Platform for East Africa
**Kenya CBC · Tanzania TIE 2023 · Uganda NCDC 2020**

> Elimu · Ujuzi · Mafanikio

---

## 🌍 Overview

ElimuAI is a full-stack, production-ready AI education platform built for East African students, teachers, parents and school administrators. It supports:

- 🇰🇪 **Kenya** — Competency Based Curriculum (CBC), PP1 through Grade 9 (JSS)
- 🇹🇿 **Tanzania** — TIE 2023 revised curriculum, Standard 1–7 and Form 1–4
- 🇺🇬 **Uganda** — NCDC revised 2020, Primary 1–7 and Senior 1–4
- 🗣️ **Bilingual** — Full English + Kiswahili UI
- 🏆 **Leaderboards** — Global, Country, School, Class scopes
- 💚 **M-Pesa Payments** — Safaricom Daraja API STK Push
- 📴 **Offline Mode** — Cached lessons work without internet

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5 |
| Backend | Node.js 20, Express 4 |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| AI | Anthropic Claude (claude-sonnet-4) |
| Payments | Safaricom M-Pesa Daraja API |
| SMS | Africa's Talking |
| Storage | Cloudinary |
| Auth | JWT (access + refresh tokens) |
| Deployment | Docker + Docker Compose |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Anthropic API key
- M-Pesa Daraja sandbox credentials (optional for dev)

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/elimuai.git
cd elimuai

# Copy and fill env file
cp backend/.env.example backend/.env
# Edit backend/.env with your keys
```

### 2. Start with Docker Compose

```bash
# Start PostgreSQL + Redis + API
docker-compose up -d

# Check all services are running
docker-compose ps
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 3b. One Command Local Start (No concurrently needed)

```bash
# From project root: starts postgres + redis + api in Docker and runs frontend Vite
npm run dev:local
```

### 4. Access the App
- **Frontend**: http://localhost:3000
- **API**: http://localhost:5001
- **Health Check**: http://localhost:5001/health

---

## ☁️ AWS ECS (Cost-Optimized) Deployment

This repo includes a low-cost ECS setup that deploys frontend + backend as a single ECS service (2 containers) behind one ALB.

What is optimized for cost:
- ARM64 images (`linux/arm64`) to use lower-cost Graviton Fargate pricing
- `FARGATE_SPOT` weighted higher than on-demand
- One ECS service + one ALB for both frontend and backend
- 7-day CloudWatch log retention

### 1. Prepare deploy env file

```bash
cp infra/ecs-cost-optimized/ecs.env.example infra/ecs-cost-optimized/ecs.env
# Edit values in ecs.env (DATABASE_URL, REDIS_URL, JWT_SECRET, ANTHROPIC_API_KEY, etc.)
```

### 2. Deploy

```bash
npm run deploy:ecs
```

---

## 💸 Cheapest AWS Deployment (Recommended)

For the lowest monthly cost, use one small EC2 VM and run the app with Docker Compose:

- EC2 hosts frontend + backend + postgres + redis
- GitHub Actions builds images and deploys automatically to EC2

### 1. Provision EC2 (Ubuntu)

```bash
# On EC2 instance
curl -fsSL https://raw.githubusercontent.com/<your-org>/<your-repo>/main/scripts/provision-ec2-cheap.sh -o provision.sh
chmod +x provision.sh
./provision.sh
```

### 2. Prepare deploy env

Copy [deploy/ec2/.env.example](deploy/ec2/.env.example) to `/opt/elimuai/.env` on EC2 and fill values.

Set images to your GHCR namespace, for example:

```bash
BACKEND_IMAGE=ghcr.io/<github-owner>/elimuai-backend:latest
FRONTEND_IMAGE=ghcr.io/<github-owner>/elimuai-frontend:latest
```

### 3. Configure GitHub repository secrets

In GitHub repository settings, add:

- `EC2_HOST`
- `EC2_USER`
- `EC2_SSH_KEY`
- `APP_ENV_FILE` (full content of `/opt/elimuai/.env`)

### 4. Enable CI/CD

- CI workflow: [/.github/workflows/ci.yml](.github/workflows/ci.yml)
- Deploy workflow: [/.github/workflows/deploy-ec2.yml](.github/workflows/deploy-ec2.yml)

On push to `main`, workflow will:

1. Build and push frontend/backend images to GHCR
2. Copy deploy files to EC2 (`/opt/elimuai`)
3. Run deployment using [deploy/ec2/deploy.sh](deploy/ec2/deploy.sh)

### 5. First manual deploy command (optional)

```bash
cd /opt/elimuai
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

---

## 🔁 Push This Code To GitHub

If this folder is not already a git repo:

```bash
cd elimuai
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

### 3. Re-run once with real ALB URL for CORS

After first deploy, script prints `AlbUrl`.

Set that URL in `FRONTEND_URL` inside `infra/ecs-cost-optimized/ecs.env`, then run deploy again:

```bash
npm run deploy:ecs
```

---

## 📁 Project Structure

```
elimuai/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main React app (all screens)
│   │   ├── main.jsx             # Entry point
│   │   └── i18n/
│   │       └── translations.js  # EN + Kiswahili strings
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── server.js            # Express entry point
│   │   ├── config/
│   │   │   ├── database.js      # PostgreSQL pool
│   │   │   └── logger.js        # Winston logger
│   │   ├── db/
│   │   │   └── schema.sql       # Full DB schema
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT auth + role + plan guards
│   │   ├── routes/
│   │   │   ├── auth.js          # Register, login, refresh, logout
│   │   │   ├── ai.js            # Tutor, homework, exam generation
│   │   │   ├── leaderboard.js   # Rankings (global/country/school)
│   │   │   ├── payments.js      # M-Pesa STK Push + callback
│   │   │   ├── progress.js      # XP, streaks, achievements
│   │   │   └── combined.js      # Users, schools, exams, reports, curriculum
│   │   └── services/
│   │       ├── progressService.js   # XP awards, streaks, achievements
│   │       ├── leaderboardService.js # Hourly rank refresh
│   │       ├── reportService.js     # Weekly parent SMS reports
│   │       └── smsService.js        # Africa's Talking SMS
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml
├── Dockerfile
├── package.json               # Monorepo root
└── README.md
```

---

## 🔑 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (email or phone) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/auth/me` | Get current user |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/tutor` | AI tutoring chat |
| POST | `/api/ai/homework` | Homework solve/check |
| POST | `/api/ai/generate-questions` | Generate exam questions |
| POST | `/api/ai/school-insights` | AI teaching insights |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard?scope=global&period=weekly` | Get leaderboard |
| GET | `/api/leaderboard/my-ranks` | User's ranks across all scopes |

### Payments (M-Pesa)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/mpesa/initiate` | Initiate STK Push |
| POST | `/api/payments/mpesa/callback` | Safaricom callback |
| GET  | `/api/payments/status/:id` | Check payment status |
| GET  | `/api/payments/history` | Payment history |

### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/progress/summary` | XP, streaks, subject scores |
| POST | `/api/progress/log` | Log learning activity |
| GET  | `/api/progress/achievements` | Badges & achievements |

---

## 💳 Pricing Plans

| Plan | Price | Target |
|------|-------|--------|
| Free | KES 0 | Individual students (5 AI questions/day) |
| Student Pro | KES 299/month | Unlimited AI + all features |
| Family | KES 499/month | Up to 3 students + parent dashboard |
| School | KES 15,000/term | Unlimited students + full admin panel |

---

## 💚 M-Pesa Integration

ElimuAI uses the **Safaricom Daraja 2.0 API** for STK Push payments.

1. Customer selects plan → enters Safaricom number
2. Backend requests OAuth token from Safaricom
3. STK Push sent to customer's phone
4. Customer enters M-Pesa PIN
5. Safaricom calls `/api/payments/mpesa/callback`
6. Backend activates user's plan + sends SMS confirmation

**Sandbox testing**: Use [Safaricom Developer Portal](https://developer.safaricom.co.ke)

---

## 🌐 Deployment (Production)

### Recommended Stack
- **API**: Railway, Render, or DigitalOcean App Platform
- **Database**: Supabase (PostgreSQL) or Railway Postgres
- **Redis**: Upstash Redis
- **Frontend**: Vercel or Netlify
- **Domain**: elimuai.africa

### Environment Variables (Production)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...  # Production DB
REDIS_URL=rediss://...         # Upstash Redis (with SSL)
JWT_SECRET=<64+ random chars>
ANTHROPIC_API_KEY=sk-ant-...
MPESA_ENVIRONMENT=production
MPESA_BASE_URL=https://api.safaricom.co.ke
MPESA_CALLBACK_URL=https://api.elimuai.africa/api/payments/mpesa/callback
AFRICASTALKING_USERNAME=<your_username>
```

---

## 📅 Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Weekly Reports | Sunday 7:00 AM EAT | SMS reports to all parents |
| Leaderboard Refresh | Every hour | Recalculate ranks |

---

## 🏆 Leaderboard Scopes

| Scope | Description |
|-------|-------------|
| Global | All users across Kenya, Tanzania, Uganda |
| Country | Users within same country |
| School | Users within same school |
| Class | Users within same class |

Periods: **Weekly** · **Monthly** · **All Time**

Ranking factors: XP earned · Streak days · Tests completed

---

## 🗣️ Languages

All UI text supports:
- 🇬🇧 **English** (default)
- 🇰🇪 **Kiswahili** — full translation of all screens, AI responses, and SMS notifications

Toggle in top bar or on onboarding screen.

---

## 📱 Offline Mode

When offline:
- ✅ Browse cached lessons (Mathematics, Science, English)
- ✅ View progress and badges
- ✅ Browse past paper list
- ❌ AI Tutor (requires connection)
- ❌ Generate exam questions (requires connection)

---

## 🔐 Security

- JWT access tokens (7 day expiry) + refresh tokens (30 day)
- bcrypt password hashing (salt rounds: 12)
- Helmet.js security headers
- Rate limiting: 100 req/15min global, 30 AI req/hour
- CORS restricted to frontend origin
- Plan-based feature gating via middleware

---

## 📞 Support

- Email: support@elimuai.africa
- SMS: Africa's Talking (Kenya +254, Tanzania +255, Uganda +256)

---

*Built with ❤️ for African students*
