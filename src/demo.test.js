import { beforeEach, describe, expect, it } from 'vitest'
import { demoClient, resetDemoData } from './demo'

describe('demo data (in memory, nothing saved)', () => {
  beforeEach(() => resetDemoData())

  it('starts with sample plans and a detected purchase', async () => {
    const { data: debts } = await demoClient.from('debts').select('*').order('due_date', { ascending: true })
    expect(debts.length).toBeGreaterThan(3)
    expect(debts.map(d => d.due_date)).toEqual([...debts.map(d => d.due_date)].sort())
    const { data: pending } = await demoClient.from('pending_purchases').select('*').eq('status', 'pending')
    expect(pending).toHaveLength(1)
  })

  it('adds, updates and removes like the real database', async () => {
    const { data: added } = await demoClient.from('debts')
      .insert({ provider: 'Zilch', item: 'Test', total: 40, instalments: 4, paid: 0, due_date: '2026-12-01' })
      .select('id').single()
    expect(added.id).toBeTruthy()

    await demoClient.from('debts').update({ paid: 1 }).eq('id', added.id)
    const { data: after } = await demoClient.from('debts').select('*').eq('id', added.id)
    expect(after[0].paid).toBe(1)

    await demoClient.from('debts').delete().eq('id', added.id)
    const { data: gone } = await demoClient.from('debts').select('*').eq('id', added.id)
    expect(gone).toEqual([])
  })

  it('returns copies, so screens can\'t change the data by accident', async () => {
    const { data } = await demoClient.from('debts').select('*')
    data[0].paid = 99
    const { data: again } = await demoClient.from('debts').select('*')
    expect(again[0].paid).not.toBe(99)
  })

  it('starts fresh after a reset', async () => {
    await demoClient.from('debts').delete().eq('provider', 'Klarna')
    resetDemoData()
    const { data } = await demoClient.from('debts').select('*').eq('provider', 'Klarna')
    expect(data.length).toBeGreaterThan(0)
  })

  it('gives example AI answers that pass the app\'s checks', async () => {
    const { data } = await demoClient.functions.invoke('ai-assist', { body: { task: 'parse-email', input: {} } })
    expect(data.result).toMatchObject({ provider: 'Klarna', instalments: 3 })
    const { data: msg } = await demoClient.functions.invoke('ai-assist', {
      body: { task: 'letter', input: { provider: 'Klarna', item: 'Trainers', request: 'pause', format: 'chat' } },
    })
    expect(msg.result).toMatch(/^Hi! I'm getting in touch about my Klarna plan/)
  })
})
