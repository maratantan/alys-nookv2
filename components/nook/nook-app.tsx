'use client'

import Image from 'next/image'
import { BookOpen, Clapperboard, FolderHeart, ListChecks, Timer, type LucideIcon } from 'lucide-react'
import { usePersistentState } from '@/lib/use-persistent-state'
import { cn } from '@/lib/utils'
import { Documents } from './documents'
import { Flashcards } from './flashcards'
import { Pomodoro } from './pomodoro'
import { Todos } from './todos'
import { Videos } from './videos'

type SectionId = 'timer' | 'todos' | 'flashcards' | 'videos' | 'docs'

const SECTIONS: { id: SectionId; label: string; title: string; subtitle: string; icon: LucideIcon; color: string }[] = [
  { id: 'timer', label: 'Timer', title: 'Pomodoro', subtitle: 'Focus in cozy little bursts.', icon: Timer, color: 'bg-accent' },
  { id: 'todos', label: 'To-Do', title: 'To-Do List', subtitle: 'Gentle priorities for today.', icon: ListChecks, color: 'bg-secondary' },
  { id: 'flashcards', label: 'Cards', title: 'Flashcards', subtitle: 'Flip, learn, and master cozy decks.', icon: BookOpen, color: 'bg-accent' },
  { id: 'videos', label: 'Videos', title: 'Videos', subtitle: 'Your playlists, all in one nook.', icon: Clapperboard, color: 'bg-accent' },
  { id: 'docs', label: 'Docs', title: 'Documents', subtitle: 'A tidy shelf for your papers.', icon: FolderHeart, color: 'bg-secondary' },
]

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      hour12: false,
    }).format(new Date())
  )

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-2xl leading-none text-foreground">
        Aly&apos;s <span className="text-primary">Nook</span>
      </span>
    </div>
  )
}

export function NookApp() {
  const [active, setActive] = usePersistentState<SectionId>('active-section', 'timer')
  const current = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0]

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl gap-6 px-4 pb-28 pt-4 sm:px-6 lg:pb-8 lg:pt-6">
      <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-60 shrink-0 flex-col gap-5 lg:flex">
        <div className="sketch flex flex-col items-center gap-3 bg-card p-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
            <Image
              src="/images/nook-mascot.png"
              alt="Alys Nook"
              fill
              sizes="220px"
              className="scale-[2.1] object-cover"
              priority
            />
          </div>
          <Logo />
          <div className="squiggle w-24" aria-hidden="true" />
        </div>
        <nav aria-label="Main" className="sketch flex flex-col gap-1.5 bg-card p-3">
          {SECTIONS.map((s) => {
            const isActive = s.id === active
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-2.5 py-2 text-left font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive ? 'border-border bg-background' : 'border-transparent hover:bg-background/60',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'blob flex size-9 items-center justify-center border-2 border-border transition-transform group-hover:-rotate-6',
                    isActive ? 'bg-primary text-primary-foreground' : s.color,
                  )}
                >
                  <s.icon className="size-[18px]" strokeWidth={2.25} />
                </span>
                {s.title}
              </button>
            )
          })}
        </nav>
        <p className="mt-auto px-2 text-xs font-semibold text-muted-foreground">
          Everything is saved privately in this browser.
        </p>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="sketch-sm relative size-12 shrink-0 overflow-hidden bg-card lg:hidden">
              <Image src="/images/nook-mascot.png" alt="" fill sizes="48px" className="scale-[1.5] object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground" suppressHydrationWarning>
                {greeting()}, Aly <span className="lg:hidden">- welcome to your nook</span>
              </p>
              <h1 className="font-display text-3xl leading-tight sm:text-4xl">{current.title}</h1>
              <p className="hidden text-sm font-semibold text-muted-foreground sm:block">{current.subtitle}</p>
            </div>
          </div>
          <div className="hidden sm:block lg:hidden">
            <Logo />
          </div>
        </header>

        {SECTIONS.map((s) => (
          <div key={s.id} hidden={s.id !== active} aria-label={s.title} role="region">
            {s.id === 'timer' && <Pomodoro />}
            {s.id === 'todos' && <Todos />}
            {s.id === 'flashcards' && <Flashcards />}
            {s.id === 'videos' && <Videos />}
            {s.id === 'docs' && <Documents />}
          </div>
        ))}
      </main>

      <nav
        aria-label="Main"
        className="sketch fixed inset-x-3 bottom-3 z-20 flex justify-around bg-card px-2 py-2 lg:hidden"
      >
        {SECTIONS.map((s) => {
          const isActive = s.id === active
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              aria-current={isActive ? 'page' : undefined}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'blob flex size-10 items-center justify-center border-2 transition-all',
                  isActive ? 'border-border bg-primary text-primary-foreground -translate-y-1' : 'border-transparent',
                )}
              >
                <s.icon className="size-5" strokeWidth={2.25} />
              </span>
              {s.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
