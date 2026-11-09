import * as THREE from "three";

export type RepairPhase =
  "idle" | "waiting" | "arriving" | "working" | "leaving" | "done";
/** Simulation time only: background tabs cannot skip or accumulate repair events. */
export class RepairSequence {
  age = 0;
  phase: RepairPhase = "idle";
  start() {
    this.age = 0;
    this.phase = "waiting";
  }
  stop() {
    this.age = 0;
    this.phase = "idle";
  }
  advance(dt: number) {
    if (this.phase === "idle" || this.phase === "done") return false;
    const before = this.age;
    this.age += Math.max(0, dt);
    this.phase =
      this.age < 2
        ? "waiting"
        : this.age < 5
          ? "arriving"
          : this.age < 11
            ? "working"
            : this.age < 14
              ? "leaving"
              : "done";
    return before < 11 && this.age >= 11;
  }
}

/** Small, deliberately toy-like service technicians, built entirely from geometry. */
export class RepairCrew {
  readonly group = new THREE.Group();
  readonly sequence = new RepairSequence();
  private workers: {
    body: THREE.Group;
    arm: THREE.Group;
    legs: THREE.Mesh[];
  }[] = [];
  private props = new THREE.Group();
  private sign: THREE.Mesh;
  private lastTap = -1;
  constructor() {
    const material = (color: number) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const blue = material(0x296d8e),
      yellow = material(0xf4b92b),
      skin = material(0xd6af83),
      black = material(0x252725),
      metal = material(0xa3a8a0),
      orange = material(0xee7428);
    const box = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      m: THREE.Material,
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    for (let i = 0; i < 3; i++) {
      const body = new THREE.Group();
      this.group.add(body);
      const legs = [
        box(body, 0.13, 0.3, 0.18, -0.12, 0.19, 0, black),
        box(body, 0.13, 0.3, 0.18, 0.12, 0.19, 0, black),
      ];
      box(body, 0.4, 0.38, 0.24, 0, 0.5, 0, blue);
      box(body, 0.42, 0.065, 0.26, 0, 0.52, 0, yellow);
      box(body, 0.28, 0.25, 0.27, 0, 0.82, 0, skin);
      for (const x of [-0.065, 0.065])
        box(body, 0.035, 0.04, 0.02, x, 0.83, 0.144, black);
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        yellow,
      );
      helmet.position.y = 0.95;
      body.add(helmet);
      box(body, 0.51, 0.05, 0.4, 0, 0.95, 0, yellow);
      box(body, 0.065, 0.12, 0.35, 0, 1.06, 0, yellow);
      box(body, 0.1, 0.3, 0.12, -0.28, 0.52, 0, blue);
      const arm = new THREE.Group();
      arm.position.set(0.28, 0.66, 0);
      body.add(arm);
      box(arm, 0.11, 0.3, 0.12, 0, -0.12, 0, blue);
      box(arm, 0.1, 0.1, 0.1, 0, -0.3, 0, skin);
      box(arm, 0.045, 0.35, 0.045, 0, -0.3, 0.13, black);
      box(arm, 0.25, 0.1, 0.1, 0, -0.14, 0.13, metal);
      this.workers.push({ body, arm, legs });
    }
    this.group.add(this.props);
    for (const x of [1.8, 6.2]) {
      box(this.props, 0.35, 0.05, 0.35, x, 0.05, 5.15, black);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.45, 12),
        orange,
      );
      cone.position.set(x, 0.29, 5.15);
      this.props.add(cone);
      box(this.props, 0.18, 0.06, 0.18, x, 0.27, 5.15, yellow);
    }
    box(this.props, 0.55, 0.28, 0.28, 5.8, 0.2, 2.9, blue);
    box(this.props, 0.23, 0.06, 0.1, 5.8, 0.4, 2.9, black);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f2bc35";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#252725";
    ctx.fillRect(12, 12, 488, 232);
    ctx.fillStyle = "#f2bc35";
    ctx.fillRect(20, 20, 472, 216);
    ctx.fillStyle = "#252725";
    ctx.textAlign = "center";
    ctx.font = 'bold 38px "Obel Mono", monospace';
    ctx.fillText("FIELD SERVICE", 256, 90);
    ctx.font = 'bold 44px "Obel Mono", monospace';
    ctx.fillText("NO WARRANTY", 256, 165);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.9),
      new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 1,
      }),
    );
    this.sign.position.set(4, 0.67, 5.2);
    this.sign.rotation.x = -0.18;
    this.props.add(this.sign);
    for (const x of [3.3, 4.7])
      box(this.props, 0.06, 0.55, 0.06, x, 0.28, 5.2, black);
    this.group.visible = false;
  }
  start() {
    this.sequence.start();
    this.lastTap = -1;
    this.group.visible = false;
  }
  stop() {
    this.sequence.stop();
    this.group.visible = false;
  }
  update(dt: number, reduced: boolean, tap: () => void) {
    const completed = this.sequence.advance(dt),
      { phase, age } = this.sequence;
    this.group.visible = phase !== "idle" && phase !== "waiting";
    this.props.visible =
      phase === "working" || phase === "leaving" || phase === "done";
    this.workers.forEach(({ body, arm, legs }, i) => {
      body.visible = phase !== "done";
      const progress =
        phase === "arriving"
          ? Math.min(1, (age - 2) / 3)
          : phase === "leaving"
            ? Math.max(0, 1 - (age - 11) / 3)
            : 1;
      const x = 2.5 + i * 1.5;
      body.position.set(
        reduced ? x : THREE.MathUtils.lerp(-9 - i * 0.7, x, progress),
        0.06,
        2.8 + (i % 2) * 0.25,
      );
      body.rotation.y =
        phase === "working"
          ? Math.PI
          : phase === "leaving"
            ? -Math.PI / 2
            : Math.PI / 2;
      const walk = !reduced && (phase === "arriving" || phase === "leaving");
      legs.forEach(
        (leg, j) =>
          (leg.rotation.x = walk
            ? Math.sin(age * 14 + i + j * Math.PI) * 0.55
            : 0),
      );
      arm.rotation.x =
        phase === "working"
          ? reduced
            ? -0.8
            : -0.8 + Math.sin(age * 12 + i * 2) * 0.7
          : 0;
    });
    if (phase === "working") {
      const beat = Math.floor((age - 5) * 3);
      if (beat !== this.lastTap) {
        this.lastTap = beat;
        tap();
      }
    }
    return completed;
  }
}
