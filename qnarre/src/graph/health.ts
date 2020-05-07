import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qn from './ndata';
import * as qp from './params';
import * as qt from './types';
import * as qg from './graph';

export type Selection = d3.Selection<any, any, any, any>;

interface HealthStats {
  min: number;
  max: number;
  mean: number;
  stddev: number;
}

export function addHealth(
  elem: SVGElement,
  health: qt.Health,
  ndata: qn.Ndata,
  id: number,
  width = 60,
  height = 10,
  y = 0,
  x?: number
) {
  d3.select(elem.parent as any)
    .selectAll('.health-pill')
    .remove();
  if (!health) return;
  const d = health.value;
  const es = d.slice(2, 8);
  const nan = es[0];
  const negInf = es[1];
  const posInf = es[5];
  const total = d[1];
  const stats: HealthStats = {
    min: d[8],
    max: d[9],
    mean: d[10],
    stddev: Math.sqrt(d[11])
  };
  if (ndata && ndata.node.type === qt.NdataT.OPER) {
    width /= 2;
    height /= 2;
  }
  const group = document.createElementNS(qp.SVG_SPACE, 'g');
  group.classList.add('health-pill');
  const defs = document.createElementNS(qp.SVG_SPACE, 'defs');
  group.appendChild(defs);
  const grad = document.createElementNS(qp.SVG_SPACE, 'linearGradient');
  const gradId = 'health-pill-gradient-' + id;
  grad.setAttribute('id', gradId);
  let count = 0;
  let offset = '0%';
  for (let i = 0; i < es.length; i++) {
    if (!es[i]) continue;
    count += es[i];
    const s0 = document.createElementNS(qp.SVG_SPACE, 'stop');
    s0.setAttribute('offset', offset);
    s0.setAttribute('stop-color', qp.healthEntries[i].background_color);
    grad.appendChild(s0);
    const s1 = document.createElementNS(qp.SVG_SPACE, 'stop');
    const percent = (count * 100) / total + '%';
    s1.setAttribute('offset', percent);
    s1.setAttribute('stop-color', qp.healthEntries[i].background_color);
    grad.appendChild(s1);
    offset = percent;
  }
  defs.appendChild(grad);
  const rect = document.createElementNS(qp.SVG_SPACE, 'rect');
  rect.setAttribute('fill', 'url(#' + gradId + ')');
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(height));
  rect.setAttribute('y', String(y));
  group.appendChild(rect);
  const title = document.createElementNS(qp.SVG_SPACE, 'title');
  title.textContent = getHealthText(health, total, es, stats);
  group.appendChild(title);
  let round = false;
  if (ndata != null) {
    const px = ndata.x - width / 2;
    let py = ndata.y - height - ndata.h / 2 - 2;
    if (ndata.labelOffset < 0) py += ndata.labelOffset;
    group.setAttribute('transform', 'translate(' + px + ', ' + py + ')');
    if (es[2] || es[3] || es[4]) {
      const n = ndata.node as qg.Noper;
      const a = n.attr;
      if (a && a.length) {
        for (let i = 0; i < a.length; i++) {
          if (a[i].key === 'T') {
            const o = a[i].value['type'];
            round = o && /^DT_(BOOL|INT|UINT)/.test(o);
            break;
          }
        }
      }
    }
  }
  const svg = document.createElementNS(qp.SVG_SPACE, 'text');
  if (Number.isFinite(stats.min) && Number.isFinite(stats.max)) {
    const min = renderHealthStat(stats.min, round);
    const max = renderHealthStat(stats.max, round);
    if (total > 1) {
      svg.textContent = min + ' ~ ' + max;
    } else {
      svg.textContent = min;
    }
    if (nan > 0 || negInf > 0 || posInf > 0) {
      svg.textContent += ' (';
      const bad: string[] = [];
      if (nan > 0) bad.push(`NaN×${nan}`);
      if (negInf > 0) bad.push(`-∞×${negInf}`);
      if (posInf > 0) bad.push(`+∞×${posInf}`);
      svg.textContent += bad.join('; ') + ')';
    }
  } else {
    svg.textContent = '(No finite elements)';
  }
  svg.classList.add('health-pill-stats');
  if (x === undefined) x = width / 2;
  svg.setAttribute('x', String(x));
  svg.setAttribute('y', String(y - 2));
  group.appendChild(svg);
  // Polymer.dom(elem.parent).appendChild(group);
}

export function addAllHealths(
  root: SVGElement,
  dict: qt.Dict<qt.Health[]>,
  idx: number
) {
  if (!dict) return;
  let i = 1;
  const r = d3.select(root);
  r.selectAll('g.nodeshape').each(d => {
    const ndata = d as qn.Ndata;
    const hs = dict[ndata.node.name];
    const h = hs ? hs[idx] : undefined;
    if (h) addHealth(this as SVGElement, h, ndata, i++);
  });
}

export function renderHealthStat(stat: number, round: boolean) {
  if (round) return stat.toFixed(0);
  if (Math.abs(stat) >= 1) return stat.toFixed(1);
  return stat.toExponential(1);
}

function getHealthText(
  h: qt.Health,
  total: number,
  es: number[],
  stats: HealthStats
) {
  let t = 'Device: ' + h.device_name + '\n';
  t += 'dtype: ' + h.dtype + '\n';
  let shape = '(scalar)';
  if (h.shape.length > 0) shape = '(' + h.shape.join(',') + ')';
  t += '\nshape: ' + shape + '\n\n';
  t += '#(elements): ' + total + '\n';
  const ns = [] as string[];
  for (let i = 0; i < es.length; i++) {
    if (es[i] > 0) ns.push('#(' + qp.healthEntries[i].label + '): ' + es[i]);
  }
  t += ns.join(', ') + '\n\n';
  if (stats.max >= stats.min) {
    t += 'min: ' + stats.min + ', max: ' + stats.max + '\n';
    t += 'mean: ' + stats.mean + ', stddev: ' + stats.stddev;
  }
  return t;
}
