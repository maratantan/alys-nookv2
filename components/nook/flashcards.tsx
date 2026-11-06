'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  FolderPlus,
  HelpCircle,
  Lightbulb,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { createId, usePersistentState } from '@/lib/use-persistent-state'
import { cn } from '@/lib/utils'
import { EmptyState, IconBlob, NookButton, Panel, PillToggle, inputClass } from './ui'

export type Flashcard = {
  id: string
  front: string
  back: string
  hint?: string
  mastered: boolean
  needsReview: boolean
  reviewCount: number
  correctCount: number
  lastReviewedAt?: number
}

export type FlashcardDeck = {
  id: string
  title: string
  description?: string
  category: string
  color: string
  cards: Flashcard[]
  createdAt: number
  updatedAt: number
}

type ActiveView =
  | { mode: 'list' }
  | { mode: 'manage'; deckId: string }
  | { mode: 'study'; deckId: string; onlyReview: boolean }

const STARTER_DECK_IDS = new Set(['deck-japanese', 'deck-coffee', 'deck-productivity'])

export function Flashcards() {
  const [decks, setDecks, hydrated] = usePersistentState<FlashcardDeck[]>('flashcards-decks', [])

  // Remove any previously saved starter decks from localStorage
  useEffect(() => {
    if (!hydrated) return
    setDecks((prev) => {
      const hasStarter = prev.some((d) => STARTER_DECK_IDS.has(d.id))
      return hasStarter ? prev.filter((d) => !STARTER_DECK_IDS.has(d.id)) : prev
    })
  }, [hydrated, setDecks])
  const [view, setView] = useState<ActiveView>({ mode: 'list' })
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // Deck creation state
  const [isCreatingDeck, setIsCreatingDeck] = useState(false)
  const [newDeckTitle, setNewDeckTitle] = useState('')
  const [newDeckCategory, setNewDeckCategory] = useState('Study & Work')
  const [newDeckDesc, setNewDeckDesc] = useState('')

  // Active deck being managed or studied
  const activeDeck = useMemo(() => {
    if (view.mode === 'manage' || view.mode === 'study') {
      return decks.find((d) => d.id === view.deckId) || null
    }
    return null
  }, [decks, view])

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>()
    decks.forEach((d) => {
      if (d.category) set.add(d.category)
    })
    return ['all', ...Array.from(set)]
  }, [decks])

  // Filtered decks for list view
  const filteredDecks = useMemo(() => {
    return decks.filter((d) => {
      const matchesCategory = activeCategory === 'all' || d.category === activeCategory
      const q = searchQuery.trim().toLowerCase()
      if (!q) return matchesCategory

      const matchesTitle = d.title.toLowerCase().includes(q)
      const matchesDesc = (d.description ?? '').toLowerCase().includes(q)
      const matchesCategoryName = d.category.toLowerCase().includes(q)
      const matchesCards = d.cards.some(
        (c) =>
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q) ||
          (c.hint ?? '').toLowerCase().includes(q),
      )
      return matchesCategory && (matchesTitle || matchesDesc || matchesCategoryName || matchesCards)
    })
  }, [decks, activeCategory, searchQuery])

  // Overall statistics
  const stats = useMemo(() => {
    let totalCards = 0
    let masteredCards = 0
    let needReviewCards = 0

    decks.forEach((d) => {
      d.cards.forEach((c) => {
        totalCards++
        if (c.mastered) masteredCards++
        else if (c.needsReview) needReviewCards++
      })
    })

    const masteryRate = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0

    return {
      totalDecks: decks.length,
      totalCards,
      masteredCards,
      needReviewCards,
      masteryRate,
    }
  }, [decks])

  // Handlers for Deck operations
  const handleCreateDeck = (e: FormEvent) => {
    e.preventDefault()
    const trimmedTitle = newDeckTitle.trim()
    if (!trimmedTitle) return

    const newDeck: FlashcardDeck = {
      id: createId(),
      title: trimmedTitle,
      category: newDeckCategory.trim() || 'General',
      description: newDeckDesc.trim(),
      color: 'bg-accent',
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    setDecks((prev) => [newDeck, ...prev])
    setNewDeckTitle('')
    setNewDeckDesc('')
    setIsCreatingDeck(false)
    setView({ mode: 'manage', deckId: newDeck.id })
  }

  const handleDeleteDeck = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId)
    if (!deck) return
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the deck "${deck.title}" with ${deck.cards.length} cards?`,
    )
    if (!confirmDelete) return

    setDecks((prev) => prev.filter((d) => d.id !== deckId))
    if (view.mode !== 'list') {
      setView({ mode: 'list' })
    }
  }

  const handleUpdateDeck = (deckId: string, patch: Partial<FlashcardDeck>) => {
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, ...patch, updatedAt: Date.now() } : d)),
    )
  }

  // Active view router
  if (view.mode === 'study' && activeDeck) {
    return (
      <StudySession
        deck={activeDeck}
        onlyReview={view.onlyReview}
        onExit={() => setView({ mode: 'list' })}
        onUpdateDeck={(patch) => handleUpdateDeck(activeDeck.id, patch)}
        onSwitchToManage={() => setView({ mode: 'manage', deckId: activeDeck.id })}
      />
    )
  }

  if (view.mode === 'manage' && activeDeck) {
    return (
      <DeckManager
        deck={activeDeck}
        onBack={() => setView({ mode: 'list' })}
        onStartStudy={(onlyReview = false) =>
          setView({ mode: 'study', deckId: activeDeck.id, onlyReview })
        }
        onUpdateDeck={(patch) => handleUpdateDeck(activeDeck.id, patch)}
        onDeleteDeck={() => handleDeleteDeck(activeDeck.id)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Overview Stat Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel className="flex flex-col items-center justify-center p-3 text-center sm:p-4">
          <span className="font-display text-2xl text-foreground sm:text-3xl">{stats.totalDecks}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Decks</span>
        </Panel>
        <Panel className="flex flex-col items-center justify-center p-3 text-center sm:p-4">
          <span className="font-display text-2xl text-foreground sm:text-3xl">{stats.totalCards}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Cards</span>
        </Panel>
        <Panel className="flex flex-col items-center justify-center p-3 text-center sm:p-4">
          <span className="font-display text-2xl text-primary sm:text-3xl">{stats.masteredCards}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mastered</span>
        </Panel>
        <Panel className="flex flex-col items-center justify-center p-3 text-center sm:p-4">
          <span className="font-display text-2xl text-destructive sm:text-3xl">{stats.needReviewCards}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">To Review</span>
        </Panel>
      </div>

      {/* Main Actions Panel */}
      <Panel className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="deck-search" className="sr-only">
              Search flashcards
            </label>
            <input
              id="deck-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search decks, questions, or answers..."
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          <div className="flex items-center gap-2">
            <NookButton onClick={() => setIsCreatingDeck((v) => !v)}>
              <Plus /> New Deck
            </NookButton>
          </div>
        </div>

        {/* Categories Tablist */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {categories.map((cat) => (
            <PillToggle
              key={cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className="text-xs capitalize"
            >
              {cat === 'all' ? 'All Decks' : cat}
              <span className="opacity-70">
                (
                {cat === 'all'
                  ? decks.length
                  : decks.filter((d) => d.category === cat).length}
                )
              </span>
            </PillToggle>
          ))}
        </div>

        {/* Inline New Deck Form Drawer */}
        {isCreatingDeck && (
          <form
            onSubmit={handleCreateDeck}
            className="sketch-sm flex flex-col gap-3 bg-secondary/50 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-foreground">Create a New Flashcard Deck</h3>
              <NookButton
                variant="ghost"
                size="icon"
                onClick={() => setIsCreatingDeck(false)}
                aria-label="Close form"
              >
                <X />
              </NookButton>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="new-deck-title" className="mb-1 block text-xs font-bold uppercase text-foreground">
                  Deck Title *
                </label>
                <input
                  id="new-deck-title"
                  required
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="e.g., Biology Chapter 3, Italian Vocab..."
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="new-deck-cat" className="mb-1 block text-xs font-bold uppercase text-foreground">
                  Category / Subject
                </label>
                <input
                  id="new-deck-cat"
                  value={newDeckCategory}
                  onChange={(e) => setNewDeckCategory(e.target.value)}
                  placeholder="e.g., Science, Languages, Work..."
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="new-deck-desc" className="mb-1 block text-xs font-bold uppercase text-foreground">
                Description (Optional)
              </label>
              <input
                id="new-deck-desc"
                value={newDeckDesc}
                onChange={(e) => setNewDeckDesc(e.target.value)}
                placeholder="A short note about what you're practicing in this deck..."
                className={inputClass}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <NookButton variant="ghost" size="sm" onClick={() => setIsCreatingDeck(false)}>
                Cancel
              </NookButton>
              <NookButton type="submit" size="sm" disabled={!newDeckTitle.trim()}>
                <FolderPlus /> Create & Add Cards
              </NookButton>
            </div>
          </form>
        )}

        {/* Decks Grid */}
        {filteredDecks.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={searchQuery ? 'No matching decks found' : 'Your card shelf is empty'}
          >
            {searchQuery
              ? 'Try searching with a different keyword or select another category.'
              : 'Create your first flashcard deck above to start studying!'}
            <div className="mt-4 flex justify-center">
              <NookButton size="sm" onClick={() => setIsCreatingDeck(true)}>
                <Plus /> Create Deck
              </NookButton>
            </div>
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDecks.map((deck) => {
              const total = deck.cards.length
              const mastered = deck.cards.filter((c) => c.mastered).length
              const needReview = deck.cards.filter((c) => c.needsReview).length
              const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0

              return (
                <div
                  key={deck.id}
                  className="sketch-sm group relative flex flex-col justify-between bg-card p-4 transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full border-2 border-border bg-accent px-2.5 py-0.5 text-xs font-bold text-foreground">
                        {deck.category || 'General'}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">
                        {total} {total === 1 ? 'card' : 'cards'}
                      </span>
                    </div>

                    <h3 className="font-display text-xl leading-snug text-foreground">
                      {deck.title}
                    </h3>

                    {deck.description ? (
                      <p className="line-clamp-2 text-xs font-semibold text-muted-foreground">
                        {deck.description}
                      </p>
                    ) : null}

                    {/* Mastery Progress Bar */}
                    <div className="mt-2 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-muted-foreground">Mastery</span>
                        <span className="text-foreground">{masteryPct}%</span>
                      </div>
                      <div
                        className="h-2.5 overflow-hidden rounded-full border-2 border-border bg-secondary"
                        role="progressbar"
                        aria-valuenow={masteryPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${deck.title} mastery percentage`}
                      >
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${masteryPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>{mastered} mastered</span>
                        {needReview > 0 ? (
                          <span className="font-bold text-destructive">{needReview} need review</span>
                        ) : (
                          <span>0 to review</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t-2 border-border/20 pt-3">
                    <NookButton
                      size="sm"
                      className="flex-1"
                      disabled={total === 0}
                      onClick={() => setView({ mode: 'study', deckId: deck.id, onlyReview: false })}
                    >
                      <BookOpen className="size-3.5" /> Study
                    </NookButton>

                    {needReview > 0 && (
                      <NookButton
                        variant="secondary"
                        size="sm"
                        title="Study only cards marked for review"
                        onClick={() => setView({ mode: 'study', deckId: deck.id, onlyReview: true })}
                      >
                        <RotateCcw className="size-3.5" /> {needReview}
                      </NookButton>
                    )}

                    <NookButton
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Manage and edit cards"
                      onClick={() => setView({ mode: 'manage', deckId: deck.id })}
                      aria-label={`Edit ${deck.title}`}
                    >
                      <Edit2 className="size-4" />
                    </NookButton>

                    <NookButton
                      variant="danger"
                      size="icon"
                      className="size-8"
                      title="Delete deck"
                      onClick={() => handleDeleteDeck(deck.id)}
                      aria-label={`Delete ${deck.title}`}
                    >
                      <Trash2 className="size-4" />
                    </NookButton>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------------------
// STUDY MODE COMPONENT
// ---------------------------------------------------------------------------
function StudySession({
  deck,
  onlyReview,
  onExit,
  onUpdateDeck,
  onSwitchToManage,
}: {
  deck: FlashcardDeck
  onlyReview: boolean
  onExit: () => void
  onUpdateDeck: (patch: Partial<FlashcardDeck>) => void
  onSwitchToManage: () => void
}) {
  // Pool of cards for this session
  const initialCards = useMemo(() => {
    if (onlyReview) {
      const reviewCards = deck.cards.filter((c) => c.needsReview)
      return reviewCards.length > 0 ? reviewCards : deck.cards
    }
    return deck.cards
  }, [deck, onlyReview])

  const [queue, setQueue] = useState<Flashcard[]>(initialCards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [sessionResults, setSessionResults] = useState<{
    correctIds: Set<string>
    reviewIds: Set<string>
    completed: boolean
  }>({
    correctIds: new Set(),
    reviewIds: new Set(),
    completed: false,
  })

  const currentCard: Flashcard | undefined = queue[currentIndex]
  const cardRef = useRef<HTMLDivElement>(null)

  // Reset flip & hint when moving cards
  useEffect(() => {
    setIsFlipped(false)
    setShowHint(false)
  }, [currentIndex])

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        setIsFlipped((f) => !f)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === '1') {
        e.preventDefault()
        handleScore(false)
      } else if (e.key === '2') {
        e.preventDefault()
        handleScore(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, isFlipped, queue, sessionResults])

  const handleShuffle = () => {
    if (queue.length <= 1) return
    const shuffled = [...queue].sort(() => Math.random() - 0.5)
    setQueue(shuffled)
    setCurrentIndex(0)
    setIsFlipped(false)
    setIsShuffled(true)
  }

  const handleNext = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    }
  }

  const handleScore = (gotIt: boolean) => {
    if (!currentCard) return

    // Update persistent deck card state
    const updatedCards = deck.cards.map((c) => {
      if (c.id === currentCard.id) {
        return {
          ...c,
          mastered: gotIt,
          needsReview: !gotIt,
          reviewCount: c.reviewCount + 1,
          correctCount: gotIt ? c.correctCount + 1 : c.correctCount,
          lastReviewedAt: Date.now(),
        }
      }
      return c
    })
    onUpdateDeck({ cards: updatedCards })

    // Track in session results
    setSessionResults((prev) => {
      const correct = new Set(prev.correctIds)
      const review = new Set(prev.reviewIds)

      if (gotIt) {
        correct.add(currentCard.id)
        review.delete(currentCard.id)
      } else {
        review.add(currentCard.id)
        correct.delete(currentCard.id)
      }

      const isLastCard = currentIndex >= queue.length - 1
      return {
        correctIds: correct,
        reviewIds: review,
        completed: isLastCard ? true : prev.completed,
      }
    })

    // Advance to next card or end session
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setSessionResults((prev) => ({ ...prev, completed: true }))
    }
  }

  const handleRestart = (onlyMistakes = false) => {
    let nextQueue: Flashcard[]
    if (onlyMistakes) {
      nextQueue = deck.cards.filter((c) => sessionResults.reviewIds.has(c.id) || c.needsReview)
      if (nextQueue.length === 0) nextQueue = deck.cards
    } else {
      nextQueue = deck.cards
    }
    setQueue(nextQueue)
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowHint(false)
    setSessionResults({
      correctIds: new Set(),
      reviewIds: new Set(),
      completed: false,
    })
  }

  // If no cards in this deck
  if (!currentCard || queue.length === 0) {
    return (
      <Panel className="flex flex-col items-center gap-4 py-12 text-center">
        <IconBlob icon={BookOpen} className="size-14" />
        <h2 className="font-display text-2xl">This deck has no cards to study!</h2>
        <p className="max-w-sm text-sm font-semibold text-muted-foreground">
          {onlyReview
            ? 'Wonderful! You have no cards needing review in this deck right now.'
            : 'Add a few cards to get your study session going.'}
        </p>
        <div className="flex gap-2">
          <NookButton variant="secondary" onClick={onExit}>
            <ArrowLeft /> Return to Decks
          </NookButton>
          <NookButton onClick={onSwitchToManage}>
            <Plus /> Manage Cards
          </NookButton>
        </div>
      </Panel>
    )
  }

  // Session Completion View
  if (sessionResults.completed) {
    const totalSession = queue.length
    const correctCount = sessionResults.correctIds.size
    const reviewCount = sessionResults.reviewIds.size
    const pct = totalSession > 0 ? Math.round((correctCount / totalSession) * 100) : 100

    return (
      <Panel className="flex flex-col items-center gap-6 py-10 text-center sm:py-14">
        <div className="relative">
          <IconBlob
            icon={pct >= 80 ? Sparkles : RotateCcw}
            className="size-20 border-3 bg-accent [&_svg]:size-10"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-3xl sm:text-4xl">
            {pct === 100
              ? 'Cozy Perfection! ✨'
              : pct >= 70
                ? 'Great Study Session! ☕'
                : 'Keep at It! 🌱'}
          </h2>
          <p className="text-base font-semibold text-muted-foreground">
            You finished reviewing {totalSession} {totalSession === 1 ? 'card' : 'cards'} in{' '}
            <span className="font-bold text-foreground">{deck.title}</span>.
          </p>
        </div>

        {/* Results summary pills */}
        <div className="grid w-full max-w-md grid-cols-3 gap-3">
          <div className="sketch-sm flex flex-col items-center bg-background/60 p-3">
            <span className="font-display text-2xl text-primary">{pct}%</span>
            <span className="text-[11px] font-bold uppercase text-muted-foreground">Score</span>
          </div>
          <div className="sketch-sm flex flex-col items-center bg-background/60 p-3">
            <span className="font-display text-2xl text-foreground">{correctCount}</span>
            <span className="text-[11px] font-bold uppercase text-muted-foreground">Got It</span>
          </div>
          <div className="sketch-sm flex flex-col items-center bg-background/60 p-3">
            <span className="font-display text-2xl text-destructive">{reviewCount}</span>
            <span className="text-[11px] font-bold uppercase text-muted-foreground">To Review</span>
          </div>
        </div>

        {/* Next step buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {reviewCount > 0 && (
            <NookButton onClick={() => handleRestart(true)}>
              <RotateCcw /> Review Missed Cards ({reviewCount})
            </NookButton>
          )}
          <NookButton variant="secondary" onClick={() => handleRestart(false)}>
            <BookOpen /> Study All Again
          </NookButton>
          <NookButton variant="ghost" onClick={onExit}>
            <ArrowLeft /> Back to Decks
          </NookButton>
        </div>
      </Panel>
    )
  }

  const progressPct = Math.round(((currentIndex + 1) / queue.length) * 100)

  return (
    <div className="flex flex-col gap-5">
      {/* Study Top Bar */}
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <NookButton
            variant="ghost"
            size="icon"
            onClick={onExit}
            aria-label="Exit study mode"
            title="Exit study session"
          >
            <ArrowLeft />
          </NookButton>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg text-foreground sm:text-xl">{deck.title}</h2>
              {onlyReview && (
                <span className="rounded-full border-2 border-border bg-destructive px-2 py-0.2 text-[10px] font-bold text-destructive-foreground">
                  Reviewing Missed
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Card {currentIndex + 1} of {queue.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NookButton
            variant={isShuffled ? 'primary' : 'secondary'}
            size="sm"
            onClick={handleShuffle}
            title="Shuffle card order"
          >
            <Shuffle className="size-3.5" />
            <span className="hidden sm:inline">Shuffle</span>
          </NookButton>

          <NookButton
            variant="ghost"
            size="sm"
            onClick={onSwitchToManage}
            title="Edit cards in this deck"
          >
            <Edit2 className="size-3.5" />
            <span className="hidden sm:inline">Edit Cards</span>
          </NookButton>
        </div>
      </Panel>

      {/* Progress Bar */}
      <div className="flex items-center gap-3 px-1">
        <div
          className="h-3 flex-1 overflow-hidden rounded-full border-2 border-border bg-secondary"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Study session progress"
        >
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-bold text-muted-foreground">{progressPct}%</span>
      </div>

      {/* 3D Flip Card Container */}
      <div className="perspective-1000 flex min-h-[380px] w-full flex-col sm:min-h-[440px]">
        <div
          ref={cardRef}
          onClick={() => setIsFlipped((f) => !f)}
          tabIndex={0}
          role="button"
          aria-label={
            isFlipped
              ? `Back of card: ${currentCard.back}. Click to flip back.`
              : `Front of card: ${currentCard.front}. Click to reveal answer.`
          }
          className={cn(
            'sketch transform-style-3d relative flex min-h-[380px] w-full cursor-pointer flex-col bg-card p-6 transition-transform duration-500 select-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary sm:min-h-[440px] sm:p-10',
            isFlipped && 'rotate-y-180',
          )}
        >
          {/* FRONT FACE */}
          <div
            className={cn(
              'backface-hidden absolute inset-0 flex flex-col justify-between p-6 sm:p-10',
              isFlipped && 'pointer-events-none',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border-2 border-border bg-accent px-3 py-1 text-xs font-bold text-foreground">
                Question
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                Card {currentIndex + 1} / {queue.length}
              </span>
            </div>

            {/* Question Text */}
            <div className="my-auto flex flex-col items-center justify-center text-center">
              <p className="font-display text-2xl leading-relaxed text-foreground sm:text-3xl md:text-4xl">
                {currentCard.front}
              </p>

              {/* Hint section */}
              {currentCard.hint && (
                <div
                  className="mt-6 flex flex-col items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {showHint ? (
                    <div className="sketch-sm flex max-w-md items-center gap-2 bg-secondary/80 px-4 py-2 text-xs font-bold text-foreground">
                      <Lightbulb className="size-4 shrink-0 text-primary" />
                      <span>{currentCard.hint}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowHint(true)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-border/60 bg-background/50 px-3 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <HelpCircle className="size-3.5" /> Show hint
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom cue */}
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground">
              <RotateCcw className="size-3.5" />
              <span>Click card or press Space to reveal answer</span>
            </div>
          </div>

          {/* BACK FACE */}
          <div
            className={cn(
              'backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between bg-card p-6 sm:p-10',
              !isFlipped && 'pointer-events-none',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border-2 border-border bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                Answer
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                Card {currentIndex + 1} / {queue.length}
              </span>
            </div>

            {/* Answer Text */}
            <div className="my-auto flex flex-col items-center justify-center text-center">
              <p className="font-display text-xl leading-relaxed text-foreground whitespace-pre-wrap sm:text-2xl md:text-3xl">
                {currentCard.back}
              </p>
              {currentCard.hint && (
                <p className="mt-4 text-xs font-semibold text-muted-foreground">
                  Hint: {currentCard.hint}
                </p>
              )}
            </div>

            {/* Bottom cue */}
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span>Score yourself below (1 or 2 on keyboard)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment & Navigation Buttons */}
      <Panel className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-center">
          <NookButton
            variant="danger"
            className="sketch-sm h-12 flex-1 border-2 border-border bg-[#ffdcd4] text-destructive hover:bg-[#ffc6ba] sm:max-w-[220px]"
            onClick={() => handleScore(false)}
            title="Mark as needing review (Shortcut: 1)"
          >
            <AlertCircle className="size-5" />
            <span className="flex flex-col text-left">
              <span className="text-sm font-bold">Need to Review</span>
              <span className="text-[10px] font-semibold opacity-70">Key [1]</span>
            </span>
          </NookButton>

          <NookButton
            className="sketch-sm h-12 flex-1 border-2 border-border bg-primary text-primary-foreground hover:brightness-105 sm:max-w-[220px]"
            onClick={() => handleScore(true)}
            title="Mark as mastered (Shortcut: 2)"
          >
            <CheckCircle2 className="size-5" />
            <span className="flex flex-col text-left">
              <span className="text-sm font-bold">Got it!</span>
              <span className="text-[10px] font-semibold opacity-85">Key [2]</span>
            </span>
          </NookButton>
        </div>

        {/* Navigation row & Keyboard helper */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-border/15 pt-3">
          <div className="flex items-center gap-1.5">
            <NookButton
              variant="secondary"
              size="sm"
              disabled={currentIndex === 0}
              onClick={handlePrev}
              title="Previous card (Left Arrow)"
            >
              <ArrowLeft /> Previous
            </NookButton>

            <NookButton
              variant="secondary"
              size="sm"
              onClick={() => setIsFlipped((f) => !f)}
              title="Flip card (Space)"
            >
              <RotateCcw /> {isFlipped ? 'Show Front' : 'Flip Card'}
            </NookButton>

            <NookButton
              variant="secondary"
              size="sm"
              disabled={currentIndex >= queue.length - 1}
              onClick={handleNext}
              title="Next card (Right Arrow)"
            >
              Next <ArrowRight />
            </NookButton>
          </div>

          <div className="hidden text-xs font-semibold text-muted-foreground sm:block">
            Keyboard: <kbd className="rounded bg-background px-1.5 py-0.5 border border-border/40 font-mono text-[11px]">Space</kbd> Flip &middot;{' '}
            <kbd className="rounded bg-background px-1.5 py-0.5 border border-border/40 font-mono text-[11px]">&larr;</kbd>{' '}
            <kbd className="rounded bg-background px-1.5 py-0.5 border border-border/40 font-mono text-[11px]">&rarr;</kbd> Move &middot;{' '}
            <kbd className="rounded bg-background px-1.5 py-0.5 border border-border/40 font-mono text-[11px]">1</kbd> Review &middot;{' '}
            <kbd className="rounded bg-background px-1.5 py-0.5 border border-border/40 font-mono text-[11px]">2</kbd> Got it
          </div>
        </div>
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DECK MANAGER COMPONENT (Edit Deck / Add & Edit Cards)
// ---------------------------------------------------------------------------
function DeckManager({
  deck,
  onBack,
  onStartStudy,
  onUpdateDeck,
  onDeleteDeck,
}: {
  deck: FlashcardDeck
  onBack: () => void
  onStartStudy: (onlyReview?: boolean) => void
  onUpdateDeck: (patch: Partial<FlashcardDeck>) => void
  onDeleteDeck: () => void
}) {
  // New Card Inputs
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [hint, setHint] = useState('')

  // Deck info editing
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [editTitle, setEditTitle] = useState(deck.title)
  const [editCategory, setEditCategory] = useState(deck.category)
  const [editDesc, setEditDesc] = useState(deck.description ?? '')

  // Inline card editing
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editCardFront, setEditCardFront] = useState('')
  const [editCardBack, setEditCardBack] = useState('')
  const [editCardHint, setEditCardHint] = useState('')

  // Card filter within deck
  const [cardSearch, setCardSearch] = useState('')
  const [cardFilter, setCardFilter] = useState<'all' | 'mastered' | 'review'>('all')

  const handleAddCard = (e: FormEvent) => {
    e.preventDefault()
    const trimmedFront = front.trim()
    const trimmedBack = back.trim()
    if (!trimmedFront || !trimmedBack) return

    const newCard: Flashcard = {
      id: createId(),
      front: trimmedFront,
      back: trimmedBack,
      hint: hint.trim() || undefined,
      mastered: false,
      needsReview: false,
      reviewCount: 0,
      correctCount: 0,
    }

    onUpdateDeck({ cards: [newCard, ...deck.cards] })
    setFront('')
    setBack('')
    setHint('')
  }

  const handleDeleteCard = (cardId: string) => {
    onUpdateDeck({ cards: deck.cards.filter((c) => c.id !== cardId) })
    if (editingCardId === cardId) setEditingCardId(null)
  }

  const handleStartEditCard = (card: Flashcard) => {
    setEditingCardId(card.id)
    setEditCardFront(card.front)
    setEditCardBack(card.back)
    setEditCardHint(card.hint ?? '')
  }

  const handleSaveEditCard = (cardId: string) => {
    if (!editCardFront.trim() || !editCardBack.trim()) return

    const updated = deck.cards.map((c) =>
      c.id === cardId
        ? {
            ...c,
            front: editCardFront.trim(),
            back: editCardBack.trim(),
            hint: editCardHint.trim() || undefined,
          }
        : c,
    )
    onUpdateDeck({ cards: updated })
    setEditingCardId(null)
  }

  const handleSaveDeckInfo = (e: FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) return

    onUpdateDeck({
      title: editTitle.trim(),
      category: editCategory.trim() || 'General',
      description: editDesc.trim(),
    })
    setIsEditingInfo(false)
  }

  const filteredCards = useMemo(() => {
    return deck.cards.filter((c) => {
      if (cardFilter === 'mastered' && !c.mastered) return false
      if (cardFilter === 'review' && !c.needsReview) return false

      const q = cardSearch.trim().toLowerCase()
      if (!q) return true
      return (
        c.front.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        (c.hint ?? '').toLowerCase().includes(q)
      )
    })
  }, [deck.cards, cardFilter, cardSearch])

  const masteredCount = deck.cards.filter((c) => c.mastered).length
  const reviewCount = deck.cards.filter((c) => c.needsReview).length

  return (
    <div className="flex flex-col gap-5">
      {/* Header and Deck Controls */}
      <Panel className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <NookButton variant="ghost" size="icon" onClick={onBack} aria-label="Back to decks">
              <ArrowLeft />
            </NookButton>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl text-foreground">{deck.title}</h2>
                <span className="rounded-full border-2 border-border bg-accent px-2.5 py-0.5 text-xs font-bold text-foreground">
                  {deck.category}
                </span>
              </div>
              {deck.description ? (
                <p className="text-xs font-semibold text-muted-foreground">{deck.description}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NookButton
              onClick={() => onStartStudy(false)}
              disabled={deck.cards.length === 0}
              className="h-10"
            >
              <BookOpen /> Study Deck ({deck.cards.length})
            </NookButton>

            {reviewCount > 0 && (
              <NookButton
                variant="secondary"
                onClick={() => onStartStudy(true)}
                className="h-10"
              >
                <RotateCcw /> Review Missed ({reviewCount})
              </NookButton>
            )}

            <NookButton
              variant="ghost"
              size="icon"
              onClick={() => setIsEditingInfo((v) => !v)}
              title="Edit deck title & category"
              aria-label="Edit deck info"
            >
              <Edit2 />
            </NookButton>

            <NookButton
              variant="danger"
              size="icon"
              onClick={onDeleteDeck}
              title="Delete deck"
              aria-label="Delete deck"
            >
              <Trash2 />
            </NookButton>
          </div>
        </div>

        {/* Deck Info Edit Form */}
        {isEditingInfo && (
          <form
            onSubmit={handleSaveDeckInfo}
            className="sketch-sm flex flex-col gap-3 bg-secondary/40 p-4"
          >
            <h3 className="font-display text-base">Edit Deck Information</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-foreground">
                  Title
                </label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-foreground">
                  Category
                </label>
                <input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-foreground">
                Description
              </label>
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex justify-end gap-2">
              <NookButton variant="ghost" size="sm" onClick={() => setIsEditingInfo(false)}>
                Cancel
              </NookButton>
              <NookButton type="submit" size="sm">
                Save Changes
              </NookButton>
            </div>
          </form>
        )}
      </Panel>

      {/* Add New Card Section */}
      <Panel className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <IconBlob icon={Plus} className="size-8" />
          <h3 className="font-display text-lg text-foreground">Add a New Flashcard</h3>
        </div>

        <form onSubmit={handleAddCard} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="card-front" className="mb-1 block text-xs font-bold uppercase text-foreground">
                Question / Front *
              </label>
              <textarea
                id="card-front"
                rows={3}
                required
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="What is the concept, word, or question?"
                className={cn(inputClass, 'resize-none')}
              />
            </div>
            <div>
              <label htmlFor="card-back" className="mb-1 block text-xs font-bold uppercase text-foreground">
                Answer / Back *
              </label>
              <textarea
                id="card-back"
                rows={3}
                required
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="What is the explanation or answer?"
                className={cn(inputClass, 'resize-none')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label htmlFor="card-hint" className="sr-only">
                Hint (optional)
              </label>
              <input
                id="card-hint"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Optional hint or mnemonic clue..."
                className={inputClass}
              />
            </div>
            <NookButton
              type="submit"
              disabled={!front.trim() || !back.trim()}
              className="h-10 self-end sm:self-auto"
            >
              <Plus /> Add Card
            </NookButton>
          </div>
        </form>
      </Panel>

      {/* Cards List Panel */}
      <Panel className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg text-foreground">
              Cards in Deck ({deck.cards.length})
            </h3>
            <span className="text-xs font-bold text-muted-foreground">
              {masteredCount} mastered &middot; {reviewCount} need review
            </span>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <PillToggle
              active={cardFilter === 'all'}
              onClick={() => setCardFilter('all')}
              className="text-xs"
            >
              All ({deck.cards.length})
            </PillToggle>
            <PillToggle
              active={cardFilter === 'mastered'}
              onClick={() => setCardFilter('mastered')}
              className="text-xs"
            >
              Mastered ({masteredCount})
            </PillToggle>
            <PillToggle
              active={cardFilter === 'review'}
              onClick={() => setCardFilter('review')}
              className="text-xs"
            >
              To Review ({reviewCount})
            </PillToggle>
          </div>
        </div>

        {/* Card Search */}
        {deck.cards.length > 5 && (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              placeholder="Search cards in this deck..."
              className={cn(inputClass, 'h-9 pl-9 text-xs')}
            />
          </div>
        )}

        {filteredCards.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={cardSearch ? 'No cards match your filter' : 'No cards added yet'}
          >
            {cardSearch
              ? 'Try adjusting your search terms.'
              : 'Add your first card above to begin studying!'}
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredCards.map((card, idx) => {
              const isEditing = editingCardId === card.id

              if (isEditing) {
                return (
                  <div
                    key={card.id}
                    className="sketch-sm flex flex-col gap-3 bg-card p-4 border-primary"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm">Edit Card</span>
                      <NookButton
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setEditingCardId(null)}
                      >
                        <X />
                      </NookButton>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold uppercase text-muted-foreground">
                          Front
                        </label>
                        <textarea
                          rows={2}
                          value={editCardFront}
                          onChange={(e) => setEditCardFront(e.target.value)}
                          className={cn(inputClass, 'resize-none')}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase text-muted-foreground">
                          Back
                        </label>
                        <textarea
                          rows={2}
                          value={editCardBack}
                          onChange={(e) => setEditCardBack(e.target.value)}
                          className={cn(inputClass, 'resize-none')}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-muted-foreground">
                        Hint (Optional)
                      </label>
                      <input
                        value={editCardHint}
                        onChange={(e) => setEditCardHint(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <NookButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCardId(null)}
                      >
                        Cancel
                      </NookButton>
                      <NookButton size="sm" onClick={() => handleSaveEditCard(card.id)}>
                        <Check /> Save Card
                      </NookButton>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={card.id}
                  className="sketch-sm group flex flex-col justify-between gap-3 bg-background/50 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="blob flex size-7 shrink-0 items-center justify-center border-2 border-border bg-secondary text-xs font-bold text-foreground">
                      {idx + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground break-words">{card.front}</p>
                        {card.mastered && (
                          <span className="rounded-full border border-border bg-primary/20 px-2 py-0.2 text-[10px] font-bold text-primary">
                            Mastered
                          </span>
                        )}
                        {card.needsReview && (
                          <span className="rounded-full border border-border bg-destructive/15 px-2 py-0.2 text-[10px] font-bold text-destructive">
                            Needs Review
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground break-words">
                        {card.back}
                      </p>
                      {card.hint && (
                        <p className="text-[11px] font-bold text-primary/80">
                          Hint: {card.hint}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 self-end sm:self-center">
                    <NookButton
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Edit card"
                      onClick={() => handleStartEditCard(card)}
                      aria-label="Edit card"
                    >
                      <Edit2 className="size-3.5" />
                    </NookButton>
                    <NookButton
                      variant="danger"
                      size="icon"
                      className="size-8"
                      title="Delete card"
                      onClick={() => handleDeleteCard(card.id)}
                      aria-label="Delete card"
                    >
                      <Trash2 className="size-3.5" />
                    </NookButton>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}
