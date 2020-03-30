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
    if (ed.meta) this.nodes = ed.meta.nodes;
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

  addText(sel: qt.Sel, t: string, dots?: string) {
    let ns = qt.Class.Anno.LABEL;
    if (dots) ns += ' ' + dots;
    const s = sel
      .append('text')
      .attr('class', ns)
      .attr('dy', '.35em')
      .attr('text-anchor', this.inbound ? 'end' : 'start')
      .text(t);
    return qs.enforceWidth(s);
  }

  addName(sel: qt.Sel) {
    const path = this.nd.name.split('/');
    const t = path[path.length - 1];
    return this.addText(sel, t);
  }

  addInteraction(sel: qt.Sel, d: qg.Ndata, e: qs.Elem) {
    sel
      .on('mouseover', function() {
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
      sel.on('contextmenu', qm.getMenu(e, this.nd.contextMenu(e)));
    }
  }

  build(sel: qt.Sel) {
    if (this.type === qt.AnnoT.SUMMARY) {
      const s = qs.selectCreate(sel, 'use');
      s.attr('class', 'summary')
        .attr('xlink:href', '#summary-icon')
        .attr('cursor', 'pointer');
    } else {
      const d = this.nd as qn.Ndata;
      const s = d.build(sel, qt.Class.Anno.NODE);
      qs.selectCreate(s, 'title').text(this.nd.name);
    }
  }
}

export class Annos extends Array<Anno> implements qg.Annos {
  names = {} as qt.Dict<boolean>;

  add(a: Anno) {
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
    this.push(new Anno(t, nd, new qe.Edata(), a.inbound));
  }

  build(sel: qt.Sel, d: qg.Ndata, e: qs.Elem) {
    const ss = sel
      .selectAll<any, qg.Anno>(function() {
        return this.childNodes;
      })
      .data(this, a => a.nd.name);
    ss.enter()
      .append('g')
      .attr('data-name', a => a.nd.name)
      .each(function(a) {
        const s = d3.select(this);
        e.addAnnoSel(a.nd.name, d.name, s);
        let t = qt.Class.Anno.EDGE;
        const m = a.ed.meta as qe.Emeta;
        if (m && !m.num.regular) t += ' ' + qt.Class.Anno.CONTROL;
        if (m && m.num.ref) t += ' ' + qt.Class.Edge.REF_LINE;
        m.addEdge(s, e, t);
        if (a.type === qt.AnnoT.DOTS) {
          a.addText(s, a.nd.name, qt.Class.Anno.DOTS);
        } else {
          a.addName(s);
          a.build(s);
        }
      })
      .merge(ss)
      .attr(
        'class',
        a => qt.Class.Anno.GROUP + toClass(a.type) + qg.toClass(a.nd.type)
      )
      .each(function(a) {
        const s = d3.select(this);
        qs.positionAnno(s, a, d, e);
        if (a.type !== qt.AnnoT.DOTS) a.addInteraction(s, d, e);
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
