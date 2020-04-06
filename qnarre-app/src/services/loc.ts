import {Injectable} from '@angular/core';
import {Location, PlatformLocation} from '@angular/common';

import {ReplaySubject} from 'rxjs';
import {map, tap} from 'rxjs/operators';

import {GaService} from './ga';
import {UpdatesService} from './updates';
import {ScrollService} from './scroll';

const dec = decodeURIComponent;
const enc = encodeURIComponent;

type Dict<T> = {[k: string]: T};

@Injectable()
export class LocService {
  private readonly anchor = document.createElement('a');
  private urlSub = new ReplaySubject<string>(1);
  private update = false;

  url$ = this.urlSub.pipe(map(u => this.strip(u)));
  path$ = this.url$.pipe(
    map(u => (u.match(/[^?#]*/) || [])[0]),
    tap(u => this.ga.locationChanged(u))
  );

  constructor(
    private ga: GaService,
    private loc: Location,
    private scroll: ScrollService,
    private pLoc: PlatformLocation,
    ups: UpdatesService
  ) {
    this.urlSub.next(loc.path(true));
    this.loc.subscribe(e => this.urlSub.next(e.url || ''));
    ups.activated.subscribe(() => (this.update = true));
  }

  go(url?: string) {
    if (url) {
      url = this.strip(url);
      if (url.startsWith('http')) {
        this.goExternal(url);
      } else if (this.update) {
        this.scroll.removeStoredScrollInfo();
        this.goExternal(url);
      } else {
        this.loc.go(url);
        this.urlSub.next(url);
      }
    }
  }

  goExternal(url: string) {
    window.location.assign(url);
  }

  replace(url: string) {
    window.location.replace(url);
  }

  search() {
    const s = {} as Dict<string | undefined>;
    const path = this.loc.path();
    const q = path.indexOf('?');
    if (q > -1) {
      try {
        path
          .substr(q + 1)
          .split('&')
          .forEach(p => {
            const ps = p.split('=');
            if (ps[0]) s[dec(ps[0])] = ps[1] && dec(ps[1]);
          });
      } catch (e) {}
    }
    return s;
  }

  setSearch(title: string, d: Dict<string | undefined>) {
    const search = Object.keys(d).reduce((a, k) => {
      const v = d[k];
      return v === undefined
        ? a
        : (a += (a ? '&' : '?') + `${enc(k)}=${enc(v)}`);
    }, '');
    this.pLoc.replaceState({}, title, this.pLoc.pathname + search);
  }

  handleAnchorClick(
    a: HTMLAnchorElement,
    button = 0,
    ctrl = false,
    meta = false
  ) {
    if (button !== 0 || ctrl || meta) return true;
    const t = a.target;
    if (t && t !== '_self') return true;
    if (a.getAttribute('download') != null) return true;
    const {pathname, search, hash} = a;
    const url = pathname + search + hash;
    this.anchor.href = url;
    if (a.href !== this.anchor.href || !/\/[^/.]*$/.test(pathname)) return true;
    this.go(url);
    return false;
  }

  private strip(url: string) {
    return url.replace(/^\/+/, '').replace(/\/+(\?|#|$)/, '$1');
  }
}
