import { createClient } from '@supabase/supabase-js'
import { demoClient } from './demo'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const realClient = createClient(supabaseUrl, supabaseKey)

// Sign-in events always come from the real client, even while the demo is open.
export const realAuth = realClient.auth

// In demo mode every call goes to the in-memory demo client instead, so the
// app's screens work unchanged and nothing touches the real database.
let demoMode = false
export const isDemo = () => demoMode
export function setDemoMode(on) { demoMode = on }

export const supabase = new Proxy({}, {
  get(_, key) {
    const client = demoMode ? demoClient : realClient
    const value = client[key]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
