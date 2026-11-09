/*
 * Switch-level solver adapted from Visual6502 / Cole Johnson's chipsim.js.
 * Copyright (c) 2010 Brian Silverman, Barry Silverman
 * Copyright (c) 2018 Cole Johnson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import { names, nodeDefinitions, transistorDefinitions } from "./netlist";

/** Preserves the reference's DFS order and floating-charge resolution rules. */
export class SwitchNetlist {
  readonly state = new Uint8Array(
    Math.max(...nodeDefinitions.map((n) => n[0])) + 1,
  );
  readonly pulls = new Int8Array(this.state.length);
  readonly on = new Uint8Array(transistorDefinitions.length);
  private readonly gates: number[][] = Array.from(this.state, () => []);
  private readonly terminals: number[][] = Array.from(this.state, () => []);
  private readonly c1 = new Uint16Array(this.on.length);
  private readonly c2 = new Uint16Array(this.on.length);
  private readonly seen = new Uint32Array(this.state.length);
  private readonly queued = new Uint8Array(this.state.length);
  private readonly group: number[] = [];
  private next: number[] = [];
  private generation = 0;
  constructor() {
    for (const [n, pull] of nodeDefinitions) this.pulls[n] = pull ? 1 : 0;
    transistorDefinitions.forEach(([gate, a, b], t) => {
      if (a === names.gnd || a === names.vcc) [a, b] = [b, a];
      this.c1[t] = a;
      this.c2[t] = b;
      this.gates[gate].push(t);
      this.terminals[a].push(t);
      this.terminals[b].push(t);
      this.on[t] = +(gate === names.vcc);
    });
    this.state[names.vcc] = 1;
  }
  read(name: keyof typeof names) {
    return this.state[names[name]] !== 0;
  }
  pull(name: keyof typeof names, high: boolean) {
    this.pulls[names[name]] = high ? 1 : -1;
  }
  drive(name: keyof typeof names, high: boolean) {
    this.pull(name, high);
    this.settle([names[name]]);
  }
  all() {
    return nodeDefinitions
      .map((n) => n[0])
      .filter((n) => n !== names.gnd && n !== names.vcc);
  }
  private visit(n: number) {
    if (this.seen[n] === this.generation) return;
    this.seen[n] = this.generation;
    this.group.push(n);
    if (n === names.gnd || n === names.vcc) return;
    for (const t of this.terminals[n])
      if (this.on[t]) this.visit(this.c1[t] === n ? this.c2[t] : this.c1[t]);
  }
  private enqueue(n: number) {
    if (n === names.gnd || n === names.vcc || this.queued[n]) return;
    this.queued[n] = 1;
    this.next.push(n);
  }
  settle(list: number[]) {
    this.next = [];
    this.queued.fill(0);
    for (let pass = 0; pass < 100; pass++) {
      if (!list.length) return;
      for (const n of list) {
        if (n === names.gnd || n === names.vcc) continue;
        this.group.length = 0;
        if (++this.generation === 0xffffffff) {
          this.seen.fill(0);
          this.generation = 1;
        }
        this.visit(n);
        let value = 0;
        if (this.seen[names.gnd] === this.generation) value = 0;
        else if (this.seen[names.vcc] === this.generation) value = 1;
        else
          for (const g of this.group) {
            if (this.pulls[g] === 1) {
              value = 1;
              break;
            }
            if (this.pulls[g] === -1) {
              value = 0;
              break;
            }
            if (this.state[g]) {
              value = 1;
              break;
            }
          }
        for (const g of this.group) {
          if (g === names.vcc || this.state[g] === value) continue;
          this.state[g] = value;
          for (const t of this.gates[g]) {
            if (this.on[t] === value) continue;
            this.on[t] = value;
            this.enqueue(this.c1[t]);
            if (!value) this.enqueue(this.c2[t]);
          }
        }
      }
      list = this.next;
      this.next = [];
      this.queued.fill(0);
    }
    throw new Error("AY-3-8605 netlist did not settle within 100 passes");
  }
}
