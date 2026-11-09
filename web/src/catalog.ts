export type CartridgeId =
  | "sports"
  | "motorcycle"
  | "tank"
  | "race"
  | "submarine"
  | "wipeout"
  | "shooting"
  | "fundamental";
export interface Cartridge {
  id: CartridgeId;
  code: string;
  name: string;
  short: string;
  chip: string;
  color: string;
  modes: readonly string[];
  story: string;
  controls: string;
}
export const cartridges: readonly Cartridge[] = [
  {
    id: "sports",
    code: "PC-501",
    name: "SUPERSPORTIC",
    short: "Supersportic",
    chip: "AY-3-8610",
    color: "orange",
    modes: [
      "Squash",
      "Hockey",
      "Tennis",
      "Target II",
      "Target I",
      "Basketball",
      "Soccer",
      "Gridball",
      "Basketball practice",
      "Practice",
    ],
    story: "Ten sports and target game selections with two-axis controls.",
    controls:
      "WASD and arrows move the players. Space and Enter serve or fire.",
  },
  {
    id: "motorcycle",
    code: "PC-502",
    name: "MOTOR CYCLE",
    short: "Motor Cycle",
    chip: "AY-3-8765",
    color: "yellow",
    modes: ["Jump practice", "Bus jump", "Wall jump", "Double jump"],
    story: "Build speed, time the ramp, and clear the obstacle.",
    controls: "A / D or arrow keys adjust speed. Space or Enter jumps.",
  },
  {
    id: "tank",
    code: "PC-503",
    name: "TANK BATTLE",
    short: "Tank Battle",
    chip: "AY-3-8710",
    color: "red",
    modes: ["Open battle", "Maze battle"],
    story: "Navigate the barriers and hit the other tank.",
    controls: "WASD + Space for tank one. Arrows + Enter for tank two.",
  },
  {
    id: "race",
    code: "PC-504",
    name: "CAR RACE GP",
    short: "Car Race GP",
    chip: "AY-3-8603",
    color: "blue",
    modes: ["Solo grand prix", "Two-player race"],
    story: "Avoid traffic and stay on the road.",
    controls: "A / D steers car one. Left / right steers car two.",
  },
  {
    id: "submarine",
    code: "PC-505",
    name: "SUBMARINE",
    short: "Submarine",
    chip: "AY-3-8605",
    color: "teal",
    modes: [
      "Sea battle",
      "Destroyer",
      "Night sea",
      "Submarine",
      "Space A",
      "Space B",
    ],
    story:
      "Fire torpedoes from the submarine or drop depth charges from the destroyer.",
    controls:
      "A / D + Space controls the submarine. Arrows + Enter controls the destroyer. In Destroyer mode, the submarine is automatic.",
  },
  {
    id: "wipeout",
    code: "PC-506",
    name: "SUPER WIPEOUT",
    short: "Super Wipeout",
    chip: "AY-3-8606",
    color: "purple",
    modes: [
      "Wipeout I",
      "Wipeout II",
      "Wipeout III",
      "Wipeout IV",
      "Color squares I",
      "Color squares II",
      "Color squares III",
      "Color squares IV",
      "Breakthrough I",
      "Breakthrough II",
    ],
    story: "Keep the ball in play and clear the blocks.",
    controls: "W / S and Up / Down move the bats. Space and Enter serve. SPEED changes ball speed; L-TEAM changes bat size and R-TEAM changes ball size.",
  },
  {
    id: "shooting",
    code: "PC-507",
    name: "SHOOTING GALLERY",
    short: "Shooting Gallery",
    chip: "AY-3-8607",
    color: "green",
    modes: ["Skeet", "Moving target", "Destruct"],
    story:
      "Aim at the target and shoot. Pointer controls replace the original light gun.",
    controls:
      "Move the pointer on the TV and click to shoot. WASD + Space also works.",
  },
  {
    id: "fundamental",
    code: "PC-508",
    name: "FUNDAMENTAL",
    short: "Fundamental",
    chip: "AY-3-8500",
    color: "cream",
    modes: ["Tennis", "Hockey", "Squash", "Practice", "Target I", "Target II"],
    story: "Basic ball-and-bat and target games.",
    controls:
      "W / S and up / down move the bats. Space or Enter serves or fires.",
  },
];
export function cartridgeById(id: string): Cartridge | undefined {
  return cartridges.find((c) => c.id === id);
}
