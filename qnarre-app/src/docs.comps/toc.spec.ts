import {Component, CUSTOM_ELEMENTS_SCHEMA, DebugElement} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {asapScheduler, BehaviorSubject} from 'rxjs';

import {TocComp} from './toc';
import {ScrollService} from '../app/scroll.serv';
import {Item, TocService} from '../app/toc.serv';

describe('TocComp', () => {
  let de: DebugElement;
  let c: TocComp;
  let toc: TestTocService;
  let page: {
    listItems: DebugElement[];
    tocHeading: DebugElement;
    tocHeadingButtonEmbedded: DebugElement;
    tocH1Heading: DebugElement;
    tocMoreButton: DebugElement;
  };
  function setPage(): typeof page {
    return {
      listItems: de.queryAll(By.css('ul.toc-list>li')),
      tocHeading: de.query(By.css('.toc-heading')),
      tocHeadingButtonEmbedded: de.query(By.css('button.toc-heading.embedded')),
      tocH1Heading: de.query(By.css('.h1')),
      tocMoreButton: de.query(By.css('button.toc-more-items'))
    };
  }
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmbeddedTocComp, UnembeddedTocComp, TocComp],
      providers: [
        {provide: ScrollService, useClass: TestScrollService},
        {provide: TocService, useClass: TestTocService}
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    });
  });
  describe('when embedded in doc body', () => {
    let f: ComponentFixture<EmbeddedTocComp>;
    beforeEach(() => {
      f = TestBed.createComponent(EmbeddedTocComp);
      de = f.debugElement.children[0];
      c = de.componentInstance;
      toc = (TestBed.inject(TocService) as unknown) as TestTocService;
    });
    it('should create c', () => {
      expect(c).toBeTruthy();
    });
    it('should be in embedded state', () => {
      expect(c.embedded).toEqual(true);
    });
    it('should not display a ToC initially', () => {
      expect(c.type).toEqual('None');
    });

    describe('(once the lifecycle hooks have run)', () => {
      beforeEach(() => f.detectChanges());
      it('should not display anything when no h2 or h3 Items', () => {
        toc.items.next([tocItem('H1', 'h1')]);
        f.detectChanges();
        expect(de.children.length).toEqual(0);
      });
      it('should update when the Items are updated', () => {
        toc.items.next([tocItem('Heading A')]);
        f.detectChanges();
        expect(de.queryAll(By.css('li')).length).toBe(1);
        toc.items.next([
          tocItem('Heading A'),
          tocItem('Heading B'),
          tocItem('Heading C')
        ]);
        f.detectChanges();
        expect(de.queryAll(By.css('li')).length).toBe(3);
      });
      it('should only display H2 and H3 Items', () => {
        toc.items.next([
          tocItem('Heading A', 'h1'),
          tocItem('Heading B'),
          tocItem('Heading C', 'h3')
        ]);
        f.detectChanges();
        const ts = de.queryAll(By.css('li'));
        const tc = ts.map(i => i.nativeNode.textContent.trim());
        expect(ts.length).toBe(2);
        expect(tc.find(t => t === 'Heading A')).toBeFalsy();
        expect(tc.find(t => t === 'Heading B')).toBeTruthy();
        expect(tc.find(t => t === 'Heading C')).toBeTruthy();
        expect(setPage().tocH1Heading).toBeFalsy();
      });
      it('should stop listening for Items once destroyed', () => {
        toc.items.next([tocItem('Heading A')]);
        f.detectChanges();
        expect(de.queryAll(By.css('li')).length).toBe(1);
        c.ngOnDestroy();
        toc.items.next([
          tocItem('Heading A', 'h1'),
          tocItem('Heading B'),
          tocItem('Heading C')
        ]);
        f.detectChanges();
        expect(de.queryAll(By.css('li')).length).toBe(1);
      });
      describe('when fewer than `maxPrimary` Items', () => {
        beforeEach(() => {
          toc.items.next([
            tocItem('Heading A'),
            tocItem('Heading B'),
            tocItem('Heading C'),
            tocItem('Heading D')
          ]);
          f.detectChanges();
          page = setPage();
        });
        it('should have four displayed items', () => {
          expect(page.listItems.length).toEqual(4);
        });
        it('should not have secondary items', () => {
          expect(c.type).toEqual('Embedded');
          const aSecond = page.listItems.find(item => item.classes.secondary);
          expect(aSecond).toBeFalsy('should not find a secondary');
        });
        it('should not display expando buttons', () => {
          expect(page.tocHeadingButtonEmbedded).toBeFalsy(
            'top expand/collapse button'
          );
          expect(page.tocMoreButton).toBeFalsy('bottom more button');
        });
      });

      describe('when many Items', () => {
        let spy: any;
        beforeEach(() => {
          f.detectChanges();
          page = setPage();
          spy = ((TestBed.inject(
            ScrollService
          ) as unknown) as TestScrollService).toTop;
        });
        it('should have more than 4 displayed items', () => {
          expect(page.listItems.length).toBeGreaterThan(4);
        });
        it('should not display the h1 item', () => {
          expect(page.listItems.find(item => item.classes.h1)).toBeFalsy(
            'should not find h1 item'
          );
        });
        it('should be in collapsed state at start', () => {
          expect(c.collapsed).toBeTruthy();
        });
        it('should have "collapsed" class at start', () => {
          expect(de.children[0].classes.collapsed).toEqual(true);
        });
        it('should display expand buttons', () => {
          expect(page.tocHeadingButtonEmbedded).toBeTruthy(
            'top expand/collapse button'
          );
          expect(page.tocMoreButton).toBeTruthy('bottom more button');
        });
        it('should have secondary items', () => {
          expect(c.type).toEqual('Expandable');
        });
        it('should have secondary item with secondary class', () => {
          const aSecondary = page.listItems.find(
            item => item.classes.secondary
          );
          expect(aSecondary).toBeTruthy('should find a secondary');
        });

        describe('after click tocHeading button', () => {
          beforeEach(() => {
            page.tocHeadingButtonEmbedded.nativeElement.click();
            f.detectChanges();
          });
          it('should not be "collapsed"', () => {
            expect(c.collapsed).toEqual(false);
          });
          it('should not have "collapsed" class', () => {
            expect(de.children[0].classes.collapsed).toBeFalsy();
          });
          it('should not scroll', () => {
            expect(spy).not.toHaveBeenCalled();
          });
          it('should be "collapsed" after clicking again', () => {
            page.tocHeadingButtonEmbedded.nativeElement.click();
            f.detectChanges();
            expect(c.collapsed).toEqual(true);
          });
          it('should not scroll after clicking again', () => {
            page.tocHeadingButtonEmbedded.nativeElement.click();
            f.detectChanges();
            expect(spy).not.toHaveBeenCalled();
          });
        });

        describe('after click tocMore button', () => {
          beforeEach(() => {
            page.tocMoreButton.nativeElement.click();
            f.detectChanges();
          });
          it('should not be "collapsed"', () => {
            expect(c.collapsed).toEqual(false);
          });
          it('should not have "collapsed" class', () => {
            expect(de.children[0].classes.collapsed).toBeFalsy();
          });
          it('should not scroll', () => {
            expect(spy).not.toHaveBeenCalled();
          });
          it('should be "collapsed" after clicking again', () => {
            page.tocMoreButton.nativeElement.click();
            f.detectChanges();
            expect(c.collapsed).toEqual(true);
          });
          it('should be "collapsed" after clicking tocHeadingButton', () => {
            page.tocMoreButton.nativeElement.click();
            f.detectChanges();
            expect(c.collapsed).toEqual(true);
          });
          it('should scroll after clicking again', () => {
            page.tocMoreButton.nativeElement.click();
            f.detectChanges();
            expect(spy).toHaveBeenCalled();
          });
        });
      });
    });
  });

  describe('when in side panel (not embedded)', () => {
    let f: ComponentFixture<UnembeddedTocComp>;
    beforeEach(() => {
      f = TestBed.createComponent(UnembeddedTocComp);
      de = f.debugElement.children[0];
      c = de.componentInstance;
      toc = (TestBed.inject(TocService) as unknown) as TestTocService;
      f.detectChanges();
      page = setPage();
    });

    it('should not be in embedded state', () => {
      expect(c.embedded).toEqual(false);
      expect(c.type).toEqual('Floating');
    });
    it('should display all items (including h1s)', () => {
      expect(page.listItems.length).toEqual(items().length);
    });
    it('should not have secondary items', () => {
      expect(c.type).toEqual('Floating');
      const aSecond = page.listItems.find(item => item.classes.secondary);
      expect(aSecond).toBeFalsy('should not find a secondary');
    });
    it('should not display expand buttons', () => {
      expect(page.tocHeadingButtonEmbedded).toBeFalsy(
        'top expand/collapse button'
      );
      expect(page.tocMoreButton).toBeFalsy('bottom more button');
    });
    it('should display H1 title', () => {
      expect(page.tocH1Heading).toBeTruthy();
    });

    describe('#index', () => {
      it("should keep track of `TocService`'s `index`", () => {
        expect(c.idx).toBeNull();
        toc.setIndex(42);
        expect(c.idx).toBe(42);
        toc.setIndex(null);
        expect(c.idx).toBeNull();
      });
      it('should stop tracking `index` once destroyed', () => {
        toc.setIndex(42);
        expect(c.idx).toBe(42);
        c.ngOnDestroy();
        toc.setIndex(43);
        expect(c.idx).toBe(42);
        toc.setIndex(null);
        expect(c.idx).toBe(42);
      });

      it('should set `active` class to active anchor', () => {
        expect(page.listItems.findIndex(By.css('.active'))).toBe(-1);
        c.idx = 1;
        f.detectChanges();
        expect(page.listItems.filter(By.css('.active')).length).toBe(1);
        expect(page.listItems.findIndex(By.css('.active'))).toBe(1);
        c.idx = undefined;
        f.detectChanges();
        expect(page.listItems.filter(By.css('.active')).length).toBe(0);
        expect(page.listItems.findIndex(By.css('.active'))).toBe(-1);
        c.idx = 0;
        f.detectChanges();
        expect(page.listItems.filter(By.css('.active')).length).toBe(1);
        expect(page.listItems.findIndex(By.css('.active'))).toBe(0);
        c.idx = 1337;
        f.detectChanges();
        expect(page.listItems.filter(By.css('.active')).length).toBe(0);
        expect(page.listItems.findIndex(By.css('.active'))).toBe(-1);
        c.idx = page.listItems.length - 1;
        f.detectChanges();
        expect(page.listItems.filter(By.css('.active')).length).toBe(1);
        expect(page.listItems.findIndex(By.css('.active'))).toBe(
          page.listItems.length - 1
        );
      });

      it('should re-apply `active` class when list elements change', () => {
        const t = () =>
          page.listItems
            .find(By.css('.active'))!
            .nativeElement.textContent.trim();
        c.idx = 1;
        f.detectChanges();
        expect(t()).toBe('Heading one');
        c.items = [tocItem('New 1'), tocItem('New 2')];
        f.detectChanges();
        page = setPage();
        expect(t()).toBe('New 2');
        c.items.unshift(tocItem('New 0'));
        f.detectChanges();
        page = setPage();
        expect(t()).toBe('New 1');
        c.items = [tocItem('Very New 1')];
        f.detectChanges();
        page = setPage();
        expect(page.listItems.findIndex(By.css('.active'))).toBe(-1);
        c.idx = 0;
        f.detectChanges();
        expect(t()).toBe('Very New 1');
      });

      describe('should scroll active ToC item into viewport', () => {
        let pst: number;
        beforeEach(() => {
          const e = f.nativeElement;
          const i = page.listItems[0].nativeElement;
          Object.assign(e.style, {
            display: 'block',
            maxHeight: `${e.clientHeight - i.clientHeight}px`,
            overflow: 'auto',
            position: 'relative'
          });
          Object.defineProperty(e, 'scrollTop', {
            get: () => pst,
            set: v => (pst = v)
          });
          pst = 0;
        });
        it('when `index` changes', () => {
          toc.setIndex(0);
          f.detectChanges();
          expect(pst).toBe(0);
          toc.setIndex(1);
          f.detectChanges();
          expect(pst).toBe(0);
          toc.setIndex(page.listItems.length - 1);
          f.detectChanges();
          expect(pst).toBeGreaterThan(0);
        });
        it('when `items` changes', () => {
          const tl = c.items;
          c.items = [];
          f.detectChanges();
          expect(pst).toBe(0);
          toc.setIndex(items.length - 1);
          f.detectChanges();
          expect(pst).toBe(0);
          c.items = tl;
          f.detectChanges();
          expect(pst).toBeGreaterThan(0);
        });
        it('not after it has been destroyed', () => {
          const tl = c.items;
          c.ngOnDestroy();
          toc.setIndex(page.listItems.length - 1);
          f.detectChanges();
          expect(pst).toBe(0);
          c.items = [];
          f.detectChanges();
          expect(pst).toBe(0);
          c.items = tl;
          f.detectChanges();
          expect(pst).toBe(0);
        });
      });
    });
  });
});

@Component({
  selector: 'qnr-embedded-host',
  template: '<qnr-toc class="embedded"></qnr-toc>'
})
class EmbeddedTocComp {}

@Component({
  selector: 'qnr-not-embedded-host',
  template: '<qnr-toc></qnr-toc>'
})
class UnembeddedTocComp {}

class TestScrollService {
  toTop = jasmine.createSpy('toTop');
}

class TestTocService {
  items = new BehaviorSubject<Item[]>(items());
  index = new BehaviorSubject<number | null>(null);

  setIndex(i: number | null) {
    this.index.next(i);
    if (asapScheduler.actions.length > 0) {
      asapScheduler.flush();
    }
  }
}

function tocItem(title: string, level = 'h2', href = '', content = title) {
  return {title, href, level, content};
}

function items() {
  return [
    tocItem('Title', 'h1', 'fizz/buzz#title', 'Title'),
    tocItem(
      'Heading one',
      'h2',
      'fizz/buzz#heading-one-special-id',
      'Heading one'
    ),
    tocItem('H2 Two', 'h2', 'fizz/buzz#h2-two', 'H2 Two'),
    tocItem('H2 Three', 'h2', 'fizz/buzz#h2-three', 'H2 <b>Three</b>'),
    tocItem('H3 3a', 'h3', 'fizz/buzz#h3-3a', 'H3 3a'),
    tocItem('H3 3b', 'h3', 'fizz/buzz#h3-3b', 'H3 3b'),
    tocItem('H2 4', 'h2', 'fizz/buzz#h2-four', '<i>H2 <b>four</b></i>')
  ];
}
