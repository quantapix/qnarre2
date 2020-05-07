import {DOCUMENT} from '@angular/common';
import {Inject, Injectable} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ReplaySubject} from 'rxjs';
import {ScrollSpyInfo, ScrollSpyService} from './scroll-spy.serv';

export interface Item {
  content: SafeHtml;
  href: string;
  secondary?: boolean;
  level: string;
  title: string;
}

@Injectable()
export class TocService {
  items = new ReplaySubject<Item[]>(1);
  active = new ReplaySubject<number | null>(1);
  private spy: ScrollSpyInfo | null = null;

  constructor(
    @Inject(DOCUMENT) private doc: any,
    private san: DomSanitizer,
    private scroll: ScrollSpyService
  ) {}

  toc(e?: Element, doc = '') {
    this.resetSpy();
    if (!e) {
      this.items.next([]);
      return;
    }
    const hs = this.findHeadings(e);
    const idMap = new Map<string, number>();
    const ts = hs.map(h => {
      const {title, content} = this.extractHtml(h);
      return {
        level: h.tagName.toLowerCase(),
        href: `${doc}#${this.idFor(h, idMap)}`,
        title,
        content
      };
    });
    this.items.next(ts);
    this.spy = this.scroll.spyOn(hs);
    this.spy.active.subscribe(i => this.active.next(i && i.index));
  }

  reset() {
    this.resetSpy();
    this.items.next([]);
  }

  private extractHtml(h: HTMLHeadingElement) {
    const d = this.doc.createElement('div') as HTMLDivElement;
    d.innerHTML = h.innerHTML;
    queryAll(d, '.github-links, .header-link').forEach(remove);
    queryAll(d, 'a').forEach(a => {
      const p = a.parentNode;
      while (a.childNodes.length) {
        p?.insertBefore(a.childNodes[0], a);
      }
      remove(a);
    });
    return {
      title: (d.textContent || '').trim(),
      content: this.san.bypassSecurityTrustHtml(d.innerHTML.trim())
    };
  }

  private findHeadings(e: Element) {
    const hs = queryAll<HTMLHeadingElement>(e, 'h1,h2,h3');
    const skip = (h: HTMLHeadingElement) =>
      !/(?:no-toc|notoc)/i.test(h.className);
    return hs.filter(skip);
  }

  private resetSpy() {
    if (this.spy) {
      this.spy.unspy();
      this.spy = null;
    }
    this.active.next(null);
  }

  private idFor(h: HTMLHeadingElement, m: Map<string, number>) {
    let id = h.id;
    function add(k: string) {
      const old = m.get(k) || 0;
      const c = old + 1;
      m.set(k, c);
      return c === 1 ? k : `${k}-${c}`;
    }
    if (id) add(id);
    else {
      id = (h.textContent || '').trim().toLowerCase().replace(/\W+/g, '-');
      id = add(id);
      h.id = id;
    }
    return id;
  }
}

function queryAll<K extends keyof HTMLElementTagNameMap>(
  e: Element,
  sel: K
): HTMLElementTagNameMap[K][];
function queryAll<K extends keyof SVGElementTagNameMap>(
  e: Element,
  sel: K
): SVGElementTagNameMap[K][];
function queryAll<E extends Element = Element>(e: Element, sel: string): E[];
function queryAll(e: Element, sel: string) {
  return Array.from(e.querySelectorAll(sel));
}

function remove(n: Node) {
  n.parentNode?.removeChild(n);
}
