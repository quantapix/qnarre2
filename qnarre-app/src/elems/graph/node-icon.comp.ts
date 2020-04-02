import {Component, Input, OnInit} from '@angular/core';

import * as qg from './graph';
import * as qt from './types';

import * as qn from '../../graph/ndata';

@Component({
  selector: 'qnr-graph-node-icon',
  template: `
    <qnr-graph-icon
      id="icon"
      [type]="type"
      [height]="height"
      [faded]="faded"
      [vertical]="vertical"
      [fillOverride]="fillOverride"
      [strokeOverride]="strokeOverride"
    ></qnr-graph-icon>
  `,
  styles: [
    `
      qnr-graph-icon {
        --qnr-graph-faded: var(--qnr-graph-faded);
      }
    `
  ]
})
export class NodeIconComp implements OnInit {
  $ = {icon: {} as any};

  @Input() height = 20;
  const = false;
  summary = false;

  @Input() node?: qg.Ncomb;
  @Input() ndata?: qn.Ndata;

  @Input() set type(t: qt.GraphIconT | undefined) {
    this._type = t;
  }
  get type() {
    const n = this.node;
    if (n) {
      switch (n.type) {
        case qt.NdataT.OPER: {
          const o = (n as qg.Noper).op;
          if (typeof o !== 'string') return qt.GraphIconT.OPER;
          if (o === 'Const' || this.const) return qt.GraphIconT.CONST;
          if (o.endsWith('Summary') || this.summary) return qt.GraphIconT.SUMY;
          return qt.GraphIconT.OPER;
        }
        case qt.NdataT.META:
          return qt.GraphIconT.META;
        case qt.NdataT.LIST:
          return qt.GraphIconT.LIST;
      }
    }
    return this._type;
  }
  private _type?: qt.GraphIconT;

  get vertical() {
    if (qg.isClus(this.node)) return this.node.noControls;
    return this._vertical;
  }
  private _vertical = false;

  get faded() {
    return !!this.ndata?.faded;
  }

  @Input() colorBy = qt.ColorBy.STRUCT;
  @Input() tidx?: (_: string) => number;

  @Input() set fillOverride(f: string | undefined) {
    if (f !== this._fillOverride) {
      qn.delGradDefs(this.$.icon.getSvgDefinableElement());
      this._fillOverride = f;
    }
    if (this.node && this.ndata && this.tidx) {
      this.ndata?.fillFor(
        this.tidx,
        this.colorBy,
        false,
        this.$.icon.getSvgDefinableElement()
      );
    }
  }
  get fillOverride() {
    if (this.node && this.ndata && this.tidx) {
      return this.ndata.fillFor(this.tidx, this.colorBy, false);
    }
    return this._fillOverride;
  }
  private _fillOverride?: string;

  get strokeOverride() {
    const f = this.fillOverride;
    return f ? qn.strokeFor(f) : undefined;
  }

  constructor() {}

  ngOnInit() {}
}
