import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { cartridges, type CartridgeId } from "./catalog";

export interface DeskState {
  active?: CartridgeId;
  mode: number;
  modeCount: number;
  fault: boolean;
  powered: boolean;
  fast: boolean;
  autoServe: boolean;
  smallLeft: boolean;
  smallRight: boolean;
  left: { x: number; y: number };
  right: { x: number; y: number };
}
export interface DeskHost {
  state(): DeskState;
  insert(id: CartridgeId): void;
  eject(): void;
  mode(n: number): void;
  toggle(id: string): void;
  fire(n: number, down: boolean): void;
  stick(n: number, x: number, y: number): void;
  aim(value: { x: number; y: number; fire: boolean } | undefined): void;
  gesture(): void;
}
type Hit =
  | { kind: "cart"; id: CartridgeId }
  | { kind: "mode"; index: number }
  | { kind: "switch"; id: string }
  | { kind: "fire"; index: number }
  | { kind: "stick"; index: number }
  | { kind: "screen" };
interface Drag {
  pointer: number;
  hit: Hit;
  startX: number;
  startY: number;
  moved: boolean;
  object?: THREE.Group;
  offset?: THREE.Vector3;
}
const colors = {
  cream: 0xd5ceb6,
  creamLight: 0xe4ddc5,
  charcoal: 0x45433e,
  rubber: 0x20221e,
  well: 0x141612,
  metal: 0x92948d,
  orange: 0xe96925,
  orangeDark: 0x924022,
  red: 0xd34125,
  wood: 0x66503b,
  tableEdge: 0x3b3025,
};
const paper: Record<string, string> = {
  orange: "#d49b5c",
  yellow: "#dac77e",
  red: "#cf9c86",
  blue: "#a7bec6",
  teal: "#a7c6b2",
  purple: "#bfb2c5",
  green: "#b8c397",
  cream: "#d6c9a1",
};
const standard = (color: number, roughness = 0.66, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

/** Real geometry and raycast interactions; games remain the shared 2D behavioral cores. */
export class WebGLDesk {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  readonly orbit: OrbitControls;
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private picks: THREE.Object3D[] = [];
  private cards = new Map<CartridgeId, THREE.Group>();
  private homes = new Map<CartridgeId, THREE.Vector3>();
  private buttons: {
    mesh: THREE.Mesh;
    material: THREE.MeshStandardMaterial;
    index: number;
  }[] = [];
  private levers = new Map<string, THREE.Object3D>();
  private sticks: THREE.Group[] = [];
  private slotMaterial: THREE.MeshStandardMaterial;
  private screenTexture: THREE.CanvasTexture;
  private screen: THREE.Mesh;
  private slotPosition = new THREE.Vector3(4, 0.59, -0.95);
  private drag?: Drag;
  private frameId = 0;
  private previous = 0;
  private textureTime = 0;
  private observer: ResizeObserver;
  private disposed = false;
  private view: "desk" | "tv" = "desk";
  private cameraGoal?: { position: THREE.Vector3; target: THREE.Vector3 };
  private reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private down = (e: PointerEvent) => this.pointerDown(e);
  private move = (e: PointerEvent) => this.pointerMove(e);
  private up = (e: PointerEvent) => this.pointerUp(e);
  private cancel = () => this.cancelDrag();
  private visibility = () => {
    if (document.hidden) this.cancelDrag();
  };
  private contextLost = (e: Event) => {
    e.preventDefault();
    this.cancelDrag();
    this.container.dispatchEvent(
      new CustomEvent("webgl-unavailable", { bubbles: true }),
    );
  };

  constructor(
    private container: HTMLElement,
    gameCanvas: HTMLCanvasElement,
    private host: DeskHost,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.id = "scene-screen";
    this.renderer.domElement.setAttribute(
      "aria-label",
      "3D console desk. Drag empty space to rotate. Scroll to zoom. Use the Cartridges button for a keyboard-accessible cartridge shelf.",
    );
    this.container.prepend(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x29251f);
    this.scene.fog = new THREE.Fog(0x29251f, 35, 70);
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = !this.reduceMotion;
    this.orbit.dampingFactor = 0.09;
    this.orbit.enablePan = false;
    this.orbit.minDistance = 6;
    this.orbit.maxDistance = 72;
    this.orbit.minPolarAngle = 0.28;
    this.orbit.maxPolarAngle = Math.PI * 0.47;
    this.orbit.target.set(0, 1.8, 0.7);
    this.camera.position.set(8, 12, 19);
    this.orbit.addEventListener("start", () => {
      this.cameraGoal = undefined;
    });
    this.addLights();
    this.addDesk();
    this.screenTexture = new THREE.CanvasTexture(gameCanvas);
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;
    this.screenTexture.minFilter = THREE.LinearFilter;
    this.screenTexture.magFilter = THREE.LinearFilter;
    this.screenTexture.generateMipmaps = false;
    this.screen = this.addTelevision();
    const slot = this.addConsole();
    this.slotMaterial = slot.material;
    cartridges.forEach((c, n) => this.addCartridge(c.id, n));
    this.addCable();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    const dom = this.renderer.domElement;
    dom.addEventListener("pointerdown", this.down, true);
    dom.addEventListener("pointermove", this.move, true);
    dom.addEventListener("pointerup", this.up, true);
    dom.addEventListener("pointercancel", this.cancel, true);
    dom.addEventListener("lostpointercapture", this.cancel);
    dom.addEventListener("webglcontextlost", this.contextLost);
    window.addEventListener("blur", this.cancel);
    document.addEventListener("visibilitychange", this.visibility);
    this.frameId = requestAnimationFrame((t) => this.render(t));
  }
  focus() {
    this.renderer.domElement.focus({ preventScroll: true });
  }
  private pickObject<T extends THREE.Object3D>(object: T, hit: Hit): T {
    object.userData.hit = hit;
    this.picks.push(object);
    return object;
  }
  private mesh(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    radius = 0.035,
  ) {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  private cylinder(
    parent: THREE.Object3D,
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 32),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  private textTexture(
    text: string,
    background: string | null,
    ink = "#24251f",
    width = 512,
    height = 128,
    size = 42,
  ) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const x = c.getContext("2d");
    if (!x) throw new Error("Label canvas unavailable");
    if (background) {
      x.fillStyle = background;
      x.fillRect(0, 0, width, height);
    }
    x.fillStyle = ink;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = `500 ${size}px "Obel Mono",monospace`;
    x.fillText(text, width / 2, height / 2, width - 24);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(
      4,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    return texture;
  }
  private label(
    parent: THREE.Object3D,
    text: string,
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    horizontal = true,
    ink = "#d3d2c0",
    background: string | null = null,
    size = 42,
  ) {
    const material = new THREE.MeshBasicMaterial({
      map: this.textTexture(text, background, ink, 512, 128, size),
      transparent: !background,
      side: THREE.DoubleSide,
      toneMapped: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      material,
    );
    mesh.position.set(x, y, z);
    if (horizontal) mesh.rotation.x = -Math.PI / 2;
    parent.add(mesh);
    return mesh;
  }
  /** Batch repeated static ribs and contacts while keeping each cartridge draggable. */
  private batchStatic(group: THREE.Group) {
    const buckets = new Map<string, THREE.Mesh[]>();
    for (const child of group.children) {
      if (!(child instanceof THREE.Mesh) || Array.isArray(child.material))
        continue;
      const m = child.material;
      const key =
        m instanceof THREE.MeshStandardMaterial
          ? [
              m.type,
              m.color.getHex(),
              m.roughness,
              m.metalness,
              m.map?.uuid,
              m.transparent,
              m.side,
              !!child.geometry.index,
            ].join(":")
          : m.uuid;
      const bucket = buckets.get(key) ?? [];
      bucket.push(child);
      buckets.set(key, bucket);
    }
    for (const bucket of buckets.values()) {
      if (bucket.length < 2) continue;
      const parts = bucket.map((mesh) => {
        mesh.updateMatrix();
        return mesh.geometry.clone().applyMatrix4(mesh.matrix);
      });
      const geometry = mergeGeometries(parts);
      parts.forEach((g) => g.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, bucket[0].material);
      mesh.castShadow = bucket.some((m) => m.castShadow);
      mesh.receiveShadow = true;
      bucket.forEach((old) => {
        group.remove(old);
        old.geometry.dispose();
      });
      group.add(mesh);
    }
  }
  private addLights() {
    this.scene.add(new THREE.HemisphereLight(0xf4ecd8, 0x53402d, 2.4));
    const key = new THREE.DirectionalLight(0xffeed4, 3.2);
    key.position.set(-6, 15, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, {
      left: -14,
      right: 14,
      top: 12,
      bottom: -12,
      near: 1,
      far: 40,
    });
    key.shadow.bias = -0.0007;
    key.shadow.normalBias = 0.015;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xc7d0c7, 1.2);
    fill.position.set(10, 6, -4);
    this.scene.add(fill);
  }
  private woodTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("Wood canvas unavailable");
    c.fillStyle = "#65503a";
    c.fillRect(0, 0, 512, 512);
    let seed = 83;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let n = 0; n < 220; n++) {
      const y = random() * 512;
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(
        160,
        y + random() * 12,
        320,
        y - random() * 12,
        512,
        y + random() * 4,
      );
      c.strokeStyle =
        n % 3 === 0 ? "rgba(35,24,15,.12)" : "rgba(173,139,94,.10)";
      c.lineWidth = random() * 1.2 + 0.2;
      c.stroke();
    }
    for (const y of [128, 256, 384]) {
      c.fillStyle = "rgba(24,18,12,.23)";
      c.fillRect(0, y, 512, 1);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1.3);
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  private addDesk() {
    const top = new THREE.MeshStandardMaterial({
      map: this.woodTexture(),
      roughness: 0.8,
    });
    this.mesh(this.scene, 19.5, 0.42, 11.4, 0, -0.23, 0.1, top, 0.12);
    const edge = standard(colors.tableEdge);
    this.mesh(this.scene, 19.3, 0.16, 0.12, 0, -0.48, 5.7, edge);
    const leg = standard(0x282924, 0.4, 0.3);
    for (const x of [-8, 8])
      for (const z of [-4.2, 4.2])
        this.mesh(this.scene, 0.38, 3, 0.38, x, -1.8, z, leg);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      standard(0x24211d, 0.95),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.3;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }
  private addTelevision() {
    const group = new THREE.Group();
    group.position.set(-4, 0, -1.85);
    this.scene.add(group);
    const shell = standard(0x33342e, 0.8);
    const veneer = new THREE.MeshStandardMaterial({
      map: this.woodTexture(),
      color: 0x896447,
      roughness: 0.65,
    });
    // Separate cabinet sleeve and moulded rear cover give the tube its depth.
    this.mesh(group, 9.6, 7, 4.9, 0, 3.7, -1.55, veneer, 0.08);
    const rear = this.mesh(group, 8.95, 6.4, 1.2, 0, 3.7, -4.35, shell, 0.1);
    const rearPositions = rear.geometry.getAttribute("position");
    for (let n = 0; n < rearPositions.count; n++) {
      const taper = 1 - 0.12 * (0.5 - rearPositions.getZ(n) / 1.2);
      rearPositions.setXY(
        n,
        rearPositions.getX(n) * taper,
        rearPositions.getY(n) * taper,
      );
    }
    rear.geometry.computeVertexNormals();
    this.mesh(group, 9.32, 6.72, 0.24, 0, 3.7, 0.94, shell, 0.06);
    const dark = standard(colors.rubber, 0.85);
    // A stepped escutcheon surrounds the rounded glass aperture.
    const roundedContour = (w: number, h: number, r: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2 + r, -h / 2);
      shape.lineTo(w / 2 - r, -h / 2);
      shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      shape.lineTo(w / 2, h / 2 - r);
      shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      shape.lineTo(-w / 2 + r, h / 2);
      shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      shape.lineTo(-w / 2, -h / 2 + r);
      shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      return shape;
    };
    const bezel = (
      w: number,
      h: number,
      iw: number,
      ih: number,
      z: number,
      material: THREE.Material,
    ) => {
      const shape = roundedContour(w, h, 0.48);
      shape.holes.push(
        new THREE.Path(roundedContour(iw, ih, 0.4).getPoints(24).reverse()),
      );
      const frame = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, {
          depth: 0.12,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelSize: 0.035,
          bevelThickness: 0.035,
          curveSegments: 16,
        }),
        material,
      );
      frame.position.set(-0.5, 3.7, z);
      group.add(frame);
    };
    bezel(8.04, 6.22, 7.6, 5.8, 1.08, standard(0x99968a, 0.38, 0.65));
    bezel(7.7, 5.9, 6.99, 5.22, 1.17, dark);
    this.mesh(
      group,
      1.06,
      6.12,
      0.13,
      4.03,
      3.7,
      1.09,
      standard(0x20221f),
      0.04,
    );
    const screenGeometry = new THREE.PlaneGeometry(7.1, 5.325, 60, 40);
    const positions = screenGeometry.getAttribute("position");
    for (let n = 0; n < positions.count; n++) {
      const x = positions.getX(n),
        y = positions.getY(n);
      positions.setZ(n, 0.27 * (1 - (x / 3.55) ** 2) * (1 - (y / 2.6625) ** 2));
    }
    screenGeometry.computeVertexNormals();
    const screen = new THREE.Mesh(
      screenGeometry,
      new THREE.MeshBasicMaterial({
        map: this.screenTexture,
        toneMapped: false,
      }),
    );
    screen.position.set(-0.5, 3.7, 1.13);
    group.add(screen);
    this.pickObject(screen, { kind: "screen" });
    const metal = standard(0x85867a, 0.5, 0.28);
    for (const y of [5.35, 4.15]) {
      const knob = this.cylinder(group, 0.37, 0.28, 4.03, y, 1.3, dark);
      knob.rotation.x = Math.PI / 2;
      const bar = this.mesh(
        group,
        0.11,
        0.45,
        0.08,
        4.03,
        y,
        1.48,
        metal,
        0.02,
      );
      bar.rotation.z = -0.6;
    }
    this.label(group, "VHF", 0.48, 0.17, 4.03, 5.88, 1.19, false);
    this.label(group, "UHF", 0.48, 0.17, 4.03, 4.68, 1.19, false);
    for (let n = 0; n < 23; n++)
      this.mesh(
        group,
        0.79,
        0.035,
        0.025,
        4.03,
        1.15 + n * 0.075,
        1.18,
        dark,
        0.005,
      );
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 8),
      new THREE.MeshBasicMaterial({ color: colors.orange }),
    );
    lamp.position.set(4.03, 0.8, 1.19);
    group.add(lamp);
    for (const x of [-2.5, 2.5])
      this.mesh(group, 1.05, 0.24, 2.3, x, 0.12, -0.4, dark, 0.04);
    this.label(
      group,
      "SOLID STATE",
      1.15,
      0.15,
      -0.4,
      0.45,
      1.08,
      false,
      "#aaaa96",
    );
    for (let n = 0; n < 28; n++) {
      this.mesh(
        group,
        0.06,
        1.15,
        0.02,
        -3.5 + n * 0.26,
        5.3,
        -4.96,
        dark,
        0.005,
      );
    }
    this.batchStatic(group);
    return screen;
  }
  private addConsole() {
    const group = new THREE.Group();
    group.position.set(4, 0.05, 0.6);
    this.scene.add(group);
    const cream = standard(colors.cream, 0.65),
      charcoal = standard(colors.charcoal, 0.65),
      dark = standard(colors.rubber, 0.8),
      metal = standard(colors.metal, 0.4, 0.25);
    this.mesh(group, 6, 0.5, 3.6, 0, 0.28, 0, cream, 0.13);
    this.mesh(group, 3.15, 0.12, 3.56, 0, 0.59, 0, charcoal, 0.04);
    for (const x of [-2.2, 2.2]) {
      for (let n = 0; n < 5; n++)
        this.mesh(
          group,
          1.14,
          0.015,
          0.028,
          x,
          0.54,
          -1.16 + n * 0.105,
          standard(0x99927f),
          0.005,
        );
      this.mesh(group, 1.43, 0.055, 2.05, x, 0.57, 0.63, charcoal, 0.04);
    }
    const slotMaterial = standard(colors.well, 0.78);
    const slot = this.mesh(
      group,
      2.53,
      0.1,
      0.66,
      0,
      0.69,
      -1.25,
      slotMaterial,
      0.06,
    );
    this.mesh(
      group,
      2.14,
      0.014,
      0.31,
      0,
      0.746,
      -1.25,
      standard(0x090c09),
      0.015,
    );
    for (let n = 0; n < 25; n++)
      this.mesh(
        group,
        0.025,
        0.012,
        0.16,
        -0.94 + n * 0.078,
        0.762,
        -1.25,
        metal,
        0.003,
      );
    this.mesh(group, 2.87, 0.025, 1.01, 0, 0.69, -0.16, metal, 0.04);
    for (let n = 0; n < 10; n++) {
      const mat = standard(colors.orange, 0.42);
      const mesh = this.mesh(
        group,
        0.44,
        0.14,
        0.35,
        -1.04 + (n % 5) * 0.52,
        0.79,
        -0.42 + Math.floor(n / 5) * 0.52,
        mat,
        0.04,
      );
      this.pickObject(mesh, { kind: "mode", index: n });
      const label = this.label(
        group,
        String(n + 1),
        0.23,
        0.18,
        mesh.position.x,
        0.865,
        mesh.position.z,
        true,
        "#302719",
        null,
        62,
      );
      this.pickObject(label, { kind: "mode", index: n });
      this.buttons.push({ mesh, material: mat, index: n });
    }
    const switches = [
      ["power", "ON/OFF"],
      ["speed", "SPEED"],
      ["left-size", "L-TEAM"],
      ["right-size", "R-TEAM"],
      ["serve", "AUTO"],
    ];
    switches.forEach(([id, title], n) => {
      const x = -1.23 + n * 0.405;
      this.label(group, title, 0.36, 0.12, x, 0.68, 0.72, true, "#d2d1bd");
      const well = this.mesh(
        group,
        0.28,
        0.04,
        0.55,
        x,
        0.67,
        1.09,
        dark,
        0.025,
      );
      this.pickObject(well, { kind: "switch", id });
      const lever = new THREE.Group();
      lever.position.set(x, 0.71, 1.09);
      group.add(lever);
      this.cylinder(lever, 0.052, 0.15, 0, 0.04, 0, metal);
      this.mesh(lever, 0.075, 0.18, 0.1, 0, 0.17, 0, metal, 0.025);
      this.pickObject(lever, { kind: "switch", id });
      this.levers.set(id, lever);
    });
    const reset = this.mesh(
      group,
      0.78,
      0.13,
      0.55,
      1.02,
      0.75,
      1.09,
      standard(colors.orange, 0.42),
      0.05,
    );
    this.pickObject(reset, { kind: "switch", id: "reset" });
    this.label(group, "RESET", 0.55, 0.15, 1.02, 0.82, 1.09, true, "#35291f");
    this.label(
      group,
      "H A N I M E X",
      2.73,
      0.23,
      0,
      0.67,
      1.58,
      true,
      "#30332a",
      "#a9a99b",
      38,
    );
    for (let n = 0; n < 2; n++) {
      const x = n === 0 ? -2.2 : 2.2,
        z = 0.35;
      this.cylinder(group, 0.49, 0.025, x, 0.61, z, metal);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.025, 8, 48),
        metal,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.64, z);
      group.add(ring);
      for (let tick = 0; tick < 24; tick++) {
        const angle = (tick / 24) * Math.PI * 2;
        const mark = this.mesh(
          group,
          0.027,
          0.012,
          0.09,
          x + Math.sin(angle) * 0.49,
          0.64,
          z + Math.cos(angle) * 0.49,
          cream,
          0.003,
        );
        mark.rotation.y = angle;
      }
      this.cylinder(group, 0.39, 0.035, x, 0.65, z, cream);
      this.cylinder(group, 0.14, 0.08, x, 0.71, z, dark);
      const stick = new THREE.Group();
      stick.position.set(x, 0.74, z);
      this.cylinder(stick, 0.065, 0.62, 0, 0.28, 0, dark);
      this.cylinder(stick, 0.115, 0.08, 0, 0.62, 0, charcoal);
      group.add(stick);
      this.sticks.push(stick);
      this.pickObject(stick, { kind: "stick", index: n });
      const catchArea = this.cylinder(
        group,
        0.39,
        0.02,
        x,
        0.69,
        z,
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      this.pickObject(catchArea, { kind: "stick", index: n });
      const fire = this.cylinder(
        group,
        0.14,
        0.075,
        x,
        0.66,
        1.15,
        standard(colors.red, 0.4),
      );
      this.pickObject(fire, { kind: "fire", index: n });
      this.label(
        group,
        "SERVE / FIRE",
        1.13,
        0.13,
        x,
        0.62,
        1.47,
        true,
        "#c1c3b6",
      );
    }
    for (const x of [-2.5, 2.5])
      for (const z of [-1.4, 1.4])
        this.cylinder(group, 0.14, 0.08, x, 0, z, dark);
    return { mesh: slot, material: slotMaterial };
  }
  private cartridgeTexture(id: CartridgeId) {
    const cart = cartridges.find((c) => c.id === id);
    if (!cart) throw new Error("Cartridge not found");
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 640;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("Cartridge canvas unavailable");
    c.fillStyle = paper[cart.color];
    c.fillRect(0, 0, 512, 640);
    c.fillStyle = "#292c22";
    c.font = '25px "Obel Mono",monospace';
    c.fillText(cart.code, 29, 47);
    c.textAlign = "right";
    c.fillText("TV GAME", 483, 47);
    c.fillRect(28, 65, 456, 2);
    c.textAlign = "left";
    c.font = '600 44px "Obel Mono",monospace';
    const words = cart.name.split(" ");
    let line = "",
      y = 133;
    for (const word of words) {
      if (c.measureText(`${line} ${word}`).width > 450 && line) {
        c.fillText(line, 28, y);
        line = word;
        y += 53;
      } else line += (line ? " " : "") + word;
    }
    c.fillText(line, 28, y);
    c.fillRect(28, 563, 456, 2);
    c.font = '19px "Obel Mono",monospace';
    c.fillText("PROGRAMMABLE CARTRIDGE", 28, 604);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const original = document.querySelector(`[data-id="${id}"] .cart-art svg`);
    if (original) {
      const svg = original.cloneNode(true) as SVGElement;
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.setAttribute("width", "420");
      svg.setAttribute("height", "252");
      const source = new XMLSerializer()
        .serializeToString(svg)
        .replaceAll("currentColor", "#292c22");
      const image = new Image();
      image.onload = () => {
        if (this.disposed) return;
        c.drawImage(image, 46, 263, 420, 252);
        t.needsUpdate = true;
      };
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    }
    return t;
  }
  private addCartridge(id: CartridgeId, index: number) {
    const group = new THREE.Group();
    const position = new THREE.Vector3(-7.25 + index * 2.06, 0.06, 4.05);
    group.position.copy(position);
    group.rotation.x = -0.14;
    this.scene.add(group);
    this.homes.set(id, position.clone());
    this.cards.set(id, group);
    const dark = standard(colors.rubber, 0.75);
    this.mesh(group, 1.65, 1.94, 0.28, 0, 1.02, 0, dark, 0.07);
    for (let n = 0; n < 6; n++)
      this.mesh(
        group,
        1.42,
        0.018,
        0.012,
        0,
        1.79 + n * 0.026,
        0.148,
        standard(0x11140f),
        0.003,
      );
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.39, 1.57),
      new THREE.MeshStandardMaterial({
        map: this.cartridgeTexture(id),
        roughness: 0.9,
        metalness: 0,
      }),
    );
    label.position.set(0, 0.95, 0.147);
    group.add(label);
    this.mesh(group, 1.12, 0.11, 0.13, 0, 0.04, 0, dark, 0.01);
    for (let n = 0; n < 16; n++)
      this.mesh(
        group,
        0.036,
        0.09,
        0.005,
        -0.5 + n * 0.066,
        0.04,
        0.071,
        standard(0xa49d7a, 0.4, 0.4),
        0.002,
      );
    this.batchStatic(group);
    this.pickObject(group, { kind: "cart", id });
    this.label(
      this.scene,
      cartridges[index].code,
      1.3,
      0.16,
      position.x,
      0.02,
      5.09,
      true,
      "#c1af94",
    );
  }
  private addCable() {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(5, 0.18, -1.14),
      new THREE.Vector3(6, 0.09, -3),
      new THREE.Vector3(1, 0.07, -4.3),
      new THREE.Vector3(-3, 0.1, -3.2),
    ]);
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 60, 0.028, 8, false),
      standard(0x191b16, 0.85),
    );
    mesh.castShadow = true;
    this.scene.add(mesh);
  }
  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.previous) {
      this.setTVView(this.view === "tv");
    } else {
      const scale = Math.max(1, 1.4 / this.camera.aspect);
      this.camera.position.set(8 * scale, 12 * scale, 19 * scale);
      this.orbit.update();
    }
  }
  private hit(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    return this.ray.intersectObjects(this.picks, true).find((h) => {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (!o.visible) return false;
        o = o.parent;
      }
      return true;
    });
  }
  private hitData(object: THREE.Object3D): Hit | undefined {
    let o: THREE.Object3D | null = object;
    while (o) {
      if (o.userData.hit) return o.userData.hit as Hit;
      o = o.parent;
    }
    return undefined;
  }
  private pointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    this.host.gesture();
    this.focus();
    const intersection = this.hit(e);
    if (!intersection) return;
    const hit = this.hitData(intersection.object);
    if (!hit) return;
    this.cameraGoal = undefined;
    this.orbit.enabled = false;
    this.renderer.domElement.setPointerCapture(e.pointerId);
    e.stopImmediatePropagation();
    this.drag = {
      pointer: e.pointerId,
      hit,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    if (hit.kind === "cart") {
      const card = this.cards.get(hit.id);
      if (card) {
        this.drag.object = card;
        const point = new THREE.Vector3();
        if (this.ray.ray.intersectPlane(this.plane, point))
          this.drag.offset = card.position.clone().sub(point);
      }
    }
    if (hit.kind === "fire") this.host.fire(hit.index, true);
    if (hit.kind === "screen") {
      if (intersection.uv)
        this.host.aim({
          x: intersection.uv.x * 640,
          y: (1 - intersection.uv.y) * 480,
          fire: true,
        });
      else this.host.fire(0, true);
    }
  }
  private pointerMove(e: PointerEvent) {
    const intersection = this.hit(e),
      data = intersection ? this.hitData(intersection.object) : undefined;
    const d = this.drag;
    if (!d) {
      this.renderer.domElement.style.cursor =
        data?.kind === "cart" ? "grab" : data ? "pointer" : "grab";
      if (data?.kind === "screen" && intersection?.uv)
        this.host.aim({
          x: intersection.uv.x * 640,
          y: (1 - intersection.uv.y) * 480,
          fire: false,
        });
      else this.host.aim(undefined);
      return;
    }
    if (d.pointer !== e.pointerId) return;
    e.stopImmediatePropagation();
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5)
      d.moved = true;
    if (d.hit.kind === "stick") {
      this.host.stick(
        d.hit.index,
        THREE.MathUtils.clamp((e.clientX - d.startX) / 38, -1, 1),
        THREE.MathUtils.clamp((e.clientY - d.startY) / 38, -1, 1),
      );
    }
    if (d.hit.kind === "screen" && intersection?.uv)
      this.host.aim({
        x: intersection.uv.x * 640,
        y: (1 - intersection.uv.y) * 480,
        fire: true,
      });
    if (d.hit.kind === "cart" && d.object && d.moved) {
      const p = new THREE.Vector3();
      if (this.ray.ray.intersectPlane(this.plane, p)) {
        p.add(d.offset ?? new THREE.Vector3());
        d.object.position.set(
          THREE.MathUtils.clamp(p.x, -8.6, 8.6),
          Math.max(0.65, p.y),
          THREE.MathUtils.clamp(p.z, -3.7, 4.8),
        );
        d.object.rotation.set(-0.04, 0, -0.04);
        this.slotMaterial.color.setHex(
          this.nearSlot(d.object) ? colors.orange : colors.well,
        );
      }
    }
  }
  private nearSlot(object: THREE.Object3D) {
    return (
      Math.hypot(
        object.position.x - this.slotPosition.x,
        object.position.z - this.slotPosition.z,
      ) < 1.35
    );
  }
  private pointerUp(e: PointerEvent) {
    const d = this.drag;
    if (!d || d.pointer !== e.pointerId) return;
    e.stopImmediatePropagation();
    const h = d.hit;
    if (h.kind === "cart") {
      if (!d.moved || (d.object && this.nearSlot(d.object))) {
        if (!d.moved && this.host.state().active === h.id) this.host.eject();
        else this.host.insert(h.id);
      } else if (this.host.state().active === h.id) this.host.eject();
    } else if (h.kind === "mode" && !d.moved) this.host.mode(h.index);
    else if (h.kind === "switch" && !d.moved) this.host.toggle(h.id);
    this.cancelDrag();
    this.renderer.domElement.releasePointerCapture(e.pointerId);
  }
  private cancelDrag() {
    if (this.drag?.hit.kind === "stick")
      this.host.stick(this.drag.hit.index, 0, 0);
    this.host.fire(0, false);
    this.host.fire(1, false);
    this.host.aim(undefined);
    this.drag = undefined;
    this.orbit.enabled = true;
    this.slotMaterial.color.setHex(colors.well);
  }
  /** A close TV view makes the existing games usable without changing their render core. */
  setTVView(tv: boolean) {
    this.view = tv ? "tv" : "desk";
    const distance = Math.max(
      10.8,
      7.8 /
        (2 *
          Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
          this.camera.aspect),
    );
    this.cameraGoal = tv
      ? {
          position: new THREE.Vector3(-4.5, 3.7, -0.72 + distance),
          target: new THREE.Vector3(-4.5, 3.7, -0.72),
        }
      : {
          position: new THREE.Vector3(8, 12, 19).multiplyScalar(
            Math.max(1, 1.4 / this.camera.aspect),
          ),
          target: new THREE.Vector3(0, 1.8, 0.7),
        };
    if (this.reduceMotion) {
      this.camera.position.copy(this.cameraGoal.position);
      this.orbit.target.copy(this.cameraGoal.target);
      this.cameraGoal = undefined;
      this.orbit.update();
    }
    this.container.classList.toggle("tv-view", tv);
  }
  private render(now: number) {
    if (this.disposed) return;
    const dt = Math.min(0.08, (now - (this.previous || now)) / 1000);
    this.previous = now;
    if (!document.hidden) {
      const state = this.host.state();
      const factor = this.reduceMotion ? 1 : 1 - Math.exp(-dt * 11);
      if (this.cameraGoal) {
        this.camera.position.lerp(this.cameraGoal.position, factor);
        this.orbit.target.lerp(this.cameraGoal.target, factor);
        if (this.camera.position.distanceTo(this.cameraGoal.position) < 0.015)
          this.cameraGoal = undefined;
      }
      for (const [id, card] of this.cards) {
        card.visible = this.view !== "tv";
        if (
          this.drag?.hit.kind === "cart" &&
          this.drag.hit.id === id &&
          this.drag.moved
        )
          continue;
        const target =
          state.active === id ? this.slotPosition : this.homes.get(id);
        if (target) card.position.lerp(target, factor);
        card.rotation.x = THREE.MathUtils.lerp(
          card.rotation.x,
          state.active === id ? -0.08 : -0.14,
          factor,
        );
        card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, 0, factor);
      }
      const eject =
        this.container.querySelector<HTMLButtonElement>("#scene-eject");
      if (eject) eject.disabled = !state.active;
      const repair =
        this.container.querySelector<HTMLButtonElement>("#scene-repair");
      if (repair) repair.hidden = !state.fault;
      this.buttons.forEach((b) => {
        const enabled = !!state.active && b.index < state.modeCount;
        b.material.color.setHex(
          !enabled
            ? 0xbf6629
            : b.index === state.mode
              ? colors.orangeDark
              : colors.orange,
        );
        b.mesh.position.y = b.index === state.mode ? 0.755 : 0.79;
      });
      const enabled: Record<string, boolean> = {
        power: state.powered,
        speed: state.fast,
        "left-size": state.smallLeft,
        "right-size": state.smallRight,
        serve: state.autoServe,
      };
      for (const [id, lever] of this.levers)
        lever.rotation.x = enabled[id] ? -0.35 : 0.35;
      this.sticks.forEach((stick, n) => {
        const input = n === 0 ? state.left : state.right;
        stick.rotation.z = THREE.MathUtils.lerp(
          stick.rotation.z,
          -input.x * 0.3,
          factor,
        );
        stick.rotation.x = THREE.MathUtils.lerp(
          stick.rotation.x,
          input.y * 0.3,
          factor,
        );
      });
      if (now - this.textureTime > 32) {
        this.screenTexture.needsUpdate = true;
        this.textureTime = now;
      }
      this.orbit.update();
      this.renderer.render(this.scene, this.camera);
      this.container.dataset.cartridge = state.active ?? "";
    }
    this.frameId = requestAnimationFrame((t) => this.render(t));
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.observer.disconnect();
    window.removeEventListener("blur", this.cancel);
    document.removeEventListener("visibilitychange", this.visibility);
    this.orbit.dispose();
    const dom = this.renderer.domElement;
    dom.removeEventListener("pointerdown", this.down, true);
    dom.removeEventListener("pointermove", this.move, true);
    dom.removeEventListener("pointerup", this.up, true);
    dom.removeEventListener("pointercancel", this.cancel, true);
    dom.removeEventListener("lostpointercapture", this.cancel);
    dom.removeEventListener("webglcontextlost", this.contextLost);
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry);
        const list = Array.isArray(o.material) ? o.material : [o.material];
        list.forEach((m) => {
          materials.add(m);
          Object.values(m).forEach((v) => {
            if (v instanceof THREE.Texture) textures.add(v);
          });
        });
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    this.renderer.dispose();
    dom.remove();
  }
}
