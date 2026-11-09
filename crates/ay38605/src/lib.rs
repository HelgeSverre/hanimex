//! AY-3-8605 switch-level model. Game behavior comes exclusively from the netlist.
// Solver adapted from Visual6502 / Cole Johnson (MIT); see LICENSE.
// The generated netlist is CC BY 4.0; see DATA-LICENSE.md.
mod compiled;
#[allow(dead_code)] // Preserve all recovered node names for probes.
mod data;
pub mod reference;
#[cfg(not(feature = "reference-engine"))]
pub use GateCircuit as Circuit;
use data::*;
#[cfg(feature = "reference-engine")]
pub use reference::ReferenceCircuit as Circuit;
use std::cell::RefCell;

const NODE_COUNT: usize = 1524;
const TRANS_COUNT: usize = 2789;
const WIDTH: usize = 228;
const HEIGHT: usize = 320;

#[derive(Debug)]
pub struct GateCircuit {
    #[cfg(feature = "profile")]
    pub metrics: [u64; 3],
    pub state: [u8; NODE_COUNT],
    pulls: [i8; NODE_COUNT],
    queued: [bool; NODE_COUNT],
    next: Vec<usize>,
    work: Vec<usize>,
    ground_count: [u16; NODE_COUNT],
    power_count: [u16; NODE_COUNT],
    bridge_count: [u16; NODE_COUNT],
}
impl Default for GateCircuit {
    fn default() -> Self {
        let mut c = Self {
            #[cfg(feature = "profile")]
            metrics: [0; 3],
            state: [0; NODE_COUNT],
            pulls: [0; NODE_COUNT],
            queued: [false; NODE_COUNT],
            next: Vec::with_capacity(NODE_COUNT),
            work: Vec::with_capacity(NODE_COUNT),
            ground_count: [0; NODE_COUNT],
            power_count: [0; NODE_COUNT],
            bridge_count: [0; NODE_COUNT],
        };
        for &(n, pull) in NODES {
            c.pulls[n] = i8::from(pull);
        }
        for &(gate, mut a, mut b) in TRANSISTORS {
            if a == GND || a == VCC {
                std::mem::swap(&mut a, &mut b);
            }
            if gate == VCC {
                c.connection_change(a, b, true);
            }
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
impl GateCircuit {
    #[inline(always)]
    fn connection_change(&mut self, a: usize, b: usize, on: bool) {
        let delta = if on { 1 } else { u16::MAX };
        if b == GND {
            self.ground_count[a] = self.ground_count[a].wrapping_add(delta);
        } else if b == VCC {
            self.power_count[a] = self.power_count[a].wrapping_add(delta);
        } else {
            self.bridge_count[a] = self.bridge_count[a].wrapping_add(delta);
            self.bridge_count[b] = self.bridge_count[b].wrapping_add(delta);
        }
    }
    #[inline(always)]
    fn compiled_recalc(&mut self, n: usize) {
        #[cfg(feature = "profile")]
        {
            self.metrics[0] += 1;
        }
        let other = compiled::PEERS[n];
        if other == 65535 {
            let (gates, base, size) = compiled::BLOCKS[compiled::NODE_BLOCK[n]];
            let mut pattern = 0;
            for (bit, &gate) in gates.iter().enumerate() {
                pattern |= (self.state[gate] as usize) << bit;
            }
            let (start, len) = compiled::VIEWS[base + pattern * size + compiled::NODE_LOCAL[n]];
            let group = &compiled::MEMBERS[start..start + len];
            let mut ground = 0;
            let mut power = 0;
            for &g in group {
                ground |= self.ground_count[g];
                power |= self.power_count[g];
            }
            let v = if ground != 0 {
                0
            } else if power != 0 {
                1
            } else {
                self.floating_value(group)
            };
            for &g in group {
                self.update_node(g, v);
            }
            return;
        }
        let linked = other != n && self.bridge_count[n] != 0;
        let ground = self.ground_count[n] + if linked { self.ground_count[other] } else { 0 };
        let power = self.power_count[n] + if linked { self.power_count[other] } else { 0 };
        let v = if ground != 0 {
            0
        } else if power != 0 {
            1
        } else if linked {
            self.floating_value(&[n, other])
        } else {
            self.floating_value(&[n])
        };
        self.update_node(n, v);
        if linked {
            self.update_node(other, v);
        }
    }
    #[inline(always)]
    fn floating_value(&self, group: &[usize]) -> u8 {
        for &n in group {
            if self.pulls[n] == 1 {
                return 1;
            }
            if self.pulls[n] == -1 {
                return 0;
            }
            if self.state[n] != 0 {
                return 1;
            }
        }
        0
    }
    #[inline(always)]
    fn update_node(&mut self, g: usize, value: u8) {
        if self.state[g] == value {
            return;
        }
        #[cfg(feature = "profile")]
        {
            self.metrics[1] += 1;
        }
        self.state[g] = value;
        for &(a, b) in
            &compiled::FANOUT[compiled::FANOUT_OFFSETS[g]..compiled::FANOUT_OFFSETS[g + 1]]
        {
            self.connection_change(a, b, value != 0);
            self.enqueue(a);
            if value == 0 {
                self.enqueue(b);
            }
        }
    }

    #[inline(always)]
    fn enqueue(&mut self, n: usize) {
        if n == GND || n == VCC || self.queued[n] {
            return;
        }
        #[cfg(feature = "profile")]
        {
            self.metrics[2] += 1;
        }
        self.queued[n] = true;
        self.next.push(n);
    }
    fn settle(&mut self, mut list: Vec<usize>) -> Result<(), UnstableCircuit> {
        self.next.clear();
        for _ in 0..100 {
            if list.is_empty() {
                self.work = list;
                return Ok(());
            }
            for &n in &list {
                self.queued[n] = false;
            }
            for &n in &list {
                if n == GND || n == VCC {
                    continue;
                }
                self.compiled_recalc(n);
            }
            list.clear();
            std::mem::swap(&mut list, &mut self.next);
        }
        Err(UnstableCircuit)
    }
    pub fn drive(&mut self, n: usize, high: bool) -> Result<(), UnstableCircuit> {
        self.pulls[n] = if high { 1 } else { -1 };
        let mut work = std::mem::take(&mut self.work);
        work.clear();
        work.push(n);
        self.settle(work)
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
