//! Experimental PC-50x behavioral models, not a recovered netlist or ROM emulator.
//!
//! Rules: GI GIMINI TV Game Circuits (January 1978), printed pp. 28, 30, 54.
//! Geometry, velocities and raster are provisional. See research/EMULATION.md.

/// Nominal PAL behavioral updates per second; not an implementation of PAL sync.
pub const TICKS_PER_SECOND: u16 = 50;
/// Width of the provisional framebuffer.
pub const WIDTH: usize = 320;
/// Height of the provisional framebuffer.
pub const HEIGHT: usize = 240;

/// AY-3-8610 game modes. These are chip selections, not physical button numbers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SportsGame {
    Tennis,
    Hockey,
    Squash,
    Practice,
    Soccer,
    Basketball,
    BasketballPractice,
    Gridball,
    TargetOne,
    TargetTwo,
}

impl SportsGame {
    /// Decode the documented strobe/select matrix (both numbered from one).
    pub fn from_matrix(strobe: u8, select: u8) -> Option<Self> {
        match (strobe, select) {
            (1, 1) => Some(Self::Tennis),
            (1, 2) => Some(Self::Hockey),
            (1, 3) => Some(Self::Squash),
            (2, 1) => Some(Self::Practice),
            (2, 2) => Some(Self::Soccer),
            (2, 3) => Some(Self::Basketball),
            (3, 1) => Some(Self::BasketballPractice),
            (3, 2) => Some(Self::Gridball),
            (4, 1) => Some(Self::TargetOne),
            (4, 2) => Some(Self::TargetTwo),
            _ => None,
        }
    }
}

/// Digital approximation of the console's analog controller input.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum Direction {
    Negative,
    #[default]
    Neutral,
    Positive,
}
impl Direction {
    fn delta(self) -> i32 {
        match self {
            Self::Negative => -1,
            Self::Neutral => 0,
            Self::Positive => 1,
        }
    }
}

/// State of a vessel in provisional pixel coordinates.
#[derive(Debug, Clone, Copy)]
pub struct Vessel {
    pub x: i32,
    pub frozen_ticks: u16,
}

/// A vertical projectile in provisional pixel coordinates.
#[derive(Debug, Clone, Copy)]
pub struct Projectile {
    pub x: i32,
    pub y: i32,
}

/// Implemented naval variations. Other AY-3-8605 modes remain unimplemented.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NavalMode {
    OnePlayer,
    TwoPlayer,
}

/// One update's submarine and destroyer controls.
#[derive(Debug, Clone, Copy, Default)]
pub struct NavalInput {
    pub submarine: Direction,
    pub destroyer: Direction,
    pub torpedo: bool,
    pub depth_charge: bool,
}

/// Events for a future audio backend; no analog sound synthesis is claimed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NavalEvent {
    Torpedo,
    DepthCharge,
    Explosion,
}

/// Experimental AY-3-8605 sea-battle model.
#[derive(Debug, Clone)]
pub struct Submarine {
    pub mode: NavalMode,
    pub submarine: Vessel,
    pub destroyer: Vessel,
    pub torpedo: Option<Projectile>,
    pub depth_charge: Option<Projectile>,
    /// Submarine first, destroyer second.
    pub scores: [u8; 2],
    pub cargo_x: Option<i32>,
    pub capital_ship: bool,
    torpedo_cooldown: u16,
    charge_cooldown: u16,
    cargo_respawn: u16,
    ai_direction: Direction,
}
impl Submarine {
    /// Reset the selected mode. Initial positions are provisional.
    pub fn new(mode: NavalMode) -> Self {
        Self {
            mode,
            submarine: Vessel {
                x: 160,
                frozen_ticks: 0,
            },
            destroyer: Vessel {
                x: 80,
                frozen_ticks: 0,
            },
            torpedo: None,
            depth_charge: None,
            scores: [0, 0],
            cargo_x: Some(240),
            capital_ship: false,
            torpedo_cooldown: 0,
            charge_cooldown: 0,
            cargo_respawn: 0,
            ai_direction: Direction::Positive,
        }
    }
    /// Whether a player reached the documented 15-point game limit.
    pub fn finished(&self) -> bool {
        self.scores.iter().any(|&s| s >= 15)
    }
    /// Advance one nominal PAL tick. GI p.54 documents movement ratio, four-second
    /// fire limit, scoring weights, two-second immobilization and one-player AI.
    pub fn tick(&mut self, input: NavalInput) -> Vec<NavalEvent> {
        if self.finished() {
            return Vec::new();
        }
        let mut events = Vec::new();
        self.torpedo_cooldown = self.torpedo_cooldown.saturating_sub(1);
        self.charge_cooldown = self.charge_cooldown.saturating_sub(1);
        let mut destroyer_direction = input.destroyer;
        let mut fire_charge = input.depth_charge;
        if self.mode == NavalMode::OnePlayer {
            if self.destroyer.x >= 300 {
                self.ai_direction = Direction::Negative;
            }
            if self.destroyer.x <= 20 {
                self.ai_direction = Direction::Positive;
            }
            destroyer_direction = self.ai_direction;
            fire_charge = true;
        }
        move_vessel(&mut self.submarine, input.submarine, 1);
        move_vessel(&mut self.destroyer, destroyer_direction, 2);
        if input.torpedo && self.torpedo.is_none() && self.torpedo_cooldown == 0 {
            self.torpedo = Some(Projectile {
                x: self.submarine.x,
                y: 194,
            });
            self.torpedo_cooldown = 4 * TICKS_PER_SECOND;
            events.push(NavalEvent::Torpedo);
        }
        if fire_charge && self.depth_charge.is_none() && self.charge_cooldown == 0 {
            self.depth_charge = Some(Projectile {
                x: self.destroyer.x,
                y: 84,
            });
            self.charge_cooldown = 4 * TICKS_PER_SECOND;
            events.push(NavalEvent::DepthCharge);
        }
        if let Some(mut shot) = self.torpedo {
            shot.y -= 2;
            if (74..=84).contains(&shot.y) && (shot.x - self.destroyer.x).abs() <= 13 {
                self.scores[0] = (self.scores[0] + 5).min(15);
                self.destroyer.frozen_ticks = 2 * TICKS_PER_SECOND;
                self.torpedo = None;
                events.push(NavalEvent::Explosion);
            } else if (48..=58).contains(&shot.y)
                && self.cargo_x.is_some_and(|x| (shot.x - x).abs() <= 15)
            {
                self.scores[0] = (self.scores[0] + if self.capital_ship { 2 } else { 1 }).min(15);
                self.cargo_x = None;
                self.cargo_respawn = 100;
                self.torpedo = None;
                events.push(NavalEvent::Explosion);
            } else {
                self.torpedo = (shot.y >= 35).then_some(shot);
            }
        }
        if let Some(mut shot) = self.depth_charge {
            shot.y += 2;
            if (194..=204).contains(&shot.y) && (shot.x - self.submarine.x).abs() <= 13 {
                self.scores[1] = (self.scores[1] + 2).min(15);
                self.submarine.frozen_ticks = 2 * TICKS_PER_SECOND;
                self.depth_charge = None;
                events.push(NavalEvent::Explosion);
            } else {
                self.depth_charge = (shot.y <= 220).then_some(shot);
            }
        }
        if let Some(x) = &mut self.cargo_x {
            *x -= 1;
            if *x < 10 {
                *x = 310;
                self.capital_ship = !self.capital_ship;
            }
        } else {
            self.cargo_respawn = self.cargo_respawn.saturating_sub(1);
            if self.cargo_respawn == 0 {
                self.cargo_x = Some(310);
                self.capital_ship = !self.capital_ship;
            }
        }
        events
    }
    /// Render a monochrome approximation, not the chip's original sprite logic.
    pub fn frame(&self) -> Vec<u32> {
        let mut frame = vec![0x080808; WIDTH * HEIGHT];
        rect(&mut frame, 8, 66, 304, 1, 0x777777);
        for (x, score) in [(126, self.scores[0]), (178, self.scores[1])] {
            number(&mut frame, x, 12, score);
        }
        ship(
            &mut frame,
            self.submarine.x,
            198,
            true,
            self.submarine.frozen_ticks,
        );
        ship(
            &mut frame,
            self.destroyer.x,
            78,
            false,
            self.destroyer.frozen_ticks,
        );
        if let Some(x) = self.cargo_x {
            ship(&mut frame, x, 52, false, 0);
        }
        for p in [self.torpedo, self.depth_charge].into_iter().flatten() {
            rect(&mut frame, p.x, p.y, 2, 5, 0xffffff);
        }
        frame
    }
}
fn move_vessel(v: &mut Vessel, direction: Direction, speed: i32) {
    if v.frozen_ticks > 0 {
        v.frozen_ticks -= 1;
    } else {
        v.x = (v.x + direction.delta() * speed).clamp(20, 300);
    }
}
fn ship(frame: &mut [u32], x: i32, y: i32, submarine: bool, frozen: u16) {
    if frozen > 0 && (frozen / 5).is_multiple_of(2) {
        return;
    }
    rect(frame, x - 12, y, 24, 4, 0xffffff);
    rect(frame, x - 9, y + 4, 18, 2, 0xffffff);
    rect(frame, x - 3, y - 4, 6, 4, 0xffffff);
    if submarine {
        rect(frame, x + 1, y - 7, 2, 3, 0xffffff);
    }
}
fn rect(frame: &mut [u32], x: i32, y: i32, w: i32, h: i32, color: u32) {
    for py in y.max(0)..(y + h).min(HEIGHT as i32) {
        for px in x.max(0)..(x + w).min(WIDTH as i32) {
            frame[py as usize * WIDTH + px as usize] = color;
        }
    }
}
fn number(frame: &mut [u32], x: i32, y: i32, value: u8) {
    const DIGITS: [[u8; 5]; 10] = [
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
    let value = value.min(15);
    for (offset, digit) in [value / 10, value % 10].into_iter().enumerate() {
        for (row, bits) in DIGITS[usize::from(digit)].iter().enumerate() {
            for col in 0..3 {
                if bits & (1 << (2 - col)) != 0 {
                    rect(
                        frame,
                        x + offset as i32 * 10 + col * 2,
                        y + row as i32 * 2,
                        2,
                        2,
                        0xffffff,
                    );
                }
            }
        }
    }
}
