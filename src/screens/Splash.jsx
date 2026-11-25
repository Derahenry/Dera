import { useEffect, useRef, useState } from 'react'

const LETTERS = ['D', 'E', 'R', 'A']

// The intro: a loud DERA wordmark rises in letter by letter, a line sweeps
// underneath, the tagline fades in, then the whole thing fades into the app.
function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false)
  // Keep the latest callback without restarting the timers when the app re-renders.
  const doneRef = useRef(onDone)
  useEffect(() => { doneRef.current = onDone })

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const leave = setTimeout(() => setLeaving(true), reduce ? 500 : 1500)
    const done = setTimeout(() => doneRef.current(), reduce ? 520 : 1850)
    return () => { clearTimeout(leave); clearTimeout(done) }
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center ${leaving ? 'splash-out' : ''}`}
      role="img"
      aria-label="DERA"
    >
      <div className="overflow-hidden flex" aria-hidden="true">
        {LETTERS.map((l, i) => (
          <span
            key={l}
            className="rise-in inline-block font-black leading-none"
            style={{ fontSize: 'clamp(88px, 28vw, 168px)', letterSpacing: '-0.06em', animationDelay: `${i * 70}ms` }}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="line-sweep mt-5 h-[5px] w-24 bg-white rounded-full" style={{ animationDelay: '380ms' }} />
      <p className="fade-up mt-6 text-sm font-medium tracking-[0.25em] uppercase text-white/75" style={{ animationDelay: '620ms' }}>
        Your BNPL, sorted
      </p>
    </div>
  )
}

export default Splash
