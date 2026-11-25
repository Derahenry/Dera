// Demo mode: a stand-in for the Supabase client that keeps sample data in
// memory. Nothing is sent to the real database and nothing is saved; leaving
// the demo or reloading the page starts fresh.
import { toDateString } from './debtMath'

export const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@dera.app',
  user_metadata: { full_name: 'Alex Morgan' },
}

export const DEMO_SESSION = { user: DEMO_USER, access_token: 'demo' }

const inDays = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toDateString(d)
}

let counter = 0
const newId = () => `demo-${Date.now().toString(36)}-${(counter++).toString(36)}`

function sampleData() {
  const debt = (fields) => ({
    id: newId(), user_id: DEMO_USER.id, status: 'on-track', created_at: new Date().toISOString(), ...fields,
  })
  return {
    debts: [
      debt({ provider: 'Zilch', item: 'ASOS order', total: 64, instalments: 4, paid: 1, due_date: inDays(-1), frequency: 'fortnightly' }),
      debt({ provider: 'Klarna', item: "Nike Air Force 1 '07", total: 89.97, instalments: 3, paid: 1, due_date: inDays(2), frequency: 'monthly' }),
      debt({ provider: 'Clearpay', item: 'Zara winter coat', total: 120, instalments: 4, paid: 2, due_date: inDays(6), frequency: 'fortnightly' }),
      debt({ provider: 'PayPal Pay in 3', item: 'AirPods Pro', total: 229, instalments: 3, paid: 1, due_date: inDays(12), frequency: 'monthly' }),
      debt({ provider: 'Klarna', item: 'Uni textbooks', total: 75, instalments: 3, paid: 3, due_date: inDays(-20), frequency: 'monthly' }),
    ],
    pending_purchases: [
      {
        id: newId(), user_id: DEMO_USER.id, source: 'email_paste', provider: 'Clearpay', item: 'JD Sports trainers',
        total: 110, instalments: 4, paid: 0, due_date: inDays(14), frequency: 'fortnightly',
        status: 'pending', debt_id: null, created_at: new Date().toISOString(),
      },
    ],
    push_subscriptions: [],
  }
}

let db = sampleData()
export function resetDemoData() { db = sampleData() }

const copy = (rows) => rows.map(r => ({ ...r }))
const wait = (ms) => new Promise(r => setTimeout(r, ms))

// Supports the parts of the Supabase query builder DERA uses:
// select / insert / update / delete, eq, order, single.
class DemoQuery {
  constructor(table) {
    this.table = table
    this.op = null
    this.filters = []
    this.sort = null
    this.wantRows = false
    this.one = false
  }
  select() { if (this.op) this.wantRows = true; else this.op = 'select'; return this }
  insert(rows) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this }
  update(fields) { this.op = 'update'; this.payload = fields; return this }
  delete() { this.op = 'delete'; return this }
  eq(col, val) { this.filters.push([col, val]); return this }
  order(col, { ascending = true } = {}) { this.sort = [col, ascending]; return this }
  single() { this.one = true; return this }

  run() {
    const rows = db[this.table] || (db[this.table] = [])
    const matches = (r) => this.filters.every(([c, v]) => r[c] === v)
    let data = null

    if (this.op === 'select') {
      data = rows.filter(matches)
      if (this.sort) {
        const [col, asc] = this.sort
        data.sort((a, b) => String(a[col]).localeCompare(String(b[col])) * (asc ? 1 : -1))
      }
      data = copy(data)
    } else if (this.op === 'insert') {
      const added = this.payload.map(r => ({
        id: newId(), user_id: DEMO_USER.id, created_at: new Date().toISOString(),
        ...(this.table === 'pending_purchases' ? { status: 'pending', debt_id: null } : {}),
        ...r,
      }))
      rows.push(...added)
      data = this.wantRows ? copy(added) : null
    } else if (this.op === 'update') {
      rows.filter(matches).forEach(r => Object.assign(r, this.payload))
    } else if (this.op === 'delete') {
      db[this.table] = rows.filter(r => !matches(r))
    }

    if (this.one) data = Array.isArray(data) ? data[0] ?? null : data
    return { data, error: null }
  }

  then(resolve, reject) {
    return wait(120).then(() => this.run()).then(resolve, reject)
  }
}

// Example AI answers, so the tools can be tried without a real account.
function demoAI(task, input = {}) {
  if (task === 'parse-email') {
    return {
      provider: 'Klarna', item: "Nike Air Max 90", total: 119.97, instalments: 3, paid: 0,
      due_date: inDays(30), frequency: 'monthly',
    }
  }
  const provider = input.provider === 'PayPal Pay in 3' ? 'PayPal' : (input.provider || 'the provider')
  const ask = {
    'more-time': 'move my next payment back by about two weeks',
    pause: 'pause my payments for a month while things settle',
    smaller: 'spread what I still owe over more, smaller payments',
  }[input.request] || 'move my next payment back by about two weeks'
  const body = `I'm getting in touch about my ${provider} plan for ${input.item || 'my purchase'}. ${input.reason ? `${String(input.reason).trim().replace(/\.?$/, '.')} ` : ''}I want to keep up with my payments, so I'd like to ask if you could ${ask}. Could you let me know what support you can offer?`
  if (input.format === 'chat') return `Hi! ${body} Thank you.`
  return `Dear ${provider},\n\n${body}\n\nThank you for your help.\n\nYours sincerely,\n${input.name || ''}`.trim()
}

export const demoClient = {
  from: (table) => new DemoQuery(table),
  rpc: async (name) => {
    await wait(150)
    if (name === 'get_benchmark_totals') {
      // Made-up totals for "other users", plus the demo person's own (as the real one includes you).
      const own = db.debts.reduce((s, d) => s + Number(d.total), 0)
      const others = [180, 240, 95, 410, 320, 150, 610, 275, 130, 505, 890, 1240]
      return { data: [...others, own].map(total_debt => ({ total_debt })), error: null }
    }
    return { data: null, error: null }
  },
  functions: {
    invoke: async (name, { body } = {}) => {
      await wait(900)
      if (name === 'ai-assist') return { data: { result: demoAI(body?.task, body?.input) }, error: null }
      return { data: null, error: { message: 'Not available in the demo' } }
    },
  },
  auth: {
    getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
    getSession: async () => ({ data: { session: DEMO_SESSION }, error: null }),
    resetPasswordForEmail: async () => ({ error: { message: 'Not available in the demo' } }),
    updateUser: async () => ({ error: { message: 'Not available in the demo' } }),
    signOut: async () => ({ error: null }),
  },
  channel: () => {
    const ch = { on: () => ch, subscribe: () => ch }
    return ch
  },
  removeChannel: () => {},
}
