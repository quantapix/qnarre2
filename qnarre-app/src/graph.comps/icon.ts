import {Component, Input} from '@angular/core';

import * as qp from '../graph.app/params';
import * as qt from '../graph.app/types';

@Component({
  selector: 'qnr-graph-icon',
  template: '',
  styleUrls: []
})
export class IconComp {
  $ = {svgDefs: {} as any};

  @Input() type?: qt.GraphIconT;
  @Input() height = 20;
  @Input() faded = false;
  @Input() vertical = false;
  @Input() fillOverride?: string;
  @Input() strokeOverride?: string;

  get fill() {
    if (this.fillOverride) return this.fillOverride;
    switch (this.type) {
      case qt.GraphIconT.META:
        return qp.MetaColors.FILL;
      case qt.GraphIconT.LIST:
        return qp.ListColors.FILL;
      default:
        return qp.OperColors.FILL;
    }
  }

  get stroke() {
    if (this.strokeOverride) return this.strokeOverride;
    switch (this.type) {
      case qt.GraphIconT.META:
        return qp.MetaColors.STROKE;
      case qt.GraphIconT.LIST:
        return qp.ListColors.STROKE;
      default:
        return qp.OperColors.STROKE;
    }
  }

  constructor() {}

  getSvgDefinableElement(): HTMLElement {
    return this.$.svgDefs;
  }
}

/*
function isType(type: qt.GraphIconT, targetType: qt.GraphIconT) {
  return type === targetType;
}

function fadedClass(faded: boolean, shape: string) {
  return faded ? 'faded-' + shape : '';
}
*/
