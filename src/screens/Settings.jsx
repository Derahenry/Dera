import { useState } from 'react'
import { supabase } from '../supabase'
import { Icon } from '../ui'

const THEMES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

function notificationState() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'granted' | 'denied' | 'default'
}

const NOTIFICATION_TEXT = {
  granted: 'On · reminders 3 days before and on the day',
  default: 'Off · get reminders before payments are due',
  denied: "Blocked · allow notifications for DERA in your browser's settings",
  unsupported: "Your browser doesn't support notifications",
}

function Group({ title, children }) {
  return (
    <section>
      <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-2 px-1">{title}</h2>
      <div className="bg-surface border border-line rounded-3xl divide-y divide-line overflow-hidden">{children}</div>
    </section>
  )
}

function Row({ icon, label, detail, action, onClick, danger }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-4 text-left ${onClick ? 'press' : ''}`}>
      <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-ink'}`}>
        <Icon name={icon} size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-medium ${danger ? 'text-danger' : 'text-ink'}`}>{label}</p>
        {detail && <p className="text-xs text-ink-3 mt-0.5">{detail}</p>}
      </div>
      {action}
      {onClick && !action && <Icon name="chevron" size={16} className="text-ink-3" />}
    </Tag>
  )
}

function Settings({ session, theme, onThemeChange }) {
  const [notif, setNotif] = useState(notificationState)
  const [resetMsg, setResetMsg] = useState('')
  const name = session?.user?.user_metadata?.full_name || 'Your account'
  const email = session?.user?.email || ''
  const initial = (name !== 'Your account' ? name : email)[0]?.toUpperCase() || 'D'

  const turnOnNotifications = async () => {
    if (notif !== 'default') return
    const result = await Notification.requestPermission()
    setNotif(result)
    if (result === 'granted') navigator.serviceWorker?.register('/sw.js').catch(() => {})
  }

  const changePassword = async () => {
    setResetMsg('Sending…')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setResetMsg(error ? "Couldn't send the email. Try again later." : `We've emailed a link to ${email}.`)
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Profile */}
      <section className="flex flex-col items-center text-center pt-2">
        <div className="w-20 h-20 rounded-full bg-inverse text-on-inverse flex items-center justify-center text-3xl font-black">
          {initial}
        </div>
        <p className="text-xl font-semibold text-ink tracking-tight mt-3">{name}</p>
        <p className="text-sm text-ink-3 mt-0.5">{email}</p>
      </section>

      <section>
        <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-2 px-1">Appearance</h2>
        <div className="flex bg-surface-2 rounded-full p-1" role="radiogroup" aria-label="Appearance">
          {THEMES.map(t => (
            <button
              key={t.id}
              role="radio"
              aria-checked={theme === t.id}
              onClick={() => onThemeChange(t.id)}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
                theme === t.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-3 mt-2 px-1">System follows your phone's light or dark setting.</p>
      </section>

      <Group title="Notifications">
        <Row
          icon="bell"
          label="Payment reminders"
          detail={NOTIFICATION_TEXT[notif]}
          action={notif === 'default' && (
            <button onClick={turnOnNotifications} className="press px-4 py-2 rounded-full bg-inverse text-on-inverse text-sm font-semibold">
              Turn on
            </button>
          )}
        />
      </Group>

      <Group title="Account">
        <Row icon="lock" label="Change password" detail={resetMsg || 'Get a link by email to set a new one'} onClick={changePassword} />
        <Row icon="logout" label="Sign out" onClick={() => supabase.auth.signOut()} danger />
      </Group>

      <Group title="Help">
        <a href="https://www.stepchange.org/" target="_blank" rel="noopener noreferrer" className="press w-full flex items-center gap-3 px-4 py-4">
          <span className="w-9 h-9 rounded-full bg-surface-2 text-ink flex items-center justify-center flex-shrink-0">
            <Icon name="message" size={18} />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium text-ink">Free debt advice</p>
            <p className="text-xs text-ink-3 mt-0.5">StepChange · 0800 138 1111</p>
          </div>
          <Icon name="external" size={16} className="text-ink-3" />
        </a>
      </Group>

      <p className="text-center text-xs text-ink-3 pt-2">DERA 1.0 · Your BNPL, sorted</p>
    </div>
  )
}

export default Settings
