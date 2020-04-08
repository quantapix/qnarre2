import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Subject} from 'rxjs';
import {LocService, MockLoc} from '../app/loc.serv';
import {} from '../../testing/loc';
import {Results} from '../search/types';
import {ResultsComponent} from '../search/results';
import {SearchService} from '../search/service';
import {NotFoundComp} from './not-found';

describe('NotFoundComp', () => {
  let fixture: ComponentFixture<NotFoundComp>;
  let searchService: SearchService;
  let searchResultSubject: Subject<Results>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NotFoundComp, ResultsComponent],
      providers: [
        {
          provide: LocService,
          useValue: new MockLocation('base/initial-url?some-query')
        },
        SearchService
      ]
    });

    fixture = TestBed.createComponent(NotFoundComp);
    searchService = TestBed.inject(SearchService);
    searchResultSubject = new Subject<Results>();
    spyOn(searchService, 'search').and.callFake(() =>
      searchResultSubject.asObservable()
    );
    fixture.detectChanges();
  });

  it('should run a search with a query built from the current url', () => {
    expect(searchService.search).toHaveBeenCalledWith('base initial url');
  });

  it('should pass through any results to the `qnr-search-results` component', () => {
    const resultsComponent = fixture.debugElement.query(
      By.directive(ResultsComponent)
    ).componentInstance;
    expect(resultsComponent.results).toBe(null);

    const results = {query: 'base initial url', results: []};
    searchResultSubject.next(results);
    fixture.detectChanges();
    expect(resultsComponent.results).toEqual(results);
  });
});
