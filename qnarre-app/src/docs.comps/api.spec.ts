import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';

import {ApiListComp} from './api';
import {ApiItem, ApiSection, ApiService} from '../services/api';
import {LocService} from '../services/loc';
import {LogService} from '../services/log';
import {MockLog} from '../services/log';
import {ApiListModule} from './api';

describe('ApiListComp', () => {
  let component: ApiListComp;
  let fixture: ComponentFixture<ApiListComp>;
  let sections: ApiSection[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ApiListModule],
      providers: [
        {provide: ApiService, useClass: TestApiService},
        {provide: LogService, useClass: MockLog},
        {provide: LocService, useClass: TestLocService}
      ]
    });

    fixture = TestBed.createComponent(ApiListComp);
    component = fixture.componentInstance;
    sections = getApiSections();
  });

  /**
   * Expectation Utility: Assert that filteredSections has the expected result for this test
   * @param itemTest - return true if the item passes the match test
   *
   * Subscibes to `filteredSections` and performs expectation within subscription callback.
   */
  function expectFilteredResult(
    label: string,
    itemTest: (item: ApiItem) => boolean
  ) {
    component.filteredSections.subscribe(filtered => {
      filtered = filtered.filter(section => section.items);
      expect(filtered.length).toBeGreaterThan(0, 'expected something');
      expect(filtered.every(section => section.items!.every(itemTest))).toBe(
        true,
        label
      );
    });
  }

  describe('#filteredSections', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return all complete sections when no criteria', () => {
      let filtered: ApiSection[] | undefined;
      component.filteredSections.subscribe(f => (filtered = f));
      expect(filtered).toEqual(sections);
    });

    it('item.show should be true for all queried items', () => {
      component.setQuery('class');
      expectFilteredResult('query: class', item => /class/.test(item.name));
    });

    it('items should be an array for every item in section when query matches section name', () => {
      component.setQuery('core');
      component.filteredSections.subscribe(filtered => {
        filtered = filtered.filter(section => Array.isArray(section.items));
        expect(filtered.length).toBe(1, 'only one section');
        expect(filtered[0].name).toBe('core');
        expect(filtered[0].items).toEqual(
          sections.find(section => section.name === 'core')!.items
        );
      });
    });

    describe('section.items', () => {
      it('should null if there are no matching items and the section itself does not match', () => {
        component.setQuery('core');
        component.filteredSections.subscribe(filtered => {
          const commonSection = filtered.find(
            section => section.name === 'common'
          )!;
          expect(commonSection.items).toBe(null);
        });
      });

      it('should be visible if they have the selected stability status', () => {
        component.setStatus({value: 'stable', title: 'Stable'});
        expectFilteredResult(
          'status: stable',
          item => item.stability === 'stable'
        );
      });

      it('should be visible if they have the selected security status', () => {
        component.setStatus({value: 'security-risk', title: 'Security Risk'});
        expectFilteredResult(
          'status: security-risk',
          item => item.securityRisk
        );
      });

      it('should be visible if they match the selected API type', () => {
        component.setType({value: 'class', title: 'Class'});
        expectFilteredResult('type: class', item => item.docType === 'class');
      });
    });

    it('should have no sections and no items visible when there is no match', () => {
      component.setQuery('fizbuzz');
      component.filteredSections.subscribe(filtered => {
        expect(filtered.some(section => !!section.items)).toBeFalsy();
      });
    });
  });

  describe('initial criteria from location', () => {
    let locationService: TestLocService;

    beforeEach(() => {
      locationService = fixture.componentRef.injector.get<any>(LocService);
    });

    function expectOneItem(
      name: string,
      section: string,
      type: string,
      stability: string
    ) {
      fixture.detectChanges();

      component.filteredSections.subscribe(filtered => {
        filtered = filtered.filter(s => s.items);
        expect(filtered.length).toBe(1, 'sections');
        expect(filtered[0].name).toBe(section, 'section name');
        const items = filtered[0].items!;
        expect(items.length).toBe(1, 'items');

        const item = items[0];
        const badItem = 'Wrong item: ' + JSON.stringify(item, null, 2);

        expect(item.docType).toBe(type, badItem);
        expect(item.stability).toBe(stability, badItem);
        expect(item.name).toBe(name, badItem);
      });
    }

    it('should filter as expected for ?query', () => {
      locationService.query = {query: '_3'};
      expectOneItem('class_3', 'core', 'class', 'experimental');
    });

    it('should filter as expected for ?status', () => {
      locationService.query = {status: 'deprecated'};
      expectOneItem('function_1', 'core', 'function', 'deprecated');
    });

    it('should filter as expected when status is security-risk', () => {
      locationService.query = {status: 'security-risk'};
      fixture.detectChanges();
      expectFilteredResult('security-risk', item => item.securityRisk);
    });

    it('should filter as expected for ?type', () => {
      locationService.query = {type: 'pipe'};
      expectOneItem('pipe_1', 'common', 'pipe', 'stable');
    });

    it('should filter as expected for ?query&status&type', () => {
      locationService.query = {
        query: 's_1',
        status: 'experimental',
        type: 'class'
      };
      fixture.detectChanges();
      expectOneItem('class_1', 'common', 'class', 'experimental');
    });

    it('should ignore case for ?query&status&type', () => {
      locationService.query = {
        query: 'S_1',
        status: 'ExperiMental',
        type: 'CLASS'
      };
      fixture.detectChanges();
      expectOneItem('class_1', 'common', 'class', 'experimental');
    });
  });

  describe('location path after criteria change', () => {
    let locationService: TestLocService;

    beforeEach(() => {
      locationService = fixture.componentRef.injector.get<any>(LocService);
    });

    it('should have query', () => {
      component.setQuery('foo');

      // `setSearch` 2nd param is a query/search params object
      const search = locationService.setSearch.calls.mostRecent().args[1];
      expect(search.query).toBe('foo');
    });

    it('should keep last of multiple query settings (in lowercase)', () => {
      component.setQuery('foo');
      component.setQuery('fooBar');

      const search = locationService.setSearch.calls.mostRecent().args[1];
      expect(search.query).toBe('foobar');
    });

    it('should have query, status, and type', () => {
      component.setQuery('foo');
      component.setStatus({value: 'stable', title: 'Stable'});
      component.setType({value: 'class', title: 'Class'});

      const search = locationService.setSearch.calls.mostRecent().args[1];
      expect(search.query).toBe('foo');
      expect(search.status).toBe('stable');
      expect(search.type).toBe('class');
    });
  });
});

////// Helpers ////////

class TestLocService {
  query: {[index: string]: string} = {};
  setSearch = jasmine.createSpy('setSearch');
  search() {
    return this.query;
  }
}

class TestApiService {
  sectionsSubject = new BehaviorSubject(getApiSections());
  sections = this.sectionsSubject.asObservable();
}

// tslint:disable:quotemark
const apiSections: ApiSection[] = [
  {
    name: 'common',
    title: 'common',
    path: 'api/common',
    deprecated: false,
    items: [
      {
        name: 'class_1',
        title: 'Class 1',
        path: 'api/common/class_1',
        docType: 'class',
        stability: 'experimental',
        securityRisk: false
      },
      {
        name: 'class_2',
        title: 'Class 2',
        path: 'api/common/class_2',
        docType: 'class',
        stability: 'stable',
        securityRisk: false
      },
      {
        name: 'directive_1',
        title: 'Directive 1',
        path: 'api/common/directive_1',
        docType: 'directive',
        stability: 'stable',
        securityRisk: true
      },
      {
        name: 'pipe_1',
        title: 'Pipe 1',
        path: 'api/common/pipe_1',
        docType: 'pipe',
        stability: 'stable',
        securityRisk: true
      }
    ]
  },
  {
    name: 'core',
    title: 'core',
    path: 'api/core',
    deprecated: false,
    items: [
      {
        name: 'class_3',
        title: 'Class 3',
        path: 'api/core/class_3',
        docType: 'class',
        stability: 'experimental',
        securityRisk: false
      },
      {
        name: 'function_1',
        title: 'Function 1',
        path: 'api/core/function 1',
        docType: 'function',
        stability: 'deprecated',
        securityRisk: true
      },
      {
        name: 'const_1',
        title: 'Const 1',
        path: 'api/core/const_1',
        docType: 'const',
        stability: 'stable',
        securityRisk: false
      }
    ]
  }
];

function getApiSections() {
  return apiSections;
}