'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, Check, ListChecks, Plus, Sparkles, Trash2 } from 'lucide-react'
import { createId, localDateString, usePersistentState } from '@/lib/use-persistent-state'
import { cn } from '@/lib/utils'
import { EmptyState, NookButton, Panel, PillToggle, inputClass } from './ui'

type Priority = 'high' | 'medium' | 'low'
type Todo = {
  id: string
  title: string
  done: boolean
  priority: Priority
  date: string
  createdAt: number
}
type Filter = 'today' | 'upcoming' | 'all' | 'done'

const PRIORITIES: { id: Priority; label: string; className: string }[] = [
  { id: 'high', label: 'Must do', className: 'bg-primary text-primary-foreground' },
  { id: 'medium', label: 'Should do', className: 'bg-accent text-foreground' },
  { id: 'low', label: 'Nice to do', className: 'bg-secondary text-foreground' },
]
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

function formatDay(date: string, today: string) {
  if (date === today) return 'Today'
  const d = new Date(`${date}T00:00:00`)
  const t = new Date(`${today}T00:00:00`)
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000)
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Todos() {
  const today = localDateString()
  const [todos, setTodos] = usePersistentState<Todo[]>('todos', [])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [date, setDate] = useState(today)
  const [filter, setFilter] = useState<Filter>('today')

  const todayTodos = todos.filter((t) => t.date <= today && (!t.done || t.date === today))
  const todayDone = todayTodos.filter((t) => t.done).length

  const visible = useMemo(() => {
    const list = todos.filter((t) => {
      if (filter === 'today') return t.date <= today && (!t.done || t.date === today)
      if (filter === 'upcoming') return t.date > today && !t.done
      if (filter === 'done') return t.done
      return true
    })
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      if (filter === 'upcoming' && a.date !== b.date) return a.date.localeCompare(b.date)
      if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      return a.createdAt - b.createdAt
    })
  }, [todos, filter, today])

  const addTodo = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    setTodos((prev) => [
      ...prev,
      { id: createId(), title: trimmed, done: false, priority, date: date || today, createdAt: Date.now() },
    ])
    setTitle('')
  }

  const toggle = (id: string) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const remove = (id: string) => setTodos((prev) => prev.filter((t) => t.id !== id))
  const clearDone = () => setTodos((prev) => prev.filter((t) => !t.done))

  const pct = todayTodos.length ? Math.round((todayDone / todayTodos.length) * 100) : 0
  const topThree = todayTodos.filter((t) => !t.done).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]).slice(0, 3)

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-5">
        <Panel>
          <form onSubmit={addTodo} className="flex flex-col gap-3">
            <label htmlFor="todo-title" className="sr-only">New task</label>
            <div className="flex gap-2">
              <input
                id="todo-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What would you like to get done?"
                className={cn(inputClass, 'h-11 text-base')}
                autoComplete="off"
              />
              <NookButton type="submit" className="h-11" disabled={!title.trim()}>
                <Plus /> <span className="hidden sm:inline">Add</span>
              </NookButton>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PRIORITIES.map((p) => (
                <PillToggle key={p.id} active={priority === p.id} onClick={() => setPriority(p.id)}>
                  {p.label}
                </PillToggle>
              ))}
              <label className="ml-auto flex items-center gap-2 text-sm font-bold">
                <CalendarDays className="size-4" aria-hidden="true" />
                <span className="sr-only">Due date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(inputClass, 'w-auto py-1')}
                />
              </label>
            </div>
          </form>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="tablist" aria-label="Filter tasks" className="flex flex-wrap gap-2">
              {(['today', 'upcoming', 'all', 'done'] as Filter[]).map((f) => (
                <PillToggle key={f} role="tab" aria-selected={filter === f} active={filter === f} onClick={() => setFilter(f)} className="capitalize">
                  {f}
                </PillToggle>
              ))}
            </div>
            {todos.some((t) => t.done) ? (
              <NookButton variant="ghost" size="sm" onClick={clearDone}>
                Clear completed
              </NookButton>
            ) : null}
          </div>

          {visible.length === 0 ? (
            <EmptyState icon={ListChecks} title={filter === 'done' ? 'Nothing checked off yet' : 'All clear!'}>
              {filter === 'done' ? 'Finished tasks will show up here.' : 'Add a task above and make today a little lovelier.'}
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {visible.map((t) => {
                const p = PRIORITIES.find((x) => x.id === t.priority)!
                return (
                  <li
                    key={t.id}
                    className={cn(
                      'group flex items-center gap-3 rounded-2xl border-2 border-dashed border-border/30 bg-background/40 px-3 py-2.5 transition-colors hover:border-border/60',
                      t.done && 'opacity-60',
                    )}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={t.done}
                      aria-label={`Mark "${t.title}" as ${t.done ? 'not done' : 'done'}`}
                      onClick={() => toggle(t.id)}
                      className={cn(
                        'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[8px_10px_7px_11px] border-2 border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        t.done ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-secondary',
                      )}
                    >
                      {t.done ? <Check className="size-4" strokeWidth={3} /> : null}
                    </button>
                    <span className={cn('min-w-0 flex-1 break-words font-semibold', t.done && 'line-through')}>{t.title}</span>
                    {t.date !== today ? (
                      <span className={cn('hidden text-xs font-bold sm:inline', t.date < today && !t.done ? 'text-destructive' : 'text-muted-foreground')}>
                        {formatDay(t.date, today)}
                      </span>
                    ) : null}
                    <span className={cn('rounded-full border-2 border-border px-2 py-0.5 text-[11px] font-bold', p.className)}>
                      {p.label}
                    </span>
                    <NookButton
                      variant="danger"
                      size="icon"
                      className="size-8 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      onClick={() => remove(t.id)}
                      aria-label={`Delete "${t.title}"`}
                    >
                      <Trash2 />
                    </NookButton>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="flex flex-col gap-5">
        <Panel className="flex flex-col gap-3">
          <h3 className="font-display text-xl">{"Today's progress"}</h3>
          <p className="text-sm font-semibold text-muted-foreground">
            {todayDone} of {todayTodos.length} tasks done
          </p>
          <div
            className="h-5 overflow-hidden rounded-full border-2 border-border bg-secondary"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Today's progress"
          >
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="font-display text-3xl">{pct}%</p>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden="true" />
            <h3 className="font-display text-xl">Top 3 today</h3>
          </div>
          {topThree.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your priorities will appear here.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {topThree.map((t, i) => (
                <li key={t.id} className="flex items-start gap-3">
                  <span className="blob flex size-7 shrink-0 items-center justify-center border-2 border-border bg-accent font-display text-sm">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-semibold">{t.title}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  )
}
