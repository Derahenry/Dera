# DERA

**A Buy Now Pay Later debt tracker for UK university students.**

Klarna, Clearpay, PayPal Pay in 3 and Zilch each show you only your own plans. DERA puts every BNPL plan in one place, shows what's due and when, spots new purchases from your emails, and helps you ask a provider for support before a missed payment turns into a fee or a credit file mark.

**Live app:** [dera-alpha.vercel.app](https://dera-alpha.vercel.app)

---

## Who it's for

Amara is 19, in her second year at university, and has four BNPL plans across three providers. She doesn't know her total, and she finds out a payment is due when the money leaves her account. DERA is built for her.

## Features

| Area | What it does |
|---|---|
| **Home** | What's left to pay, what's due this week, and every plan sorted by its next payment. Mark a payment as made (with Undo); finished plans move to "Paid off". |
| **Detected purchases** | Paste a BNPL email and DERA reads the purchase with AI. It waits on Home as "New Klarna purchase detected" with Add, Edit or Ignore, and warns if it looks like a duplicate. Only the details are stored, never the email. |
| **Calendar** | A month view of every instalment, plus overdue and coming-up lists. |
| **Insights** | A wellbeing score (paying on time, how much you owe, progress), a month-by-month payment plan against your own budget, and an anonymous comparison with other DERA users. |
| **Message your provider** | Pick a plan and what you need (more time, a pause, smaller payments). AI writes a short chat message or email, with each provider's real support contacts and free UK debt advice services. |
| **Payment schedules** | Weekly, fortnightly or monthly instalments, with the next due date moving on as you pay. |
| **Design** | Monochrome, phone-first design that follows your phone's light or dark setting, with an animated intro and onboarding. |
| **Payment reminders** | A phone notification 3 days before and on the day each payment is due, at 9am UK time, even when DERA is closed. Turn on, test or turn off in Settings. |
| **Accounts** | Email sign-up and sign-in, password reset, and light, dark or system appearance. |
| **Installable** | An Install button on Android and desktop Chrome, and Add to Home Screen steps on iPhone (needed there for reminders). |

Open banking is shown as "Coming soon" until it can be built properly with a server-side token exchange.

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS 4
- **Backend:** Supabase (authentication, Postgres with row-level security, realtime, Edge Functions, Vault, pg_cron)
- **Notifications:** Web Push from a Supabase Edge Function, scheduled daily with pg_cron
- **AI:** Groq (`openai/gpt-oss-120b`), called only from a Supabase Edge Function
- **Email:** Resend as the SMTP sender for sign-up and password emails
- **Hosting:** Vercel, deployed automatically from `main`

## Security and privacy

- **Your data is yours.** Row-level security means each person can only read and change their own debts and detected purchases. Deleting an account deletes its data.
- **AI runs on the server.** The app calls a Supabase Edge Function (`supabase/functions/ai-assist`), which only accepts signed-in users, builds the prompts itself (so it can only do DERA's two tasks), caps the text each request can send, and keeps the API key as a server secret.
- **Daily AI limit.** Each person can make 30 AI requests a day, so one account can't use up the shared allowance.
- **Fair comparisons.** Benchmark figures are worked out on the server from real debts, so they can't be faked from the browser.
- **Reminder keys stay secret.** The private notification key and the daily job's secret are kept in Supabase Vault, readable only by the server. People can only see and remove their own devices.
- **Security headers.** The site sends a Content Security Policy and blocks being shown inside other sites' frames.

## Running it locally

```bash
git clone https://github.com/Derahenry/Dera.git
cd Dera
npm install
```

Copy `.env.example` to `.env` and fill in your Supabase URL and publishable key. Then run:

```bash
npm run dev
```

### Backend setup (new Supabase project)

1. **Database:** run every file in `supabase/migrations` in date order.
   `20261123_initial_schema.sql` is the starting point; the rest build on it.
2. **AI features:** deploy the Edge Function and set its secret:
   ```bash
   supabase functions deploy ai-assist
   supabase secrets set GROQ_API_KEY=your-groq-key
   ```
3. **Payment reminders:**
   - Generate a VAPID key pair (for example `npx web-push generate-vapid-keys`).
   - Store the keys and a random job secret in Vault:
     ```sql
     select vault.create_secret('<public key>', 'vapid_public_key');
     select vault.create_secret('<private key>', 'vapid_private_key');
     select vault.create_secret('<long random string>', 'reminders_cron_secret');
     ```
   - Put the public key in `VAPID_PUBLIC_KEY` in `src/push.js`.
   - Deploy the function with JWT checking off (it checks the job secret or the user itself):
     ```bash
     supabase functions deploy send-reminders --no-verify-jwt
     ```
   - The daily job in `20261125_push_reminders.sql` calls this project's function URL; change it to yours.

To regenerate the app icons, run `npm run icons`.

## Project structure

```
src/
  App.jsx               App shell: sign-in flow, data loading, tabs and sheets
  screens/              Home, Calendar, Insights, Message provider, Settings,
                        Splash and Onboarding
  AddDebt.jsx           Add and edit a plan (bottom sheet)
  EmailParser.jsx       Paste an email to detect a purchase
  DetectedCard.jsx      The Add / Edit / Ignore card for a detected purchase
  pendingPurchases.js   Saving and matching detected purchases
  PaymentPlan.jsx       Monthly plan against a budget
  Benchmarking.jsx      Anonymous comparison
  OpenBanking.jsx       "Coming soon" screen
  Auth.jsx              Sign up, log in, forgot password
  ResetPassword.jsx     Set a new password from the email link
  ai.js                 Calls the AI function and shows its messages
  push.js               Payment reminders (Web Push) and the install prompt
  debtMath.js           Dates, schedules, amounts and validation
  providerHelp.js       Provider support contacts and free advice services
  ui.jsx                Shared components (icons, sheet, bottom bar)
  index.css             Design tokens (light and dark), motion
public/
  sw.js                 Service worker: shows reminders, opens DERA on tap
  manifest.json         Install details and icons
supabase/
  functions/ai-assist/       Server-side AI calls, with the daily limit
  functions/send-reminders/  Daily reminders and the Settings test
  migrations/                Database changes, in date order
scripts/
  generate-icons.js     Rebuilds the app icons
vercel.json             Security headers
```

## Roadmap

- [x] Dashboard, debt entry, payment tracking and Supabase auth
- [x] Calendar, payment plan, wellbeing score and benchmarking
- [x] AI provider messages and email reading, server-side with a daily limit
- [x] Monochrome redesign with light and dark mode
- [x] Detected purchases from pasted emails
- [x] Payment reminders that arrive even when the app is closed
- [x] Security headers and a daily AI limit
- [ ] Forwarded emails feeding detected purchases automatically
- [ ] Open banking via TrueLayer
- [ ] Automated tests

## Author

Built by **Chidera Nwokolo**, Software Engineering student at the University of Northampton.
[LinkedIn](https://www.linkedin.com/in/chidera-nwokolo-11a4ab2ba)
