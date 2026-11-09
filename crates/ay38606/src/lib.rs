//! AY-3-8606 recovered circuit with compiled gates and the original transistor reference.
// Solver adapted from Visual6502 / Cole Johnson (MIT); see LICENSE.
// Data derivatives are CC BY-SA 4.0; see research/ay38606/PROVENANCE.md.
mod compiled;
mod counter;
#[allow(dead_code)] // Preserve all recovered node names for probes.
mod data;
mod fanout;
#[cfg(test)]
#[path = "../../ay38605/src/latch_tests.rs"]
mod latch_tests;
mod latches;
#[path = "../../ay38605/src/reference.rs"]
pub mod reference;
#[cfg(not(feature = "reference-engine"))]
pub use GateCircuit as Circuit;
use data::*;
#[cfg(feature = "reference-engine")]
pub use reference::ReferenceCircuit as Circuit;
use std::cell::RefCell;

const NODE_COUNT: usize = 1633;
const TRANS_COUNT: usize = 2990;
const WIDTH: usize = 228;
const HEIGHT: usize = 320;

#[derive(Debug)]
pub struct GateCircuit {
    counter_frozen: bool,
    counter_cursor: Option<usize>,
    #[cfg(feature = "profile")]
    pub metrics: [u64; 3],
    pub state: [u8; NODE_COUNT],
    pulls: [i8; NODE_COUNT],
    queued: [u32; NODE_COUNT],
    queue_generation: u32,
    next: Vec<usize>,
    work: Vec<usize>,
    ground_count: [u16; NODE_COUNT],
    power_count: [u16; NODE_COUNT],
    bridge_count: [u16; NODE_COUNT],
}
impl Default for GateCircuit {
    fn default() -> Self {
        let mut c = Self {
            counter_frozen: false,
            counter_cursor: None,
            #[cfg(feature = "profile")]
            metrics: [0; 3],
            state: [0; NODE_COUNT],
            pulls: [0; NODE_COUNT],
            queued: [0; NODE_COUNT],
            queue_generation: 1,
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
        } else if latches::SOURCE[a] == 65535 {
            self.bridge_count[a] = self.bridge_count[a].wrapping_add(delta);
            self.bridge_count[b] = self.bridge_count[b].wrapping_add(delta);
        }
    }
    #[cfg_attr(not(debug_assertions), inline(always))]
    fn compiled_recalc(&mut self, n: usize) {
        debug_assert!(
            !(self.counter_frozen && counter::IS_NODE[n]),
            "macro boundary must be closed"
        );
        #[cfg(feature = "profile")]
        {
            self.metrics[0] += 1;
        }
        let other = compiled::PEERS[n];
        let source = latches::SOURCE[n];
        if source != 65535 {
            let open = self.state[latches::CLOCK[n]] != 0;
            if n != source && !open {
                return;
            }
            let value = u8::from(self.ground_count[source] == 0);
            self.update_node(n, value);
            if open {
                self.update_node(other, value);
            }
            return;
        }
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
        fanout::RUN[g](self, value != 0);
    }

    #[inline(always)]
    fn enqueue(&mut self, n: usize) {
        if n == GND || n == VCC || self.queued[n] == self.queue_generation {
            return;
        }
        #[cfg(feature = "profile")]
        {
            self.metrics[2] += 1;
        }
        self.queued[n] = self.queue_generation;
        self.next.push(n);
    }
    #[inline(always)]
    fn next_generation(&mut self) {
        self.queue_generation = self.queue_generation.wrapping_add(1);
        if self.queue_generation == 0 {
            self.queued.fill(0);
            self.queue_generation = 1;
        }
    }
    fn settle(&mut self, list: Vec<usize>) -> Result<(), UnstableCircuit> {
        self.settle_with_limit(list, 100)
    }
    fn settle_with_limit(
        &mut self,
        mut list: Vec<usize>,
        limit: usize,
    ) -> Result<(), UnstableCircuit> {
        self.next.clear();
        for _ in 0..limit {
            if list.is_empty() {
                self.work = list;
                return Ok(());
            }
            self.next_generation();
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
        // External writes invalidate the cursor. Re-entry checks the entire
        // 111-node vector plus external clock, not just the nine-bit table index.
        let target = if n == CLK && high != (self.state[CLK] != 0) {
            self.counter_cursor.or_else(|| counter::find(&self.state))
        } else {
            self.counter_cursor = None;
            None
        };
        self.pulls[n] = if high { 1 } else { -1 };
        let mut work = std::mem::take(&mut self.work);
        work.clear();
        if let Some(row) = target {
            // Preserve canonical node bytes and connection counts so both the
            // inspector and an immediate return to the gate solver see reality.
            self.state[CLK] = u8::from(high);
            for &(node, value) in counter::CHANGES[row] {
                self.state[node] = value;
            }
            for &(node, delta) in counter::GROUND[row] {
                self.ground_count[node] = self.ground_count[node].wrapping_add_signed(delta);
            }
            for &(node, delta) in counter::POWER[row] {
                self.power_count[node] = self.power_count[node].wrapping_add_signed(delta);
            }
            for &(node, delta) in counter::BRIDGE[row] {
                self.bridge_count[node] = self.bridge_count[node].wrapping_add_signed(delta);
            }
            self.counter_frozen = true;
            self.next.clear();
            self.next_generation();
            counter::BANKS[row](self);
            std::mem::swap(&mut work, &mut self.next);
            let result = self.settle_with_limit(work, 99);
            self.counter_frozen = false;
            self.counter_cursor = result.as_ref().ok().map(|()| counter::NEXT[row]);
            result
        } else {
            work.push(n);
            self.settle(work)
        }
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
    reset_release_field: u32,
    pub thresholds: [u32; 2],
    x: usize,
    sync_count: usize,
    charges: [u32; 2],
}
impl Chip {
    pub fn new() -> Result<Self, UnstableCircuit> {
        let mut circuit = Circuit::default();
        for n in [
            PIN_S1,
            PIN_S2,
            PIN_S3,
            PIN_BALLSPEED,
            PIN_BALLSIZE,
            PIN_BATSIZE,
            PIN_RIGHT_SERVE,
            PIN_LEFT_SERVE,
            PIN_TEST1,
            PIN_TEST2,
        ] {
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
            reset_release_field: 4,
            thresholds: [100, 100],
            x: 0,
            sync_count: 0,
            charges: [0, 0],
        };
        chip.inputs(1, 100, 100, 0)?;
        // Blocks reset only while their scan region is active. Hold reset for
        // four fields while the momentary game-selection contact is applied.
        chip.circuit.drive(RESET, false)?;
        chip.run(128)?;
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
            self.reset_release_field = self.fields + 4;
            self.circuit.drive(RESET, false)?;
            for n in [PIN_S1, PIN_S2, PIN_S3] {
                self.circuit.drive(n, true)?;
            }
        }
        self.mode = mode.clamp(1, 10);
        self.thresholds = [sub.clamp(20, 235), des.clamp(20, 235)];
        for (bit, n) in [
            PIN_LEFT_SERVE,
            PIN_RIGHT_SERVE,
            PIN_BATSIZE,
            PIN_BALLSPEED,
            PIN_BALLSIZE,
        ]
        .into_iter()
        .enumerate()
        {
            self.circuit.drive(n, buttons & (1 << bit) == 0)?;
        }
        Ok(())
    }
    fn sync(&mut self, vertical: bool) -> Result<(), UnstableCircuit> {
        if vertical {
            self.charges.fill(0);
            self.circuit.drive(PIN_LEFT_BAT, false)?;
            self.circuit.drive(PIN_RIGHT_BAT, false)?;
            if self.fields >= self.reset_release_field && self.circuit.pulls[RESET] != 1 {
                self.circuit.drive(RESET, true)?;
            }
            return Ok(());
        }
        for (i, pin) in [PIN_LEFT_BAT, PIN_RIGHT_BAT].into_iter().enumerate() {
            self.charges[i] += 1;
            if self.charges[i] == self.thresholds[i] {
                self.circuit.drive(pin, true)?;
            }
        }
        if self.fields >= self.selection_release_field {
            for n in [PIN_S1, PIN_S2, PIN_S3] {
                if self.circuit.pulls[n] != 1 {
                    self.circuit.drive(n, true)?;
                }
            }
            return Ok(());
        }
        let strobe = [PIN2_STROBE1, PIN2_STROBE2, PIN2_STROBE3, PIN2_STROBE4][(self.mode - 1) % 4];
        self.circuit.drive(
            [PIN_S1, PIN_S2, PIN_S3][(self.mode - 1) / 4],
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
                    self.sync(true)?;
                } else if self.sync_count >= 8 {
                    self.line += 1;
                    self.x = 0;
                    self.sync(false)?;
                }
                self.sync_count = 0;
            }
            let s = &self.circuit.state;
            if self.x < WIDTH && self.line < HEIGHT {
                // Four raw output channels plus sync/blanking, not invented sprites.
                self.raster[self.line * WIDTH + self.x] = s[PIN2_LVIDEO]
                    | (s[PIN2_RVIDEO] << 1)
                    | (s[PIN2_BACKGROUND] << 2)
                    | (s[PIN2_BOUNDS] << 3)
                    | (s[PIN2_BLANKING] << 4)
                    | (s[PIN2_SYNC] << 5);
            }
            self.x += 1;
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
            c.reset_release_field = c.fields + 3;
            let result = c.circuit.drive(RESET, false);
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
#[cfg(test)]
mod tests {
    use super::*;

    fn drive_both(
        compiled: &mut GateCircuit,
        reference: &mut reference::ReferenceCircuit,
        node: usize,
        high: bool,
    ) -> Result<(), UnstableCircuit> {
        compiled.drive(node, high)?;
        reference.drive(node, high)?;
        assert_eq!(
            compiled.state, reference.state,
            "after driving node {node} to {high}"
        );
        Ok(())
    }

    #[test]
    fn generated_fanout_matches_ordered_transistor_events() {
        for node in 0..NODE_COUNT {
            for high in [false, true] {
                let mut generated = GateCircuit::default();
                let mut original = GateCircuit::default();
                generated.state[node] = u8::from(!high);
                generated.update_node(node, u8::from(high));
                for &(a, b) in &compiled::FANOUT
                    [compiled::FANOUT_OFFSETS[node]..compiled::FANOUT_OFFSETS[node + 1]]
                {
                    original.connection_change(a, b, high);
                    original.enqueue(a);
                    if !high {
                        original.enqueue(b);
                    }
                }
                assert_eq!(
                    generated.ground_count, original.ground_count,
                    "ground fanout {node}/{high}"
                );
                assert_eq!(
                    generated.power_count, original.power_count,
                    "power fanout {node}/{high}"
                );
                assert_eq!(
                    generated.bridge_count, original.bridge_count,
                    "bridge fanout {node}/{high}"
                );
                assert_eq!(generated.next, original.next, "event order {node}/{high}");
            }
        }
    }

    #[test]
    fn counter_matches_reference_through_disable_reset_and_repeated_levels()
    -> Result<(), UnstableCircuit> {
        let mut compiled = GateCircuit::default();
        let mut reference = reference::ReferenceCircuit::default();
        for n in [
            PIN_S1,
            PIN_S2,
            PIN_S3,
            PIN_BALLSPEED,
            PIN_BALLSIZE,
            PIN_BATSIZE,
            PIN_LEFT_SERVE,
            PIN_RIGHT_SERVE,
            PIN_TEST1,
            PIN_TEST2,
        ] {
            compiled.pulls[n] = 1;
            reference.pulls[n] = 1;
        }
        compiled.pulls[RESET] = -1;
        reference.pulls[RESET] = -1;
        compiled.settle(NODES.iter().map(|n| n.0).collect())?;
        reference.settle(NODES.iter().map(|n| n.0).collect())?;
        assert_eq!(compiled.state, reference.state);
        let mut macro_edges = 0;
        for edge in 0..20_000 {
            if edge == 10_000 {
                compiled.queue_generation = u32::MAX;
            }
            // Include the all-keys-down disable state, then re-enter the normal
            // orbit. External writes invalidate the cached transition index.
            if edge % 997 == 0 {
                for (bit, node) in [PIN_S1, PIN_S2, PIN_S3, PIN_LEFT_SERVE, PIN_RIGHT_SERVE]
                    .into_iter()
                    .enumerate()
                {
                    drive_both(
                        &mut compiled,
                        &mut reference,
                        node,
                        (edge / 997) & (1 << bit) != 0,
                    )?;
                }
            }
            if edge % 4096 == 0 {
                drive_both(&mut compiled, &mut reference, RESET, false)?;
            } else if edge % 4096 == 256 {
                drive_both(&mut compiled, &mut reference, RESET, true)?;
            }
            let high = compiled.state[CLK] == 0;
            drive_both(&mut compiled, &mut reference, CLK, high)?;
            macro_edges += usize::from(compiled.counter_cursor.is_some());
            if edge % 127 == 0 {
                drive_both(&mut compiled, &mut reference, CLK, high)?;
            }
        }
        assert!(
            macro_edges > 1000,
            "comparison must exercise the macro, not only fallback"
        );
        Ok(())
    }
}
