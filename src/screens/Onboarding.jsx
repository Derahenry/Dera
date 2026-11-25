import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui'

const SLIDES = [
  {
    eyebrow: 'All in one place',
    headline: 'Every BNPL plan.\nOne app.',
    sub: 'Klarna, Clearpay, PayPal and Zilch, tracked together, without the stress.',
    art: (
      <div className="flex gap-3">
        {['K', 'C', 'P', 'Z'].map((l, i) => (
          <span key={l} className="fade-up w-14 h-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xl font-bold" style={{ animationDelay: `${i * 80}ms` }}>
            {l}
          </span>
        ))}
      </div>
    ),
  },
  {
    eyebrow: 'Stay ahead',
    headline: "Know what's\ncoming.",
    sub: 'See every payment date, get reminders, and never be caught out.',
    art: (
      <div className="fade-up w-20 h-20 rounded-3xl bg-white/10 border border-white/15 flex items-center justify-center">
        <Icon name="calendar" size={36} />
      </div>
    ),
  },
  {
    eyebrow: 'Take control',
    headline: 'Pay it off.\nFor good.',
    sub: 'Mark payments as you go and watch what you owe shrink to zero.',
    art: (
      <div className="fade-up w-20 h-20 rounded-full bg-white text-black flex items-center justify-center check-pop">
        <Icon name="check" size={38} />
      </div>
    ),
  },
]

// Story-style intro: progress bars at the top, tap right/left to move,
// slides advance on their own after 5 seconds.
function Onboarding({ onDone }) {
  const [index, setIndex] = useState(0)
  const touchStart = useRef(null)
  const last = index === SLIDES.length - 1

  useEffect(() => {
    if (last) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const t = setTimeout(() => setIndex(i => Math.min(i + 1, SLIDES.length - 1)), 5000)
    return () => clearTimeout(t)
  }, [index, last])

  const next = () => (last ? onDone() : setIndex(i => i + 1))
  const prev = () => setIndex(i => Math.max(i - 1, 0))
  const slide = SLIDES[index]

  return (
    <div
      className="fixed inset-0 bg-black text-white flex flex-col"
      onTouchStart={e => { touchStart.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStart.current === null) return
        const delta = touchStart.current - e.changedTouches[0].clientX
        if (delta > 50) next()
        if (delta < -50) prev()
        touchStart.current = null
      }}
    >
      {/* Story bars */}
      <div className="flex gap-1.5 px-5 pt-12" aria-hidden="true">
        {SLIDES.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
            {i < index && <div className="h-full bg-white" />}
            {i === index && <div key={index} className={`h-full bg-white ${last ? '' : 'story-fill'}`} />}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-5 pt-4">
        <span className="text-sm font-black tracking-[0.2em]">DERA</span>
        {!last && (
          <button onClick={onDone} className="text-sm font-medium text-white/60 hover:text-white">Skip</button>
        )}
      </div>

      {/* Tap zones: left half goes back, right half goes forward */}
      <div className="flex-1 relative">
        <button className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous" onClick={prev} />
        <button className="absolute inset-y-0 right-0 w-2/3" aria-label="Next" onClick={next} />
        <div key={index} className="h-full flex flex-col justify-end px-6 pb-10 pointer-events-none max-w-lg mx-auto w-full">
          <div className="mb-auto mt-16">{slide.art}</div>
          <p className="fade-up text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{slide.eyebrow}</p>
          <h1 className="fade-up mt-3 text-[44px] leading-[1.02] font-black tracking-tight whitespace-pre-line" style={{ animationDelay: '60ms' }}>
            {slide.headline}
          </h1>
          <p className="fade-up mt-4 text-base text-white/65 leading-relaxed max-w-sm" style={{ animationDelay: '120ms' }}>
            {slide.sub}
          </p>
        </div>
      </div>

      <div className="px-6 pb-10 max-w-lg mx-auto w-full">
        <button
          onClick={next}
          className="press w-full py-4 rounded-full bg-white text-black text-base font-semibold"
        >
          {last ? 'Get started' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

export default Onboarding
