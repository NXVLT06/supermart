# SmartTrolley — Smart Shopping Trolley System

A production-grade Smart Shopping Trolley checkout system built with **React 18 + Vite + Ant Design 5** on the frontend and **Vercel Serverless Functions + Vercel KV** on the backend.

## 🛒 Features

- **Payment Page** — Itemized receipt table with 3-second auto-pay progress bar
- **Review Page** — Star rating + written feedback with animated Thank You screen
- **Supervisor Dashboard** — Password-protected live dashboard with SSE real-time updates, trolley status cards, reviews feed, and gate controls
- **WhatsApp Receipts** — WATI API integration for sending checkout receipts
- **Black & White Theme** — Premium ink-press aesthetic with smooth animations

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Ant Design 5, React Router v6 |
| Backend | Vercel Serverless Functions (Node.js 18) |
| Database | Vercel KV (Redis) |
| Real-time | Server-Sent Events (SSE) |
| WhatsApp | WATI API |

## 📁 Project Structure

```
├── api/                          # Vercel Serverless Functions
│   ├── checkout.js               # POST /api/checkout
│   ├── reviews.js                # GET /api/reviews
│   ├── events.js                 # GET /api/events (SSE)
│   ├── trolley/[trolleyId].js    # GET /api/trolley/:id
│   ├── payment/verify.js         # POST /api/payment/verify
│   ├── review/submit.js          # POST /api/review/submit
│   └── gate/supervisor-override.js
├── lib/
│   ├── kv.js                     # Vercel KV helper
│   └── whatsapp.js               # WATI API wrapper
└── src/
    ├── pages/
    │   ├── PaymentView.jsx
    │   ├── ReviewView.jsx
    │   └── SupervisorDashboard.jsx
    ├── App.jsx
    ├── main.jsx
    └── index.css
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Vercel account (for KV and deployment)
- WATI account (for WhatsApp)

### Local Development

```bash
# Install dependencies
npm install

# Copy env variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Start dev server
npm run dev

# Open http://localhost:3000
```

### Test Routes
| URL | Description |
|-----|-------------|
| `/#/supervisor` | Dashboard (password: `admin123`) |
| `/#/pay/demo-1` | Payment page |
| `/#/review/demo-1` | Review page |

## ☁️ Deploy to Vercel

```bash
npx vercel --prod
```

Set these environment variables in Vercel dashboard:

| Variable | Description |
|----------|-------------|
| `VERCEL_KV_REST_API_URL` | Vercel KV REST endpoint |
| `VERCEL_KV_REST_API_TOKEN` | Vercel KV auth token |
| `WATI_API_KEY` | WATI WhatsApp API key |
| `WATI_API_ENDPOINT` | WATI instance endpoint |
| `BASE_URL` | Your deployed Vercel URL |

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/checkout` | Start checkout, send WhatsApp |
| GET | `/api/trolley/:id` | Get trolley state |
| POST | `/api/payment/verify` | Mark as PAID |
| POST | `/api/review/submit` | Submit review |
| GET | `/api/reviews` | Get recent reviews |
| POST | `/api/gate/supervisor-override` | Gate control |
| GET | `/api/events` | SSE live stream |

## 🔑 KV Schema

```
trolley:{id}         HASH   { status, theftFlag, total, phone, items, sessionId, updatedAt }
session:{sessionId}  HASH   { trolleyId, status, total, phone, verifiedAt, transactionId }
review:{trolleyId}   HASH   { rating, feedback, submittedAt }
reviews:list         LIST   [ ...review JSON strings ]
gate:override:{id}   STRING { gateId, action, validUntil } (TTL 300s)
```

## 📄 License

MIT
