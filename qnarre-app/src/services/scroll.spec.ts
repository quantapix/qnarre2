/* eslint-disable @typescript-eslint/unbound-method */
import {ReflectiveInjector} from '@angular/core';
import {
  Location,
  LocationStrategy,
  PlatformLocation,
  ViewportScroller
} from '@angular/common';
import {DOCUMENT} from '@angular/common';
import {MockLocationStrategy, SpyLocation} from '@angular/common/testing';
import {fakeAsync, tick} from '@angular/core/testing';

import {ScrollService, topMargin} from './scroll';

describe('ScrollService', () => {
  const ssInstances: ScrollService[] = [];
  const createScrollService = (
    ...args: ConstructorParameters<typeof ScrollService>
  ) => {
    const instance = new ScrollService(...args);
    ssInstances.push(instance);
    return instance;
  };

  const topOfPageElem = {} as Element;
  let injector: ReflectiveInjector;
  let document: MockDocument;
  let pLoc: MockPlatformLocation;
  let ss: ScrollService;
  let location: SpyLocation;

  class MockPlatformLocation {
    hash = '';
  }

  class MockDocument {
    body = new MockElement();
    getElementById = jasmine
      .createSpy('Document getElementById')
      .and.returnValue(topOfPageElem);
    querySelector = jasmine.createSpy('Document querySelector');
  }

  class MockElement {
    getBoundingClientRect = jasmine
      .createSpy('Element getBoundingClientRect')
      .and.returnValue({top: 0});
    scrollIntoView = jasmine.createSpy('Element scrollIntoView');
  }

  const viewportScrollerStub = jasmine.createSpyObj('viewportScroller', [
    'getScrollPosition',
    'scrollToPosition'
  ]);

  beforeEach(() => {
    injector = ReflectiveInjector.resolveAndCreate([
      {
        provide: ScrollService,
        useFactory: createScrollService,
        deps: [DOCUMENT, PlatformLocation, ViewportScroller, Location]
      },
      {provide: Location, useClass: SpyLocation},
      {provide: DOCUMENT, useClass: MockDocument},
      {provide: PlatformLocation, useClass: MockPlatformLocation},
      {provide: ViewportScroller, useValue: viewportScrollerStub},
      {provide: LocationStrategy, useClass: MockLocationStrategy}
    ]);
    pLoc = injector.get(PlatformLocation);
    document = injector.get(DOCUMENT);
    ss = injector.get(ScrollService);
    location = injector.get(Location);

    spyOn(window, 'scrollBy');
  });

  afterEach(() => {
    ssInstances.forEach(instance => instance.ngOnDestroy());
    window.sessionStorage.clear();
  });

  it('should debounce `updateScrollPositonInHistory()`', fakeAsync(() => {
    const updateScrollPositionInHistorySpy = spyOn(
      ss,
      'updateScrollPositionInHistory'
    );

    window.dispatchEvent(new Event('scroll'));
    tick(249);
    window.dispatchEvent(new Event('scroll'));
    tick(249);
    window.dispatchEvent(new Event('scroll'));
    tick(249);
    expect(updateScrollPositionInHistorySpy).not.toHaveBeenCalled();
    tick(1);
    expect(updateScrollPositionInHistorySpy).toHaveBeenCalledTimes(1);
  }));

  it('should set `scrollRestoration` to `manual` if supported', () => {
    if (ss.supportManualScrollRestoration) {
      expect(window.history.scrollRestoration).toBe('manual');
    } else {
      expect(window.history.scrollRestoration).toBeUndefined();
    }
  });

  it('should not break when cookies are disabled in the browser', () => {
    expect(() => {
      const originalSessionStorage = Object.getOwnPropertyDescriptor(
        window,
        'sessionStorage'
      )!;

      try {
        // Simulate `window.sessionStorage` being inaccessible, when cookies are disabled.
        Object.defineProperty(window, 'sessionStorage', {
          get() {
            throw new Error('The operation is insecure');
          }
        });

        const platformLoc = pLoc as PlatformLocation;
        const service = createScrollService(
          document,
          platformLoc,
          viewportScrollerStub,
          location
        );

        service.updateScrollLocationHref();
        expect(service.getStoredScrollLocationHref()).toBeNull();

        service.removeStoredScrollInfo();
        expect(service.getStoredScrollPosition()).toBeNull();
      } finally {
        Object.defineProperty(window, 'sessionStorage', originalSessionStorage);
      }
    }).not.toThrow();
  });

  describe('#topOffset', () => {
    it('should query for the top-bar by CSS selector', () => {
      expect(document.querySelector).not.toHaveBeenCalled();

      expect(ss.topOffset).toBe(topMargin);
      expect(document.querySelector).toHaveBeenCalled();
    });

    it("should be calculated based on the top-bar's height + margin", () => {
      document.querySelector.and.returnValue({
        clientHeight: 50
      });
      expect(ss.topOffset).toBe(50 + topMargin);
    });

    it('should only query for the top-bar once', () => {
      expect(ss.topOffset).toBe(topMargin);
      document.querySelector.calls.reset();

      expect(ss.topOffset).toBe(topMargin);
      expect(document.querySelector).not.toHaveBeenCalled();
    });

    it("should retrieve the top-bar's height again after resize", () => {
      let clientHeight = 50;
      document.querySelector.and.callFake(() => ({
        clientHeight
      }));

      expect(ss.topOffset).toBe(50 + topMargin);
      expect(document.querySelector).toHaveBeenCalled();

      document.querySelector.calls.reset();
      clientHeight = 100;

      expect(ss.topOffset).toBe(50 + topMargin);
      expect(document.querySelector).not.toHaveBeenCalled();

      window.dispatchEvent(new Event('resize'));

      expect(ss.topOffset).toBe(100 + topMargin);
      expect(document.querySelector).toHaveBeenCalled();
    });

    it('should stop updating on resize once destroyed', () => {
      let clientHeight = 50;
      document.querySelector.and.callFake(() => ({
        clientHeight
      }));

      expect(ss.topOffset).toBe(50 + topMargin);

      clientHeight = 100;
      window.dispatchEvent(new Event('resize'));
      expect(ss.topOffset).toBe(100 + topMargin);

      ss.ngOnDestroy();

      clientHeight = 200;
      window.dispatchEvent(new Event('resize'));
      expect(ss.topOffset).toBe(100 + topMargin);
    });
  });

  describe('#topElem', () => {
    it('should query for the top-of-page element by ID', () => {
      expect(document.getElementById).not.toHaveBeenCalled();

      expect(ss.topElem).toBe(topOfPageElem);
      expect(document.getElementById).toHaveBeenCalled();
    });

    it('should only query for the top-of-page element once', () => {
      expect(ss.topElem).toBe(topOfPageElem);
      document.getElementById.calls.reset();

      expect(ss.topElem).toBe(topOfPageElem);
      expect(document.getElementById).not.toHaveBeenCalled();
    });

    it('should return `<body>` if unable to find the top-of-page element', () => {
      document.getElementById.and.returnValue(null);
      expect(ss.topElem).toBe(document.body as any);
    });
  });

  describe('#scroll', () => {
    it('should scroll to the top if there is no hash', () => {
      pLoc.hash = '';

      const topOfPage = new MockElement();
      document.getElementById.and.callFake((id: string) =>
        id === 'top-of-page' ? topOfPage : null
      );

      ss.scroll();
      expect(topOfPage.scrollIntoView).toHaveBeenCalled();
    });

    it('should not scroll if the hash does not match an element id', () => {
      pLoc.hash = 'not-found';
      document.getElementById.and.returnValue(null);

      ss.scroll();
      expect(document.getElementById).toHaveBeenCalledWith('not-found');
      expect(window.scrollBy).not.toHaveBeenCalled();
    });

    it('should scroll to the element whose id matches the hash', () => {
      const element = new MockElement();
      pLoc.hash = 'some-id';
      document.getElementById.and.returnValue(element);

      ss.scroll();
      expect(document.getElementById).toHaveBeenCalledWith('some-id');
      expect(element.scrollIntoView).toHaveBeenCalled();
      expect(window.scrollBy).toHaveBeenCalled();
    });

    it('should scroll to the element whose id matches the hash with encoded characters', () => {
      const element = new MockElement();
      pLoc.hash = '%F0%9F%91%8D'; // 👍
      document.getElementById.and.returnValue(element);

      ss.scroll();
      expect(document.getElementById).toHaveBeenCalledWith('👍');
      expect(element.scrollIntoView).toHaveBeenCalled();
      expect(window.scrollBy).toHaveBeenCalled();
    });
  });

  describe('#scrollTo', () => {
    it('should scroll to element', () => {
      const element: Element = new MockElement() as any;
      ss.scrollTo(element);
      expect(element.scrollIntoView).toHaveBeenCalled();
      expect(window.scrollBy).toHaveBeenCalledWith(0, -ss.topOffset!);
    });

    it('should not scroll more than necessary (e.g. for elements close to the bottom)', () => {
      const element: Element = new MockElement() as any;
      const getBoundingClientRect = element.getBoundingClientRect as any;
      const topOffset = ss.topOffset;

      getBoundingClientRect.and.returnValue({top: topOffset! + 100});
      ss.scrollTo(element);
      expect(element.scrollIntoView).toHaveBeenCalledTimes(1);
      expect(window.scrollBy).toHaveBeenCalledWith(0, 100);

      getBoundingClientRect.and.returnValue({top: topOffset! - 10});
      ss.scrollTo(element);
      expect(element.scrollIntoView).toHaveBeenCalledTimes(2);
      expect(window.scrollBy).toHaveBeenCalledWith(0, -10);
    });

    it('should scroll all the way to the top if close enough', () => {
      const element: Element = new MockElement() as any;

      (window as any).pageYOffset = 25;
      ss.scrollTo(element);

      expect(element.scrollIntoView).toHaveBeenCalled();
      expect(window.scrollBy).toHaveBeenCalledWith(0, -ss.topOffset!);
      //window.scrollBy.calls.reset();

      (window as any).pageYOffset = 15;
      ss.scrollTo(element);

      expect(element.scrollIntoView).toHaveBeenCalled();
      expect(window.scrollBy).toHaveBeenCalledWith(0, -ss.topOffset!);
      expect(window.scrollBy).toHaveBeenCalledWith(0, -15);
    });

    it('should do nothing if no element', () => {
      ss.scrollTo(undefined);
      expect(window.scrollBy).not.toHaveBeenCalled();
    });
  });

  describe('#scrollToTop', () => {
    it('should scroll to top', () => {
      const topElem = (new MockElement() as any) as Element;
      document.getElementById.and.callFake((id: string) =>
        id === 'top-of-page' ? topElem : null
      );
      ss.scrollToTop();
      expect(topElem.scrollIntoView).toHaveBeenCalled();
      expect(window.scrollBy).toHaveBeenCalledWith(0, -topMargin);
    });
  });

  describe('#withHash', () => {
    it('should return true when the location has a hash', () => {
      pLoc.hash = 'anchor';
      expect(ss.withHash()).toBe(true);
    });

    it('should return false when the location has no hash', () => {
      pLoc.hash = '';
      expect(ss.withHash()).toBe(false);
    });
  });

  describe('#needToFixScrollPosition', () => {
    it(
      'should return true when popState event was fired after a back navigation if the browser supports ' +
        'scrollRestoration`. Otherwise, needToFixScrollPosition() returns false',
      () => {
        if (ss.supportManualScrollRestoration) {
          location.go('/initial-url1');
          // We simulate a scroll down
          location.replaceState('/initial-url1', 'hack', {
            scrollPosition: [2000, 0]
          });
          location.go('/initial-url2');
          location.back();

          expect(ss.poppedPos).toEqual([2000, 0]);
          expect(ss.needToFixScrollPosition()).toBe(true);
        } else {
          location.go('/initial-url1');
          location.go('/initial-url2');
          location.back();

          expect(ss.poppedPos).toBe(null);
          expect(ss.needToFixScrollPosition()).toBe(false);
        }
      }
    );

    it(
      'should return true when popState event was fired after a forward navigation if the browser supports ' +
        'scrollRestoration`. Otherwise, needToFixScrollPosition() returns false',
      () => {
        if (ss.supportManualScrollRestoration) {
          location.go('/initial-url1');
          location.go('/initial-url2');
          // We simulate a scroll down
          location.replaceState('/initial-url1', 'hack', {
            scrollPosition: [2000, 0]
          });

          location.back();
          ss.poppedPos = [0, 0];
          location.forward();

          expect(ss.poppedPos).toEqual([2000, 0]);
          expect(ss.needToFixScrollPosition()).toBe(true);
        } else {
          location.go('/initial-url1');
          location.go('/initial-url2');
          location.back();
          location.forward();

          expect(ss.poppedPos).toBe(null);
          expect(ss.needToFixScrollPosition()).toBe(false);
        }
      }
    );
  });

  describe('#scrollAfter', () => {
    let scrollSpy: any;
    let scrollToTopSpy: any;
    let needToFixScrollPositionSpy: any;
    let scrollToPosition: any;
    let withHashSpy: any;
    let getStoredScrollPositionSpy: any;
    const scrollDelay = 500;

    beforeEach(() => {
      scrollSpy = spyOn(ss, 'scroll');
      scrollToTopSpy = spyOn(ss, 'scrollToTop');
      scrollToPosition = spyOn(ss, 'scrollToPos');
      needToFixScrollPositionSpy = spyOn(ss, 'needToFixScrollPosition');
      getStoredScrollPositionSpy = spyOn(ss, 'getStoredScrollPosition');
      withHashSpy = spyOn(ss, 'withHash');
    });

    it('should call `scroll` when we navigate to a location with anchor', fakeAsync(() => {
      needToFixScrollPositionSpy.and.returnValue(false);
      getStoredScrollPositionSpy.and.returnValue(null);
      withHashSpy.and.returnValue(true);

      ss.scrollAfter(scrollDelay);

      expect(scrollSpy).not.toHaveBeenCalled();
      tick(scrollDelay);
      expect(scrollSpy).toHaveBeenCalled();
    }));

    it('should call `scrollToTop` when we navigate to a location without anchor', fakeAsync(() => {
      needToFixScrollPositionSpy.and.returnValue(false);
      getStoredScrollPositionSpy.and.returnValue(null);
      withHashSpy.and.returnValue(false);

      ss.scrollAfter(scrollDelay);

      expect(scrollToTopSpy).toHaveBeenCalled();
      tick(scrollDelay);
      expect(scrollSpy).not.toHaveBeenCalled();
    }));

    it('should call `viewportScroller.scrollToPosition` when we reload a page', fakeAsync(() => {
      getStoredScrollPositionSpy.and.returnValue([0, 1000]);

      ss.scrollAfter(scrollDelay);

      expect(viewportScrollerStub.scrollToPosition).toHaveBeenCalled();
      expect(getStoredScrollPositionSpy).toHaveBeenCalled();
    }));

    it('should call `scrollToPosition` after a popState', fakeAsync(() => {
      needToFixScrollPositionSpy.and.returnValue(true);
      getStoredScrollPositionSpy.and.returnValue(null);
      ss.scrollAfter(scrollDelay);
      expect(scrollToPosition).toHaveBeenCalled();
      tick(scrollDelay);
      expect(scrollSpy).not.toHaveBeenCalled();
      expect(scrollToTopSpy).not.toHaveBeenCalled();
    }));
  });

  describe('once destroyed', () => {
    it('should stop updating scroll position', fakeAsync(() => {
      const updateScrollPositionInHistorySpy = spyOn(
        ss,
        'updateScrollPositionInHistory'
      );

      window.dispatchEvent(new Event('scroll'));
      tick(250);
      expect(updateScrollPositionInHistorySpy).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event('scroll'));
      tick(250);
      expect(updateScrollPositionInHistorySpy).toHaveBeenCalledTimes(2);

      updateScrollPositionInHistorySpy.calls.reset();
      ss.ngOnDestroy();

      window.dispatchEvent(new Event('scroll'));
      tick(250);
      expect(updateScrollPositionInHistorySpy).not.toHaveBeenCalled();
    }));

    it('should stop updating the stored location href', () => {
      const updateScrollLocationHrefSpy = spyOn(ss, 'updateScrollLocationHref');

      window.dispatchEvent(new Event('beforeunload'));
      expect(updateScrollLocationHrefSpy).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event('beforeunload'));
      expect(updateScrollLocationHrefSpy).toHaveBeenCalledTimes(2);

      updateScrollLocationHrefSpy.calls.reset();
      ss.ngOnDestroy();

      window.dispatchEvent(new Event('beforeunload'));
      expect(updateScrollLocationHrefSpy).not.toHaveBeenCalled();
    });

    it('should stop scrolling on `hashchange` events', () => {
      const scrollToPositionSpy = spyOn(ss, 'scrollToPos');

      location.simulateHashChange('foo');
      expect(scrollToPositionSpy).toHaveBeenCalledTimes(1);

      location.simulateHashChange('bar');
      expect(scrollToPositionSpy).toHaveBeenCalledTimes(2);

      scrollToPositionSpy.calls.reset();
      ss.ngOnDestroy();

      location.simulateHashChange('baz');
      expect(scrollToPositionSpy).not.toHaveBeenCalled();
    });
  });
});
