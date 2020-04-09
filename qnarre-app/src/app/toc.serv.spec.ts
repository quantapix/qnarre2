import {DOCUMENT} from '@angular/common';
import {ReflectiveInjector} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {Subject} from 'rxjs';

import {ScrollItem, ScrollSpyInfo, ScrollSpyService} from './scroll-spy.serv';
import {Item, TocService} from './toc.serv';

describe('TocService', () => {
  let inj: ReflectiveInjector;
  let ss: MockSpyService;
  let ts: TocService;
  let lasts: Item[];

  function genToc(html = '', d = 'fizz/buzz'): HTMLDivElement {
    const el = document.createElement('div');
    el.innerHTML = html;
    ts.toc(el, d);
    return el;
  }

  beforeEach(() => {
    inj = ReflectiveInjector.resolveAndCreate([
      {provide: DomSanitizer, useClass: TestDomSanitizer},
      {provide: DOCUMENT, useValue: document},
      {provide: ScrollSpyService, useClass: MockSpyService},
      TocService
    ]);
    ss = inj.get(ScrollSpyService);
    ts = inj.get(TocService);
    ts.items.subscribe(items => (lasts = items));
  });

  describe('items', () => {
    it('should emit the latest value to new subscribers', () => {
      const ev1 = createItem('Heading A');
      const ev2 = createItem('Heading B');
      let v1: Item[] | undefined;
      let v2: Item[] | undefined;
      ts.items.next([]);
      ts.items.subscribe(v => (v1 = v));
      expect(v1).toEqual([]);
      ts.items.next([ev1, ev2]);
      ts.items.subscribe(v => (v2 = v));
      expect(v2).toEqual([ev1, ev2]);
    });
    it('should emit the same values to all subscribers', () => {
      const ev1 = createItem('Heading A');
      const ev2 = createItem('Heading B');
      const vs: Item[][] = [];
      ts.items.subscribe(v => vs.push(v));
      ts.items.subscribe(v => vs.push(v));
      ts.items.next([ev1, ev2]);
      expect(vs).toEqual([
        [ev1, ev2],
        [ev1, ev2]
      ]);
    });
  });

  describe('active', () => {
    it('should emit the active heading index (or null)', () => {
      const xs: (number | null)[] = [];
      ts.active.subscribe(i => xs.push(i));
      genToc();
      ss.$lastInfo.active.next({index: 42} as ScrollItem);
      ss.$lastInfo.active.next({index: 0} as ScrollItem);
      ss.$lastInfo.active.next(null);
      ss.$lastInfo.active.next({index: 7} as ScrollItem);
      expect(xs).toEqual([null, 42, 0, null, 7]);
    });

    it('should reset athe active index (and unspy) when calling `reset()`', () => {
      const xs: (number | null)[] = [];
      ts.active.subscribe(i => xs.push(i));
      genToc();
      const unspy = ss.$lastInfo.unspy;
      ss.$lastInfo.active.next({index: 42} as ScrollItem);
      expect(unspy).not.toHaveBeenCalled();
      expect(xs).toEqual([null, 42]);
      ts.reset();
      expect(unspy).toHaveBeenCalled();
      expect(xs).toEqual([null, 42, null]);
    });

    it('should reset the active index (and unspy) when a new `items` is requested', () => {
      const xs: (number | null)[] = [];
      ts.active.subscribe(i => xs.push(i));
      genToc();
      const unspy1 = ss.$lastInfo.unspy;
      ss.$lastInfo.active.next({index: 1} as ScrollItem);
      expect(unspy1).not.toHaveBeenCalled();
      expect(xs).toEqual([null, 1]);
      ts.toc();
      expect(unspy1).toHaveBeenCalled();
      expect(xs).toEqual([null, 1, null]);
      genToc();
      const unspy2 = ss.$lastInfo.unspy;
      ss.$lastInfo.active.next({index: 3} as ScrollItem);
      expect(unspy2).not.toHaveBeenCalled();
      expect(xs).toEqual([null, 1, null, null, 3]);
      genToc();
      ss.$lastInfo.active.next({index: 4} as ScrollItem);
      expect(unspy2).toHaveBeenCalled();
      expect(xs).toEqual([null, 1, null, null, 3, null, 4]);
    });

    it('should emit the active index for the latest `items`', () => {
      const xs: (number | null)[] = [];
      ts.active.subscribe(i => xs.push(i));
      genToc();
      const a1 = ss.$lastInfo.active;
      a1.next({index: 1} as ScrollItem);
      a1.next({index: 2} as ScrollItem);
      genToc();
      const a2 = ss.$lastInfo.active;
      a2.next({index: 3} as ScrollItem);
      a2.next({index: 4} as ScrollItem);
      expect(xs).toEqual([null, 1, 2, null, 3, 4]);
    });
  });

  describe('should clear items', () => {
    beforeEach(() => {
      const ev1 = createItem('Heading A');
      const ev2 = createItem('Heading B');
      ts.items.next([ev1, ev2]);
      expect(lasts).not.toEqual([]);
    });
    it('when reset()', () => {
      ts.reset();
      expect(lasts).toEqual([]);
    });
    it('when given undefined doc element', () => {
      ts.toc(undefined);
      expect(lasts).toEqual([]);
    });
    it('when given doc element w/ no hs', () => {
      genToc('<p>This</p><p>and</p><p>that</p>');
      expect(lasts).toEqual([]);
    });
    it('when given doc element w/ hs other than h1, h2 & h3', () => {
      genToc('<h4>and</h4><h5>that</h5>');
      expect(lasts).toEqual([]);
    });
    it('when given doc element w/ no-toc hs', () => {
      genToc(`
        <h2 class="no-toc">one</h2><p>some one</p>
        <h2 class="notoc">two</h2><p>some two</p>
        <h2 class="no-Toc">three</h2><p>some three</p>
        <h2 class="noToc">four</h2><p>some four</p>
      `);
      expect(lasts).toEqual([]);
    });
  });

  describe('when given many heading', () => {
    let d: string;
    let e: HTMLDivElement;
    let hs: NodeListOf<HTMLHeadingElement>;
    beforeEach(() => {
      d = 'fizz/buzz';
      e = genToc(
        `
        <h1>Fun with TOC</h1>

        <h2 id="heading-one-special-id">Heading one</h2>
          <p>h2 toc 0</p>

        <h2>H2 Two</h2>
          <p>h2 toc 1</p>

        <h2>H2 <b>Three</b></h2>
          <p>h2 toc 2</p>
          <h3 id="h3-3a">H3 3a</h3> <p>h3 toc 3</p>
          <h3 id="h3-3b">H3 3b</h3> <p>h3 toc 4</p>

            <!-- h4 shouldn't be in TOC -->
            <h4 id="h4-3b">H4 of h3-3b</h4> <p>an h4</p>

        <h2><i>H2 4 <b>repeat</b></i></h2>
          <p>h2 toc 5</p>

        <h2><b>H2 4 <i>repeat</i></b></h2>
          <p>h2 toc 6</p>

        <h2 class="no-toc" id="skippy">Skippy</h2>
          <p>Skip this header</p>

        <h2 id="h2-6">H2 6</h2>
          <p>h2 toc 7</p>
          <h3 id="h3-6a">H3 6a</h3> <p>h3 toc 8</p>
      `,
        d
      );
      hs = e.querySelectorAll('h1,h2,h3,h4') as NodeListOf<HTMLHeadingElement>;
    });
    it('should have items with expect number of Items', () => {
      expect(lasts.length).toEqual(hs.length - 2);
    });
    it("should have href with d and heading's id", () => {
      const t = lasts.find(item => item.title === 'Heading one');
      expect(t?.href).toEqual(`${d}#heading-one-special-id`);
    });
    it('should have level "h1" for an <h1>', () => {
      const t = lasts.find(item => item.title === 'Fun with TOC');
      expect(t?.level).toEqual('h1');
    });
    it('should have level "h2" for an <h2>', () => {
      const t = lasts.find(item => item.title === 'Heading one');
      expect(t?.level).toEqual('h2');
    });
    it('should have level "h3" for an <h3>', () => {
      const t = lasts.find(item => item.title === 'H3 3a');
      expect(t?.level).toEqual('h3');
    });
    it("should have title which is heading's textContent ", () => {
      const h = hs[3];
      const t = lasts[3];
      expect(h.textContent).toEqual(t.title);
    });
    it('should have "SafeHtml" content which is heading\'s innerHTML ', () => {
      const h = hs[3];
      const c = lasts[3].content;
      expect((c as TestSafeHtml).changingThisBreaksApplicationSecurity).toEqual(
        h.innerHTML
      );
    });
    it('should calculate and set id of heading without an id', () => {
      const id = hs[2].getAttribute('id');
      expect(id).toEqual('h2-two');
    });
    it('should have href with d and calculated heading id', () => {
      const t = lasts.find(item => item.title === 'H2 Two');
      expect(t?.href).toEqual(`${d}#h2-two`);
    });
    it('should ignore HTML in heading when calculating id', () => {
      const id = hs[3].getAttribute('id');
      const t = lasts[3];
      expect(id).toEqual('h2-three', 'heading id');
      expect(t.href).toEqual(`${d}#h2-three`, 't href');
    });
    it('should avoid repeating an id when calculating', () => {
      const ts = lasts.filter(item => item.title === 'H2 4 repeat');
      expect(ts[0].href).toEqual(`${d}#h2-4-repeat`, 'first');
      expect(ts[1].href).toEqual(`${d}#h2-4-repeat-2`, 'second');
    });
  });

  describe('Item for an h2 with links and extra whitespace', () => {
    let d: string;
    let t: Item;
    beforeEach(() => {
      d = 'fizz/buzz/';
      genToc(
        `
        <h2 id="setup-to-develop-locally">
          Setup to <a href="moo">develop</a> <i>locally</i>.
          <a class="header-link" href="tutorial/toh-pt1#setup-to-develop-locally" aria-hidden="true">
            <span class="icon">icon-link</span>
          </a>
          <div class="github-links">
            <a>GitHub</a>
            <a>links</a>
          </div>
        </h2>
      `,
        d
      );
      t = lasts[0];
    });
    it('should have expected href', () => {
      expect(t.href).toEqual(`${d}#setup-to-develop-locally`);
    });
    it('should have expected title', () => {
      expect(t.title).toEqual('Setup to develop locally.');
    });
    it('should have removed anchor link and GitHub links from t html content', () => {
      expect(
        (t.content as TestSafeHtml).changingThisBreaksApplicationSecurity
      ).toEqual('Setup to develop <i>locally</i>.');
    });
    it("should have bypassed HTML sanitizing of heading's innerHTML ", () => {
      const s: TestDomSanitizer = inj.get(DomSanitizer);
      expect(s.bypassSecurityTrustHtml).toHaveBeenCalledWith(
        'Setup to develop <i>locally</i>.'
      );
    });
  });
});

interface TestSafeHtml extends SafeHtml {
  changingThisBreaksApplicationSecurity: string;
  getTypeName: () => string;
}

class TestDomSanitizer {
  bypassSecurityTrustHtml = jasmine
    .createSpy('bypassSecurityTrustHtml')
    .and.callFake((html: string) => {
      return {
        changingThisBreaksApplicationSecurity: html,
        getTypeName: () => 'HTML'
      } as TestSafeHtml;
    });
}

class MockSpyService {
  private $$lastInfo:
    | {
        active: Subject<ScrollItem | null>;
        unspy: any;
      }
    | undefined;

  get $lastInfo() {
    if (!this.$$lastInfo) throw new Error('$lastInfo not defined');
    return this.$$lastInfo;
  }

  spyOn(_hs: HTMLHeadingElement[]): ScrollSpyInfo {
    return (this.$$lastInfo = {
      active: new Subject<ScrollItem | null>(),
      unspy: jasmine.createSpy('unspy')
    });
  }
}

function createItem(title: string, level = 'h2', href = '', content = title) {
  return {title, href, level, content};
}
