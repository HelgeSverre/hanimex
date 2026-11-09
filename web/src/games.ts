import { ClippyDemo } from "./clippy";
import type { CartridgeId } from "./catalog";
export const W = 640,
  H = 480;
export interface PlayerInput {
  x: number;
  y: number;
  fire: boolean;
}
export interface Controls {
  left: PlayerInput;
  right: PlayerInput;
  aim?: { x: number; y: number; fire: boolean };
  autoServe: boolean;
  fast: boolean;
  smallLeft: boolean;
  smallRight: boolean;
}
export const emptyControls = (): Controls => ({
  left: { x: 0, y: 0, fire: false },
  right: { x: 0, y: 0, fire: false },
  autoServe: true,
  fast: false,
  smallLeft: false,
  smallRight: false,
});
export type SoundEvent = "bat" | "wall" | "score" | "fire" | "hit";
export interface Game {
  dispose?(): void;
  setRunning?(running: boolean): void;
  update(dt: number, input: Controls): void;
  draw(ctx: CanvasRenderingContext2D): void;
  scores: number[];
  ended: boolean;
  drainSounds(): SoundEvent[];
}
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const near = (a: number, b: number, r: number) => Math.abs(a - b) < r;
const INK = "#e5e7d3",
  DIM = "#697565",
  DARK = "#101610";
function box(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color = INK,
) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}
const digits = [
  [7, 5, 5, 5, 7],
  [2, 6, 2, 2, 7],
  [7, 1, 7, 4, 7],
  [7, 1, 7, 1, 7],
  [5, 5, 7, 1, 1],
  [7, 4, 7, 1, 7],
  [7, 4, 7, 5, 7],
  [7, 1, 1, 1, 1],
  [7, 5, 7, 5, 7],
  [7, 5, 7, 1, 7],
];
function num(c: CanvasRenderingContext2D, n: number, x: number, y = 24) {
  const s = String(Math.max(0, Math.floor(n))).padStart(2, "0");
  for (let d = 0; d < s.length; d++) {
    digits[+s[d]].forEach((bits, row) => {
      for (let k = 0; k < 3; k++)
        if (bits & (1 << (2 - k)))
          box(c, x + d * 24 + k * 6, y + row * 6, 5, 5);
    });
  }
}
function text(
  c: CanvasRenderingContext2D,
  s: string,
  x = W / 2,
  y = H / 2,
  size = 18,
) {
  c.fillStyle = INK;
  c.font = `${size}px monospace`;
  c.textAlign = "center";
  c.fillText(s, x, y);
}
abstract class Base implements Game {
  scores = [0, 0];
  ended = false;
  time = 0;
  protected sounds: SoundEvent[] = [];
  protected seed = 127;
  protected random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  protected score(player: number, amount = 1, limit = 15) {
    this.scores[player] = Math.min(limit, this.scores[player] + amount);
    this.sounds.push("score");
    this.ended = this.scores[player] >= limit;
  }
  drainSounds() {
    return this.sounds.splice(0);
  }
  abstract update(dt: number, input: Controls): void;
  abstract scene(c: CanvasRenderingContext2D): void;
  draw(c: CanvasRenderingContext2D) {
    c.fillStyle = DARK;
    c.fillRect(0, 0, W, H);
    this.scene(c);
    num(c, this.scores[0], 244);
    num(c, this.scores[1], 352);
    if (this.ended) {
      box(c, 156, 205, 328, 76, DARK);
      text(c, "GAME OVER", 320, 237, 24);
      text(c, "PRESS GAME RESET", 320, 262, 14);
    }
  }
}
interface Paddle {
  x: number;
  y: number;
}
export class Sports extends Base {
  private p: Paddle[] = [
    { x: 80, y: 255 },
    { x: 560, y: 255 },
  ];
  private ball = { x: 320, y: 260, vx: 170, vy: 80 };
  private waiting = true;
  private wait = 0;
  private hits = 0;
  private serve = 0;
  private prevFire = [false, false];
  private target = { x: 100, y: 170, vx: 130 };
  private targetShot = [false, false];
  private sizes = [70, 70];
  constructor(
    public mode: number,
    private basic = false,
  ) {
    super();
  }
  private get kind() {
    if (!this.basic) return this.mode;
    return [2, 1, 0, 9, 4, 3][this.mode] ?? 2;
  }
  private launch() {
    this.waiting = false;
    this.wait = 0;
    this.hits = 0;
    this.ball = {
      x: this.p[this.serve].x + (this.serve === 0 ? 20 : -20),
      y: this.p[this.serve].y,
      vx: this.serve === 0 ? 170 : -170,
      vy: (this.random() - 0.5) * 160,
    };
    this.sounds.push("fire");
  }
  update(dt: number, i: Controls) {
    if (this.ended) return;
    this.time += dt;
    this.wait += dt;
    const k = this.kind;
    this.sizes = [i.smallLeft ? 42 : 70, i.smallRight ? 42 : 70];
    [i.left, i.right].forEach((v, n) => {
      this.p[n].y = clamp(this.p[n].y + v.y * 230 * dt, 105, 425);
      const min = n === 0 ? 32 : 345,
        max = n === 0 ? 295 : 608;
      this.p[n].x = clamp(
        this.p[n].x + v.x * 180 * dt,
        k === 0 || k === 9 ? 40 : min,
        k === 0 || k === 9 ? 600 : max,
      );
      if (this.basic) this.p[n].x = n === 0 ? 60 : 580;
    });
    if (k === 3 || k === 4) {
      this.target.x += this.target.vx * dt;
      if (this.target.x > 610 || this.target.x < 30) {
        this.target.vx *= -1;
        this.target.y = 110 + this.random() * 290;
        this.targetShot = [false, false];
      }
      const inputs = [i.left, i.right];
      for (let n = 0; n < (k === 4 ? 1 : 2); n++) {
        const fire = inputs[n].fire;
        if (fire && !this.prevFire[n] && !this.targetShot[n]) {
          this.targetShot[n] = true;
          this.sounds.push("fire");
          if (
            near(this.p[n].x, this.target.x, 30) &&
            near(this.p[n].y, this.target.y, 30)
          )
            this.score(n);
        }
        this.prevFire[n] = fire;
      }
      return;
    }
    if (this.waiting) {
      this.ball.x = this.p[this.serve].x + (this.serve === 0 ? 20 : -20);
      this.ball.y = this.p[this.serve].y;
      if (
        (this.serve === 0 ? i.left.fire : i.right.fire) ||
        (i.autoServe && this.wait > 0.8)
      )
        this.launch();
      return;
    }
    const b = this.ball;
    const oldX = b.x;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < 85 || b.y > 445) {
      b.y = clamp(b.y, 85, 445);
      b.vy *= -1;
      this.sounds.push("wall");
    }
    if ((k === 0 || k === 9) && b.x < 25) {
      b.x = 25;
      b.vx = Math.abs(b.vx);
      this.sounds.push("wall");
    }
    if (k === 5 || k === 8) {
      if (b.x < 24 || b.x > 616) {
        b.x = clamp(b.x, 24, 616);
        b.vx *= -1;
      }
      for (let n = 0; n < (k === 8 ? 1 : 2); n++) {
        const hx = n === 0 ? 90 : 550;
        if (b.vy > 0 && b.y > 182 && b.y < 194 && near(b.x, hx, 28)) {
          this.score(n);
          this.waiting = true;
          this.wait = 0;
        }
      }
    }
    const paddleHit = (n: number, px: number, py: number) => {
      const crossed =
        b.vx < 0 ? oldX >= px && b.x <= px : oldX <= px && b.x >= px;
      if (crossed && near(b.y, py, this.sizes[n] / 2 + 5)) {
        b.x = px + (b.vx < 0 ? 5 : -5);
        b.vx *= -1;
        const zone = clamp(
          Math.floor((b.y - py + this.sizes[n] / 2) / (this.sizes[n] / 5)),
          0,
          4,
        );
        b.vy = [-150, -75, 0, 75, 150][zone];
        this.hits++;
        if (this.hits === 7 && i.fast) {
          b.vx *= 1.4;
          b.vy *= 1.4;
        }
        this.sounds.push("bat");
        if (k === 9 || k === 8)
          this.scores[1] = Math.min(15, this.scores[1] + 1);
      }
    };
    if (k === 7) {
      for (let n = 0; n < 2; n++)
        for (let j = 0; j < 3; j++) {
          const x = 65 + n * 305 + j * 80;
          const gapY = this.p[n].y;
          if (Math.abs(b.x - x) < 6 && !near(b.y, gapY, 44)) {
            b.vx *= -1;
            b.x += Math.sign(b.vx) * 9;
            this.sounds.push("bat");
          }
        }
    } else {
      for (let n = 0; n < (k === 9 || k === 8 ? 1 : 2); n++) {
        paddleHit(n, this.p[n].x, this.p[n].y);
        if (k === 1 || k === 6) paddleHit(n, n === 0 ? 38 : 602, this.p[n].y);
      }
    }
    if (b.x < -10 || b.x > 650) {
      const winner = b.x < 0 ? 1 : 0;
      if (k === 9) {
        this.scores[0]++;
        this.scores[1] = 0;
      } else if (k !== 5 && k !== 8) this.score(winner);
      this.serve = Math.floor((this.scores[0] + this.scores[1]) / 5) % 2;
      this.waiting = true;
      this.wait = 0;
    }
  }
  scene(c: CanvasRenderingContext2D) {
    const k = this.kind;
    box(c, 22, 79, 596, 3);
    box(c, 22, 448, 596, 3);
    if (k === 3 || k === 4) {
      box(c, this.target.x - 15, this.target.y - 8, 30, 16);
      for (let n = 0; n < (k === 4 ? 1 : 2); n++) {
        const p = this.p[n];
        box(c, p.x - 12, p.y, 24, 2);
        box(c, p.x, p.y - 12, 2, 24);
      }
      return;
    }
    if (k === 2) {
      for (let y = 82; y < 448; y += 16) box(c, 319, y, 2, 8, DIM);
    }
    if (k === 0 || k === 9) box(c, 22, 79, 3, 370);
    if (k === 5 || k === 8) {
      box(c, 22, 79, 3, 370);
      box(c, 616, 79, 3, 370);
      for (let n = 0; n < (k === 8 ? 1 : 2); n++) {
        const x = n === 0 ? 90 : 550;
        box(c, x - 24, 190, 48, 3);
        box(c, x - 24, 190, 3, 22);
        box(c, x + 21, 190, 3, 22);
      }
    }
    if (k === 1 || k === 6) {
      for (let n = 0; n < 2; n++) {
        box(c, n === 0 ? 22 : 616, 79, 3, 100);
        box(c, n === 0 ? 22 : 616, 350, 3, 100);
        box(
          c,
          n === 0 ? 36 : 600,
          this.p[n].y - this.sizes[n] / 2,
          5,
          this.sizes[n],
        );
      }
    }
    for (let n = 0; n < (k === 9 || k === 8 ? 1 : 2); n++) {
      const p = this.p[n];
      if (k === 7) {
        for (let j = 0; j < 3; j++) {
          const x = 65 + n * 305 + j * 80;
          box(c, x, 82, 5, Math.max(0, p.y - 44 - 82));
          box(c, x, p.y + 44, 5, Math.max(0, 448 - p.y - 44));
        }
      } else box(c, p.x - 3, p.y - this.sizes[n] / 2, 6, this.sizes[n]);
    }
    box(c, this.ball.x - 4, this.ball.y - 4, 8, 8);
    if (this.waiting) text(c, "SERVE", 320, 416, 14);
  }
}
interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: number;
}
export class Naval extends Base {
  sub = 320;
  destroyer = 190;
  cargo = 520;
  private shots: Shot[] = [];
  private cooldown = [0, 0];
  private freeze = [0, 0];
  private capital = false;
  private cargoWait = 0;
  private phase = 1;
  private flashing = [0, 0];
  constructor(public mode: number) {
    super();
  }
  update(dt: number, i: Controls) {
    if (this.ended) return;
    this.time += dt;
    for (let n = 0; n < 2; n++) {
      this.cooldown[n] = Math.max(0, this.cooldown[n] - dt);
      this.freeze[n] = Math.max(0, this.freeze[n] - dt);
      this.flashing[n] = Math.max(0, this.flashing[n] - dt);
    }
    let sx = i.left.x,
      dx = i.right.x,
      sf = i.left.fire,
      df = i.right.fire;
    if (this.mode === 1 || this.mode === 4) {
      sx = this.destroyer > this.sub ? 1 : -1;
      sf = true;
    }
    if (this.mode === 3 || this.mode === 5) {
      if (this.destroyer > 594) this.phase = -1;
      if (this.destroyer < 46) this.phase = 1;
      dx = this.phase;
      df = true;
    }
    if (this.freeze[0] === 0)
      this.sub = clamp(this.sub + sx * 72 * dt, 35, 605);
    if (this.freeze[1] === 0)
      this.destroyer = clamp(this.destroyer + dx * 108 * dt, 35, 605);
    if (this.cargoWait > 0) {
      this.cargoWait -= dt;
      if (this.cargoWait <= 0) this.cargo = 620;
    } else {
      this.cargo -= 36 * dt;
      if (this.cargo < -30) {
        this.cargo = 660;
        this.capital = !this.capital;
      }
    }
    [sf, df].forEach((fire, n) => {
      if (
        fire &&
        this.cooldown[n] === 0 &&
        !this.shots.some((s) => s.owner === n)
      ) {
        this.shots.push({
          x: n === 0 ? this.sub : this.destroyer,
          y: n === 0 ? 388 : 158,
          vx: 0,
          vy: n === 0 ? -120 : 60,
          owner: n,
        });
        this.cooldown[n] = 4;
        this.sounds.push("fire");
      }
    });
    this.shots = this.shots.filter((s) => {
      s.y += s.vy * dt;
      if (s.owner === 0) {
        if (near(s.y, 147, 12) && near(s.x, this.destroyer, 25)) {
          this.score(0, 5, 30);
          this.freeze[1] = 2;
          this.flashing[1] = 2;
          this.sounds.push("hit");
          return false;
        }
        if (
          this.cargoWait <= 0 &&
          near(s.y, 112, 12) &&
          near(s.x, this.cargo, 28)
        ) {
          this.score(0, this.capital ? 2 : 1, 30);
          this.cargoWait = 3;
          this.sounds.push("hit");
          return false;
        }
      } else if (near(s.y, 394, 13) && near(s.x, this.sub, 25)) {
        this.score(1, 2, 30);
        this.freeze[0] = 2;
        this.flashing[0] = 2;
        this.sounds.push("hit");
        return false;
      }
      return s.y > 75 && s.y < 440;
    });
  }
  scene(c: CanvasRenderingContext2D) {
    const space = this.mode >= 4;
    if (!space) box(c, 22, 132, 596, 1, DIM);
    else
      for (let n = 0; n < 24; n++)
        box(c, ((n * 157) % 600) + 20, ((n * 79) % 360) + 80, 2, 2, DIM);
    const ship = (x: number, y: number, sub: boolean, flash: number) => {
      if (flash > 0 && Math.floor(this.time * 8) % 2 === 0) return;
      if (space) {
        box(c, x - 24, y, 48, 4);
        box(c, x - 14, y - 8, 28, 8);
        box(c, x - 5, y - 16, 10, 8);
        box(c, x - 30, y + 4, 60, 4);
      } else {
        box(c, x - 25, y, 50, 5);
        box(c, x - 18, y + 5, 36, 5);
        box(c, x - 6, y - 7, 16, 7);
        if (sub) box(c, x + 3, y - 14, 3, 7);
        else {
          box(c, x - 13, y - 4, 7, 4);
          box(c, x + 12, y - 4, 7, 4);
        }
      }
    };
    if (this.cargoWait <= 0 && !space) ship(this.cargo, 110, false, 0);
    ship(this.destroyer, 145, false, this.flashing[1]);
    if (this.mode !== 2 || this.shots.some((s) => s.owner === 0))
      ship(this.sub, 394, true, this.flashing[0]);
    this.shots.forEach((s) => box(c, s.x - 2, s.y, 4, 10));
  }
}
export class RoadRace extends Base {
  private cars = [190, 450];
  private traffic: { x: number; y: number; lane: number }[] = [];
  private spawn = 0;
  private distance = 0;
  private damaged = [0, 0];
  constructor(public mode: number) {
    super();
  }
  update(dt: number, i: Controls) {
    if (this.ended) return;
    this.time += dt;
    this.distance += dt * 160;
    const count = this.mode === 0 ? 1 : 2;
    for (let n = 0; n < count; n++) {
      const input = n === 0 ? i.left : i.right;
      const min = n === 0 ? 78 : 352,
        max = n === 0 ? 286 : 560;
      this.cars[n] = clamp(this.cars[n] + input.x * 220 * dt, min, max);
      this.damaged[n] = Math.max(0, this.damaged[n] - dt);
    }
    this.spawn -= dt;
    if (this.spawn <= 0) {
      const lane = this.mode === 0 ? 0 : this.random() < 0.5 ? 0 : 1;
      this.traffic.push({
        x: (lane === 0 ? 78 : 352) + this.random() * 208,
        y: 60,
        lane,
      });
      this.spawn = 0.5 + this.random() * 0.55;
    }
    this.traffic = this.traffic.filter((car) => {
      car.y += dt * (i.fast ? 240 : 160);
      for (let n = 0; n < count; n++)
        if (
          car.lane === n &&
          near(car.y, 390, 30) &&
          near(car.x, this.cars[n], 24) &&
          this.damaged[n] === 0
        ) {
          this.scores[1]++;
          this.damaged[n] = 1.5;
          this.sounds.push("hit");
        }
      if (car.y > 490) {
        this.scores[0]++;
        return false;
      }
      return true;
    });
    this.ended = this.scores[1] >= 15;
  }
  scene(c: CanvasRenderingContext2D) {
    [60, 310, 330, 580].forEach((x) => box(c, x, 76, 4, 378));
    for (let n = 0; n < 2; n++)
      for (let y = -80; y < 480; y += 80)
        box(c, n === 0 ? 180 : 454, y + (this.distance % 80), 3, 28, DIM);
    const car = (x: number, y: number) => {
      box(c, x - 8, y - 18, 16, 36);
      box(c, x - 15, y - 12, 5, 8);
      box(c, x + 10, y - 12, 5, 8);
      box(c, x - 15, y + 8, 5, 8);
      box(c, x + 10, y + 8, 5, 8);
    };
    this.traffic.forEach((v) => car(v.x, v.y));
    for (let n = 0; n < (this.mode === 0 ? 1 : 2); n++)
      if (this.damaged[n] === 0 || Math.floor(this.time * 10) % 2)
        car(this.cars[n], 390);
  }
}
export class Motorcycle extends Base {
  private x = 70;
  private y = 385;
  private vy = 0;
  private speed = 135;
  private onGround = true;
  private cooldown = 0;
  private jumpHeld = false;
  constructor(public mode: number) {
    super();
  }
  update(dt: number, i: Controls) {
    if (this.ended) return;
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.speed = clamp(this.speed + (i.left.x || i.right.x) * dt * 90, 65, 240);
    if (
      (i.left.fire || i.right.fire) &&
      !this.jumpHeld &&
      this.onGround &&
      this.cooldown === 0
    ) {
      this.vy = -250 - (this.speed - 65) * 0.6;
      this.onGround = false;
      this.sounds.push("fire");
    }
    this.jumpHeld = i.left.fire || i.right.fire;
    this.x += this.speed * dt;
    if (!this.onGround) {
      this.vy += 420 * dt;
      this.y += this.vy * dt;
      if (this.y >= 385) {
        this.y = 385;
        this.vy = 0;
        this.onGround = true;
        this.cooldown = 0.3;
      }
    }
    const width = 50 + this.mode * 24;
    if (this.x > 285 && this.x < 285 + width && this.y > 350) {
      this.score(1);
      this.x = 65;
      this.y = 385;
      this.onGround = true;
      this.vy = 0;
      this.cooldown = 0.7;
      this.sounds.push("hit");
    }
    if (this.x > 610) {
      this.score(0);
      this.x = 65;
    }
  }
  scene(c: CanvasRenderingContext2D) {
    box(c, 25, 401, 590, 3);
    const width = 50 + this.mode * 24;
    box(c, 285, 360, width, 40, DIM);
    for (let x = 290; x < 285 + width; x += 18) box(c, x, 369, 10, 9, DARK);
    box(c, this.x - 16, this.y - 8, 32, 4);
    box(c, this.x - 13, this.y, 8, 8);
    box(c, this.x + 9, this.y, 8, 8);
    box(c, this.x - 2, this.y - 22, 5, 14);
    box(c, this.x - 3, this.y - 28, 9, 6);
    box(c, 200, 388, 36, 4);
    text(c, "BUILD SPEED / TIME THE JUMP", 320, 100, 12);
  }
}
export class Tanks extends Base {
  private tanks = [
    { x: 85, y: 260, dx: 1, dy: 0 },
    { x: 555, y: 260, dx: -1, dy: 0 },
  ];
  private shots: Shot[] = [];
  private cooldown = [0, 0];
  private walls: { x: number; y: number; w: number; h: number }[];
  constructor(public mode: number) {
    super();
    this.walls =
      mode === 1
        ? [
            { x: 230, y: 140, w: 14, h: 130 },
            { x: 396, y: 260, w: 14, h: 130 },
            { x: 290, y: 310, w: 80, h: 14 },
          ]
        : [{ x: 305, y: 200, w: 30, h: 100 }];
  }
  private blocked(x: number, y: number) {
    return this.walls.some(
      (w) =>
        x > w.x - 15 &&
        x < w.x + w.w + 15 &&
        y > w.y - 15 &&
        y < w.y + w.h + 15,
    );
  }
  update(dt: number, i: Controls) {
    if (this.ended) return;
    this.time += dt;
    [i.left, i.right].forEach((input, n) => {
      const t = this.tanks[n];
      this.cooldown[n] = Math.max(0, this.cooldown[n] - dt);
      if (input.x || input.y) {
        if (input.x) {
          t.dx = input.x;
          t.dy = 0;
        } else {
          t.dy = input.y;
          t.dx = 0;
        }
        const x = clamp(t.x + input.x * 100 * dt, 35, 605),
          y = clamp(t.y + input.y * 100 * dt, 100, 425);
        if (!this.blocked(x, y)) {
          t.x = x;
          t.y = y;
        }
      }
      if (input.fire && this.cooldown[n] === 0) {
        this.shots.push({
          x: t.x + t.dx * 20,
          y: t.y + t.dy * 20,
          vx: t.dx * 260,
          vy: t.dy * 260,
          owner: n,
        });
        this.cooldown[n] = 0.8;
        this.sounds.push("fire");
      }
    });
    this.shots = this.shots.filter((s) => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const target = this.tanks[1 - s.owner];
      if (near(s.x, target.x, 18) && near(s.y, target.y, 18)) {
        this.score(s.owner);
        target.x = s.owner === 0 ? 555 : 85;
        target.y = 110 + this.random() * 300;
        return false;
      }
      return (
        s.x > 25 &&
        s.x < 615 &&
        s.y > 85 &&
        s.y < 445 &&
        !this.blocked(s.x, s.y)
      );
    });
  }
  scene(c: CanvasRenderingContext2D) {
    box(c, 22, 80, 596, 3);
    box(c, 22, 446, 596, 3);
    this.walls.forEach((w) => box(c, w.x, w.y, w.w, w.h, DIM));
    this.tanks.forEach((t) => {
      box(c, t.x - 12, t.y - 12, 24, 24);
      box(c, t.x - 17, t.y - 15, 5, 30);
      box(c, t.x + 12, t.y - 15, 5, 30);
      box(
        c,
        t.x + t.dx * 14 - 3,
        t.y + t.dy * 14 - 3,
        t.dx ? 18 : 6,
        t.dy ? 18 : 6,
      );
    });
    this.shots.forEach((s) => box(c, s.x - 2, s.y - 2, 5, 5));
  }
}
export class Wipeout extends Base {
  private paddle = 320;
  private ball = { x: 320, y: 390, vx: 150, vy: -170 };
  private waiting = true;
  private bricks: { x: number; y: number; alive: boolean }[];
  private paddleWidth = 95;
  constructor(public mode: number) {
    super();
    this.bricks = Array.from({ length: 60 }, (_, n) => ({
      x: 60 + (n % 12) * 44,
      y: 120 + Math.floor(n / 12) * 20,
      alive: true,
    }));
  }
  update(dt: number, i: Controls) {
    if (this.ended) return;
    this.time += dt;
    this.paddleWidth = i.smallLeft ? 60 : 95;
    this.paddle = clamp(
      this.paddle + (i.left.x || i.right.x) * 300 * dt,
      65,
      575,
    );
    if (this.waiting) {
      this.ball.x = this.paddle;
      this.ball.y = 395;
      if (i.left.fire || i.right.fire || (i.autoServe && this.time > 1))
        this.waiting = false;
      return;
    }
    const b = this.ball;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 27 || b.x > 613) {
      b.x = clamp(b.x, 27, 613);
      b.vx *= -1;
      this.sounds.push("wall");
    }
    if (b.y < 87) {
      b.y = 87;
      b.vy = Math.abs(b.vy);
    }
    if (
      b.vy > 0 &&
      b.y > 397 &&
      b.y < 414 &&
      near(b.x, this.paddle, this.paddleWidth / 2 + 4)
    ) {
      b.vy = -Math.abs(b.vy);
      b.vx = (b.x - this.paddle) * 5;
      this.sounds.push("bat");
    }
    for (const brick of this.bricks)
      if (
        brick.alive &&
        b.x > brick.x - 3 &&
        b.x < brick.x + 41 &&
        b.y > brick.y - 4 &&
        b.y < brick.y + 18
      ) {
        brick.alive = false;
        b.vy *= -1;
        this.scores[0]++;
        this.sounds.push("hit");
        break;
      }
    if (b.y > 465) {
      this.score(1);
      this.waiting = true;
      this.time = 0;
    }
    if (this.bricks.every((v) => !v.alive)) this.ended = true;
  }
  scene(c: CanvasRenderingContext2D) {
    box(c, 22, 80, 596, 3);
    box(c, 22, 80, 3, 370);
    box(c, 615, 80, 3, 370);
    this.bricks.forEach((b) => {
      if (b.alive)
        box(
          c,
          b.x,
          b.y,
          38,
          14,
          this.mode >= 4 && Math.floor(b.y / 20) % 2 === 0 ? DIM : INK,
        );
    });
    box(c, this.paddle - this.paddleWidth / 2, 412, this.paddleWidth, 7);
    box(c, this.ball.x - 4, this.ball.y - 4, 8, 8);
    if (this.waiting) text(c, "SERVE", 320, 370, 14);
  }
}
export class Shooting extends Base {
  private cursor = { x: 320, y: 300 };
  private target = { x: 40, y: 180, vx: 125 };
  private fired = false;
  private flash = 0;
  constructor(public mode: number) {
    super();
  }
  update(dt: number, i: Controls) {
    if (this.ended) return;
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.target.x += this.target.vx * dt;
    if (this.target.x > 610 || this.target.x < 30) {
      this.target.vx *= -1;
      this.target.y = 100 + this.random() * 260;
      this.score(1);
    }
    if (i.aim) {
      this.cursor.x = i.aim.x;
      this.cursor.y = i.aim.y;
    } else {
      this.cursor.x = clamp(this.cursor.x + i.left.x * 240 * dt, 20, 620);
      this.cursor.y = clamp(this.cursor.y + i.left.y * 240 * dt, 80, 445);
    }
    const fire = i.aim?.fire || i.left.fire || i.right.fire;
    if (fire && !this.fired) {
      this.sounds.push("fire");
      this.flash = 0.08;
      if (
        near(this.cursor.x, this.target.x, this.mode === 1 ? 25 : 35) &&
        near(this.cursor.y, this.target.y, this.mode === 1 ? 25 : 35)
      ) {
        this.score(0);
        this.target.y = 110 + this.random() * 260;
        this.target.x = this.target.vx > 0 ? 30 : 610;
      }
    }
    this.fired = fire;
  }
  scene(c: CanvasRenderingContext2D) {
    if (this.flash > 0) {
      box(c, 22, 80, 596, 365, DIM);
    }
    const t = this.target;
    box(c, t.x - 15, t.y - 4, 30, 8);
    if (this.mode === 0) {
      box(c, t.x - 9, t.y - 9, 18, 5);
      box(c, t.x - 5, t.y + 4, 10, 5);
    } else {
      box(c, t.x - 11, t.y - 11, 22, 22);
      box(c, t.x - 6, t.y - 6, 12, 12, DARK);
    }
    box(c, this.cursor.x - 14, this.cursor.y, 28, 2);
    box(c, this.cursor.x, this.cursor.y - 14, 2, 28);
    box(c, 22, 445, 596, 3);
  }
}
export function createGame(id: CartridgeId, mode = 0): Game {
  switch (id) {
    case "clippy":
      return new ClippyDemo(mode);
    case "sports":
      return new Sports(mode);
    case "fundamental":
      return new Sports(mode, true);
    case "submarine":
      return new Naval(mode);
    case "race":
      return new RoadRace(mode);
    case "motorcycle":
      return new Motorcycle(mode);
    case "tank":
      return new Tanks(mode);
    case "wipeout":
      return new Wipeout(mode);
    case "shooting":
      return new Shooting(mode);
  }
}
