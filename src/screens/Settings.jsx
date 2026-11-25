import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Icon } from '../ui'
import {
  canPromptInstall, disableReminders, enableReminders, isIOS, isInstalled, isSubscribed,
  onInstallChange, promptInstall, pushSupport, sendTestReminder,
} from '../push'

const THEMES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

// 'checking' | 'on' | 'off' | 'denied' | 'needs-install' | 'unsupported'
function startingState() {
  const support = pushSupport()
  if (support !== 'ok') return support
  if (Notification.permission === 'denied') return 'denied'
  return 'checking'
}

const REMINDER_TEXT = {
  checking: 'Checking…',
  on: 'On · 3 days before and on the day, even when DERA is closed',
  off: 'Off · get a reminder before each payment is due',
  denied: "Blocked · allow notifications for DERA in your browser's settings",
  'needs-install': 'Add DERA to your Home Screen first, then turn them on there',
  demo: 'Create an account to get reminders on your phone',
  unsupported: "This browser can't show reminders",
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

function Settings({ session, theme, onThemeChange, demo = false, onExitDemo }) {
  const [reminders, setReminders] = useState(() => (demo ? 'demo' : startingState()))
  const [reminderBusy, setReminderBusy] = useState(false)
  const [reminderMsg, setReminderMsg] = useState('')
  const [canInstall, setCanInstall] = useState(canPromptInstall)
  const [showIosSteps, setShowIosSteps] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const name = session?.user?.user_metadata?.full_name || 'Your account'
  const email = session?.user?.email || ''
  const initial = (name !== 'Your account' ? name : email)[0]?.toUpperCase() || 'D'
  const installed = isInstalled()

  useEffect(() => {
    if (reminders !== 'checking') return
    isSubscribed().then(on => setReminders(on ? 'on' : 'off')).catch(() => setReminders('off'))
  }, [reminders])

  useEffect(() => onInstallChange(() => setCanInstall(canPromptInstall())), [])

  const turnOn = async () => {
    setReminderBusy(true)
    setReminderMsg('')
    const result = await enableReminders()
    setReminderBusy(false)
    if (result === 'on') setReminders('on')
    else if (result === 'denied') setReminders('denied')
    else setReminderMsg("Couldn't turn reminders on. Try again.")
  }

  const turnOff = async () => {
    setReminderBusy(true)
    setReminderMsg('')
    await disableReminders().catch(() => {})
    setReminderBusy(false)
    setReminders('off')
  }

  const sendTest = async () => {
    setReminderBusy(true)
    setReminderMsg('Sending…')
    const error = await sendTestReminder()
    setReminderBusy(false)
    setReminderMsg(error || 'Sent. It should arrive in a few seconds.')
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
          detail={reminderMsg || REMINDER_TEXT[reminders]}
          action={reminders === 'off' ? (
            <button onClick={turnOn} disabled={reminderBusy} className="press px-4 py-2 rounded-full bg-inverse text-on-inverse text-sm font-semibold disabled:opacity-50 flex-shrink-0">
              {reminderBusy ? 'Turning on…' : 'Turn on'}
            </button>
          ) : null}
        />
        {reminders === 'on' && (
          <div className="flex gap-2 px-4 py-3">
            <button onClick={sendTest} disabled={reminderBusy} className="press flex-1 py-2.5 rounded-full bg-surface-2 text-ink text-sm font-semibold disabled:opacity-50">
              Send a test
            </button>
            <button onClick={turnOff} disabled={reminderBusy} className="press flex-1 py-2.5 rounded-full bg-surface-2 text-ink-2 text-sm font-semibold disabled:opacity-50">
              Turn off
            </button>
          </div>
        )}
      </Group>

      {!installed && (canInstall || isIOS()) && (
        <Group title="App">
          {canInstall ? (
            <Row
              icon="download"
              label="Install DERA"
              detail="Open it from your home screen like any other app"
              action={(
                <button onClick={() => promptInstall()} className="press px-4 py-2 rounded-full bg-inverse text-on-inverse text-sm font-semibold flex-shrink-0">
                  Install
                </button>
              )}
            />
          ) : (
            <>
              <Row
                icon="download"
                label="Add DERA to your Home Screen"
                detail="Needed on iPhone for payment reminders"
                onClick={() => setShowIosSteps(s => !s)}
              />
              {showIosSteps && (
                <ol className="px-5 py-4 text-sm text-ink-2 list-decimal list-inside flex flex-col gap-1.5">
                  <li>Open DERA in Safari</li>
                  <li>Tap the Share button (square with an arrow)</li>
                  <li>Tap <span className="font-semibold text-ink">Add to Home Screen</span>, then Add</li>
                  <li>Open DERA from your Home Screen and turn reminders on here</li>
                </ol>
              )}
            </>
          )}
        </Group>
      )}

      <Group title="Account">
        {demo ? (
          <Row icon="logout" label="Exit demo" detail="Back to sign in. Nothing from the demo is kept." onClick={onExitDemo} danger />
        ) : (
          <>
            <Row icon="lock" label="Change password" detail={resetMsg || 'Get a link by email to set a new one'} onClick={changePassword} />
            <Row icon="logout" label="Sign out" onClick={() => supabase.auth.signOut()} danger />
          </>
        )}
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
        <a href="/privacy.html" className="press w-full flex items-center gap-3 px-4 py-4">
          <span className="w-9 h-9 rounded-full bg-surface-2 text-ink flex items-center justify-center flex-shrink-0">
            <Icon name="lock" size={18} />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium text-ink">Privacy</p>
            <p className="text-xs text-ink-3 mt-0.5">What DERA stores and why</p>
          </div>
          <Icon name="chevron" size={16} className="text-ink-3" />
        </a>
      </Group>

      <p className="text-center text-xs text-ink-3 pt-2">DERA 1.0 · Your BNPL, sorted</p>
    </div>
  )
}

export default Settings
