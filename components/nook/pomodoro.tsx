'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Coffee, Leaf, Minus, Pause, Play, Plus, RotateCcw, Settings2, SkipForward, Sun } from 'lucide-react'
import { localDateString, usePersistentState } from '@/lib/use-persistent-state'
import { cn } from '@/lib/utils'
import { IconBlob, NookButton, Panel, PillToggle } from './ui'
import { FocusMixer } from './focus-mixer'

type Mode = 'focus' | 'short' | 'long'

type Settings = {
  focus: number
  short: number
  long: number
  interval: number
  autoStart: boolean
  sound: boolean
}

const DEFAULT_SETTINGS: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  interval: 4,
  autoStart: false,
  sound: true,
}

const MODES: { id: Mode; label: string; icon: typeof Sun; hint: string }[] = [
  { id: 'focus', label: 'Focus', icon: Sun, hint: 'Time to get cozy and focus.' },
  { id: 'short', label: 'Short break', icon: Coffee, hint: 'Sip something warm.' },
  { id: 'long', label: 'Long break', icon: Leaf, hint: 'Stretch, wander, rest.' },
]

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function playChime() {
  const audio = new Audio('/sounds/witaminit.mp3')
  audio.play().catch(() => {})
}

export function Pomodoro() {
  const [settings, setSettings] = usePersistentState<Settings>('pomodoro-settings', DEFAULT_SETTINGS)
  const [stats, setStats] = usePersistentState<{ date: string; sessions: number; minutes: number }>(
    'pomodoro-stats',
    { date: localDateString(), sessions: 0, minutes: 0 },
  )
  const [mode, setMode] = useState<Mode>('focus')
  const [remaining, setRemaining] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [cycleCount, setCycleCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const endAtRef = useRef<number>(0)

  const duration = settings[mode] * 60
  const secondsLeft = remaining ?? duration
  const progress = duration > 0 ? 1 - secondsLeft / duration : 0
  const today = localDateString()
  const todayStats = stats.date === today ? stats : { date: today, sessions: 0, minutes: 0 }

  useEffect(() => {
    if (!running) return
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [running])

  const switchMode = useCallback((next: Mode, autoStart = false) => {
    setMode(next)
    setRemaining(null)
    setRunning(autoStart)
    if (autoStart) {
      endAtRef.current = Date.now() + settings[next] * 60 * 1000
    }
  }, [settings])

  useEffect(() => {
    if (!running || remaining !== 0) return
    if (settings.sound) playChime()
    if (mode === 'focus') {
      const nextCount = cycleCount + 1
      setCycleCount(nextCount)
      setStats({
        date: today,
        sessions: todayStats.sessions + 1,
        minutes: todayStats.minutes + settings.focus,
      })
      switchMode(nextCount % settings.interval === 0 ? 'long' : 'short', settings.autoStart)
    } else {
      switchMode('focus', settings.autoStart)
    }
  }, [running, remaining, mode, cycleCount, settings, today, todayStats, setStats, switchMode])

  useEffect(() => {
    const base = "Aly's Nook"
    document.title = running ? `${formatTime(secondsLeft)} - ${MODES.find((m) => m.id === mode)?.label} | ${base}` : base
  }, [running, secondsLeft, mode])

  const start = () => {
    endAtRef.current = Date.now() + secondsLeft * 1000
    setRunning(true)
  }
  const pause = () => {
    setRunning(false)
  }
  const reset = () => {
    setRunning(false)
    setRemaining(null)
  }
  const skip = () => {
    if (mode === 'focus') {
      const nextCount = cycleCount + 1
      setCycleCount(nextCount)
      switchMode(nextCount % settings.interval === 0 ? 'long' : 'short')
    } else {
      switchMode('focus')
    }
  }

  const updateSetting = (key: 'focus' | 'short' | 'long' | 'interval', delta: number) => {
    const limits = { focus: [1, 120], short: [1, 30], long: [1, 60], interval: [2, 8] } as const
    const [min, max] = limits[key]
    setSettings((prev) => ({ ...prev, [key]: Math.min(max, Math.max(min, prev[key] + delta)) }))
    if (key === mode && !running) setRemaining(null)
  }

  const activeMode = MODES.find((m) => m.id === mode)!
  const radius = 120
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Panel className="flex flex-col items-center gap-6 py-8">
        <div role="tablist" aria-label="Timer mode" className="flex flex-wrap justify-center gap-2">
          {MODES.map((m) => (
            <PillToggle
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              active={mode === m.id}
              onClick={() => switchMode(m.id)}
            >
              <m.icon className="size-4" aria-hidden="true" />
              {m.label}
            </PillToggle>
          ))}
        </div>

        <div className="relative aspect-square w-full max-w-[300px]">
          <svg viewBox="0 0 280 280" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="140" cy="140" r="134" fill="var(--card)" stroke="var(--border)" strokeWidth="2.5" strokeDasharray="5 7" strokeLinecap="round" />
            <circle cx="140" cy="140" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="16" />
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <activeMode.icon className="size-6 text-primary" aria-hidden="true" />
            <p className="font-display text-6xl tabular-nums sm:text-7xl" aria-live="polite" aria-atomic="true">
              {formatTime(secondsLeft)}
            </p>
            <p className="text-sm font-semibold text-muted-foreground">{activeMode.hint}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NookButton variant="secondary" size="icon" onClick={reset} aria-label="Reset timer">
            <RotateCcw />
          </NookButton>
          {running ? (
            <NookButton onClick={pause} className="h-14 min-w-36 text-lg [&_svg]:size-5">
              <Pause /> Pause
            </NookButton>
          ) : (
            <NookButton onClick={start} className="h-14 min-w-36 text-lg [&_svg]:size-5">
              <Play /> {remaining !== null && remaining < duration ? 'Resume' : 'Start'}
            </NookButton>
          )}
          <NookButton variant="secondary" size="icon" onClick={skip} aria-label="Skip to next session">
            <SkipForward />
          </NookButton>
        </div>

        <div className="flex items-center gap-2" aria-label={`${cycleCount % settings.interval} of ${settings.interval} focus sessions until long break`}>
          {Array.from({ length: settings.interval }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'size-3.5 rounded-full border-2 border-border',
                i < cycleCount % settings.interval ? 'bg-primary' : 'bg-card',
              )}
            />
          ))}
          <span className="ml-1 text-xs font-semibold text-muted-foreground">until long break</span>
        </div>
      </Panel>

      <div className="flex flex-col gap-5">
        <Panel className="flex flex-col gap-4">
          <h3 className="font-display text-xl">Today</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="sketch-sm flex flex-col gap-1 bg-secondary p-3">
              <span className="font-display text-3xl">{todayStats.sessions}</span>
              <span className="text-xs font-bold text-muted-foreground">sessions</span>
            </div>
            <div className="sketch-sm flex flex-col gap-1 bg-accent p-3">
              <span className="font-display text-3xl">{todayStats.minutes}</span>
              <span className="text-xs font-bold text-muted-foreground">focus mins</span>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <IconBlob icon={Settings2} className="size-9 bg-secondary" />
              <h3 className="font-display text-xl">Settings</h3>
            </div>
            <NookButton
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowSettings((s) => !s)}
              aria-expanded={showSettings}
            >
              {showSettings ? 'Hide' : 'Show'}
            </NookButton>
          </div>
          <div className={cn('flex-col gap-3 lg:flex', showSettings ? 'flex' : 'hidden')}>
            {(
              [
                ['focus', 'Focus', 'min'],
                ['short', 'Short break', 'min'],
                ['long', 'Long break', 'min'],
                ['interval', 'Long break every', 'sessions'],
              ] as const
            ).map(([key, label, unit]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold">{label}</span>
                <div className="flex items-center gap-2">
                  <NookButton variant="secondary" size="icon" className="size-7" onClick={() => updateSetting(key, -1)} aria-label={`Decrease ${label}`}>
                    <Minus />
                  </NookButton>
                  <span className="w-16 text-center text-sm font-bold tabular-nums">
                    {settings[key]} <span className="text-xs text-muted-foreground">{unit}</span>
                  </span>
                  <NookButton variant="secondary" size="icon" className="size-7" onClick={() => updateSetting(key, 1)} aria-label={`Increase ${label}`}>
                    <Plus />
                  </NookButton>
                </div>
              </div>
            ))}
            <div className="squiggle my-1 opacity-70" aria-hidden="true" />
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold">
              Auto-start next session
              <input
                type="checkbox"
                className="size-5 accent-[var(--primary)]"
                checked={settings.autoStart}
                onChange={(e) => setSettings((p) => ({ ...p, autoStart: e.target.checked }))}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold">
              Chime when done
              <input
                type="checkbox"
                className="size-5 accent-[var(--primary)]"
                checked={settings.sound}
                onChange={(e) => setSettings((p) => ({ ...p, sound: e.target.checked }))}
              />
            </label>
          </div>
        </Panel>
      </div>
      </div>
      <FocusMixer />
    </div>
  )
}
