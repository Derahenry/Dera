// Payment reminders by Web Push, so they arrive even when DERA is closed.
// The server (send-reminders) holds the private key; this public key is safe to ship.
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = 'BO4-yXtOjJv6o2gdnxM-emCURPFw0E5_aoGm_5hsoj4sYLxP9qwxAqf6CuZKl21elxMnnRn9V3A0PbCHi1zkvKE'

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

// 'ok' | 'needs-install' (iPhone only allows it once DERA is on the Home Screen) | 'unsupported'
export function pushSupport() {
  const capable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (isIOS() && !isInstalled()) return 'needs-install'
  return capable ? 'ok' : 'unsupported'
}

function keyBytes(base64url) {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

async function registration() {
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

async function save(subscription) {
  const { endpoint, keys } = subscription.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth,
  })
  return !error
}

export async function isSubscribed() {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  return Boolean(await reg?.pushManager.getSubscription())
}

// Ask (after a tap), subscribe this device and save it. Returns 'on' | 'denied' | 'error'.
export async function enableReminders() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'error'
  try {
    const reg = await registration()
    const subscription = await reg.pushManager.getSubscription()
      || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) })
    return (await save(subscription)) ? 'on' : 'error'
  } catch {
    return 'error'
  }
}

export async function disableReminders() {
  const reg = await navigator.serviceWorker.getRegistration()
  const subscription = await reg?.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}

// On sign-in: if this device already has reminders on, make sure it's saved for
// whoever is signed in now (e.g. after switching accounts).
export async function syncReminders() {
  if (!(await isSubscribed())) return
  const reg = await navigator.serviceWorker.getRegistration()
  const subscription = await reg.pushManager.getSubscription()
  await save(subscription)
}

export async function sendTestReminder() {
  const { error } = await supabase.functions.invoke('send-reminders', { body: { test: true } })
  if (!error) return null
  try {
    const body = await error.context?.json?.()
    if (body?.error) return body.error
  } catch { /* not JSON */ }
  return "Couldn't send a test. Try again."
}

// Shows a notification from the app itself (works on Android, unlike new Notification()).
export async function showLocalNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.getRegistration()
  reg?.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: '/' } })
}

// ── Install prompt (Android / desktop Chrome) ─────────────────────────────
let installEvent = null
const listeners = new Set()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  installEvent = e
  listeners.forEach(fn => fn())
})
window.addEventListener('appinstalled', () => {
  installEvent = null
  listeners.forEach(fn => fn())
})

export const canPromptInstall = () => Boolean(installEvent)
export function onInstallChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export async function promptInstall() {
  if (!installEvent) return false
  installEvent.prompt()
  const { outcome } = await installEvent.userChoice
  installEvent = null
  listeners.forEach(fn => fn())
  return outcome === 'accepted'
}
