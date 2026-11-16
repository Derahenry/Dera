// ai-assist: runs DERA's AI features on the server so the Groq key never reaches the browser.
//
// The browser sends a task name and the user's input. The prompts live here, so this
// function can only write hardship letters and read BNPL emails. It can't be used as a
// general-purpose chatbot on your Groq account.
//
// Secret required: GROQ_API_KEY (set in Supabase dashboard > Edge Functions > Secrets).

import { createClient } from 'npm:@supabase/supabase-js@2'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

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

function letterPrompt(input: Record<string, unknown>): string {
  const provider = clean(input.provider, 40)
  const recipient = PROVIDERS[provider] || provider || 'the creditor'
  const total = Number(input.total)
  return `You are a professional debt advisor in the UK. Write a formal, polite hardship letter from a customer to ${recipient}.

The customer details:
- Provider: ${provider}
- Item/purchase: ${clean(input.item, 120)}
- Amount owed: £${Number.isFinite(total) ? total.toFixed(2) : '0.00'}
- Due date: ${clean(input.due_date, 20)}
- Reason for difficulty: ${clean(input.reason, 600)}

Write a short, professional letter requesting a payment extension of 14 days. The tone should be polite, honest, and respectful. Do not include a subject line. Start with "Dear ${recipient}," and end with "Yours sincerely," followed by a blank line for their name. Keep it under 200 words.`
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
  "paid": "number of instalments already paid as a number"
}

If any field cannot be determined from the email, use these defaults: instalments: 3, paid: 0.`
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

  const groqRes = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
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
