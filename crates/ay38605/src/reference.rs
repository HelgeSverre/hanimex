// Frozen switch-level reference from submarine-chip-inspector. MIT notice: ../LICENSE.
use super::{NODE_COUNT, TRANS_COUNT, UnstableCircuit, data::*};
#[derive(Debug)]
pub struct ReferenceCircuit {
    pub state: [u8; NODE_COUNT],
    pub(super) pulls: [i8; NODE_COUNT],
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
impl Default for ReferenceCircuit {
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
impl ReferenceCircuit {
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
    pub(super) fn settle(&mut self, mut list: Vec<usize>) -> Result<(), UnstableCircuit> {
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
