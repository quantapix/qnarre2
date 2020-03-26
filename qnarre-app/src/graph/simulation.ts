import {dispatch} from 'd3-dispatch';
import {timer} from 'd3-timer';

import * as qf from './force';
import * as qt from './core/types';

export class Decay {
  tgt = 0;
  value: number;
  constructor(public velo = 0.6, public alpha = 1, public min = 0.001) {
    this.value = 1 - Math.pow(this.min, 1 / 300);
  }
  setVelo(v: number) {
    this.velo = 1 - v;
  }
  setAlpha(v: number) {
    this.value = v;
  }
  tick() {
    this.alpha += (this.tgt - this.alpha) * this.value;
  }
}

export function simulation<
  N extends qf.Ndata,
  L extends qf.Ldata<N> | undefined
>() {
  return new Simulation<N, L>();
}

export class Simulation<N extends qf.Ndata, L extends qf.Ldata<N> | undefined> {
  radius = 10;
  angle = Math.PI * (3 - Math.sqrt(5));
  forces = new Map<string, qf.Force<N, L>>();
  stepper = timer(this.step.bind(this));
  event = dispatch('tick', 'end');

  constructor(public ns = [] as N[], public decay = new Decay()) {}

  init() {
    const ns = this.ns;
    ns.forEach((n, i) => {
      n.idx = i;
      if (n.fix) {
        n.x = n.fix.x;
        n.y = n.fix.y;
      }
      if (isNaN(n.x) || isNaN(n.y)) {
        const r = this.radius * Math.sqrt(i);
        const a = i * this.angle;
        n.x = r * Math.cos(a);
        n.y = r * Math.sin(a);
      }
      if (isNaN(n.vx) || isNaN(n.vy)) n.vx = n.vy = 0;
    });
    this.forces.forEach(f => f.init(ns));
  }

  restart() {
    this.stepper.restart(this.step.bind(this));
    return this;
  }

  stop() {
    this.stepper.stop();
    return this;
  }

  setNodes(ns: N[]) {
    this.ns = ns;
    this.init();
    return this;
  }

  setAlphaTarget(tgt: number) {
    this.decay.tgt = tgt;
    return this;
  }

  setForce(name: string, f?: qf.Force<N, L>) {
    if (f) this.forces.set(name, f.init(this.ns));
    else this.forces.delete(name);
    return this;
  }

  step() {
    this.tick();
    this.event.call('tick', this as any);
    if (this.decay.alpha < this.decay.min) {
      this.stepper.stop();
      this.event.call('end', this as any);
    }
  }

  tick(iters = 1) {
    for (let k = 0; k < iters; ++k) {
      this.decay.tick();
      this.forces.forEach(f => f.apply(this.decay.alpha));
      this.ns.forEach(n => {
        if (n.fix === undefined) n.x += n.vx *= this.decay.velo;
        else {
          n.x = n.fix.x;
          n.vx = 0;
        }
        if (n.fix === undefined) n.y += n.vy *= this.decay.velo;
        else {
          n.y = n.fix.y;
          n.vy = 0;
        }
      });
    }
    return this;
  }

  find(p: qt.Point, radius?: number) {
    if (radius === undefined) radius = Number.POSITIVE_INFINITY;
    else radius *= radius;
    let r: N | undefined;
    this.ns.forEach((n: N) => {
      const d = {x: p.x - n.x, y: p.y - n.y};
      const d2 = d.x * d.x + d.y * d.y;
      if (d2 < radius!) {
        r = n;
        radius = d2;
      }
      return r;
    });
  }

  on(name: 'tick' | 'end' | string, listener: ((s: this) => void) | undefined) {
    this.event.on(name, listener as any);
    return this;
  }
}
