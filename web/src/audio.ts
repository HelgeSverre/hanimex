import type { SoundEvent } from "./games";
/** Short procedural effects only. No samples or microphone data leave this page. */
export class ConsoleAudio {
  private context?: AudioContext;
  enabled = true;
  async wake() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      /* Audio is an enhancement; gameplay stays available. */
    }
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
    gain.connect(c.destination);
    oscillator.start();
    oscillator.stop(c.currentTime + length);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}
