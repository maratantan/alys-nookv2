'use client'

import { useState, type FormEvent } from 'react'
import {
  Bird,
  CloudLightning,
  CloudRain,
  Coffee,
  Flame,
  Keyboard,
  Pause,
  Play,
  Plus,
  Radio,
  Sliders,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
  type LucideIcon,
} from 'lucide-react'
import { type SoundId } from '@/lib/focus-audio-engine'
import { useSoundMixer, type SoundPreset } from '@/lib/sound-mixer-context'
import { cn } from '@/lib/utils'
import { IconBlob, NookButton, Panel, PillToggle, inputClass } from './ui'

const SOUND_ICONS: Record<SoundId, LucideIcon> = {
  rain: CloudRain,
  thunder: CloudLightning,
  fireplace: Flame,
  coffeeshop: Coffee,
  birds: Bird,
  waves: Waves,
  wind: Wind,
  whitenoise: Radio,
  keyboard: Keyboard,
}

export function FocusMixer() {
  const {
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
  } = useSoundMixer()

  const [isSavingPreset, setIsSavingPreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetDesc, setPresetDesc] = useState('')

  const handleSavePreset = (e: FormEvent) => {
    e.preventDefault()
    if (!presetName.trim()) return
    saveCustomPreset(presetName.trim(), presetDesc.trim())
    setPresetName('')
    setPresetDesc('')
    setIsSavingPreset(false)
  }

  return (
    <Panel className="flex flex-col gap-5 p-4 sm:p-6">
      {/* Header & Master Controls */}
      <div className="flex flex-col gap-4 border-b-2 border-border/20 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconBlob
              icon={Sliders}
              className={cn(
                'size-10 transition-transform',
                isPlaying && activeCount > 0 && 'animate-pulse bg-primary text-primary-foreground',
              )}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl text-foreground sm:text-2xl">
                  Focus Sounds Mixer
                </h3>
                {isPlaying && activeCount > 0 && (
                  <span className="blob flex size-2.5 bg-primary animate-ping" />
                )}
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                {isPlaying && activeCount > 0
                  ? `${activeCount} ambient ${activeCount === 1 ? 'sound' : 'sounds'} playing in the background`
                  : 'Mix warm ambient sounds to build your cozy flow state'}
              </p>
            </div>
          </div>

          {/* Master Transport Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {isPlaying && activeCount > 0 ? (
              <NookButton onClick={pauseAll} className="h-9 px-3.5">
                <Pause className="size-4" /> Pause
              </NookButton>
            ) : (
              <NookButton onClick={playAll} className="h-9 px-3.5">
                <Play className="size-4" /> {activeCount > 0 ? 'Resume' : 'Play Mixer'}
              </NookButton>
            )}

            <NookButton
              variant={masterMuted ? 'danger' : 'secondary'}
              size="icon"
              className="size-9"
              onClick={toggleMasterMute}
              title={masterMuted ? 'Unmute Master' : 'Mute Master'}
              aria-label={masterMuted ? 'Unmute Master' : 'Mute Master'}
            >
              {masterMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </NookButton>

            <NookButton
              variant="ghost"
              size="sm"
              onClick={stopAll}
              title="Stop and reset all sounds"
              className="text-xs"
            >
              <Square className="size-3.5" /> Stop All
            </NookButton>
          </div>
        </div>

        {/* Master Volume Slider Row */}
        <div className="sketch-sm flex flex-col gap-2 bg-secondary/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Volume2 className="size-4 text-primary" />
            <span>Master Volume</span>
            <span className="text-muted-foreground">({Math.round(masterVolume * 100)}%)</span>
          </div>

          <div className="flex flex-1 items-center gap-3 sm:max-w-xs">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterMuted ? 0 : masterVolume}
              onChange={(e) => {
                if (masterMuted) toggleMasterMute()
                setMasterVolume(parseFloat(e.target.value))
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border/20 accent-primary"
              aria-label="Master volume slider"
            />
          </div>
        </div>
      </div>

      {/* Presets Section */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="font-display text-sm uppercase tracking-wider text-muted-foreground">
              Soundscapes & Presets
            </h4>
          </div>

          {activeCount > 0 && !isSavingPreset && (
            <button
              type="button"
              onClick={() => setIsSavingPreset(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <Plus className="size-3.5" /> Save current mix as preset
            </button>
          )}
        </div>

        {/* Preset Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((preset) => {
            const isActive = activePresetId === preset.id
            return (
              <div key={preset.id} className="group relative flex items-center">
                <PillToggle
                  active={isActive}
                  onClick={() => applyPreset(preset)}
                  className="pr-2"
                  title={preset.description}
                >
                  <span>{preset.name}</span>
                  {preset.isCustom && (
                    <span className="rounded-full bg-accent px-1.5 py-0.2 text-[9px] font-bold text-foreground">
                      Custom
                    </span>
                  )}
                </PillToggle>

                {preset.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteCustomPreset(preset.id)
                    }}
                    className="ml-1 cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                    aria-label={`Delete custom preset ${preset.name}`}
                    title="Delete preset"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Save Preset Form Drawer */}
        {isSavingPreset && (
          <form
            onSubmit={handleSavePreset}
            className="sketch-sm flex flex-col gap-3 bg-secondary/50 p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display text-base text-foreground">
                Save Current Mix as Preset
              </h4>
              <NookButton
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setIsSavingPreset(false)}
                aria-label="Cancel"
              >
                <X className="size-4" />
              </NookButton>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="preset-name" className="mb-1 block text-xs font-bold uppercase text-foreground">
                  Preset Name *
                </label>
                <input
                  id="preset-name"
                  required
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., Midnight Rain, Cabin Study..."
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="preset-desc" className="mb-1 block text-xs font-bold uppercase text-foreground">
                  Description (Optional)
                </label>
                <input
                  id="preset-desc"
                  value={presetDesc}
                  onChange={(e) => setPresetDesc(e.target.value)}
                  placeholder="e.g., Gentle typing with fireplace crackle..."
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Saves {activeCount} active {activeCount === 1 ? 'sound' : 'sounds'} with their current volumes.
              </p>
              <div className="flex gap-2">
                <NookButton variant="ghost" size="sm" onClick={() => setIsSavingPreset(false)}>
                  Cancel
                </NookButton>
                <NookButton type="submit" size="sm" disabled={!presetName.trim()}>
                  Save Preset
                </NookButton>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Sound Cards Grid */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {sounds.map((sound) => {
          const Icon = SOUND_ICONS[sound.id] || Volume2
          const isSoundPlaying = isPlaying && sound.active && !sound.muted

          return (
            <div
              key={sound.id}
              className={cn(
                'sketch-sm flex flex-col justify-between gap-3 p-3.5 transition-all',
                sound.active
                  ? 'border-primary bg-background shadow-sm'
                  : 'bg-card/70 opacity-80 hover:opacity-100',
              )}
            >
              {/* Card Top Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleSound(sound.id)}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                    aria-label={`Toggle ${sound.name}`}
                  >
                    <IconBlob
                      icon={Icon}
                      className={cn(
                        'size-9 transition-colors',
                        sound.active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground hover:bg-accent',
                      )}
                    />
                  </button>
                  <div>
                    <h5 className="font-display text-base leading-snug text-foreground">
                      {sound.name}
                    </h5>
                    <p className="line-clamp-1 text-[11px] font-semibold text-muted-foreground">
                      {sound.description}
                    </p>
                  </div>
                </div>

                {/* Sound Toggle Button */}
                <button
                  type="button"
                  onClick={() => toggleSound(sound.id)}
                  aria-pressed={sound.active}
                  className={cn(
                    'sketch-sm shrink-0 cursor-pointer px-2.5 py-1 text-xs font-bold transition-all',
                    sound.active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-accent',
                  )}
                >
                  {sound.active ? 'On' : 'Off'}
                </button>
              </div>

              {/* Volume Slider & Sound Mute Row */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={!sound.active}
                  onClick={() => toggleSoundMute(sound.id)}
                  className={cn(
                    'cursor-pointer rounded-lg p-1 transition-colors disabled:opacity-30',
                    sound.muted
                      ? 'text-destructive bg-destructive/10'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title={sound.muted ? 'Unmute this sound' : 'Mute this sound'}
                  aria-label={sound.muted ? `Unmute ${sound.name}` : `Mute ${sound.name}`}
                >
                  {sound.muted ? (
                    <VolumeX className="size-4" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </button>

                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    disabled={!sound.active}
                    value={sound.muted ? 0 : sound.volume}
                    onChange={(e) => setSoundVolume(sound.id, parseFloat(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border/20 accent-primary disabled:opacity-40"
                    aria-label={`${sound.name} volume`}
                  />
                  <span className="w-8 text-right font-mono text-[10px] font-bold text-muted-foreground">
                    {sound.muted ? '0%' : `${Math.round(sound.volume * 100)}%`}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
