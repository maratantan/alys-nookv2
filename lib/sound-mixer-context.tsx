'use client'

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'
import {
  focusAudioEngine,
  SOUND_DEFINITIONS,
  type SoundId,
} from './focus-audio-engine'
import { createId, usePersistentState } from './use-persistent-state'

export interface SoundState {
  id: SoundId
  name: string
  description: string
  volume: number
  active: boolean
  muted: boolean
}

export interface SoundPreset {
  id: string
  name: string
  description?: string
  isCustom?: boolean
  volumes: Partial<Record<SoundId, number>>
}

export const DEFAULT_PRESETS: SoundPreset[] = [
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    description: 'Smooth white noise, soft typing rhythm, and gentle rain.',
    volumes: {
      whitenoise: 0.65,
      keyboard: 0.45,
      rain: 0.45,
    },
  },
  {
    id: 'cozy-cafe',
    name: 'Cozy Cafe',
    description: 'Bustling coffee shop, crackling hearth, and outdoor rain.',
    volumes: {
      coffeeshop: 0.7,
      fireplace: 0.45,
      rain: 0.35,
    },
  },
  {
    id: 'rainy-evening',
    name: 'Rainy Evening',
    description: 'Heavy downpour, rolling thunder, and warm fireplace.',
    volumes: {
      rain: 0.8,
      thunder: 0.7,
      fireplace: 0.55,
    },
  },
  {
    id: 'nature-retreat',
    name: 'Nature Retreat',
    description: 'Sweet songbirds, gentle wind, and rolling ocean surf.',
    volumes: {
      birds: 0.7,
      wind: 0.5,
      waves: 0.6,
    },
  },
]

interface SoundMixerContextValue {
  sounds: SoundState[]
  masterVolume: number
  masterMuted: boolean
  isPlaying: boolean
  activeCount: number
  presets: SoundPreset[]
  activePresetId: string | null
  toggleSound: (id: SoundId) => void
  setSoundVolume: (id: SoundId, volume: number) => void
  toggleSoundMute: (id: SoundId) => void
  playAll: () => void
  pauseAll: () => void
  stopAll: () => void
  setMasterVolume: (volume: number) => void
  toggleMasterMute: () => void
  applyPreset: (preset: SoundPreset) => void
  saveCustomPreset: (name: string, description?: string) => void
  deleteCustomPreset: (presetId: string) => void
}

const SoundMixerContext = createContext<SoundMixerContextValue | null>(null)

export function SoundMixerProvider({ children }: { children: ReactNode }) {
  // Persistent sound settings: active states and volumes
  const [persistedSoundSettings, setPersistedSoundSettings] = usePersistentState<
    Record<string, { volume: number; active: boolean; muted: boolean }>
  >('focus-sound-settings', {
    rain: { volume: 0.6, active: false, muted: false },
    thunder: { volume: 0.55, active: false, muted: false },
    fireplace: { volume: 0.6, active: false, muted: false },
    coffeeshop: { volume: 0.5, active: false, muted: false },
    birds: { volume: 0.55, active: false, muted: false },
    waves: { volume: 0.6, active: false, muted: false },
    wind: { volume: 0.5, active: false, muted: false },
    whitenoise: { volume: 0.65, active: false, muted: false },
    keyboard: { volume: 0.45, active: false, muted: false },
  })

  // Master volume and mute
  const [masterVolume, setMasterVolumeState] = usePersistentState<number>('focus-sound-master-volume', 0.8)
  const [masterMuted, setMasterMutedState] = usePersistentState<boolean>('focus-sound-master-muted', false)

  // Custom user presets
  const [customPresets, setCustomPresets] = usePersistentState<SoundPreset[]>('focus-sound-custom-presets', [])

  // Runtime playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  // All presets merged
  const presets = useMemo(() => {
    return [...DEFAULT_PRESETS, ...customPresets]
  }, [customPresets])

  // Full sound state objects
  const sounds: SoundState[] = useMemo(() => {
    return SOUND_DEFINITIONS.map((def) => {
      const saved = persistedSoundSettings[def.id]
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        volume: saved ? saved.volume : def.defaultVolume,
        active: saved ? saved.active : false,
        muted: saved ? saved.muted : false,
      }
    })
  }, [persistedSoundSettings])

  const activeCount = useMemo(() => {
    return sounds.filter((s) => s.active).length
  }, [sounds])

  // Sync with audio engine when sound settings or isPlaying changes
  useEffect(() => {
    focusAudioEngine.setMasterVolume(masterVolume)
    focusAudioEngine.setMuted(masterMuted)
  }, [masterVolume, masterMuted])

  // Update actual audio engine sources
  useEffect(() => {
    if (!isPlaying) {
      focusAudioEngine.pause()
      return
    }

    focusAudioEngine.resume()

    for (const sound of sounds) {
      const effectiveVol = sound.muted ? 0 : sound.volume
      const shouldPlay = sound.active && !sound.muted
      focusAudioEngine.setSound(sound.id, shouldPlay, effectiveVol)
    }
  }, [isPlaying, sounds])

  const toggleSound = useCallback((id: SoundId) => {
    setActivePresetId(null)
    setPersistedSoundSettings((prev) => {
      const current = prev[id] || { volume: 0.6, active: false, muted: false }
      const nextActive = !current.active
      const next = { ...prev, [id]: { ...current, active: nextActive } }
      return next
    })
    setIsPlaying(true)
  }, [setPersistedSoundSettings])

  const setSoundVolume = useCallback((id: SoundId, volume: number) => {
    setActivePresetId(null)
    setPersistedSoundSettings((prev) => {
      const current = prev[id] || { volume: 0.6, active: false, muted: false }
      return {
        ...prev,
        [id]: { ...current, volume: Math.max(0, Math.min(1, volume)) },
      }
    })
  }, [setPersistedSoundSettings])

  const toggleSoundMute = useCallback((id: SoundId) => {
    setPersistedSoundSettings((prev) => {
      const current = prev[id] || { volume: 0.6, active: false, muted: false }
      return {
        ...prev,
        [id]: { ...current, muted: !current.muted },
      }
    })
  }, [setPersistedSoundSettings])

  const playAll = useCallback(() => {
    // If no sound is active, activate rain and white noise as a cozy default
    if (activeCount === 0) {
      setPersistedSoundSettings((prev) => ({
        ...prev,
        rain: { ...prev.rain, active: true },
        whitenoise: { ...prev.whitenoise, active: true },
      }))
    }
    setIsPlaying(true)
  }, [activeCount, setPersistedSoundSettings])

  const pauseAll = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const stopAll = useCallback(() => {
    setIsPlaying(false)
    setActivePresetId(null)
    setPersistedSoundSettings((prev) => {
      const next: Record<string, { volume: number; active: boolean; muted: boolean }> = {}
      for (const [k, v] of Object.entries(prev)) {
        next[k] = { ...v, active: false, muted: false }
      }
      return next
    })
    focusAudioEngine.stopAll()
  }, [setPersistedSoundSettings])

  const setMasterVolume = useCallback((volume: number) => {
    setMasterVolumeState(Math.max(0, Math.min(1, volume)))
  }, [setMasterVolumeState])

  const toggleMasterMute = useCallback(() => {
    setMasterMutedState((prev) => !prev)
  }, [setMasterMutedState])

  const applyPreset = useCallback((preset: SoundPreset) => {
    setActivePresetId(preset.id)
    setPersistedSoundSettings((prev) => {
      const next: Record<string, { volume: number; active: boolean; muted: boolean }> = {}

      for (const def of SOUND_DEFINITIONS) {
        const presetVol = preset.volumes[def.id]
        const isPresetActive = typeof presetVol === 'number' && presetVol > 0
        const current = prev[def.id] || { volume: def.defaultVolume, active: false, muted: false }

        next[def.id] = {
          volume: isPresetActive ? presetVol : current.volume,
          active: isPresetActive,
          muted: false,
        }
      }
      return next
    })
    setIsPlaying(true)
  }, [setPersistedSoundSettings])

  const saveCustomPreset = useCallback((name: string, description?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    const volumes: Partial<Record<SoundId, number>> = {}
    for (const s of sounds) {
      if (s.active) {
        volumes[s.id] = s.volume
      }
    }

    const newPreset: SoundPreset = {
      id: `custom-${createId()}`,
      name: trimmed,
      description: description?.trim() || 'Custom sound combination',
      isCustom: true,
      volumes,
    }

    setCustomPresets((prev) => [...prev, newPreset])
    setActivePresetId(newPreset.id)
  }, [sounds, setCustomPresets])

  const deleteCustomPreset = useCallback((presetId: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== presetId))
    if (activePresetId === presetId) {
      setActivePresetId(null)
    }
  }, [activePresetId, setCustomPresets])

  const value: SoundMixerContextValue = {
    sounds,
    masterVolume,
    masterMuted,
    isPlaying,
    activeCount,
    presets,
    activePresetId,
    toggleSound,
    setSoundVolume,
    toggleSoundMute,
    playAll,
    pauseAll,
    stopAll,
    setMasterVolume,
    toggleMasterMute,
    applyPreset,
    saveCustomPreset,
    deleteCustomPreset,
  }

  return (
    <SoundMixerContext.Provider value={value}>
      {children}
    </SoundMixerContext.Provider>
  )
}

export function useSoundMixer() {
  const context = useContext(SoundMixerContext)
  if (!context) {
    throw new Error('useSoundMixer must be used within a SoundMixerProvider')
  }
  return context
}
