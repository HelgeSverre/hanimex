//! Pin-level workbench for recovered circuits; console adapters are not yet modeled.
#[cfg_attr(feature = "pong", path = "ay38500.rs")]
#[cfg_attr(not(feature = "pong"), path = "ay38606.rs")]
mod data;
use data::*;
// Reuse the frozen solver unchanged. Each build supplies its own topology and rails.
#[path = "../../ay38605/src/reference.rs"]
mod reference;
use reference::ReferenceCircuit;
use std::cell::RefCell;

#[derive(Debug)]
/// The switch network exceeded the reference solver’s settling bound.
pub struct UnstableCircuit;
impl std::fmt::Display for UnstableCircuit {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("netlist did not settle within 100 passes")
    }
}
impl std::error::Error for UnstableCircuit {}
thread_local! { static CIRCUIT: RefCell<ReferenceCircuit> = RefCell::new(ReferenceCircuit::default()); }
/// Restore power-on state with reset low. Returns 1 if settling fails.
#[unsafe(no_mangle)]
pub extern "C" fn circuit_init() -> u32 {
    CIRCUIT.with(|c| {
        let mut c = c.borrow_mut();
        *c = ReferenceCircuit::default();
        c.pulls[RESET] = -1;
        u32::from(c.settle(NODES.iter().map(|n| n.0).collect()).is_err())
    })
}
/// Drive a non-rail node. Returns 2 for an invalid node, 1 for settling failure.
#[unsafe(no_mangle)]
pub extern "C" fn circuit_drive(node: usize, high: u32) -> u32 {
    if node >= NODE_COUNT || node == GND || node == VCC {
        return 2;
    }
    CIRCUIT.with(|c| u32::from(c.borrow_mut().drive(node, high != 0).is_err()))
}
/// Advance up to one million half-clock edges. Oversized requests return 2.
#[unsafe(no_mangle)]
pub extern "C" fn circuit_run(edges: u32) -> u32 {
    if edges > 1_000_000 {
        return 2;
    }
    CIRCUIT.with(|c| {
        let mut c = c.borrow_mut();
        for _ in 0..edges {
            let high = c.state[CLK] == 0;
            if c.drive(CLK, high).is_err() {
                return 1;
            }
        }
        0
    })
}
/// Stable address of the canonical node bytes in this Wasm instance.
#[unsafe(no_mangle)]
pub extern "C" fn circuit_nodes() -> *const u8 {
    CIRCUIT.with(|c| c.borrow().state.as_ptr())
}
/// Number of node bytes exposed by `circuit_nodes`.
#[unsafe(no_mangle)]
pub extern "C" fn circuit_node_count() -> usize {
    NODE_COUNT
}
