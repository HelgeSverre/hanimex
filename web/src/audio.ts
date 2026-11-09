import type { DemoNote } from "./clippy";
import type { SoundEvent } from "./games";
/** Short procedural effects only. No samples or microphone data leave this page. */
export class ConsoleAudio {
  private context?: AudioContext;
  private output?: GainNode;
  private demoOutput?: GainNode;
  private demoNoise?: AudioBuffer;
  private demoSources = new Set<AudioScheduledSourceNode>();
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
  stopDemo() {
    if (this.demoSources.size === 0) return;
    this.demoSources.forEach((source) => source.stop());
    this.demoSources.clear();
  }
  demoNotes(notes: DemoNote[]) {
    const c = this.context;
    if (!this.enabled || !c || c.state !== "running" || !notes.length) return;
    if (!this.demoOutput) {
      this.demoOutput = c.createGain();
      this.demoOutput.gain.value = 0.7;
      this.demoOutput.connect(this.output!);
    }
    for (const note of notes) {
      const start = c.currentTime;
      const gain = c.createGain(),
        filter = c.createBiquadFilter();
      let source: AudioScheduledSourceNode;
      if (note.voice === "snare" || note.voice === "hat") {
        if (!this.demoNoise) {
          this.demoNoise = c.createBuffer(
            1,
            Math.ceil(c.sampleRate * 0.3),
            c.sampleRate,
          );
          const samples = this.demoNoise.getChannelData(0);
          for (let i = 0; i < samples.length; i++)
            samples[i] = Math.random() * 2 - 1;
        }
        const noise = c.createBufferSource();
        noise.buffer = this.demoNoise;
        source = noise;
        filter.type = note.voice === "hat" ? "highpass" : "bandpass";
        filter.frequency.value = note.voice === "hat" ? 6500 : 1700;
      } else {
        const oscillator = c.createOscillator();
        oscillator.type =
          note.voice === "kick"
            ? "sine"
            : note.voice === "bass"
              ? "sawtooth"
              : "triangle";
        oscillator.frequency.setValueAtTime(
          note.voice === "kick" ? 140 : 440 * 2 ** ((note.midi - 69) / 12),
          start,
        );
        if (note.voice === "kick")
          oscillator.frequency.exponentialRampToValueAtTime(
            42,
            start + note.length,
          );
        source = oscillator;
        filter.type = "lowpass";
        filter.frequency.value = note.voice === "bass" ? 650 : 4000;
      }
      const levels = {
        kick: 0.16,
        snare: 0.12,
        hat: 0.035,
        bass: 0.065,
        lead: 0.06,
      };
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(levels[note.voice], start + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.length);
      source.connect(filter).connect(gain).connect(this.demoOutput);
      this.demoSources.add(source);
      source.onended = () => {
        this.demoSources.delete(source);
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      source.start(start);
      source.stop(start + note.length);
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
