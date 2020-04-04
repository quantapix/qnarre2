/* eslint-disable @typescript-eslint/unbound-method */
import {ReflectiveInjector} from '@angular/core';
import {Location, LocationStrategy, PlatformLocation} from '@angular/common';
import {MockLocationStrategy} from '@angular/common/testing';
import {Subject} from 'rxjs';

import {GaService} from './ga';
import {UpdatesService} from './updates';
import {LocationService} from './location';
import {ScrollService} from './scroll';

describe('LocationService', () => {
  let injector: ReflectiveInjector;
  let loc: MockLocationStrategy;
  let s: LocationService;
  let updates: MockUpdatesService;
  let scroll: MockScrollService;

  beforeEach(() => {
    injector = ReflectiveInjector.resolveAndCreate([
      LocationService,
      Location,
      {provide: GaService, useClass: TestGaService},
      {provide: LocationStrategy, useClass: MockLocationStrategy},
      {provide: PlatformLocation, useClass: MockPlatformLocation},
      {provide: UpdatesService, useClass: MockUpdatesService},
      {provide: ScrollService, useClass: MockScrollService}
    ]);

    loc = injector.get(LocationStrategy);
    s = injector.get(LocationService);
    updates = injector.get(UpdatesService);
    scroll = injector.get(ScrollService);
  });

  describe('currentUrl', () => {
    it('should emit the latest url at the time it is subscribed to', () => {
      loc.simulatePopState('/initial-url1');
      loc.simulatePopState('/initial-url2');
      loc.simulatePopState('/initial-url3');
      loc.simulatePopState('/next-url1');
      loc.simulatePopState('/next-url2');
      loc.simulatePopState('/next-url3');
      let initialUrl: string | undefined;
      s.url.subscribe(u => (initialUrl = u));
      expect(initialUrl).toEqual('next-url3');
    });
    it('should emit all loc changes after it has been subscribed to', () => {
      loc.simulatePopState('/initial-url1');
      loc.simulatePopState('/initial-url2');
      loc.simulatePopState('/initial-url3');
      const urls: string[] = [];
      s.url.subscribe(url => urls.push(url));

      loc.simulatePopState('/next-url1');
      loc.simulatePopState('/next-url2');
      loc.simulatePopState('/next-url3');

      expect(urls).toEqual([
        'initial-url3',
        'next-url1',
        'next-url2',
        'next-url3'
      ]);
    });

    it('should pass only the latest and later urls to each subscriber', () => {
      loc.simulatePopState('/initial-url1');
      loc.simulatePopState('/initial-url2');
      loc.simulatePopState('/initial-url3');

      const urls1: string[] = [];
      s.url.subscribe(url => urls1.push(url));

      loc.simulatePopState('/next-url1');
      loc.simulatePopState('/next-url2');

      const urls2: string[] = [];
      s.url.subscribe(url => urls2.push(url));

      loc.simulatePopState('/next-url3');

      expect(urls1).toEqual([
        'initial-url3',
        'next-url1',
        'next-url2',
        'next-url3'
      ]);

      expect(urls2).toEqual(['next-url2', 'next-url3']);
    });

    it('should strip leading and trailing slashes', () => {
      const urls: string[] = [];

      s.url.subscribe(u => urls.push(u));

      loc.simulatePopState('///some/url1///');
      loc.simulatePopState('///some/url2///?foo=bar');
      loc.simulatePopState('///some/url3///#baz');
      loc.simulatePopState('///some/url4///?foo=bar#baz');

      expect(urls.slice(-4)).toEqual([
        'some/url1',
        'some/url2?foo=bar',
        'some/url3#baz',
        'some/url4?foo=bar#baz'
      ]);
    });
  });

  describe('currentPath', () => {
    it('should strip leading and trailing slashes off the url', () => {
      const paths: string[] = [];

      s.path.subscribe(p => paths.push(p));

      loc.simulatePopState('///initial/url1///');
      loc.simulatePopState('///initial/url2///?foo=bar');
      loc.simulatePopState('///initial/url3///#baz');
      loc.simulatePopState('///initial/url4///?foo=bar#baz');

      expect(paths.slice(-4)).toEqual([
        'initial/url1',
        'initial/url2',
        'initial/url3',
        'initial/url4'
      ]);
    });

    it('should not strip other slashes off the url', () => {
      const ps: string[] = [];
      s.path.subscribe(p => ps.push(p));
      loc.simulatePopState('initial///url1');
      loc.simulatePopState('initial///url2?foo=bar');
      loc.simulatePopState('initial///url3#baz');
      loc.simulatePopState('initial///url4?foo=bar#baz');
      expect(ps.slice(-4)).toEqual([
        'initial///url1',
        'initial///url2',
        'initial///url3',
        'initial///url4'
      ]);
    });
    it('should strip the query off the url', () => {
      let path: string | undefined;
      s.path.subscribe(p => (path = p));
      loc.simulatePopState('/initial/url1?foo=bar');
      expect(path).toBe('initial/url1');
    });
    it('should strip the hash fragment off the url', () => {
      const ps: string[] = [];
      s.path.subscribe(p => ps.push(p));
      loc.simulatePopState('/initial/url1#foo');
      loc.simulatePopState('/initial/url2?foo=bar#baz');
      expect(ps.slice(-2)).toEqual(['initial/url1', 'initial/url2']);
    });
    it('should emit the latest path at the time it is subscribed to', () => {
      loc.simulatePopState('/initial/url1');
      loc.simulatePopState('/initial/url2');
      loc.simulatePopState('/initial/url3');
      loc.simulatePopState('/next/url1');
      loc.simulatePopState('/next/url2');
      loc.simulatePopState('/next/url3');
      let initialPath: string | undefined;
      s.path.subscribe(p => (initialPath = p));
      expect(initialPath).toEqual('next/url3');
    });
    it('should emit all loc changes after it has been subscribed to', () => {
      loc.simulatePopState('/initial/url1');
      loc.simulatePopState('/initial/url2');
      loc.simulatePopState('/initial/url3');
      const ps: string[] = [];
      s.path.subscribe(path => ps.push(path));
      loc.simulatePopState('/next/url1');
      loc.simulatePopState('/next/url2');
      loc.simulatePopState('/next/url3');
      expect(ps).toEqual([
        'initial/url3',
        'next/url1',
        'next/url2',
        'next/url3'
      ]);
    });
    it('should pass only the latest and later paths to each subscriber', () => {
      loc.simulatePopState('/initial/url1');
      loc.simulatePopState('/initial/url2');
      loc.simulatePopState('/initial/url3');
      const paths1: string[] = [];
      s.path.subscribe(path => paths1.push(path));
      loc.simulatePopState('/next/url1');
      loc.simulatePopState('/next/url2');
      const paths2: string[] = [];
      s.path.subscribe(path => paths2.push(path));
      loc.simulatePopState('/next/url3');
      expect(paths1).toEqual([
        'initial/url3',
        'next/url1',
        'next/url2',
        'next/url3'
      ]);
      expect(paths2).toEqual(['next/url2', 'next/url3']);
    });
  });

  describe('go', () => {
    it('should update the loc', () => {
      s.go('some-new-url');
      expect(loc.internalPath).toEqual('some-new-url');
      expect(loc.path(true)).toEqual('some-new-url');
    });

    it('should emit the new url', () => {
      const urls: string[] = [];
      s.go('some-initial-url');

      s.url.subscribe(url => urls.push(url));
      s.go('some-new-url');
      expect(urls).toEqual(['some-initial-url', 'some-new-url']);
    });

    it('should strip leading and trailing slashes', () => {
      let url: string | undefined;

      s.url.subscribe(u => (url = u));
      s.go('/some/url/');

      expect(loc.internalPath).toEqual('some/url');
      expect(loc.path(true)).toEqual('some/url');
      expect(url).toBe('some/url');
    });

    it('should ignore empty URL string', () => {
      const initialUrl = 'some/url';
      const goExternalSpy = spyOn(s, 'goExternal');
      let url: string | undefined;

      s.go(initialUrl);
      s.url.subscribe(u => (url = u));

      s.go('');
      expect(url).toEqual(initialUrl, 'should not have re-navigated locally');
      expect(goExternalSpy).not.toHaveBeenCalled();
    });

    it('should leave the site for external url that starts with "http"', () => {
      const goExternalSpy = spyOn(s, 'goExternal');
      const externalUrl = 'http://some/far/away/land';
      s.go(externalUrl);
      expect(goExternalSpy).toHaveBeenCalledWith(externalUrl);
    });

    it(
      'should do a "full page navigation" and remove the stored scroll position when navigating to ' +
        'internal URLs only if a ServiceWorker update has been activated',
      () => {
        const goExternalSpy = spyOn(s, 'goExternal');
        const removeStoredScrollInfoSpy = spyOn(
          scroll,
          'removeStoredScrollInfo'
        );

        // Internal URL - No ServiceWorker update
        s.go('some-internal-url');
        expect(removeStoredScrollInfoSpy).not.toHaveBeenCalled();
        expect(goExternalSpy).not.toHaveBeenCalled();
        expect(loc.path(true)).toEqual('some-internal-url');

        // Internal URL - ServiceWorker update
        updates.updateActivated.next('foo');
        s.go('other-internal-url');
        expect(goExternalSpy).toHaveBeenCalledWith('other-internal-url');
        expect(removeStoredScrollInfoSpy).toHaveBeenCalled();
      }
    );

    it('should not remove the stored scroll position when navigating to external URLs', () => {
      const removeStoredScrollInfoSpy = spyOn(scroll, 'removeStoredScrollInfo');
      const goExternalSpy = spyOn(s, 'goExternal');
      const externalUrl = 'http://some/far/away/land';
      const otherExternalUrl = 'http://some/far/far/away/land';

      // External URL - No ServiceWorker update
      s.go(externalUrl);
      expect(removeStoredScrollInfoSpy).not.toHaveBeenCalled();
      expect(goExternalSpy).toHaveBeenCalledWith(externalUrl);

      // External URL - ServiceWorker update
      updates.updateActivated.next('foo');
      s.go(otherExternalUrl);
      expect(removeStoredScrollInfoSpy).not.toHaveBeenCalled();
      expect(goExternalSpy).toHaveBeenCalledWith(otherExternalUrl);
    });

    it('should not update currentUrl for external url that starts with "http"', () => {
      let localUrl: string | undefined;
      spyOn(s, 'goExternal');
      s.url.subscribe(url => (localUrl = url));
      s.go('https://some/far/away/land');
      expect(localUrl).toBeFalsy('should not set local url');
    });
  });

  describe('search', () => {
    it('should read the query from the current loc.path', () => {
      loc.simulatePopState('a/b/c?foo=bar&moo=car');
      expect(s.search()).toEqual({foo: 'bar', moo: 'car'});
    });

    it('should cope with an empty query', () => {
      loc.simulatePopState('a/b/c');
      expect(s.search()).toEqual({});

      loc.simulatePopState('x/y/z?');
      expect(s.search()).toEqual({});

      loc.simulatePopState('x/y/z?x=');
      expect(s.search()).toEqual({x: ''});

      loc.simulatePopState('x/y/z?x');
      expect(s.search()).toEqual({x: undefined});
    });

    it('should URL decode query values', () => {
      loc.simulatePopState('a/b/c?query=a%26b%2Bc%20d');
      expect(s.search()).toEqual({query: 'a&b+c d'});
    });

    it('should URL decode query keys', () => {
      loc.simulatePopState('a/b/c?a%26b%2Bc%20d=value');
      expect(s.search()).toEqual({'a&b+c d': 'value'});
    });

    it('should cope with a hash on the URL', () => {
      spyOn(loc, 'path').and.callThrough();
      s.search();
      expect(loc.path).toHaveBeenCalledWith(false);
    });
  });

  describe('setSearch', () => {
    let platformLocation: MockPlatformLocation;

    beforeEach(() => {
      platformLocation = injector.get(PlatformLocation);
    });

    it('should call replaceState on PlatformLocation', () => {
      const params = {};
      s.setSearch('Some label', params);
      expect(platformLocation.replaceState).toHaveBeenCalledWith(
        jasmine.any(Object),
        'Some label',
        'a/b/c'
      );
    });

    it('should convert the params to a query string', () => {
      const params = {foo: 'bar', moo: 'car'};
      s.setSearch('Some label', params);
      expect(platformLocation.replaceState).toHaveBeenCalledWith(
        jasmine.any(Object),
        'Some label',
        jasmine.any(String)
      );
      const [
        path,
        query
      ] = platformLocation.replaceState.calls.mostRecent().args[2].split('?');
      expect(path).toEqual('a/b/c');
      expect(query).toContain('foo=bar');
      expect(query).toContain('moo=car');
    });

    it('should URL encode param values', () => {
      const params = {query: 'a&b+c d'};
      s.setSearch('', params);
      const [
        ,
        query
      ] = platformLocation.replaceState.calls.mostRecent().args[2].split('?');
      expect(query).toContain('query=a%26b%2Bc%20d');
    });

    it('should URL encode param keys', () => {
      const params = {'a&b+c d': 'value'};
      s.setSearch('', params);
      const [
        ,
        query
      ] = platformLocation.replaceState.calls.mostRecent().args[2].split('?');
      expect(query).toContain('a%26b%2Bc%20d=value');
    });
  });

  describe('handleAnchorClick', () => {
    let anchor: HTMLAnchorElement;

    beforeEach(() => {
      anchor = document.createElement('a');
      spyOn(s, 'go');
    });

    describe('should try to navigate with go() when anchor clicked for', () => {
      it('relative local url', () => {
        anchor.href = 'some/local/url';
        const result = s.handleAnchorClick(anchor);
        expect(s.go).toHaveBeenCalledWith('/some/local/url');
        expect(result).toBe(false);
      });

      it('absolute local url', () => {
        anchor.href = '/some/local/url';
        const result = s.handleAnchorClick(anchor);
        expect(s.go).toHaveBeenCalledWith('/some/local/url');
        expect(result).toBe(false);
      });

      it('local url with query params', () => {
        anchor.href = 'some/local/url?query=xxx&other=yyy';
        const result = s.handleAnchorClick(anchor);
        expect(s.go).toHaveBeenCalledWith(
          '/some/local/url?query=xxx&other=yyy'
        );
        expect(result).toBe(false);
      });

      it('local url with hash fragment', () => {
        anchor.href = 'some/local/url#somefragment';
        const result = s.handleAnchorClick(anchor);
        expect(s.go).toHaveBeenCalledWith('/some/local/url#somefragment');
        expect(result).toBe(false);
      });

      it('local url with query params and hash fragment', () => {
        anchor.href = 'some/local/url?query=xxx&other=yyy#somefragment';
        const result = s.handleAnchorClick(anchor);
        expect(s.go).toHaveBeenCalledWith(
          '/some/local/url?query=xxx&other=yyy#somefragment'
        );
        expect(result).toBe(false);
      });

      it('local url with period in a path segment but no extension', () => {
        anchor.href = 'tut.or.ial/toh-p2';
        const result = s.handleAnchorClick(anchor);
        expect(s.go).toHaveBeenCalled();
        expect(result).toBe(false);
      });
    });

    describe('should let browser handle anchor click when', () => {
      it('url is external to the site', () => {
        anchor.href =
          'http://other.com/some/local/url?query=xxx&other=yyy#somefragment';
        let result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);

        anchor.href = 'some/local/url.pdf';
        anchor.protocol = 'ftp';
        result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('mouse button is not zero (middle or right)', () => {
        anchor.href = 'some/local/url';
        const result = s.handleAnchorClick(anchor, 1, false, false);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('ctrl key is pressed', () => {
        anchor.href = 'some/local/url';
        const result = s.handleAnchorClick(anchor, 0, true, false);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('meta key is pressed', () => {
        anchor.href = 'some/local/url';
        const result = s.handleAnchorClick(anchor, 0, false, true);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('anchor has (non-_self) target', () => {
        anchor.href = 'some/local/url';
        anchor.target = '_blank';
        let result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);

        anchor.target = '_parent';
        result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);

        anchor.target = '_top';
        result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);

        anchor.target = 'other-frame';
        result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);

        anchor.target = '_self';
        result = s.handleAnchorClick(anchor);
        expect(s.go).toHaveBeenCalledWith('/some/local/url');
        expect(result).toBe(false);
      });

      it('zip url', () => {
        anchor.href = 'tutorial/toh-p2.zip';
        const result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('image or media url', () => {
        anchor.href = 'cat-photo.png';
        let result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true, 'png');

        anchor.href = 'cat-photo.gif';
        result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true, 'gif');

        anchor.href = 'cat-photo.jpg';
        result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true, 'jpg');

        anchor.href = 'dog-bark.mp3';
        result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true, 'mp3');

        anchor.href = 'pet-tricks.mp4';
        result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true, 'mp4');
      });

      it('url has any extension', () => {
        anchor.href = 'tutorial/toh-p2.html';
        const result = s.handleAnchorClick(anchor);
        expect(s.go).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });
  });

  describe('google analytics - GaService#locationChanged', () => {
    let gaLocationChanged: jasmine.Spy;

    beforeEach(() => {
      const ga = injector.get(GaService);
      gaLocationChanged = ga.locationChanged;
      // execute currentPath observable so that gaLocationChanged is called
      s.path.subscribe();
    });

    it('should call locationChanged with initial URL', () => {
      const initialUrl = loc.path().replace(/^\/+/, ''); // strip leading slashes

      expect(gaLocationChanged.calls.count()).toBe(1, 'gaS.locationChanged');
      const args = gaLocationChanged.calls.first().args;
      expect(args[0]).toBe(initialUrl);
    });

    it('should call locationChanged when `go` to a page', () => {
      s.go('some-new-url');
      expect(gaLocationChanged.calls.count()).toBe(2, 'gaS.locationChanged');
      const args = gaLocationChanged.calls.argsFor(1);
      expect(args[0]).toBe('some-new-url');
    });

    it('should call locationChanged with url stripped of hash or query', () => {
      // Important to keep GA service from sending tracking event when the doc hasn't changed
      // e.g., when the user navigates within the page via # fragments.
      s.go('some-new-url#one');
      s.go('some-new-url#two');
      s.go('some-new-url/?foo="true"');
      expect(gaLocationChanged.calls.count()).toBe(
        4,
        'gaS.locationChanged called'
      );
      const args = gaLocationChanged.calls.allArgs();
      expect(args[1]).toEqual(args[2], 'same url for hash calls');
      expect(args[1]).toEqual(args[3], 'same url for query string call');
    });

    it('should call locationChanged when window history changes', () => {
      loc.simulatePopState('/next-url');

      expect(gaLocationChanged.calls.count()).toBe(2, 'gaS.locationChanged');
      const args = gaLocationChanged.calls.argsFor(1);
      expect(args[0]).toBe('next-url');
    });
  });
});

/// Test Helpers ///
class MockPlatformLocation {
  pathname = 'a/b/c';
  replaceState = jasmine.createSpy('PlatformLocation.replaceState');
}

class MockUpdatesService {
  updateActivated = new Subject<string>();
}

class MockScrollService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  removeStoredScrollInfo() {}
}

class TestGaService {
  locationChanged = jasmine.createSpy('locationChanged');
}
