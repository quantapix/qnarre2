import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

import {combineLatest, ConnectableObservable, Observable} from 'rxjs';
import {map, publishLast, publishReplay} from 'rxjs/operators';

import {LocService} from './loc';
import {CONTENT_URL_PREFIX} from './docs';

import {
  CurrentNodes,
  NavNode,
  NavResponse,
  NavViews,
  VersionInfo
} from './nav.model';
export {
  CurrentNodes,
  CurrentNode,
  NavNode,
  NavResponse,
  NavViews,
  VersionInfo
} from './nav.model';

export const navPath = CONTENT_URL_PREFIX + 'navigation.json';

@Injectable()
export class NavService {
  views: Observable<NavViews>;
  version: Observable<VersionInfo>;
  nodes: Observable<CurrentNodes>;

  constructor(private http: HttpClient, private loc: LocService) {
    const info = this.fetchInfo();
    this.views = this.getViews(info);
    this.nodes = this.getNodes(this.views);
    this.version = this.getVersion(info);
  }

  private fetchInfo() {
    const info: Observable<NavResponse> = this.http
      .get<NavResponse>(navPath)
      .pipe(publishLast());
    (info as ConnectableObservable<NavResponse>).connect();
    return info;
  }

  private getVersion(nav: Observable<NavResponse>) {
    const info: Observable<VersionInfo> = nav.pipe(
      map(response => response.__versionInfo),
      publishLast()
    );
    (info as ConnectableObservable<VersionInfo>).connect();
    return info;
  }

  private getViews(nav: Observable<NavResponse>) {
    const views: Observable<NavViews> = nav.pipe(
      map(response => {
        const vs = Object.assign({}, response);
        Object.keys(vs).forEach(k => {
          if (k.startsWith('_')) {
            delete vs[k];
          }
        });
        return vs as NavViews;
      }),
      publishLast()
    );
    (views as ConnectableObservable<NavViews>).connect();
    return views;
  }

  private getNodes(views: Observable<NavViews>) {
    const nodes: Observable<CurrentNodes> = combineLatest([
      views.pipe(map(vs => this.urlToNodesMap(vs))),
      this.loc.path$
    ]).pipe(
      map(r => ({navMap: r[0], url: r[1]})),
      map(r => {
        const match = /^api/.exec(r.url);
        if (match) {
          r.url = match[0];
        }
        return r.navMap.get(r.url) || {'': {view: '', url: r.url, nodes: []}};
      }),
      publishReplay(1)
    );
    (nodes as ConnectableObservable<CurrentNodes>).connect();
    return nodes;
  }

  private urlToNodesMap(vs: NavViews) {
    const m = new Map<string, CurrentNodes>();
    Object.keys(vs).forEach(v => vs[v].forEach(n => this.walk(v, m, n)));
    return m;
  }

  private ensureTooltip(node: NavNode) {
    const title = node.title;
    const tooltip = node.tooltip;
    if (tooltip == null && title) {
      node.tooltip = title + (/[a-zA-Z0-9]$/.test(title) ? '.' : '');
    }
  }

  private walk(
    view: string,
    map: Map<string, CurrentNodes>,
    n: NavNode,
    ps: NavNode[] = []
  ) {
    const nodes = [n, ...ps];
    const url = n.url;
    this.ensureTooltip(n);
    if (url) {
      const cleaned = url.replace(/\/$/, '');
      if (!map.has(cleaned)) {
        map.set(cleaned, {});
      }
      const item = map.get(cleaned);
      item[view] = {url, view, nodes};
    }
    if (n.children) {
      n.children.forEach(c => this.walk(view, map, c, nodes));
    }
  }
}
