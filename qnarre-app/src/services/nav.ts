import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

import {combineLatest, ConnectableObservable, Observable} from 'rxjs';
import {map, publishLast, publishReplay} from 'rxjs/operators';

import * as qt from '../types';
import {CONTENT_URL_PREFIX} from './docs';
import {LocService} from './loc';

export const navPath = CONTENT_URL_PREFIX + 'navigation.json';

export interface Item {
  title: string;
  url?: string;
  tooltip?: string;
  hidden?: boolean;
  children?: Item[];
}

export type Views = qt.Dict<Item[]>;

export interface Node {
  url: string;
  view: string;
  items: Item[];
}

export type Nodes = qt.Dict<Node>;

export interface Version {
  full: string;
  major: number;
  minor: number;
  patch: number;
}

@Injectable()
export class NavService {
  views$: Observable<Views>;
  nodes$: Observable<Nodes>;

  constructor(private http: HttpClient, private loc: LocService) {
    this.views$ = this.fetch();
    this.nodes$ = this.merge();
  }

  private fetch() {
    let o = this.http
      .get<Views>(navPath)
      .pipe(publishLast()) as ConnectableObservable<Views>;
    o.connect();
    o = o.pipe(
      map(vs => {
        const vs2 = Object.assign({}, vs) as Views;
        Object.keys(vs2).forEach(n => {
          if (n.startsWith('_')) delete vs2[n];
        });
        return vs2;
      }),
      publishLast()
    ) as ConnectableObservable<Views>;
    o.connect();
    return o;
  }

  private merge() {
    const o = combineLatest([
      this.views$.pipe(map(vs => this.nodes(vs))),
      this.loc.path$
    ]).pipe(
      map(p => ({ns: p[0], url: p[1]})),
      map(e => {
        const m = /^api/.exec(e.url);
        if (m) e.url = m[0];
        return e.ns.get(e.url) ?? {'': {view: '', url: e.url, items: []}};
      }),
      publishReplay(1)
    );
    (o as ConnectableObservable<Nodes>).connect();
    return o;
  }

  private nodes(vs: Views) {
    const ns = new Map<string, Nodes>();
    Object.keys(vs).forEach(n => vs[n].forEach(i => this.walk(ns, n, i)));
    return ns;
  }

  private walk(
    ns: Map<string, Nodes>,
    view: string,
    i: Item,
    more: Item[] = []
  ) {
    this.fix(i);
    const url = i.url;
    const items = [i, ...more];
    if (url) {
      const u2 = url.replace(/\/$/, '');
      if (!ns.has(u2)) ns.set(u2, {});
      const n = ns.get(u2)!;
      n[view] = {url, view, items};
    }
    if (i.children) i.children.forEach(c => this.walk(ns, view, c, items));
  }

  private fix(i: Item) {
    const t = i.title;
    if (t && i.tooltip === undefined) {
      i.tooltip = t + (/[a-zA-Z0-9]$/.test(t) ? '.' : '');
    }
  }
}
