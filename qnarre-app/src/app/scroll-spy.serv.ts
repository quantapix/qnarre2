import {Inject, Injectable} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {fromEvent, Observable, ReplaySubject, Subject} from 'rxjs';
import {auditTime, distinctUntilChanged, takeUntil} from 'rxjs/operators';

import {ScrollService} from './scroll.serv';

export interface ScrollItem {
  element: Element;
  index: number;
}

export interface ScrollSpyInfo {
  active: Observable<ScrollItem | null>;
  unspy: () => void;
}

export class ScrollSpiedElement implements ScrollItem {
  top = 0;
  constructor(
    public readonly element: Element,
    public readonly index: number
  ) {}
  calculateTop(scrollTop: number, topOffset: number) {
    this.top = scrollTop + this.element.getBoundingClientRect().top - topOffset;
  }
}

export class ScrollSpiedElementGroup {
  activeScrollItem: ReplaySubject<ScrollItem | null> = new ReplaySubject(1);
  private spiedElements: ScrollSpiedElement[];

  constructor(elements: Element[]) {
    this.spiedElements = elements.map(
      (elem, i) => new ScrollSpiedElement(elem, i)
    );
  }

  calibrate(scrollTop: number, topOffset: number) {
    this.spiedElements.forEach(spiedElem =>
      spiedElem.calculateTop(scrollTop, topOffset)
    );
    this.spiedElements.sort((a, b) => b.top - a.top); // Sort in descending `top` order.
  }

  onScroll(scrollTop: number, maxScrollTop: number) {
    let activeItem: ScrollItem | undefined;
    if (scrollTop + 1 >= maxScrollTop) {
      activeItem = this.spiedElements[0];
    } else {
      this.spiedElements.some(spiedElem => {
        if (spiedElem.top <= scrollTop) {
          activeItem = spiedElem;
          return true;
        }
        return false;
      });
    }
    this.activeScrollItem.next(activeItem || null);
  }
}

@Injectable()
export class ScrollSpyService {
  private spiedGroups: ScrollSpiedElementGroup[] = [];
  private onStopListening = new Subject();
  private resizeEvents = fromEvent(window, 'resize').pipe(
    auditTime(300),
    takeUntil(this.onStopListening)
  );
  private scrollEvents = fromEvent(window, 'scroll').pipe(
    auditTime(10),
    takeUntil(this.onStopListening)
  );
  private lastHeight = -1;
  private lastMaxTop = -1;

  constructor(
    @Inject(DOCUMENT) private doc: any,
    private scroll: ScrollService
  ) {}

  spyOn(elements: Element[]): ScrollSpyInfo {
    if (!this.spiedGroups.length) {
      this.resizeEvents.subscribe(() => this.onResize());
      this.scrollEvents.subscribe(() => this.onScroll());
      this.onResize();
    }
    const t = this.getTop();
    const o = this.getTopOffset();
    const maxScrollTop = this.lastMaxTop;
    const g = new ScrollSpiedElementGroup(elements);
    g.calibrate(t, o);
    g.onScroll(t, maxScrollTop);
    this.spiedGroups.push(g);
    return {
      active: g.activeScrollItem.asObservable().pipe(distinctUntilChanged()),
      unspy: () => this.unspy(g)
    };
  }

  private getContentHeight() {
    return this.doc.body.scrollHeight || Number.MAX_SAFE_INTEGER;
  }

  private getTop() {
    return (window && window.pageYOffset) || 0;
  }

  private getTopOffset() {
    return this.scroll.topOffset! + 50;
  }

  private getViewportHeight() {
    return this.doc.body.clientHeight || 0;
  }

  private onResize() {
    const ch = this.getContentHeight();
    const vh = this.getViewportHeight();
    const t = this.getTop();
    const o = this.getTopOffset();
    this.lastHeight = ch;
    this.lastMaxTop = ch - vh;
    this.spiedGroups.forEach(group => group.calibrate(t, o));
  }

  private onScroll() {
    if (this.lastHeight !== this.getContentHeight()) this.onResize();
    const t = this.getTop();
    const max = this.lastMaxTop;
    this.spiedGroups.forEach(g => g.onScroll(t, max));
  }

  private unspy(gr: ScrollSpiedElementGroup) {
    gr.activeScrollItem.complete();
    this.spiedGroups = this.spiedGroups.filter(g => g !== gr);
    if (!this.spiedGroups.length) this.onStopListening.next();
  }
}
