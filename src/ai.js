// Calls the ai-assist Edge Function (the Groq key stays on the server).
// Returns { result } or { error } with a message that's safe to show.
import { supabase } from './supabase'

export async function askAI(task, input, fallbackError) {
  const { data, error } = await supabase.functions.invoke('ai-assist', { body: { task, input } })
  if (!error && data?.result) return { result: data.result }

  // Show the daily-limit message from the server; anything else gets the friendly fallback.
  try {
    const body = await error?.context?.json?.()
    if (body?.code === 'daily_limit' && body.error) return { error: body.error }
  } catch { /* not JSON */ }
  return { error: fallbackError }
}
