use super::*;

// Exhaustively compare each recognized cell with a raw channel walk. This
// includes arbitrary charge values, not only states seen in a running game.
#[test]
fn latch_cells_match_channel_solver_for_every_input_and_charge_combination() {
    let mut cases = 0;
    for &(store, data, clock) in latches::CELLS {
        let devices: Vec<_> = TRANSISTORS
            .iter()
            .copied()
            .filter(|&(_, a, b)| [store, data].contains(&a) || [store, data].contains(&b))
            .collect();
        let mut deps: Vec<_> = devices
            .iter()
            .map(|t| t.0)
            .chain([store, data, clock])
            .filter(|&n| n != GND && n != VCC)
            .collect();
        deps.sort_unstable();
        deps.dedup();
        assert!(deps.len() <= 16);
        for pattern in 0..1usize << deps.len() {
            for root in [store, data] {
                let mut circuit = GateCircuit::default();
                for (bit, &node) in deps.iter().enumerate() {
                    circuit.state[node] = ((pattern >> bit) & 1) as u8;
                }
                // Only the source has rail drivers; the specialized cell never
                // reads the transfer counts, which it derives from the gate.
                circuit.ground_count[data] = devices
                    .iter()
                    .filter(|&&(g, a, b)| circuit.state[g] != 0 && (a == GND || b == GND))
                    .count() as u16;
                let mut expected = circuit.state;
                let mut stack = vec![root];
                let mut group = Vec::new();
                while let Some(node) = stack.pop() {
                    if group.contains(&node) {
                        continue;
                    }
                    group.push(node);
                    if node == GND || node == VCC {
                        continue;
                    }
                    for &(gate, a, b) in &devices {
                        if circuit.state[gate] != 0 {
                            if a == node {
                                stack.push(b);
                            } else if b == node {
                                stack.push(a);
                            }
                        }
                    }
                }
                let value = if group.contains(&GND) {
                    0
                } else if group.contains(&VCC) {
                    1
                } else {
                    u8::from(
                        group
                            .iter()
                            .any(|&n| circuit.pulls[n] == 1 || circuit.state[n] != 0),
                    )
                };
                for node in group {
                    if node != GND && node != VCC {
                        expected[node] = value;
                    }
                }
                circuit.compiled_recalc(root);
                assert_eq!(
                    circuit.state, expected,
                    "cell {store}/{data}, root {root}, pattern {pattern}"
                );
                cases += 1;
            }
        }
    }
    assert!(cases >= latches::CELLS.len() * 2);
    println!("checked {cases} cell/input/charge/root combinations");
}
