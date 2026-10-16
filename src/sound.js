/**
 * Procedural Web Audio API Clockwork Automaton Sound Engine
 * Synthesizes extremely subtle museum automaton sounds:
 * - Faint ceramic/brass escapement ticks
 * - Soft bearing & tension spring resonance
 * - Delicate feather air-whisper during wingbeats
 */
export class ClockworkSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.masterGain = null;
    this.tickAccum = 0;
  }

  toggle() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.14; // Default volume low and museum-quiet
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.enabled = !this.enabled;
    this.masterGain.gain.setTargetAtTime(
      this.enabled ? 0.14 : 0.0,
      this.ctx.currentTime,
      0.08
    );

    if (this.enabled) {
      this.triggerClick(1800, 0.04);
    }
    return this.enabled;
  }

  update(dt, coreRpm = 142) {
    if (!this.enabled || !this.ctx) return;

    // Escapement tick rate proportional to core RPM
    const ticksPerSec = (coreRpm / 60) * 1.5;
    this.tickAccum += dt * ticksPerSec;
    if (this.tickAccum >= 1.0) {
      this.tickAccum %= 1.0;
      this.triggerClick(2400 + Math.random() * 250, 0.022);
    }
  }

  triggerClick(freq = 2200, gainAmt = 0.03) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + 0.018);

    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 6.0;

    gain.gain.setValueAtTime(gainAmt, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.025);
  }

  triggerWingbeat(intensity = 0.6) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Delicate filtered white-noise feather whisper + low spring resonance
    const bufferSize = this.ctx.sampleRate * 0.28;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(280, now + 0.26);
    filter.Q.value = 2.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055 * intensity, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.27);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  triggerChime() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(656, now + 0.65);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.7);
  }
}
