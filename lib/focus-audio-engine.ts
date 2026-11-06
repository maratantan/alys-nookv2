'use client'

// Web Audio API Focus Sounds Synthesizer & Mixer Engine
// 100% procedural Web Audio API synthesis: zero external files, zero 404s, infinite seamless loops

export type SoundId =
  | 'rain'
  | 'thunder'
  | 'fireplace'
  | 'coffeeshop'
  | 'birds'
  | 'waves'
  | 'wind'
  | 'whitenoise'
  | 'keyboard'

export interface SoundDef {
  id: SoundId
  name: string
  description: string
  defaultVolume: number
}

export const SOUND_DEFINITIONS: SoundDef[] = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    description: 'Soft, steady rainfall pattering outside the window.',
    defaultVolume: 0.6,
  },
  {
    id: 'thunder',
    name: 'Thunderstorms',
    description: 'Distant rolling thunder and deep, cozy rain rumbles.',
    defaultVolume: 0.55,
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    description: 'Warm hearth with crackling wooden logs and soft embers.',
    defaultVolume: 0.6,
  },
  {
    id: 'coffeeshop',
    name: 'Coffee Shop',
    description: 'Gentle cafe chatter, porcelain clinks, and espresso hum.',
    defaultVolume: 0.5,
  },
  {
    id: 'birds',
    name: 'Forest Birds',
    description: 'Peaceful morning birdsong in a lush, sunlit canopy.',
    defaultVolume: 0.55,
  },
  {
    id: 'waves',
    name: 'Ocean Waves',
    description: 'Rhythmic, calming ocean surf washing gently onto sand.',
    defaultVolume: 0.6,
  },
  {
    id: 'wind',
    name: 'Gentle Wind',
    description: 'Soft whispering breeze drifting through tree branches.',
    defaultVolume: 0.5,
  },
  {
    id: 'whitenoise',
    name: 'White Noise',
    description: 'Smooth, warm ambient hum to mask distracting sounds.',
    defaultVolume: 0.65,
  },
  {
    id: 'keyboard',
    name: 'Keyboard Typing',
    description: 'Rhythmic, tactile mechanical keystrokes in a study nook.',
    defaultVolume: 0.45,
  },
]

type ActiveSoundHandle = {
  gainNode: GainNode
  stop: () => void
}

class FocusAudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private activeSounds = new Map<SoundId, ActiveSoundHandle>()
  private masterVolume = 0.8
  private isMuted = false

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime)
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  // Helper to create looped noise buffers
  private createNoiseBuffer(ctx: AudioContext, seconds: number, type: 'white' | 'pink' | 'brown' = 'white'): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      let lastOut = 0

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1

        if (type === 'white') {
          data[i] = white * 0.25
        } else if (type === 'pink') {
          b0 = 0.99886 * b0 + white * 0.0555179
          b1 = 0.99332 * b1 + white * 0.0750759
          b2 = 0.96900 * b2 + white * 0.1538520
          b3 = 0.86650 * b3 + white * 0.3104856
          b4 = 0.55000 * b4 + white * 0.5329522
          b5 = -0.7616 * b5 - white * 0.0168980
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06
          b6 = white * 0.115926
        } else if (type === 'brown') {
          data[i] = (lastOut + (0.02 * white)) / 1.02
          lastOut = data[i]
          data[i] *= 1.4
        }
      }
    }
    return buffer
  }

  // 1. Rain Synthesizer
  private startRain(ctx: AudioContext, dest: GainNode): () => void {
    const noise = ctx.createBufferSource()
    noise.buffer = this.createNoiseBuffer(ctx, 4, 'pink')
    noise.loop = true

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.setValueAtTime(320, ctx.currentTime)

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(1200, ctx.currentTime)
    bp.Q.setValueAtTime(0.7, ctx.currentTime)

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(4500, ctx.currentTime)

    // Subtle LFO modulation to simulate rainfall swells
    const lfo = ctx.createOscillator()
    lfo.frequency.setValueAtTime(0.18, ctx.currentTime)
    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(150, ctx.currentTime)
    lfo.connect(lfoGain)
    lfoGain.connect(bp.frequency)
    lfo.start()

    noise.connect(hp)
    hp.connect(bp)
    bp.connect(lp)
    lp.connect(dest)
    noise.start()

    return () => {
      try {
        noise.stop()
        lfo.stop()
        noise.disconnect()
        lfo.disconnect()
      } catch {}
    }
  }

  // 2. Thunderstorm Synthesizer (Rain bed + scheduled rolling thunder)
  private startThunder(ctx: AudioContext, dest: GainNode): () => void {
    const stopRain = this.startRain(ctx, dest)
    let isRunning = true
    let thunderTimer: NodeJS.Timeout | null = null

    const triggerRumble = () => {
      if (!isRunning) return

      try {
        const rumbleSource = ctx.createBufferSource()
        rumbleSource.buffer = this.createNoiseBuffer(ctx, 5, 'brown')

        const rumbleFilter = ctx.createBiquadFilter()
        rumbleFilter.type = 'lowpass'
        rumbleFilter.frequency.setValueAtTime(90, ctx.currentTime)
        rumbleFilter.Q.setValueAtTime(3.2, ctx.currentTime)

        const rumbleGain = ctx.createGain()
        const now = ctx.currentTime
        rumbleGain.gain.setValueAtTime(0.001, now)
        // Attack
        rumbleGain.gain.exponentialRampToValueAtTime(1.8, now + 0.25)
        // Secondary rolling peaks
        rumbleGain.gain.exponentialRampToValueAtTime(0.9, now + 1.2)
        rumbleGain.gain.exponentialRampToValueAtTime(1.2, now + 2.0)
        // Long decay
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5)

        rumbleSource.connect(rumbleFilter)
        rumbleFilter.connect(rumbleGain)
        rumbleGain.connect(dest)

        rumbleSource.start(now)
        rumbleSource.stop(now + 4.8)
      } catch {}

      if (isRunning) {
        const delay = 12000 + Math.random() * 14000
        thunderTimer = setTimeout(triggerRumble, delay)
      }
    }

    // Initial thunder after a gentle pause
    thunderTimer = setTimeout(triggerRumble, 2500)

    return () => {
      isRunning = false
      if (thunderTimer) clearTimeout(thunderTimer)
      stopRain()
    }
  }

  // 3. Fireplace (Hearth roar + wood snaps and popping crackles)
  private startFireplace(ctx: AudioContext, dest: GainNode): () => void {
    // 1. Low warm hearth rumble
    const roar = ctx.createBufferSource()
    roar.buffer = this.createNoiseBuffer(ctx, 4, 'brown')
    roar.loop = true

    const roarLp = ctx.createBiquadFilter()
    roarLp.type = 'lowpass'
    roarLp.frequency.setValueAtTime(220, ctx.currentTime)

    const roarGain = ctx.createGain()
    roarGain.gain.setValueAtTime(0.35, ctx.currentTime)

    roar.connect(roarLp)
    roarLp.connect(roarGain)
    roarGain.connect(dest)
    roar.start()

    // 2. Synthesized crackle & pop bursts
    const sampleRate = ctx.sampleRate
    const crackleLength = sampleRate * 5
    const crackleBuffer = ctx.createBuffer(1, crackleLength, sampleRate)
    const crackleData = crackleBuffer.getChannelData(0)

    // Fill with natural Poisson-like wooden clicks
    for (let i = 0; i < crackleLength; i++) {
      if (Math.random() < 0.0018) {
        const clickLen = Math.floor(sampleRate * (0.005 + Math.random() * 0.025))
        const amp = 0.25 + Math.random() * 0.75
        for (let j = 0; j < clickLen && i + j < crackleLength; j++) {
          const decay = Math.exp(-j / (clickLen * 0.2))
          crackleData[i + j] += (Math.random() * 2 - 1) * amp * decay
        }
      }
    }

    const crackleSource = ctx.createBufferSource()
    crackleSource.buffer = crackleBuffer
    crackleSource.loop = true

    const crackleHp = ctx.createBiquadFilter()
    crackleHp.type = 'highpass'
    crackleHp.frequency.setValueAtTime(900, ctx.currentTime)

    crackleSource.connect(crackleHp)
    crackleHp.connect(dest)
    crackleSource.start()

    return () => {
      try {
        roar.stop()
        crackleSource.stop()
        roar.disconnect()
        crackleSource.disconnect()
      } catch {}
    }
  }

  // 4. Coffee Shop (Cafe murmur + ceramic cup clinks + espresso steam)
  private startCoffeeShop(ctx: AudioContext, dest: GainNode): () => void {
    // Murmur body: filtered noise through vocal-like formant bands
    const noise = ctx.createBufferSource()
    noise.buffer = this.createNoiseBuffer(ctx, 6, 'pink')
    noise.loop = true

    const bp1 = ctx.createBiquadFilter()
    bp1.type = 'bandpass'
    bp1.frequency.setValueAtTime(550, ctx.currentTime)
    bp1.Q.setValueAtTime(1.8, ctx.currentTime)

    const bp2 = ctx.createBiquadFilter()
    bp2.type = 'bandpass'
    bp2.frequency.setValueAtTime(1450, ctx.currentTime)
    bp2.Q.setValueAtTime(2.2, ctx.currentTime)

    const murmurMix = ctx.createGain()
    murmurMix.gain.setValueAtTime(0.4, ctx.currentTime)

    noise.connect(bp1)
    noise.connect(bp2)
    bp1.connect(murmurMix)
    bp2.connect(murmurMix)
    murmurMix.connect(dest)
    noise.start()

    let isRunning = true
    let clinkTimer: NodeJS.Timeout | null = null

    // Cup clink generator: high-pitched resonant chime
    const triggerClink = () => {
      if (!isRunning) return

      try {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const now = ctx.currentTime
        const freq = 2200 + Math.random() * 1200
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)

        gain.gain.setValueAtTime(0.001, now)
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)

        osc.connect(gain)
        gain.connect(dest)
        osc.start(now)
        osc.stop(now + 0.18)
      } catch {}

      if (isRunning) {
        clinkTimer = setTimeout(triggerClink, 3500 + Math.random() * 6000)
      }
    }

    clinkTimer = setTimeout(triggerClink, 2000)

    return () => {
      isRunning = false
      if (clinkTimer) clearTimeout(clinkTimer)
      try {
        noise.stop()
        noise.disconnect()
      } catch {}
    }
  }

  // 5. Forest Birds (Sweet morning songbird chirps)
  private startBirds(ctx: AudioContext, dest: GainNode): () => void {
    // Soft high ambient leaf air
    const air = ctx.createBufferSource()
    air.buffer = this.createNoiseBuffer(ctx, 4, 'pink')
    air.loop = true
    const airHp = ctx.createBiquadFilter()
    airHp.type = 'highpass'
    airHp.frequency.setValueAtTime(1400, ctx.currentTime)
    const airGain = ctx.createGain()
    airGain.gain.setValueAtTime(0.08, ctx.currentTime)
    air.connect(airHp)
    airHp.connect(airGain)
    airGain.connect(dest)
    air.start()

    let isRunning = true
    let birdTimer: NodeJS.Timeout | null = null

    // Chirp phrase generator: 3 to 5 rapid frequency modulated sweeps
    const triggerChirpPhrase = () => {
      if (!isRunning) return

      try {
        const phraseLength = 3 + Math.floor(Math.random() * 3)
        let t = ctx.currentTime + 0.05
        const baseFreq = 2600 + Math.random() * 800

        for (let i = 0; i < phraseLength; i++) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'

          const chirpDur = 0.06 + Math.random() * 0.04
          const fStart = baseFreq + (Math.random() * 600 - 300)
          const fEnd = fStart + (Math.random() > 0.5 ? 900 : -700)

          osc.frequency.setValueAtTime(fStart, t)
          osc.frequency.exponentialRampToValueAtTime(Math.max(1000, fEnd), t + chirpDur)

          gain.gain.setValueAtTime(0.001, t)
          gain.gain.linearRampToValueAtTime(0.25, t + 0.015)
          gain.gain.exponentialRampToValueAtTime(0.001, t + chirpDur)

          osc.connect(gain)
          gain.connect(dest)
          osc.start(t)
          osc.stop(t + chirpDur + 0.02)

          t += chirpDur + 0.04 + Math.random() * 0.06
        }
      } catch {}

      if (isRunning) {
        birdTimer = setTimeout(triggerChirpPhrase, 2200 + Math.random() * 3800)
      }
    }

    birdTimer = setTimeout(triggerChirpPhrase, 1000)

    return () => {
      isRunning = false
      if (birdTimer) clearTimeout(birdTimer)
      try {
        air.stop()
        air.disconnect()
      } catch {}
    }
  }

  // 6. Ocean Waves (Rhythmic swell, crest, and foamy wash)
  private startWaves(ctx: AudioContext, dest: GainNode): () => void {
    const noise = ctx.createBufferSource()
    noise.buffer = this.createNoiseBuffer(ctx, 8, 'brown')
    noise.loop = true

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.setValueAtTime(2.2, ctx.currentTime)

    // LFO to sweep cutoff & swell volume every 8-9 seconds
    const waveGain = ctx.createGain()
    const lfo = ctx.createOscillator()
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime) // ~8.3 sec cycle

    const lfoFilterGain = ctx.createGain()
    lfoFilterGain.gain.setValueAtTime(320, ctx.currentTime)
    lp.frequency.setValueAtTime(380, ctx.currentTime)

    lfo.connect(lfoFilterGain)
    lfoFilterGain.connect(lp.frequency)

    const lfoVol = ctx.createGain()
    lfoVol.gain.setValueAtTime(0.35, ctx.currentTime)
    lfo.connect(lfoVol)
    waveGain.gain.setValueAtTime(0.5, ctx.currentTime)
    lfoVol.connect(waveGain.gain)

    noise.connect(lp)
    lp.connect(waveGain)
    waveGain.connect(dest)

    noise.start()
    lfo.start()

    return () => {
      try {
        noise.stop()
        lfo.stop()
        noise.disconnect()
        lfo.disconnect()
      } catch {}
    }
  }

  // 7. Wind (Whistling breeze rustling through trees)
  private startWind(ctx: AudioContext, dest: GainNode): () => void {
    const noise = ctx.createBufferSource()
    noise.buffer = this.createNoiseBuffer(ctx, 6, 'pink')
    noise.loop = true

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.setValueAtTime(3.8, ctx.currentTime)
    bp.frequency.setValueAtTime(420, ctx.currentTime)

    // Interacting LFOs for organic wind gusts
    const lfo1 = ctx.createOscillator()
    lfo1.frequency.setValueAtTime(0.15, ctx.currentTime)
    const lfo1Gain = ctx.createGain()
    lfo1Gain.gain.setValueAtTime(240, ctx.currentTime)

    const lfo2 = ctx.createOscillator()
    lfo2.frequency.setValueAtTime(0.08, ctx.currentTime)
    const lfo2Gain = ctx.createGain()
    lfo2Gain.gain.setValueAtTime(140, ctx.currentTime)

    lfo1.connect(lfo1Gain)
    lfo2.connect(lfo2Gain)
    lfo1Gain.connect(bp.frequency)
    lfo2Gain.connect(bp.frequency)

    noise.connect(bp)
    bp.connect(dest)

    noise.start()
    lfo1.start()
    lfo2.start()

    return () => {
      try {
        noise.stop()
        lfo1.stop()
        lfo2.stop()
        noise.disconnect()
      } catch {}
    }
  }

  // 8. White Noise (Smooth warm masking spectrum)
  private startWhiteNoise(ctx: AudioContext, dest: GainNode): () => void {
    const noise = ctx.createBufferSource()
    noise.buffer = this.createNoiseBuffer(ctx, 4, 'pink')
    noise.loop = true

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(4800, ctx.currentTime)

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.setValueAtTime(120, ctx.currentTime)

    noise.connect(hp)
    hp.connect(lp)
    lp.connect(dest)
    noise.start()

    return () => {
      try {
        noise.stop()
        noise.disconnect()
      } catch {}
    }
  }

  // 9. Keyboard Typing (Mechanical tactile keystroke cadence)
  private startKeyboard(ctx: AudioContext, dest: GainNode): () => void {
    let isRunning = true
    let typeTimer: NodeJS.Timeout | null = null

    const typeWord = () => {
      if (!isRunning) return

      try {
        const lettersInWord = 3 + Math.floor(Math.random() * 6)
        let t = ctx.currentTime + 0.05

        for (let i = 0; i < lettersInWord; i++) {
          const isSpace = i === lettersInWord - 1 && Math.random() > 0.4
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'

          const f = isSpace ? 180 + Math.random() * 40 : 340 + Math.random() * 120
          osc.frequency.setValueAtTime(f, t)

          gain.gain.setValueAtTime(0.001, t)
          gain.gain.exponentialRampToValueAtTime(isSpace ? 0.35 : 0.22, t + 0.008)
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045)

          osc.connect(gain)
          gain.connect(dest)
          osc.start(t)
          osc.stop(t + 0.05)

          t += 0.11 + Math.random() * 0.09
        }
      } catch {}

      if (isRunning) {
        // Pause between words
        typeTimer = setTimeout(typeWord, 500 + Math.random() * 900)
      }
    }

    typeTimer = setTimeout(typeWord, 300)

    return () => {
      isRunning = false
      if (typeTimer) clearTimeout(typeTimer)
    }
  }

  // --- Public API ---

  public setSound(id: SoundId, active: boolean, volume: number): void {
    const existing = this.activeSounds.get(id)

    if (!active) {
      if (existing) {
        try {
          const now = this.ctx?.currentTime ?? 0
          existing.gainNode.gain.setValueAtTime(existing.gainNode.gain.value, now)
          existing.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15)
          setTimeout(() => {
            existing.stop()
            this.activeSounds.delete(id)
          }, 180)
        } catch {
          existing.stop()
          this.activeSounds.delete(id)
        }
      }
      return
    }

    const ctx = this.getAudioContext()
    const targetVol = Math.max(0.001, Math.min(1, volume))

    if (existing) {
      // Smoothly update volume
      existing.gainNode.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.05)
      return
    }

    // Start new sound
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime)
    gainNode.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.1)

    if (this.masterGain) {
      gainNode.connect(this.masterGain)
    }

    let stopFn: () => void = () => {}

    switch (id) {
      case 'rain':
        stopFn = this.startRain(ctx, gainNode)
        break
      case 'thunder':
        stopFn = this.startThunder(ctx, gainNode)
        break
      case 'fireplace':
        stopFn = this.startFireplace(ctx, gainNode)
        break
      case 'coffeeshop':
        stopFn = this.startCoffeeShop(ctx, gainNode)
        break
      case 'birds':
        stopFn = this.startBirds(ctx, gainNode)
        break
      case 'waves':
        stopFn = this.startWaves(ctx, gainNode)
        break
      case 'wind':
        stopFn = this.startWind(ctx, gainNode)
        break
      case 'whitenoise':
        stopFn = this.startWhiteNoise(ctx, gainNode)
        break
      case 'keyboard':
        stopFn = this.startKeyboard(ctx, gainNode)
        break
    }

    this.activeSounds.set(id, { gainNode, stop: stopFn })
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05)
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted
    if (this.ctx && this.masterGain) {
      const target = muted ? 0 : this.masterVolume
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05)
    }
  }

  public stopAll(): void {
    for (const [id, handle] of this.activeSounds.entries()) {
      try {
        handle.stop()
      } catch {}
    }
    this.activeSounds.clear()
  }

  public pause(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {})
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  public isContextRunning(): boolean {
    return this.ctx?.state === 'running'
  }
}

export const focusAudioEngine = new FocusAudioEngine()
