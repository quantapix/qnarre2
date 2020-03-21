import {Component, CUSTOM_ELEMENTS_SCHEMA, DebugElement} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {asapScheduler, BehaviorSubject} from 'rxjs';

import {TocComponent} from './toc.component';
import {ScrollService} from '../../services/scroll.service';
import {TocItem, TocService} from '../../services/toc.service';

describe('TocComponent', () => {
  let tocComponentDe: DebugElement;
  let c: TocComponent;
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
      listItems: tocComponentDe.queryAll(By.css('ul.toc-list>li')),
      tocHeading: tocComponentDe.query(By.css('.toc-heading')),
      tocHeadingButtonEmbedded: tocComponentDe.query(
        By.css('button.toc-heading.embedded')
      ),
      tocH1Heading: tocComponentDe.query(By.css('.h1')),
      tocMoreButton: tocComponentDe.query(By.css('button.toc-more-items'))
    };
  }
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        HostEmbeddedTocComponent,
        HostNotEmbeddedTocComponent,
        TocComponent
      ],
      providers: [
        {provide: ScrollService, useClass: TestScrollService},
        {provide: TocService, useClass: TestTocService}
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    });
  });
  describe('when embedded in doc body', () => {
    let f: ComponentFixture<HostEmbeddedTocComponent>;
    beforeEach(() => {
      f = TestBed.createComponent(HostEmbeddedTocComponent);
      tocComponentDe = f.debugElement.children[0];
      c = tocComponentDe.componentInstance;
      toc = (TestBed.inject(TocService) as unknown) as TestTocService;
    });
    it('should create c', () => {
      expect(c).toBeTruthy();
    });
    it('should be in embedded state', () => {
      expect(c.isEmbedded).toEqual(true);
    });
    it('should not display a ToC initially', () => {
      expect(c.type).toEqual('None');
    });

    describe('(once the lifecycle hooks have run)', () => {
      beforeEach(() => f.detectChanges());
      it('should not display anything when no h2 or h3 TocItems', () => {
        toc.tocList.next([tocItem('H1', 'h1')]);
        f.detectChanges();
        expect(tocComponentDe.children.length).toEqual(0);
      });
      it('should update when the TocItems are updated', () => {
        toc.tocList.next([tocItem('Heading A')]);
        f.detectChanges();
        expect(tocComponentDe.queryAll(By.css('li')).length).toBe(1);
        toc.tocList.next([
          tocItem('Heading A'),
          tocItem('Heading B'),
          tocItem('Heading C')
        ]);
        f.detectChanges();
        expect(tocComponentDe.queryAll(By.css('li')).length).toBe(3);
      });
      it('should only display H2 and H3 TocItems', () => {
        toc.tocList.next([
          tocItem('Heading A', 'h1'),
          tocItem('Heading B'),
          tocItem('Heading C', 'h3')
        ]);
        f.detectChanges();
        const tocItems = tocComponentDe.queryAll(By.css('li'));
        const textContents = tocItems.map(item =>
          item.nativeNode.textContent.trim()
        );
        expect(tocItems.length).toBe(2);
        expect(textContents.find(text => text === 'Heading A')).toBeFalsy();
        expect(textContents.find(text => text === 'Heading B')).toBeTruthy();
        expect(textContents.find(text => text === 'Heading C')).toBeTruthy();
        expect(setPage().tocH1Heading).toBeFalsy();
      });
      it('should stop listening for TocItems once destroyed', () => {
        toc.tocList.next([tocItem('Heading A')]);
        f.detectChanges();
        expect(tocComponentDe.queryAll(By.css('li')).length).toBe(1);
        c.ngOnDestroy();
        toc.tocList.next([
          tocItem('Heading A', 'h1'),
          tocItem('Heading B'),
          tocItem('Heading C')
        ]);
        f.detectChanges();
        expect(tocComponentDe.queryAll(By.css('li')).length).toBe(1);
      });
      describe('when fewer than `maxPrimary` TocItems', () => {
        beforeEach(() => {
          toc.tocList.next([
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
          expect(c.type).toEqual('EmbeddedSimple');
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

      describe('when many TocItems', () => {
        let spy: jasmine.Spy;
        beforeEach(() => {
          f.detectChanges();
          page = setPage();
          spy = ((TestBed.inject(
            ScrollService
          ) as unknown) as TestScrollService).scrollToTop;
        });
        it('should have more than 4 displayed items', () => {
          expect(page.listItems.length).toBeGreaterThan(4);
        });
        it('should not display the h1 item', () => {
          expect(page.listItems.find(item => item.classes.h1)).toBeFalsy(
            'should not find h1 item'
          );
        });
        it('should be in "collapsed" (not expanded) state at the start', () => {
          expect(c.isCollapsed).toBeTruthy();
        });
        it('should have "collapsed" class at the start', () => {
          expect(tocComponentDe.children[0].classes.collapsed).toEqual(true);
        });
        it('should display expando buttons', () => {
          expect(page.tocHeadingButtonEmbedded).toBeTruthy(
            'top expand/collapse button'
          );
          expect(page.tocMoreButton).toBeTruthy('bottom more button');
        });
        it('should have secondary items', () => {
          expect(c.type).toEqual('EmbeddedExpandable');
        });
        // CSS will hide items with the secondary class when collapsed
        it('should have secondary item with a secondary class', () => {
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
            expect(c.isCollapsed).toEqual(false);
          });
          it('should not have "collapsed" class', () => {
            expect(tocComponentDe.children[0].classes.collapsed).toBeFalsy();
          });
          it('should not scroll', () => {
            expect(spy).not.toHaveBeenCalled();
          });
          it('should be "collapsed" after clicking again', () => {
            page.tocHeadingButtonEmbedded.nativeElement.click();
            f.detectChanges();
            expect(c.isCollapsed).toEqual(true);
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
            expect(c.isCollapsed).toEqual(false);
          });
          it('should not have "collapsed" class', () => {
            expect(tocComponentDe.children[0].classes.collapsed).toBeFalsy();
          });
          it('should not scroll', () => {
            expect(spy).not.toHaveBeenCalled();
          });
          it('should be "collapsed" after clicking again', () => {
            page.tocMoreButton.nativeElement.click();
            f.detectChanges();
            expect(c.isCollapsed).toEqual(true);
          });
          it('should be "collapsed" after clicking tocHeadingButton', () => {
            page.tocMoreButton.nativeElement.click();
            f.detectChanges();
            expect(c.isCollapsed).toEqual(true);
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
    let f: ComponentFixture<HostNotEmbeddedTocComponent>;
    beforeEach(() => {
      f = TestBed.createComponent(HostNotEmbeddedTocComponent);
      tocComponentDe = f.debugElement.children[0];
      c = tocComponentDe.componentInstance;
      toc = (TestBed.inject(TocService) as unknown) as TestTocService;
      f.detectChanges();
      page = setPage();
    });

    it('should not be in embedded state', () => {
      expect(c.isEmbedded).toEqual(false);
      expect(c.type).toEqual('Floating');
    });
    it('should display all items (including h1s)', () => {
      expect(page.listItems.length).toEqual(getTestTocList().length);
    });
    it('should not have secondary items', () => {
      expect(c.type).toEqual('Floating');
      const aSecond = page.listItems.find(item => item.classes.secondary);
      expect(aSecond).toBeFalsy('should not find a secondary');
    });
    it('should not display expando buttons', () => {
      expect(page.tocHeadingButtonEmbedded).toBeFalsy(
        'top expand/collapse button'
      );
      expect(page.tocMoreButton).toBeFalsy('bottom more button');
    });
    it('should display H1 title', () => {
      expect(page.tocH1Heading).toBeTruthy();
    });

    describe('#activeIndex', () => {
      it("should keep track of `TocService`'s `activeItemIndex`", () => {
        expect(c.activeIndex).toBeNull();
        toc.setActiveIndex(42);
        expect(c.activeIndex).toBe(42);
        toc.setActiveIndex(null);
        expect(c.activeIndex).toBeNull();
      });
      it('should stop tracking `activeItemIndex` once destroyed', () => {
        toc.setActiveIndex(42);
        expect(c.activeIndex).toBe(42);
        c.ngOnDestroy();
        toc.setActiveIndex(43);
        expect(c.activeIndex).toBe(42);
        toc.setActiveIndex(null);
        expect(c.activeIndex).toBe(42);
      });

      it('should set the `active` class to the active anchor (and only that)', () => {
        expect(page.listItems.findIndex(By.css('.active'))).toBe(-1);
        c.activeIndex = 1;
        f.detectChanges();
        expect(page.listItems.filter(By.css('.active')).length).toBe(1);
        expect(page.listItems.findIndex(By.css('.active'))).toBe(1);
        c.activeIndex = null;
        f.detectChanges();
        expect(page.listItems.filter(By.css('.active')).length).toBe(0);
        expect(page.listItems.findIndex(By.css('.active'))).toBe(-1);
        c.activeIndex = 0;
        f.detectChanges();
        expect(page.listItems.filter(By.css('.active')).length).toBe(1);
        expect(page.listItems.findIndex(By.css('.active'))).toBe(0);
        c.activeIndex = 1337;
        f.detectChanges();
        expect(page.listItems.filter(By.css('.active')).length).toBe(0);
        expect(page.listItems.findIndex(By.css('.active'))).toBe(-1);
        c.activeIndex = page.listItems.length - 1;
        f.detectChanges();
        expect(page.listItems.filter(By.css('.active')).length).toBe(1);
        expect(page.listItems.findIndex(By.css('.active'))).toBe(
          page.listItems.length - 1
        );
      });

      it('should re-apply the `active` class when the list elements change', () => {
        const getActiveTextContent = () =>
          page.listItems
            .find(By.css('.active'))
            .nativeElement.textContent.trim();
        c.activeIndex = 1;
        f.detectChanges();
        expect(getActiveTextContent()).toBe('Heading one');
        c.tocList = [tocItem('New 1'), tocItem('New 2')];
        f.detectChanges();
        page = setPage();
        expect(getActiveTextContent()).toBe('New 2');
        c.tocList.unshift(tocItem('New 0'));
        f.detectChanges();
        page = setPage();
        expect(getActiveTextContent()).toBe('New 1');
        c.tocList = [tocItem('Very New 1')];
        f.detectChanges();
        page = setPage();
        expect(page.listItems.findIndex(By.css('.active'))).toBe(-1);
        c.activeIndex = 0;
        f.detectChanges();
        expect(getActiveTextContent()).toBe('Very New 1');
      });

      describe('should scroll the active ToC item into viewport (if not already visible)', () => {
        let parentScrollTop: number;
        beforeEach(() => {
          const hostElem = f.nativeElement;
          const firstItem = page.listItems[0].nativeElement;
          Object.assign(hostElem.style, {
            display: 'block',
            maxHeight: `${hostElem.clientHeight - firstItem.clientHeight}px`,
            overflow: 'auto',
            position: 'relative'
          });
          Object.defineProperty(hostElem, 'scrollTop', {
            get: () => parentScrollTop,
            set: v => (parentScrollTop = v)
          });
          parentScrollTop = 0;
        });
        it('when the `activeIndex` changes', () => {
          toc.setActiveIndex(0);
          f.detectChanges();
          expect(parentScrollTop).toBe(0);
          toc.setActiveIndex(1);
          f.detectChanges();
          expect(parentScrollTop).toBe(0);
          toc.setActiveIndex(page.listItems.length - 1);
          f.detectChanges();
          expect(parentScrollTop).toBeGreaterThan(0);
        });
        it('when the `tocList` changes', () => {
          const tocList = c.tocList;
          c.tocList = [];
          f.detectChanges();
          expect(parentScrollTop).toBe(0);
          toc.setActiveIndex(tocList.length - 1);
          f.detectChanges();
          expect(parentScrollTop).toBe(0);
          c.tocList = tocList;
          f.detectChanges();
          expect(parentScrollTop).toBeGreaterThan(0);
        });
        it('not after it has been destroyed', () => {
          const tocList = c.tocList;
          c.ngOnDestroy();
          toc.setActiveIndex(page.listItems.length - 1);
          f.detectChanges();
          expect(parentScrollTop).toBe(0);
          c.tocList = [];
          f.detectChanges();
          expect(parentScrollTop).toBe(0);
          c.tocList = tocList;
          f.detectChanges();
          expect(parentScrollTop).toBe(0);
        });
      });
    });
  });
});

@Component({
  selector: 'qnr-embedded-host',
  template: '<qnr-toc class="embedded"></qnr-toc>'
})
class HostEmbeddedTocComponent {}

@Component({
  selector: 'qnr-not-embedded-host',
  template: '<qnr-toc></qnr-toc>'
})
class HostNotEmbeddedTocComponent {}

class TestScrollService {
  scrollToTop = jasmine.createSpy('scrollToTop');
}

class TestTocService {
  tocList = new BehaviorSubject<TocItem[]>(getTestTocList());
  activeItemIndex = new BehaviorSubject<number | null>(null);

  setActiveIndex(index: number | null) {
    this.activeItemIndex.next(index);
    if (asapScheduler.actions.length > 0) {
      asapScheduler.flush();
    }
  }
}

function tocItem(title: string, level = 'h2', href = '', content = title) {
  return {title, href, level, content};
}

function getTestTocList() {
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
