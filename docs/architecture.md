# Architecture — AI Cold Email Personalizer

## Full System Diagram

```
Browser (Next.js)
      │
      │  REST API calls (JWT Auth)
      ▼
FastAPI Backend ──────────────────────────────────────┐
      │                                               │
      ├── /api/auth     Register / Login (JWT)        │
      │                                               │
      ├── /api/emails/generate                        │
      │       │                                       │
      │       ├── 1. Check Redis quota (per user/mo)  │
      │       ├── 2. Scrape URL (BeautifulSoup)       │
      │       └── 3. Generate email (OpenAI GPT-4o)   │
      │                                               │
      ├── /api/emails/bulk                            │
      │       └── Enqueue ARQ job → Redis Queue       │
      │                      │                        │
      │               ARQ Worker (separate process)   │
      │                      └── Loops prospects      │
      │                          scrapes + generates  │
      │                          updates job status   │
      │                                               │
      └── /api/users/billing/checkout                 │
              └── Stripe Checkout Session             │
                      │                               │
              Stripe Webhook → /billing/webhook       │
                      └── Upgrades user plan in Redis │
                                                      │
                     Redis ◄────────────────────────┘
                      ├── Quota: quota:{user}:{month}
                      ├── Users: user:{user_id}
                      ├── History: history:{user_id}
                      └── Jobs: job:{job_id}
```

## Email Generation Pipeline (Chain-of-Thought)

```
Input: prospect data + sender info + tone
      │
      ▼
System prompt tells GPT-4o to:
  1. ANALYSE the prospect — role, company, pain points
  2. CONNECT sender value prop to prospect's specific situation
  3. CRAFT a curiosity-driving subject line
  4. WRITE a <120 word email starting with THEM, not you

      │
      ▼
GPT-4o returns JSON:
  {
    "reasoning": "why this personalisation approach",
    "subject":   "the subject line",
    "body":      "the email body"
  }

      │
      ▼
Saved to Redis history + returned to frontend
```

## Rate Limiting (Redis)

```
Key pattern: quota:{user_id}:{YYYY-MM}
TTL: 35 days (covers month boundary)

On each /generate request:
  1. GET quota:user:2024-01 → current count
  2. If count >= plan_limit → 429 Too Many Requests
  3. Else INCR + EXPIRE → proceed with generation
```

## Stripe Billing Flow

```
User clicks "Upgrade"
      │
      ▼
POST /api/users/billing/checkout
  → stripe.checkout.Session.create(price_id, metadata={user_id, plan})
  → returns checkout_url

      │ redirect
      ▼
Stripe Checkout Page (hosted by Stripe)

      │ on success
      ▼
Stripe sends webhook → POST /api/users/billing/webhook
  event: checkout.session.completed
  → read metadata.user_id + metadata.plan
  → update Redis: user:{id}.plan = "pro"

      │
      ▼
User's quota limit is now 500/mo
```

## Bulk Job Flow (ARQ)

```
POST /api/emails/bulk  { prospects: [...100 items], sender_info: {...} }
      │
      ▼
Set Redis job:{id} = { status: "queued", total: 100, completed: 0 }
Enqueue ARQ task → process_bulk_job(job_id, prospects, ...)
Return { job_id } to client

      │ background worker
      ▼
Worker loops over prospects:
  for each prospect:
    1. check_and_increment_quota (stops if limit reached)
    2. scrape URL (or use manual data)
    3. generate_email via OpenAI
    4. append to results
    5. every 5 emails: update_job_progress in Redis

      │ client polls
      ▼
GET /api/emails/bulk/{job_id}
  → returns { status, completed, failed, emails[] }
```
