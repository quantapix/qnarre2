import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import {Injector} from '@angular/core';
import {TestBed} from '@angular/core/testing';

import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';

import {Nodes, Item, navPath, NavService, Views} from './nav';
import {LocService} from './loc';

describe('NavService', () => {
  let inj: Injector;
  let nav: NavService;
  let http: HttpTestingController;

  beforeEach(() => {
    inj = TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NavService,
        {
          provide: LocService,
          useFactory: () => new MockLoc('a')
        }
      ]
    });
    nav = inj.get(NavService);
    http = inj.get(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('navViews', () => {
    it('should make a single connection to the server', () => {
      const req = http.expectOne({});
      expect(req.request.url).toBe('generated/navigation.json');
    });
    it('should expose the server response', () => {
      const viewsEvents: Views[] = [];
      nav.views$.subscribe(views => viewsEvents.push(views));
      expect(viewsEvents).toEqual([]);
      http.expectOne({}).flush({TopBar: [{title: '', url: 'a'}]});
      expect(viewsEvents).toEqual([{TopBar: [{title: '', url: 'a'}]}]);
    });
    it('navViews observable should complete', () => {
      let completed = false;
      nav.views$.subscribe({
        complete: () => (completed = true)
      });
      http.expectOne({method: 'get', url: navPath}).flush({});
      expect(completed).toBe(true, 'observable completed');
    });
    it('should return the same object to all subscribers', () => {
      let views1: Views | undefined;
      nav.views$.subscribe(views => (views1 = views));
      let views2: Views | undefined;
      nav.views$.subscribe(views => (views2 = views));
      http.expectOne({}).flush({TopBar: [{url: 'a'}]});
      let views3: Views | undefined;
      nav.views$.subscribe(views => (views3 = views));
      expect(views2).toBe(views1);
      expect(views3).toBe(views1);
      http.expectNone({});
    });
    it('should do WHAT(?) if the request fails');
  });

  describe('node.tooltip', () => {
    let view: Item[];
    const sideNav: Item[] = [
      {title: 'a', tooltip: 'a tip'},
      {title: 'b'},
      {title: 'c!'},
      {title: '', url: 'foo'}
    ];
    beforeEach(() => {
      nav.views$.subscribe(vs => (view = vs['sideNav']));
      http.expectOne({}).flush({sideNav});
    });
    it('should have the supplied tooltip', () => {
      expect(view[0].tooltip).toEqual('a tip');
    });
    it('should create a tooltip from title + period', () => {
      expect(view[1].tooltip).toEqual('b.');
    });
    it('should create a tooltip from title, keeping its trailing punctuation', () => {
      expect(view[2].tooltip).toEqual('c!');
    });
    it('should not create a tooltip if there is no title', () => {
      expect(view[3].tooltip).toBeUndefined();
    });
  });

  describe('currentNode', () => {
    let ns: Nodes;
    let location: MockLoc;
    const tops: Item[] = [{url: 'features', title: 'Features', tooltip: 'tip'}];
    const sides: Item[] = [
      {
        title: 'a',
        tooltip: 'tip',
        children: [
          {
            url: 'b',
            title: 'b',
            tooltip: 'tip',
            children: [
              {url: 'c', title: 'c', tooltip: 'tip'},
              {url: 'd', title: 'd', tooltip: 'tip'}
            ]
          },
          {url: 'e', title: 'e', tooltip: 'tip'}
        ]
      },
      {url: 'f', title: 'f', tooltip: 'tip'}
    ];
    const navJson = {
      TopBar: tops,
      SideNav: sides
    };
    beforeEach(() => {
      location = (inj.get(LocService) as any) as MockLoc;
      nav.nodes$.subscribe(s => (ns = s));
      http.expectOne({}).flush(navJson);
    });
    it('should list the side navigation node that matches the current location, and all its ancestors', () => {
      location.go('b');
      expect(ns).toEqual({
        SideNav: {
          url: 'b',
          view: 'SideNav',
          items: [sides[0].children![0], sides[0]]
        }
      });
      location.go('d');
      expect(ns).toEqual({
        SideNav: {
          url: 'd',
          view: 'SideNav',
          items: [
            sides[0].children![0].children![1],
            sides[0].children![0],
            sides[0]
          ]
        }
      });
      location.go('f');
      expect(ns).toEqual({
        SideNav: {
          url: 'f',
          view: 'SideNav',
          items: [sides[1]]
        }
      });
    });
    it('should be a TopBar selected node if the current location is a top menu node', () => {
      location.go('features');
      expect(ns).toEqual({
        TopBar: {
          url: 'features',
          view: 'TopBar',
          items: [tops[0]]
        }
      });
    });
    it('should be a plain object if no navigation node matches the current location', () => {
      location.go('g?search=moo#anchor-1');
      expect(ns).toEqual({
        '': {
          url: 'g',
          view: '',
          items: []
        }
      });
    });
    it('should ignore trailing slashes, hashes, and search params on URLs in the navmap', () => {
      const cnode: Nodes = {
        SideNav: {
          url: 'c',
          view: 'SideNav',
          items: [
            sides[0].children![0].children![0],
            sides[0].children![0],
            sides[0]
          ]
        }
      };
      location.go('c');
      expect(ns).toEqual(cnode, 'location: c');
      location.go('c#foo');
      expect(ns).toEqual(cnode, 'location: c#foo');
      location.go('c?foo=1');
      expect(ns).toEqual(cnode, 'location: c?foo=1');
      location.go('c#foo?bar=1&baz=2');
      expect(ns).toEqual(cnode, 'location: c#foo?bar=1&baz=2');
    });
  });

  describe('docVersions', () => {
    let actual: Item[];
    let versions: Item[];
    let expected: Item[];
    beforeEach(() => {
      actual = [];
      versions = [
        {title: 'v4.0.0'},
        {title: 'v2', url: 'https://v2.angular.io'}
      ];
      expected = versions.map(v => ({
        ...v,
        ...{tooltip: v.title + '.'}
      }));
      nav.views$.subscribe(vs => (actual = vs['docVersions']));
    });
    it('should extract the docVersions', () => {
      http.expectOne({}).flush({versions});
      expect(actual).toEqual(expected);
    });
  });
});

class MockLoc {
  urlSubject = new BehaviorSubject<string>(this.initialUrl);
  currentUrl = this.urlSubject
    .asObservable()
    .pipe(map(url => this.stripSlashes(url)));
  currentPath = this.currentUrl.pipe(map(url => url.match(/[^?#]*/)?.[0]));
  search = jasmine.createSpy('search').and.returnValue({});
  setSearch = jasmine.createSpy('setSearch');
  go = jasmine
    .createSpy('Location.go')
    .and.callFake((url: string) => this.urlSubject.next(url));
  goExternal = jasmine.createSpy('Location.goExternal');
  replace = jasmine.createSpy('Location.replace');
  handleAnchorClick = jasmine
    .createSpy('Location.handleAnchorClick')
    .and.returnValue(false);

  constructor(private initialUrl: string) {}

  private stripSlashes(url: string) {
    return url.replace(/^\/+/, '').replace(/\/+(\?|#|$)/, '$1');
  }
}
