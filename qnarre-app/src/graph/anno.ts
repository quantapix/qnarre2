import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qe from './edata';
import * as qm from '../elems/graph/contextmenu';
import * as qn from './ndata';
import * as qs from './scene';
import * as qt from './types';
import * as qg from './graph';
import * as qp from './params';

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

  initSizes() {
    switch (this.type) {
      case qt.AnnoT.CONSTANT:
        _.extend(this, qp.PARAMS.constant.size);
        break;
      case qt.AnnoT.SHORTCUT:
        if (qg.isOper(this.nd)) {
          _.extend(this, qp.PARAMS.shortcutSize.oper);
        } else if (qg.isMeta(this.nd)) {
          _.extend(this, qp.PARAMS.shortcutSize.meta);
        } else if (qg.isList(this.nd)) {
          _.extend(this, qp.PARAMS.shortcutSize.list);
        } else {
          throw Error('Invalid type: ' + this.nd.type);
        }
        break;
      case qt.AnnoT.SUMMARY:
        _.extend(this, qp.PARAMS.constant.size);
        break;
    }
  }

  addLabel(s: qt.Selection, l: string, dots?: string) {
    let ns = qt.Class.Anno.LABEL;
    if (dots) ns += ' ' + dots;
    const t = s
      .append('text')
      .attr('class', ns)
      .attr('dy', '.35em')
      .attr('text-anchor', this.inbound ? 'end' : 'start')
      .text(l);
    return qs.enforceWidth(t);
  }

  addNameLabel(s: qt.Selection) {
    const path = this.nd.name.split('/');
    const t = path[path.length - 1];
    return this.addLabel(s, t);
  }

  addInteraction(s: qt.Selection, d: qg.Ndata, e: qs.GraphElem) {
    s.on('mouseover', function() {
      e.fire('anno-highlight', {
        name: this.nd.name,
        hostName: d.name
      });
    })
      .on('mouseout', function() {
        e.fire('anno-unhighlight', {
          name: this.nd.name,
          hostName: d.name
        });
      })
      .on('click', function() {
        (d3.event as Event).stopPropagation();
        e.fire('anno-select', {
          name: this.nd.name,
          hostName: d.name
        });
      });
    if (this.type !== qt.AnnoT.SUMMARY && this.type !== qt.AnnoT.CONSTANT) {
      s.on('contextmenu', qm.getMenu(e, this.nd.contextMenu(e)));
    }
  }

  buildShape(s: qt.Selection) {
    if (this.type === qt.AnnoT.SUMMARY) {
      const s2 = qs.selectCreate(s, 'use');
      s2.attr('class', 'summary')
        .attr('xlink:href', '#summary-icon')
        .attr('cursor', 'pointer');
    } else {
      const s2 = qn.buildShape(s, a, qt.Class.Anno.NODE);
      qs.selectCreate(s2, 'title').text(this.nd.name);
    }
  }
}

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

  buildSels(s: qt.Selection, d: qg.Ndata, e: qs.GraphElem) {
    const ss = s
      .selectAll<any, qg.Anno>(function() {
        return this.childNodes;
      })
      .data(this, a => a.nd.name);
    ss.enter()
      .append('g')
      .attr('data-name', a => a.nd.name)
      .each(function(a) {
        const s2 = d3.select(this);
        e.addAnnoSel(a.nd.name, d.name, s2);
        let t = qt.Class.Anno.EDGE;
        const me = a.edata && a.edata.metaedge;
        if (me && !me.numRegular) t += ' ' + qt.Class.Anno.CONTROL;
        if (me && me.numRef) t += ' ' + qt.Class.Edge.REF_LINE;
        qe.appendEdge(s2, a, elem, t);
        if (a.type !== qt.AnnoT.DOTS) {
          a.addNameLabel(s2);
          a.buildShape(s2);
        } else {
          a.addLabel(s2, a.nd.name, qt.Class.Anno.DOTS);
        }
      })
      .merge(ss)
      .attr(
        'class',
        a => qt.Class.Anno.GROUP + toClass(a.type) + qg.toClass(a.nd.type)
      )
      .each(function(a) {
        const s2 = d3.select(this);
        qs.positionAnno(s2, a, d, e);
        if (a.type !== qt.AnnoT.DOTS) a.addInteraction(s2, d, e);
      });
    ss.exit<qg.Anno>()
      .each(function(a) {
        e.delAnnoSel(a.nd.name, d.name);
      })
      .remove();
    return ss;
  }
}

function toClass(t: qt.AnnoT) {
  return ' ' + ((qt.AnnoT[t] || '').toLowerCase() || null) + ' ';
}
