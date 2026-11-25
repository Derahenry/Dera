// send-reminders: phone notifications for payments due today or in 3 days,
// delivered even when DERA is closed (Web Push).
//
// Two ways in:
//  - The daily job (pg_cron) calls it with the x-cron-secret header. It only
//    sends at 9am UK time, so one schedule works across summer and winter time.
//  - A signed-in user taps "Send a test" in Settings, and gets one test
//    notification on their own devices.
//
// Keys come from Supabase Vault through get_reminder_config(), never the code.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const gbp = (n: number) => `£${n.toFixed(2)}`
const shortName = (provider: string) => (provider === 'PayPal Pay in 3' ? 'PayPal' : provider)

function londonHour(): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(new Date()))
}

type Device = { endpoint: string; p256dh: string; auth: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: config, error: configError } = await admin.rpc('get_reminder_config')
  if (configError || !config?.vapid_private_key) {
    console.error('Missing reminder config', configError?.message)
    return json({ error: 'Reminders are not set up on the server yet.' }, 500)
  }
  webpush.setVapidDetails('https://dera-alpha.vercel.app', config.vapid_public_key, config.vapid_private_key)

  // Sends one notification; forgets devices the browser says are gone.
  const send = async (device: Device, payload: Record<string, string>) => {
    try {
      await webpush.sendNotification(
        { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 12 },
      )
      return true
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', device.endpoint)
      } else {
        console.error('Push failed', status, (err as Error).message)
      }
      return false
    }
  }

  // ── Daily job ──────────────────────────────────────────────────────────
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret) {
    if (cronSecret !== config.reminders_cron_secret) return json({ error: 'Not allowed' }, 401)
    const body = await req.json().catch(() => ({}))
    if (!body.force && londonHour() !== 9) return json({ skipped: 'not 9am in the UK' })

    const { data: due, error } = await admin.rpc('get_due_reminders')
    if (error) {
      console.error('Could not load due payments', error.message)
      return json({ error: 'Could not load due payments' }, 500)
    }

    let sent = 0
    for (const r of due ?? []) {
      const amount = gbp(Number(r.total) / Number(r.instalments))
      const provider = shortName(r.provider)
      const payload = r.days === 0
        ? { title: 'Payment due today', body: `${provider} · ${amount} for ${r.item}`, url: '/' }
        : { title: 'Payment due in 3 days', body: `${provider} · ${amount} for ${r.item}`, url: '/' }
      if (await send(r, payload)) sent++
    }
    return json({ due: due?.length ?? 0, sent })
  }

  // ── Test from Settings ─────────────────────────────────────────────────
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return json({ error: 'Please sign in again.' }, 401)

  const { data: devices } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id)
  if (!devices?.length) return json({ error: 'Turn on reminders on this device first.' }, 400)

  let sent = 0
  for (const d of devices) {
    if (await send(d, { title: 'Reminders are on', body: "DERA will remind you 3 days before and on the day a payment is due.", url: '/' })) sent++
  }
  return sent > 0 ? json({ sent }) : json({ error: "Couldn't reach this device. Turn reminders off and on again." }, 502)
})
