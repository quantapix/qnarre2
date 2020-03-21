import * as d3 from 'd3';
import {Injectable} from '@angular/core';

import {Ndata, Ldata, ForceGraph} from './model';

@Injectable()
export class SceneService {
  applyZoomable(selem: any, celem: any) {
    const svg = d3.select(selem);
    const c = d3.select(celem);
    const zoom = () => {
      const t = d3.event.transform;
      c.attr('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
    };
    const z = d3.zoom().on('zoom', zoom);
    svg.call(z);
  }

  applyDraggable(svgElem: any, n: Ndata, g: ForceGraph) {
    const svg = d3.select(svgElem);
    const start = () => {
      d3.event.sourceEvent.stopPropagation();
      if (!d3.event.active) g.sim!.setAlphaTarget(0.3).restart();
      const drag = () => {
        n.fix = {x: d3.event.x, y: d3.event.y};
      };
      const end = () => {
        if (!d3.event.active) g.sim!.setAlphaTarget(0);
        n.fix = undefined;
      };
      d3.event.on('drag', drag).on('end', end);
    };
    svg.call(d3.drag().on('start', start));
  }

  getForceGraph(ns: Ndata[], ls: Ldata[], opts: {w: number; h: number}) {
    return new ForceGraph(ns, ls, opts);
  }
}
