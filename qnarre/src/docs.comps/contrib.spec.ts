import {ReflectiveInjector} from '@angular/core';

import {of} from 'rxjs';

import {ContribListComp} from './contrib';
import {ContribGroup, ContribService} from './contrib.serv';
import {LocService} from '../app/loc.serv';

describe('ContribListComp', () => {
  let component: ContribListComp;
  let injector: ReflectiveInjector;
  let contributorService: TestContribService;
  let locationService: TestLocService;
  let contributorGroups: ContribGroup[];

  beforeEach(() => {
    injector = ReflectiveInjector.resolveAndCreate([
      ContribListComp,
      {provide: ContribService, useClass: TestContribService},
      {provide: LocService, useClass: TestLocService}
    ]);

    locationService = injector.get(LocService);
    contributorService = injector.get(ContribService);
    contributorGroups = contributorService.testContribs;
  });

  it('should select the first group when no query string', () => {
    component = getComponent();
    expect(component.selectedGroup).toBe(contributorGroups[0]);
  });

  it('should select the first group when query string w/o "group" property', () => {
    locationService.searchResult = {foo: 'GDE'};
    component = getComponent();
    expect(component.selectedGroup).toBe(contributorGroups[0]);
  });

  it('should select the first group when query group not found', () => {
    locationService.searchResult = {group: 'foo'};
    component = getComponent();
    expect(component.selectedGroup).toBe(contributorGroups[0]);
  });

  it('should select the GDE group when query group is "GDE"', () => {
    locationService.searchResult = {group: 'GDE'};
    component = getComponent();
    expect(component.selectedGroup).toBe(contributorGroups[1]);
  });

  it('should select the GDE group when query group is "gde" (case insensitive)', () => {
    locationService.searchResult = {group: 'gde'};
    component = getComponent();
    expect(component.selectedGroup).toBe(contributorGroups[1]);
  });

  it('should set the query to the "GDE" group when user selects "GDE"', () => {
    component = getComponent();
    component.selectGroup('GDE');
    expect(locationService.searchResult['group']).toBe('GDE');
  });

  it('should set the query to the first group when user selects unknown name', () => {
    component = getComponent();
    component.selectGroup('GDE'); // a legit group that isn't the first

    component.selectGroup('foo'); // not a legit group name
    expect(locationService.searchResult['group']).toBe('Angular');
  });

  //// Test Helpers ////
  function getComponent(): ContribListComp {
    const comp = injector.get(ContribListComp);
    comp.ngOnInit();
    return comp;
  }

  interface SearchResult {
    [index: string]: string;
  }

  class TestLocService {
    searchResult: SearchResult = {};
    search = jasmine.createSpy('search').and.callFake(() => this.searchResult);
    setSearch = jasmine
      .createSpy('setSearch')
      .and.callFake((_label: string, result: SearchResult) => {
        this.searchResult = result;
      });
  }

  class TestContribService {
    testContribs = getTestData();
    contributors = of(this.testContribs);
  }

  function getTestData(): ContribGroup[] {
    return [
      // Not interested in the contributors data in these tests
      {name: 'Angular', order: 0, contributors: []},
      {name: 'GDE', order: 1, contributors: []}
    ];
  }
});
