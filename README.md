# ✉️ AI Cold Email Personalizer

A SaaS tool that scrapes prospect data (LinkedIn / company websites) and generates hyper-personalised cold emails using GPT-4 with chain-of-thought prompting. Features Stripe billing, async job queues, and a polished Next.js frontend.

---

## ✨ Features

- **Prospect scraping** — extract name, role, company, recent news from any URL
- **AI email generation** — chain-of-thought prompting for highly personalised emails
- **Bulk generation** — upload CSV of prospects, process all asynchronously
- **Stripe billing** — Free (5/mo), Pro (500/mo), Business (unlimited) tiers
- **Rate limiting** — Redis-backed per-user quota enforcement
- **Job queue** — BullMQ-style async processing via Redis + ARQ
- **Email history** — browse, copy, regenerate past emails
- **Copy & export** — one-click copy, CSV export of generated emails

---

## 📁 Project Structure

```
cold-email-ai/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routes (auth, emails, billing, jobs)
│   │   ├── core/           # Config, security, logging
│   │   ├── models/         # Pydantic schemas
│   │   ├── services/       # OpenAI, scraper, Stripe, Redis
│   │   ├── workers/        # ARQ async job workers
│   │   └── utils/          # Helpers
│   ├── tests/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components (ui/, layout/, forms/)
│   │   ├── pages/          # Next.js pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # API client, helpers
│   │   └── styles/         # Global CSS
│   └── package.json
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── docs/
│   └── architecture.md
└── README.md
```

---

## ⚙️ Quick Start

```bash
# 1. Clone and set up env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Fill in OPENAI_API_KEY, STRIPE_SECRET_KEY, REDIS_URL

# 2. Start everything with Docker
docker-compose -f docker/docker-compose.yml up --build

# 3. Or run manually
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Worker (separate terminal)
cd backend && arq app.workers.email_worker.WorkerSettings

# Frontend
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

---

## 🔑 Environment Variables

### backend/.env
```
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
SECRET_KEY=your-jwt-secret-here
DATABASE_URL=sqlite:///./cold_email.db
```

### frontend/.env.local
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 💳 Pricing Tiers

| Plan | Emails/month | Price |
|------|-------------|-------|
| Free | 5 | $0 |
| Pro | 500 | $29/mo |
| Business | Unlimited | $99/mo |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | OpenAI GPT-4o |
| Backend | FastAPI (Python) |
| Job Queue | ARQ + Redis |
| Rate Limiting | Redis |
| Scraping | BeautifulSoup + httpx |
| Billing | Stripe |
| Frontend | Next.js 14 + Tailwind CSS |
| Auth | JWT (python-jose) |
| DB | SQLite (dev) / PostgreSQL (prod) |

---

## 📄 License
MIT
