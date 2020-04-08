import {
  DOCUMENT,
  Location,
  PlatformLocation,
  PopStateEvent,
  ViewportScroller
} from '@angular/common';
import {Injectable, Inject, OnDestroy} from '@angular/core';
import {fromEvent, Subject} from 'rxjs';
import {debounceTime, takeUntil} from 'rxjs/operators';

type ScrollPosition = [number, number];
interface ScrollPositionPopStateEvent extends PopStateEvent {
  state?: {scrollPosition: ScrollPosition};
}

export const topMargin = 16;

@Injectable()
export class ScrollService implements OnDestroy {
  private _topOffset = null as number | null;
  private _topElem?: Element;
  private onDestroy = new Subject<void>();
  private storage: Storage;

  poppedPos?: ScrollPosition;
  supportManualScrollRestoration: boolean =
    !!window &&
    'scrollTo' in window &&
    'scrollX' in window &&
    'scrollY' in window &&
    !!history &&
    'scrollRestoration' in history;

  get topOffset() {
    if (!this._topOffset) {
      const t = this.doc.querySelector('.app-toolbar');
      this._topOffset = ((t && t.clientHeight) || 0) + topMargin;
    }
    return this._topOffset;
  }

  get topElem() {
    if (!this._topElem) {
      this._topElem = this.doc.getElementById('top-of-page') || this.doc.body;
    }
    return this._topElem;
  }

  constructor(
    @Inject(DOCUMENT) private doc: any,
    private pLoc: PlatformLocation,
    private scroller: ViewportScroller,
    private loc: Location
  ) {
    try {
      this.storage = window.sessionStorage;
    } catch {
      this.storage = {
        length: 0,
        clear: () => undefined,
        getItem: () => null,
        key: () => null,
        removeItem: () => undefined,
        setItem: () => undefined
      };
    }
    fromEvent(window, 'resize')
      .pipe(takeUntil(this.onDestroy))
      .subscribe(() => (this._topOffset = null));
    fromEvent(window, 'scroll')
      .pipe(debounceTime(250), takeUntil(this.onDestroy))
      .subscribe(() => this.updateScrollPositionInHistory());
    fromEvent(window, 'beforeunload')
      .pipe(takeUntil(this.onDestroy))
      .subscribe(() => this.updateScrollLocationHref());
    if (this.supportManualScrollRestoration) {
      history.scrollRestoration = 'manual';
      const locationSubscription = this.loc.subscribe(
        (e: ScrollPositionPopStateEvent) => {
          if (e.type === 'hashchange') {
            this.scrollToPos();
          } else {
            this.removeStoredScrollInfo();
            this.poppedPos = e.state ? e.state.scrollPosition : undefined;
          }
        }
      );
      this.onDestroy.subscribe(() => locationSubscription.unsubscribe());
    }
    if (window.location.href !== this.getStoredScrollLocationHref()) {
      this.removeStoredScrollInfo();
    }
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

  scroll() {
    const h = this.curHash();
    const e: HTMLElement = h ? this.doc.getElementById(h) : this.topElem;
    this.scrollTo(e);
  }

  withHash() {
    return !!this.curHash();
  }

  scrollAfter(delay: number) {
    const p = this.getStoredScrollPosition();
    if (p) {
      this.scroller.scrollToPosition(p);
    } else {
      if (this.needToFixScrollPosition()) {
        this.scrollToPos();
      } else {
        if (this.withHash()) setTimeout(() => this.scroll(), delay);
        else this.scrollToTop();
      }
    }
  }

  scrollTo(e?: Element) {
    if (e) {
      e.scrollIntoView();
      if (window && window.scrollBy) {
        const o = this.topOffset ?? 0;
        window.scrollBy(0, e.getBoundingClientRect().top - o);
        if (window.pageYOffset < 20) window.scrollBy(0, -window.pageYOffset);
      }
    }
  }

  scrollToTop() {
    this.scrollTo(this.topElem);
  }

  scrollToPos() {
    if (this.poppedPos) {
      this.scroller.scrollToPosition(this.poppedPos);
      this.poppedPos = undefined;
    }
  }

  updateScrollLocationHref(): void {
    this.storage.setItem('scrollLocationHref', window.location.href);
  }

  updateScrollPositionInHistory() {
    if (this.supportManualScrollRestoration) {
      const currentScrollPosition = this.scroller.getScrollPosition();
      this.loc.replaceState(this.loc.path(true), undefined, {
        scrollPosition: currentScrollPosition
      });
      this.storage.setItem('scrollPosition', currentScrollPosition.join(','));
    }
  }

  getStoredScrollLocationHref(): string | null {
    const href = this.storage.getItem('scrollLocationHref');
    return href || null;
  }

  getStoredScrollPosition(): ScrollPosition | null {
    const position = this.storage.getItem('scrollPosition');
    if (!position) {
      return null;
    }
    const [x, y] = position.split(',');
    return [+x, +y];
  }

  removeStoredScrollInfo() {
    this.storage.removeItem('scrollLocationHref');
    this.storage.removeItem('scrollPosition');
  }

  needToFixScrollPosition() {
    return this.supportManualScrollRestoration && !!this.poppedPos;
  }

  private curHash() {
    return decodeURIComponent(this.pLoc.hash.replace(/^#/, ''));
  }
}
