import {EventEmitter} from '@angular/core';

import * as qf from './force';
import * as qs from './simulation';
import * as qt from './core/types';

const Params = {
  links: 1 / 50,
  collision: 1,
  charge: -1
};

const spectrum = [
  // "rgb(222,237,250)"
  'rgb(176,212,243)',
  'rgb(128,186,236)',
  'rgb(77,158,228)',
  'rgb(38,137,223)',
  'rgb(0,116,217)',
  'rgb(0,106,197)'
  // "rgb(0,94,176)"
  // "rgb(0,82,154)"
  // "rgb(0,60,113)"
];

export class Ndata implements qf.Ndata {
  size = 0;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fix?: qt.Point;

  constructor(public id: string, public idx: number, d?: any) {
    this.x = d?.x ?? NaN;
    this.y = d?.y ?? NaN;
    this.vx = d?.vx ?? NaN;
    this.vy = d?.vy ?? NaN;
  }

  normal = () => Math.sqrt(this.size / 100);

  get r() {
    return 50 * this.normal() + 10;
  }

  get fontSize() {
    return 30 * this.normal() + 10 + 'px';
  }

  get color() {
    const i = Math.floor(spectrum.length * this.normal());
    return spectrum[i];
  }
}

export class Ldata implements qf.Ldata<Ndata> {
  constructor(public idx: number, public ns: Ndata[]) {}
}

export class ForceGraph {
  ticker: EventEmitter<qs.Simulation<Ndata, Ldata>> = new EventEmitter();
  sim?: qs.Simulation<Ndata, Ldata>;

  constructor(
    public ns = [] as Ndata[],
    public ls = [] as Ldata[],
    opts = {w: 0, h: 0} as qt.Area
  ) {
    this.init(opts);
  }

  connectNodes(ns: Ndata[]) {
    const l = new Ldata(NaN, ns);
    this.sim!.stop();
    this.ls.push(l);
    this.sim!.setAlphaTarget(0.3).restart();
    this.initLinks();
  }

  initLinks() {
    this.sim!.setForce(
      'links',
      qf
        .links<Ndata, Ldata>(this.ls)
        .setId(n => n.id)
        .setStren(Params.links)
    );
  }

  init(opts: qt.Area) {
    if (!this.sim) {
      this.sim = qs
        .simulation<Ndata, Ldata>()
        .setForce(
          'charge',
          qf.bodies<Ndata>().setStren(n => Params.charge * n.r)
        )
        .setForce(
          'collide',
          qf
            .collide<Ndata>()
            .setStren(Params.collision)
            .setRadius(d => d['r'] + 5)
            .setIters(2)
        );
      this.sim.on('tick', () => this.ticker.emit(this.sim));
      this.sim.setNodes(this.ns);
      this.initLinks();
    }
    this.sim.setForce(
      'centers',
      qf.center<Ndata>({x: opts.w / 2, y: opts.h / 2})
    );
    this.sim.restart();
  }
}
