import type { SoundEvent } from "./games";
/** Short procedural effects only. No samples or microphone data leave this page. */
export class ConsoleAudio {
  private context?: AudioContext;
  private output?: GainNode;
  private soundEnabled = true;
  get enabled() {
    return this.soundEnabled;
  }
  set enabled(value: boolean) {
    this.soundEnabled = value;
    if (this.context && this.output)
      this.output.gain.setTargetAtTime(
        value ? 1 : 0,
        this.context.currentTime,
        0.008,
      );
  }
  async wake() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (!this.output) {
        this.output = this.context.createGain();
        this.output.gain.value = this.enabled ? 1 : 0;
        this.output.connect(this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      /* Audio is an enhancement; gameplay stays available. */
    }
  }
  /** Plastic clack + low thump, or a longer noise burst and falling bass. */
  foley(event: "drop" | "explode", strength = 1) {
    const c = this.context;
    if (!this.enabled || !c || c.state !== "running") return;
    const boom = event === "explode";
    const level = Math.max(0.25, Math.min(1, strength));
    const start = c.currentTime,
      duration = boom ? 0.95 : 0.18;
    const source = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      noiseGain = c.createGain();
    const buffer = c.createBuffer(
      1,
      Math.ceil(c.sampleRate * duration),
      c.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    source.buffer = buffer;
    filter.type = boom ? "lowpass" : "bandpass";
    filter.frequency.setValueAtTime(boom ? 2400 : 1700, start);
    filter.frequency.exponentialRampToValueAtTime(
      boom ? 100 : 650,
      start + duration,
    );
    filter.Q.value = boom ? 0.7 : 1.6;
    noiseGain.gain.setValueAtTime(0, start);
    noiseGain.gain.linearRampToValueAtTime(
      (boom ? 0.24 : 0.09) * level,
      start + 0.003,
    );
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(noiseGain).connect(this.output!);
    source.start(start);
    source.stop(start + duration);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      noiseGain.disconnect();
    };
    const thump = c.createOscillator(),
      thumpGain = c.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(
      boom ? 110 : 190 + Math.random() * 25,
      start,
    );
    thump.frequency.exponentialRampToValueAtTime(
      boom ? 28 : 65,
      start + duration * 0.8,
    );
    thumpGain.gain.setValueAtTime(0, start);
    thumpGain.gain.linearRampToValueAtTime(
      (boom ? 0.16 : 0.055) * level,
      start + 0.004,
    );
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    thump.connect(thumpGain).connect(this.output!);
    thump.start(start);
    thump.stop(start + duration);
    thump.onended = () => {
      thump.disconnect();
      thumpGain.disconnect();
    };
  }
  play(event: SoundEvent | "insert" | "eject" | "switch") {
    const c = this.context;
    if (!this.enabled || !c || c.state !== "running") return;
    const oscillator = c.createOscillator(),
      gain = c.createGain();
    const f = {
      bat: 1000,
      wall: 500,
      score: 2000,
      fire: 350,
      hit: 90,
      insert: 120,
      eject: 160,
      switch: 70,
    }[event];
    oscillator.type = event === "hit" ? "sawtooth" : "square";
    oscillator.frequency.setValueAtTime(f, c.currentTime);
    if (event === "fire" || event === "hit")
      oscillator.frequency.exponentialRampToValueAtTime(
        f / 3,
        c.currentTime + 0.09,
      );
    const length = ["insert", "eject", "switch"].includes(event)
      ? 0.035
      : event === "hit"
        ? 0.12
        : 0.024;
    gain.gain.setValueAtTime(0.025, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + length);
    oscillator.connect(gain);
    gain.connect(this.output!);
    oscillator.start();
    oscillator.stop(c.currentTime + length);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}
