import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qe from './edata';
import * as qm from '../elems/graph/contextmenu';
import * as qn from './ndata';
import * as qs from './scene';
import * as qt from './types';
import * as qg from './graph';
import * as qp from './params';

export class Annos extends Array<Anno> implements qg.Annos {
  names = {} as qt.Dict<boolean>;

  pushAnno(a: Anno) {
    if (a.nd.name in this.names) return;
    this.names[a.nd.name] = true;
    if (this.length < qp.GdataPs.maxAnnotations) {
      this.push(a);
      return;
    }
    const t = qt.AnnoT.DOTS;
    const last = this[this.length - 1];
    if (last.type === t) {
      const nd = last.nd as qg.Ndots;
      nd.setMore(++nd.more);
      return;
    }
    const nd = new qn.Ndots(1);
    this.push(new Anno(t, nd, new Edata(nd), a.inbound));
  }

  buildGroup(s: qt.Selection, d: qg.Ndata, e: qs.GraphElem) {
    const gs = s
      .selectAll<any, qg.Anno>(function() {
        return this.childNodes;
      })
      .data(this, a => a.nd.name);
    gs.enter()
      .append('g')
      .attr('data-name', a => a.nd.name)
      .each(function(a) {
        const g = d3.select(this);
        e.addAnnoGroup(a, d, g);
        let t = qt.Class.Anno.EDGE;
        const me = a.edata && a.edata.metaedge;
        if (me && !me.numRegular) t += ' ' + qt.Class.Anno.CONTROL;
        if (me && me.numRef) t += ' ' + qt.Class.Edge.REF_LINE;
        qe.appendEdge(g, a, elem, t);
        if (a.type !== qt.AnnoT.DOTS) {
          addNameLabel(a, g);
          buildShape(a, g);
        } else addLabel(a, g, a.nd.name, qt.Class.Anno.DOTS);
      })
      .merge(gs)
      .attr(
        'class',
        a => qt.Class.Anno.GROUP + toClass(a.type) + qn.nodeClass(a.nd)
      )
      .each(function(a) {
        const g = d3.select(this);
        qs.positionAnno(g, a, d, e);
        if (a.type !== qt.AnnoT.DOTS) addInteraction(a, g, d, e);
      });
    gs.exit<qg.Anno>()
      .each(function(a) {
        const g = d3.select(this);
        e.removeAnnoGroup(a, d, g);
      })
      .remove();
    return gs;
  }
}

export class Anno implements qg.Anno {
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  offset = 0;
  nodes?: string[];
  points = [] as qt.Point[];

  constructor(
    public type: qt.AnnoT,
    public nd: qg.Ndata,
    public ed: qg.Edata,
    public inbound?: boolean
  ) {
    if (emeta && emeta.metaedge) {
      this.v = edata.metaedge.v;
      this.w = edata.metaedge.w;
    }
  }
}

function toClass(t: qt.AnnoT) {
  return ' ' + ((qt.AnnoT[t] || '').toLowerCase() || null) + ' ';
}

function addNameLabel(a: Anno, s: qt.Selection) {
  const path = a.nd.name.split('/');
  const t = path[path.length - 1];
  return addLabel(a, s, t);
}

function buildShape(a: Anno, s: qt.Selection) {
  if (a.type === qt.AnnoT.SUMMARY) {
    const s2 = qs.selectCreate(s, 'use');
    s2.attr('class', 'summary')
      .attr('xlink:href', '#summary-icon')
      .attr('cursor', 'pointer');
  } else {
    const s2 = qn.buildShape(s, a, qt.Class.Anno.NODE);
    qs.selectCreate(s2, 'title').text(a.nd.name);
  }
}

function addLabel(a: Anno, s: qt.Selection, l: string, dots?: string) {
  let ns = qt.Class.Anno.LABEL;
  if (dots) ns += ' ' + dots;
  const t = s
    .append('text')
    .attr('class', ns)
    .attr('dy', '.35em')
    .attr('text-anchor', a.inbound ? 'end' : 'start')
    .text(l);
  return qn.enforceLabelWidth(t);
}

function addInteraction(
  a: Anno,
  s: qt.Selection,
  d: qg.Ndata,
  e: qs.GraphElem
) {
  s.on('mouseover', (a: Anno) => {
    e.fire('anno-highlight', {
      name: a.nd.name,
      hostName: d.name
    });
  })
    .on('mouseout', (a: Anno) => {
      e.fire('anno-unhighlight', {
        name: a.nd.name,
        hostName: d.name
      });
    })
    .on('click', (a: Anno) => {
      (d3.event as Event).stopPropagation();
      e.fire('anno-select', {
        name: a.nd.name,
        hostName: d.name
      });
    });
  if (a.type !== qt.AnnoT.SUMMARY && a.type !== qt.AnnoT.CONSTANT) {
    s.on('contextmenu', qm.getMenu(e, qn.contextMenu(a.nd, e)));
  }
}
