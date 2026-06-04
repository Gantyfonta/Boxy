// Retro Sound Effects Generator using Web Audio API

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  public enabled: boolean = true;

  private init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.15, this.ctx.currentTime); // keep it comfortable
      this.masterVolume.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio not supported or blocked", e);
    }
  }

  public playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 1.0,
    noise: boolean = false
  ) {
    this.init();
    if (!this.ctx || !this.enabled) return;

    // Resume context if suspended
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    gain.connect(this.masterVolume!);

    if (noise) {
      // Noise buffer generator (white/pinkish noise)
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Filter for explosion/rumbles
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(freqStart, now);
      filter.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);

      noiseSource.connect(filter);
      filter.connect(gain);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } else {
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
      }

      osc.connect(gain);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      osc.start(now);
      osc.stop(now + duration);
    }
  }

  public playJump() {
    this.playTone(150, 400, 0.15, "triangle", 0.6);
  }

  public playLand() {
    this.playTone(100, 40, 0.1, "sine", 0.5, true);
  }

  public playLift() {
    this.playTone(200, 350, 0.12, "sine", 0.82);
  }

  public playThrow() {
    this.playTone(300, 150, 0.15, "triangle", 0.7);
  }

  public playSplat() {
    this.playTone(120, 60, 0.08, "triangle", 0.7);
  }

  public playShatter() {
    this.playTone(600, 80, 0.25, "sine", 0.8, true);
    // Also add a little wood snap
    setTimeout(() => {
      this.playTone(120, 50, 0.12, "triangle", 0.4);
    }, 30);
  }

  public playExplosion() {
    // Huge explosion sound
    this.playTone(180, 10, 1.2, "sine", 1.8, true); // rumble
    this.playTone(400, 20, 0.4, "triangle", 1.2); // blast sweep
  }

  public playTick() {
    this.playTone(900, 1200, 0.03, "square", 0.4);
  }

  public playBubble() {
    // Sweet bouncy bubble sound
    this.playTone(220, 440, 0.14, "sine", 0.9);
  }

  public playChime() {
    // Two fast bell notes
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.playTone(523.25, 523.25, 0.15, "sine", 0.6); // C5
    setTimeout(() => {
      this.playTone(659.25, 659.25, 0.25, "sine", 0.6); // E5
    }, 80);
  }

  public playKeyCollect() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.playTone(587.33, 880.00, 0.18, "sine", 0.7); // D5 -> A5
    setTimeout(() => {
      this.playTone(1174.66, 1174.66, 0.3, "sine", 0.5); // D6
    }, 90);
  }

  public playUnlock() {
    this.playTone(400, 800, 0.1, "triangle", 0.6);
    setTimeout(() => {
      this.playChime();
    }, 120);
  }
}

export const sound = new SoundManager();
