//! AY-3-8605 switch-level model. Game behavior comes exclusively from the netlist.
// Solver adapted from Visual6502 / Cole Johnson (MIT); see LICENSE.
// The generated netlist is CC BY 4.0; see DATA-LICENSE.md.
#[allow(dead_code)] // Preserve all recovered node names for probes.
mod data;
use data::*;
use std::cell::RefCell;

const NODE_COUNT: usize = 1524;
const TRANS_COUNT: usize = 2789;
const WIDTH: usize = 228;
const HEIGHT: usize = 320;

#[derive(Debug)]
pub struct Circuit {
    pub state: [u8; NODE_COUNT],
    pulls: [i8; NODE_COUNT],
    on: [bool; TRANS_COUNT],
    gates: Vec<Vec<usize>>,
    terminals: Vec<Vec<usize>>,
    c1: [usize; TRANS_COUNT],
    c2: [usize; TRANS_COUNT],
    seen: [u32; NODE_COUNT],
    queued: [bool; NODE_COUNT],
    group: Vec<usize>,
    next: Vec<usize>,
    generation: u32,
}
impl Default for Circuit {
    fn default() -> Self {
        let mut c = Self {
            state: [0; NODE_COUNT],
            pulls: [0; NODE_COUNT],
            on: [false; TRANS_COUNT],
            gates: vec![vec![]; NODE_COUNT],
            terminals: vec![vec![]; NODE_COUNT],
            c1: [0; TRANS_COUNT],
            c2: [0; TRANS_COUNT],
            seen: [0; NODE_COUNT],
            queued: [false; NODE_COUNT],
            group: Vec::with_capacity(NODE_COUNT),
            next: Vec::with_capacity(NODE_COUNT),
            generation: 0,
        };
        for &(n, pull) in NODES {
            c.pulls[n] = i8::from(pull);
        }
        for (t, &(gate, mut a, mut b)) in TRANSISTORS.iter().enumerate() {
            if a == GND || a == VCC {
                std::mem::swap(&mut a, &mut b);
            }
            c.c1[t] = a;
            c.c2[t] = b;
            c.gates[gate].push(t);
            c.terminals[a].push(t);
            c.terminals[b].push(t);
            c.on[t] = gate == VCC;
        }
        c.state[VCC] = 1;
        c
    }
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UnstableCircuit;
impl std::fmt::Display for UnstableCircuit {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("netlist did not settle within 100 passes")
    }
}
impl std::error::Error for UnstableCircuit {}
impl Circuit {
    fn visit(&mut self, n: usize) {
        if self.seen[n] == self.generation {
            return;
        }
        self.seen[n] = self.generation;
        self.group.push(n);
        if n == GND || n == VCC {
            return;
        }
        for i in 0..self.terminals[n].len() {
            let t = self.terminals[n][i];
            if self.on[t] {
                self.visit(if self.c1[t] == n {
                    self.c2[t]
                } else {
                    self.c1[t]
                });
            }
        }
    }
    fn enqueue(&mut self, n: usize) {
        if n == GND || n == VCC || self.queued[n] {
            return;
        }
        self.queued[n] = true;
        self.next.push(n);
    }
    fn settle(&mut self, mut list: Vec<usize>) -> Result<(), UnstableCircuit> {
        self.next.clear();
        self.queued.fill(false);
        for _ in 0..100 {
            if list.is_empty() {
                return Ok(());
            }
            for &n in &list {
                if n == GND || n == VCC {
                    continue;
                }
                self.group.clear();
                self.generation = self.generation.wrapping_add(1);
                if self.generation == 0 {
                    self.seen.fill(0);
                    self.generation = 1;
                }
                self.visit(n);
                let mut value = 0;
                if self.seen[GND] == self.generation {
                } else if self.seen[VCC] == self.generation {
                    value = 1;
                } else {
                    for &g in &self.group {
                        if self.pulls[g] == 1 {
                            value = 1;
                            break;
                        }
                        if self.pulls[g] == -1 {
                            break;
                        }
                        if self.state[g] != 0 {
                            value = 1;
                            break;
                        }
                    }
                }
                for i in 0..self.group.len() {
                    let g = self.group[i];
                    if g == VCC || self.state[g] == value {
                        continue;
                    }
                    self.state[g] = value;
                    for j in 0..self.gates[g].len() {
                        let t = self.gates[g][j];
                        if self.on[t] == (value != 0) {
                            continue;
                        }
                        self.on[t] = value != 0;
                        self.enqueue(self.c1[t]);
                        if value == 0 {
                            self.enqueue(self.c2[t]);
                        }
                    }
                }
            }
            list.clear();
            std::mem::swap(&mut list, &mut self.next);
            self.queued.fill(false);
        }
        Err(UnstableCircuit)
    }
    pub fn drive(&mut self, n: usize, high: bool) -> Result<(), UnstableCircuit> {
        self.pulls[n] = if high { 1 } else { -1 };
        self.settle(vec![n])
    }
}

#[derive(Debug)]
pub struct Chip {
    pub circuit: Circuit,
    pub raster: Vec<u8>,
    pub half_cycles: u64,
    pub fields: u32,
    pub field_clocks: u32,
    last_field_cycle: u64,
    pub line: usize,
    pub last_field_lines: usize,
    pub mode: usize,
    selection_release_field: u32,
    pub thresholds: [u32; 2],
    x: usize,
    sync_count: usize,
    charges: [u32; 2],
}
impl Chip {
    pub fn new() -> Result<Self, UnstableCircuit> {
        let mut circuit = Circuit::default();
        for n in [PIN_S1, PIN_S2, PIN_S3, PIN_SKILL1, PIN_SKILL2, PIN_TEST] {
            circuit.pulls[n] = 1;
        }
        circuit.pulls[RESET] = -1;
        circuit.settle(NODES.iter().map(|n| n.0).collect())?;
        circuit.drive(RESET, true)?;
        let mut chip = Self {
            circuit,
            raster: vec![0; WIDTH * HEIGHT],
            half_cycles: 0,
            fields: 0,
            field_clocks: 0,
            last_field_cycle: 0,
            line: 0,
            last_field_lines: 0,
            mode: 1,
            selection_release_field: 3,
            thresholds: [200, 200],
            x: 0,
            sync_count: 0,
            charges: [0, 0],
        };
        chip.inputs(1, 200, 200, 0)?;
        // The archived author specifies a clocked reset to initialise ship counters.
        chip.circuit.drive(RESET, false)?;
        chip.run(128)?;
        chip.circuit.drive(RESET, true)?;
        Ok(chip)
    }
    pub fn inputs(
        &mut self,
        mode: usize,
        sub: u32,
        des: u32,
        buttons: u32,
    ) -> Result<(), UnstableCircuit> {
        if self.mode != mode {
            self.selection_release_field = self.fields + 3;
            for n in [PIN_S1, PIN_S2, PIN_S3] {
                self.circuit.drive(n, true)?;
            }
        }
        self.mode = mode.clamp(1, 6);
        self.thresholds = [sub, des];
        for (bit, n) in [PIN_FIRE_T, PIN_FIRE_DC, PIN_SKILL1, PIN_SKILL2]
            .into_iter()
            .enumerate()
        {
            self.circuit.drive(n, buttons & (1 << bit) == 0)?;
        }
        Ok(())
    }
    fn sync(&mut self) -> Result<(), UnstableCircuit> {
        self.charges.fill(0);
        self.circuit.drive(PIN_SUB_INPUT, false)?;
        self.circuit.drive(PIN_DES_INPUT, false)?;
        // Console game keys are momentary contacts; unlike the archive UI,
        // release them after a short selection pulse.
        if self.fields >= self.selection_release_field {
            for n in [PIN_S1, PIN_S2, PIN_S3] {
                if self.circuit.pulls[n] != 1 {
                    self.circuit.drive(n, true)?;
                }
            }
            return Ok(());
        }
        let strobe = if self.mode % 2 == 1 {
            PIN2_STROBE1
        } else {
            PIN2_STROBE2
        };
        self.circuit.drive(
            [PIN_S1, PIN_S2, PIN_S3][(self.mode - 1) / 2],
            self.circuit.state[strobe] == 0,
        )
    }
    pub fn half_step(&mut self) -> Result<(), UnstableCircuit> {
        let was_high = self.circuit.state[CLK] != 0;
        self.circuit.drive(CLK, !was_high)?;
        self.half_cycles += 1;
        if was_high {
            if self.circuit.state[PIN2_SYNC] != 0 {
                self.sync_count += 1;
            } else {
                if self.sync_count > 64 {
                    self.last_field_lines = self.line;
                    self.fields += 1;
                    self.field_clocks = ((self.half_cycles - self.last_field_cycle) / 2) as u32;
                    self.last_field_cycle = self.half_cycles;
                    self.line = 0;
                    self.x = 0;
                    self.sync()?;
                } else if self.sync_count >= 8 {
                    self.line += 1;
                    self.x = 0;
                    self.sync()?;
                }
                self.sync_count = 0;
            }
            let s = &self.circuit.state;
            if self.x < WIDTH && self.line < HEIGHT {
                // Four raw output channels plus sync/blanking, not invented sprites.
                self.raster[self.line * WIDTH + self.x] = s[PIN2_LVIDEO]
                    | (s[PIN2_RVIDEO] << 1)
                    | (s[PIN2_BACKGROUND] << 2)
                    | (s[PIN2_HUE_OUT] << 3)
                    | (s[PIN2_BLANKING] << 4)
                    | (s[PIN2_SYNC] << 5);
            }
            self.x += 1;
        }
        for (i, pin) in [PIN_SUB_INPUT, PIN_DES_INPUT].into_iter().enumerate() {
            self.charges[i] += 1;
            if self.charges[i] == self.thresholds[i] {
                self.circuit.drive(pin, true)?;
            }
        }
        Ok(())
    }
    pub fn run(&mut self, clocks: u32) -> Result<(), UnstableCircuit> {
        for _ in 0..clocks * 2 {
            self.half_step()?;
        }
        Ok(())
    }
}
thread_local! { static INSTANCE: RefCell<Option<Chip>> = const {RefCell::new(None)}; }
// Wasm is single-threaded; all state remains owned by the worker's instance.
#[unsafe(no_mangle)]
pub extern "C" fn chip_init() -> u32 {
    INSTANCE.with(|c| match Chip::new() {
        Ok(chip) => {
            *c.borrow_mut() = Some(chip);
            0
        }
        Err(_) => 1,
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn chip_run(clocks: u32) -> u32 {
    INSTANCE.with(|c| {
        c.borrow_mut()
            .as_mut()
            .map_or(1, |c| u32::from(c.run(clocks).is_err()))
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn chip_input(mode: u32, sub: u32, des: u32, buttons: u32) -> u32 {
    INSTANCE.with(|c| {
        c.borrow_mut().as_mut().map_or(1, |c| {
            u32::from(c.inputs(mode as usize, sub, des, buttons).is_err())
        })
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn chip_raster() -> *const u8 {
    INSTANCE.with(|c| {
        c.borrow()
            .as_ref()
            .map_or(std::ptr::null(), |c| c.raster.as_ptr())
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn chip_nodes() -> *const u8 {
    INSTANCE.with(|c| {
        c.borrow()
            .as_ref()
            .map_or(std::ptr::null(), |c| c.circuit.state.as_ptr())
    })
}
#[unsafe(no_mangle)]
pub extern "C" fn chip_fields() -> u32 {
    INSTANCE.with(|c| c.borrow().as_ref().map_or(0, |c| c.fields))
}

#[unsafe(no_mangle)]
pub extern "C" fn chip_field_clocks() -> u32 {
    INSTANCE.with(|c| c.borrow().as_ref().map_or(0, |c| c.field_clocks))
}

/// Apply the console's reset contact after the timing generator has settled.
#[unsafe(no_mangle)]
pub extern "C" fn chip_reset() -> u32 {
    INSTANCE.with(|c| {
        c.borrow_mut().as_mut().map_or(1, |c| {
            let result = c
                .circuit
                .drive(RESET, false)
                .and_then(|()| c.run(256))
                .and_then(|()| c.circuit.drive(RESET, true));
            u32::from(result.is_err())
        })
    })
}

/// Advance one clock edge for interactive circuit inspection.
#[unsafe(no_mangle)]
pub extern "C" fn chip_half_step() -> u32 {
    INSTANCE.with(|c| {
        c.borrow_mut()
            .as_mut()
            .map_or(1, |c| u32::from(c.half_step().is_err()))
    })
}
