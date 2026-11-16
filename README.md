# DERA

**A Buy Now Pay Later debt tracker for UK university students.**

Klarna, Clearpay, PayPal Pay in 3 and Zilch each show you only your own plans. DERA puts every BNPL debt in one dashboard, shows what's due and when, and helps you plan repayments before a missed payment turns into a fee or a credit file mark.

**Live app:** [dera-alpha.vercel.app](https://dera-alpha.vercel.app)

---

## Who it's for

Amara is 19, in her second year at university, and has four BNPL plans across three providers. She doesn't know her total, and she finds out a payment is due when the money leaves her account. DERA is built for her.

## Features

| Area | What it does |
|---|---|
| **Dashboard** | Total owed, a breakdown by provider, and a card for each debt with progress and a status (on track, upcoming, due soon) |
| **Add and edit debts** | Enter a plan by hand: provider, item, total, instalments paid, next due date |
| **Payment calendar** | Every upcoming instalment on one calendar |
| **Repayment planner** | Compare the avalanche and snowball methods for paying debts off |
| **Risk checker** | Flags debts that are close to their due date or at risk of being missed |
| **Wellbeing score** | A score built from payment timeliness, debt load and repayment progress |
| **AI letter writer** | Drafts a polite hardship letter to a provider asking for a 14-day extension |
| **Email parser** | Paste a BNPL confirmation email and DERA pulls out the provider, item, amount and due date |
| **Benchmarking** | Anonymously compares your debt level with other DERA users |
| **Installable** | Works as a Progressive Web App, so it can be added to a phone's home screen |

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS
- **Backend:** Supabase (authentication, Postgres database, Edge Functions)
- **AI:** Groq (Llama 3.3 70B), called only from a Supabase Edge Function
- **Hosting:** Vercel, deployed automatically from `main`

## How the AI features stay secure

The letter writer and email parser don't call the AI provider from the browser. They call a Supabase Edge Function (`supabase/functions/ai-assist`), which:

- only accepts requests from signed-in users,
- builds the prompts on the server, so it can only do DERA's two tasks,
- caps how much text each request can send,
- keeps the API key as a server-side secret, so it never appears in the site's JavaScript.

## Running it locally

```bash
git clone https://github.com/Derahenry/Dera.git
cd Dera
npm install
```

Create a `.env` file:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Then run:

```bash
npm run dev
```

For the AI features, deploy the Edge Function and set its secret:

```bash
supabase functions deploy ai-assist
supabase secrets set GROQ_API_KEY=your-groq-key
```

## Project structure

```
src/
  App.jsx               Main app shell, tabs and dashboard
  Auth.jsx              Sign up and log in
  AddDebt.jsx           Add and edit debts
  PaymentCalendar.jsx   Upcoming instalments
  RepaymentPlanner.jsx  Avalanche vs snowball
  RiskPredictor.jsx     Risk warnings
  WellbeingScore.jsx    Wellbeing score
  LetterWriter.jsx      AI hardship letter
  EmailParser.jsx       AI email extraction
  Benchmarking.jsx      Anonymous comparison
  OpenBanking.jsx       Bank connection (in progress)
supabase/functions/
  ai-assist/            Server-side AI calls
```

## Roadmap

- [x] Dashboard, debt entry and Supabase auth
- [x] Payment calendar, repayment planner, risk checker
- [x] Wellbeing score, AI letter writer, email parser
- [x] AI calls moved server-side
- [ ] Open Banking via TrueLayer (needs a server-side token exchange)
- [ ] Automated tests
- [ ] Split `App.jsx` into smaller components

## Author

Built by **Chidera Nwokolo**, Software Engineering student at the University of Northampton.
[LinkedIn](https://www.linkedin.com/in/chidera-nwokolo-11a4ab2ba)
