// Purchases DERA has detected and is waiting for the user to add, edit or ignore.
// Only the extracted details are saved, never the email they came from.
import { supabase } from './supabase'
import { validateDebt } from './debtMath'

const FIELDS = ['provider', 'item', 'total', 'instalments', 'paid', 'due_date', 'frequency']

export async function fetchPending() {
  const { data, error } = await supabase
    .from('pending_purchases')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

// Keep only fields that fit the table, so a half-read email still saves.
function clean(raw) {
  const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))
  const int = (v) => (Number.isInteger(num(v)) ? num(v) : null)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(raw?.due_date ?? '')) ? raw.due_date : null
  return {
    provider: raw?.provider ? String(raw.provider).slice(0, 40) : null,
    item: raw?.item ? String(raw.item).trim().slice(0, 120) : null,
    total: num(raw?.total),
    instalments: int(raw?.instalments),
    paid: int(raw?.paid) ?? 0,
    due_date: date,
    frequency: raw?.frequency || null,
  }
}

export async function savePending(raw, source = 'email_paste') {
  const { data, error } = await supabase
    .from('pending_purchases')
    .insert({ ...clean(raw), source })
    .select('*')
    .single()
  return { data, error }
}

export async function setPendingStatus(id, status, debtId = null) {
  const update = { status }
  if (status === 'added') update.debt_id = debtId
  const { error } = await supabase.from('pending_purchases').update(update).eq('id', id)
  return { error }
}

// The details as a debt the add sheet can open with (no id, so it saves as new).
export function toDebtDraft(purchase) {
  const draft = { pendingId: purchase.id }
  FIELDS.forEach(f => { if (purchase[f] != null) draft[f] = purchase[f] })
  return draft
}

export function isComplete(purchase) {
  return validateDebt(purchase).errors.length === 0
}

const sameText = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
const sameAmount = (a, b) => a != null && b != null && Math.abs(Number(a) - Number(b)) < 0.01

// Same provider, item and total as something already tracked or detected.
export function matches(a, b) {
  return sameText(a.provider, b.provider) && sameText(a.item, b.item) && sameAmount(a.total, b.total)
}

export function findDuplicateDebt(purchase, debts) {
  return debts.find(d => matches(purchase, d)) || null
}
