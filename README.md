# 🎙️ Minto — AI Meeting MOM Generator

> **One-tap AI meeting assistant built for India & global teams.**  
> Accurately captures meetings in **Hindi, Marathi, English, and code-switched Hinglish**, generating ultra-detailed, dual-pass audited Minutes of Meeting (MOM).

---

## ⚡ Key Highlights

- **₹0 Total Setup Cost:** Runs entirely on free tiers & credits. No credit card required.
- **Zero Laptop Footprint:** Your laptop is only used for code edits. Once deployed to Vercel, close your laptop—meetings process 100% in the cloud.
- **Any Meeting Length:** Continuous 30-second chunking handles 15-minute syncs or **6 to 12+ hour marathons** without memory issues.
- **Mixed Language Detection:** Deepgram Nova-3 auto-detects English, Hindi, Marathi, and code-switching without manual language toggling.
- **Dual-Pass Accuracy Auditor:** 
  - **Pass 1:** Gemini Flash extracts all decisions, action items, owners, deadlines, numbers, and discussion topics.
  - **Pass 2:** Gemini Auditor checks the draft against the full transcript to fix omissions, verify names, and validate numbers.
- **Offline Resilient:** If Wi-Fi or mobile data blips mid-meeting, chunks buffer in browser IndexedDB and sync automatically upon reconnection.
- **Export & Share:** Instant 1-click PDF download, native mobile share (WhatsApp / Slack / Email), and clipboard copy.

---

## 🏗️ The ₹0 Cloud Architecture

```
User's Phone / Laptop / Tablet (Browser or PWA)
                     │
                     │  🎙️ mic → 30-second audio chunks
                     ▼
             Vercel Cloud Serverless
                     │
   ┌─────────────────┼─────────────────┐
   ▼                 ▼                 ▼
Deepgram Nova-3   Gemini Flash    Supabase Postgres
 ($200 Free)      (Free Tier)     (Free Tier)
 Speech-to-Text    MOM & Audit     Transcripts & Auth
   │                 │                 │
   └─────────────────┼─────────────────┘
                     ▼
       Ultra-Detailed Verified MOM
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd "MoM Generator"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

You can test Minto immediately! If keys are not set, Minto runs in **Preview / Demo Mode** so you can test recording, timer, visualizer, mock transcription, and MOM generation.

To connect live cloud services, fill in:
```env
# Supabase (https://supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Deepgram (https://console.deepgram.com - $200 free credit)
DEEPGRAM_API_KEY=your-deepgram-api-key

# Google Gemini (https://aistudio.google.com - Free tier)
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 How to Get Your Free Cloud Accounts (Step-by-Step)

### 1. Deepgram ($200 Free Credits — No Credit Card)
1. Sign up at [console.deepgram.com](https://console.deepgram.com) with Google or email.
2. You receive **$200 in free credits** (~775 hours of transcription).
3. Navigate to **API Keys** → **Create a New API Key**.
4. Copy the key into `DEEPGRAM_API_KEY`.

### 2. Google Gemini API (Free Tier — No Credit Card)
1. Visit [Google AI Studio](https://aistudio.google.com).
2. Sign in with your Google account.
3. Click **Get API Key** → **Create API Key in new project**.
4. Copy the key into `GEMINI_API_KEY`.

### 3. Supabase (Free Database & Google Auth)
1. Sign up at [supabase.com](https://supabase.com).
2. Click **New Project** (Free Tier).
3. Go to **SQL Editor** → create a new query.
4. Paste and run the migration script from [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).
5. Go to **Project Settings** → **API** to copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
6. *(Optional)* For Google Login: Go to **Authentication** → **Providers** → **Google** and toggle Enable.

---

## ☁️ 1-Click Deployment to Vercel (Close Your Laptop)

1. Push your code to a free GitHub repository:
   ```bash
   git add .
   git commit -m "feat: initial Minto release"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/minto.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **Add New** → **Project** → select your `minto` repository.
4. Under **Environment Variables**, paste the 5 keys from `.env.local`.
5. Click **Deploy**.

Vercel will give you a live URL like `https://minto-xyz.vercel.app`.  
Open it on your **Android phone, iPhone, iPad, Mac, or PC** — you can now close your laptop completely!

---

## 📱 Mobile Screen Lock & Backgrounding Note

- On mobile phones, browser security suspends the microphone if the screen completely locks.
- Minto automatically activates the **Screen Wake Lock API** while recording so your phone screen stays awake during the meeting.
- For 6+ hour meetings on mobile, keep your phone plugged in or resting on the table with the screen active.

---

## 🛡️ License

MIT License. Open source and free for commercial and personal usage.
