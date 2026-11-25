// ai-assist: runs DERA's AI features on the server so the Groq key never reaches the browser.
//
// The browser sends a task name and the user's input. The prompts live here, so this
// function can only write hardship letters and read BNPL emails. It can't be used as a
// general-purpose chatbot on your Groq account.
//
// Secret required: GROQ_API_KEY (set in Supabase dashboard > Edge Functions > Secrets).

import { createClient } from 'npm:@supabase/supabase-js@2'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
// llama-3.3-70b-versatile was shut down by Groq on 16 Aug 2026; this is their recommended replacement.
const MODEL = 'openai/gpt-oss-120b'
// AI requests each person can make per UK day (counted by use_ai_request in the database).
const DAILY_LIMIT = 30

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PROVIDERS: Record<string, string> = {
  'Klarna': 'Klarna Bank AB',
  'Clearpay': 'Clearpay Finance Limited',
  'PayPal Pay in 3': 'PayPal Credit',
  'Zilch': 'Zilch Technology Limited',
  'Other': 'the creditor',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Trim and cap user text so one request can't send a huge prompt.
function clean(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max)
}

const REQUESTS: Record<string, string> = {
  'more-time': 'ask to move the next payment back by about two weeks',
  'pause': 'ask for a short pause in payments (for example one month) while things settle',
  'smaller': 'ask to spread the remaining balance over more, smaller payments',
}

const money = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : null
}

// Older versions of the app send no `request`/`format`; they get the original
// behaviour (a formal letter asking for a 14-day extension).
function letterPrompt(input: Record<string, unknown>): string {
  const provider = clean(input.provider, 40)
  const recipient = PROVIDERS[provider] || provider || 'the creditor'
  const request = REQUESTS[clean(input.request, 20)] ?? REQUESTS['more-time']
  const format = clean(input.format, 10) === 'chat' ? 'chat' : 'email'
  const name = clean(input.name, 80)
  const nextAmount = money(input.next_amount)
  const remaining = money(input.remaining)

  const details = [
    `- Provider: ${provider}`,
    `- Item/purchase: ${clean(input.item, 120)}`,
    `- Original total: ${money(input.total) ?? 'unknown'}`,
    remaining ? `- Still to pay: ${remaining}` : null,
    nextAmount ? `- Next payment: ${nextAmount} due ${clean(input.due_date, 20)}` : `- Next payment due: ${clean(input.due_date, 20)}`,
    `- What's happening: ${clean(input.reason, 600)}`,
  ].filter(Boolean).join('\n')

  const shape = format === 'chat'
    ? `Write a short message to paste into ${provider}'s in-app support chat. Friendly, honest and clear, under 100 words. No greeting like "Dear", no sign-off, no subject line.`
    : `Write a short, polite email to ${recipient}. Start with "Dear ${recipient}," and end with "Yours sincerely," then ${name ? `"${name}"` : 'a blank line for their name'} on the next line. Under 180 words. No subject line.`

  return `You are helping a UK customer who is struggling with a Buy Now Pay Later payment contact their provider.

The customer's details:
${details}

${shape}
In the message, briefly explain the situation in the customer's own voice, ${request}, and ask the provider to confirm what support they can offer.
Rules: do not invent account or reference numbers, dates or amounts that are not given above. Do not use placeholders in square brackets. Do not mention this app. Write in British English.`
}

function emailPrompt(input: Record<string, unknown>): string {
  return `You are a financial data extractor. Read the following BNPL (Buy Now Pay Later) email and extract the key details.

Email content:
${clean(input.emailText, 6000)}

Extract and return ONLY a JSON object with these exact fields:
{
  "provider": "one of: Klarna, Clearpay, PayPal Pay in 3, Zilch, Other",
  "item": "name of the item or purchase",
  "total": "total amount as a number only, no currency symbol",
  "due_date": "due date in YYYY-MM-DD format",
  "instalments": "total number of instalments as a number",
  "paid": "number of instalments already paid as a number",
  "frequency": "how often instalments are due: one of weekly, fortnightly, monthly, or null if the email does not say"
}

If any field cannot be determined from the email, use these defaults: instalments: 3, paid: 0, frequency: null.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Only signed-in DERA users can use the AI features.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Please sign in again.' }, 401)

  const groqKey = Deno.env.get('GROQ_API_KEY')
  if (!groqKey) return json({ error: 'AI is not set up on the server yet.' }, 500)

  let body: { task?: string; input?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }
  const input = body.input ?? {}

  let prompt: string
  let maxTokens: number
  let wantsJson = false
  if (body.task === 'letter') {
    if (!clean(input.reason, 600) || !clean(input.provider, 40)) {
      return json({ error: 'Pick a debt and give a reason.' }, 400)
    }
    prompt = letterPrompt(input)
    maxTokens = 500
  } else if (body.task === 'parse-email') {
    if (!clean(input.emailText, 6000)) return json({ error: 'Paste an email first.' }, 400)
    prompt = emailPrompt(input)
    maxTokens = 300
    wantsJson = true
  } else {
    return json({ error: 'Unknown task.' }, 400)
  }

  // Daily cap per person, checked only for valid requests, so one account can't use up the Groq allowance.
  const { data: left, error: limitError } = await supabase.rpc('use_ai_request', { daily_limit: DAILY_LIMIT })
  if (limitError) {
    console.error('Usage check failed', limitError.message)
    return json({ error: 'The AI service is busy. Try again in a minute.' }, 503)
  }
  if (left < 0) {
    return json({
      error: `You've used today's ${DAILY_LIMIT} AI requests. They reset at midnight.`,
      code: 'daily_limit',
    }, 429)
  }

  const groqRes = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      // gpt-oss reasons before answering; keep that short and leave room for the answer itself.
      reasoning_effort: 'low',
      max_completion_tokens: maxTokens + 1000,
      ...(wantsJson ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!groqRes.ok) {
    console.error('Groq error', groqRes.status, await groqRes.text())
    return json({ error: 'The AI service is busy. Try again in a minute.' }, 502)
  }

  const data = await groqRes.json()
  const text: string = data.choices?.[0]?.message?.content ?? ''

  if (wantsJson) {
    try {
      return json({ result: JSON.parse(text.replace(/```json|```/g, '').trim()) })
    } catch {
      return json({ error: 'Could not read that email.' }, 422)
    }
  }
  return json({ result: text })
})
