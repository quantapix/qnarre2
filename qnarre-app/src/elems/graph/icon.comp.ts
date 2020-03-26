import {Component} from '@angular/core';
import * as params from '../../graph/params';

export enum GraphIconType {
  CONST = 'CONST',
  META = 'META',
  OP = 'OP',
  SERIES = 'SERIES',
  SUMMARY = 'SUMMARY'
}

@Component({
  selector: 'qnr-graph-icon',
  template: '',
  styleUrls: []
})
export class IconComponent {
  type: GraphIconType;
  fillOverride?: string;
  strokeOverride?: string;
  vertical = false;
  height = 20;
  faded = false;
  _fill: string; // computeFill(type, fillOverride)
  _stroke: string; // computeStroke(type, strokeOverride);

  constructor() {}

  getSvgDefinableElement(): HTMLElement {
    return this.$.svgDefs;
  }
}

function computeFill(type: GraphIconType, fillOverride?: string) {
  if (fillOverride) return fillOverride;
  switch (type) {
    case GraphIconType.META:
      return params.NmetaColors.DEFAULT_FILL;
    case GraphIconType.SERIES:
      return params.NseriesColors.DEFAULT_FILL;
    default:
      return params.NoperColors.DEFAULT_FILL;
  }
}

function computeStroke(type: GraphIconType, strokeOverride?: string) {
  if (strokeOverride) return strokeOverride;
  switch (type) {
    case GraphIconType.META:
      return params.NmetaColors.DEFAULT_STROKE;
    case GraphIconType.SERIES:
      return params.NseriesColors.DEFAULT_STROKE;
    default:
      return params.NoperColors.DEFAULT_STROKE;
  }

  function isType(type: GraphIconType, targetType: GraphIconType) {
    return type === targetType;
  }

  function fadedClass(faded: boolean, shape: string) {
    return faded ? 'faded-' + shape : '';
  }
}
