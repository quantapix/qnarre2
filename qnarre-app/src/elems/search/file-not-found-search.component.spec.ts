import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Subject} from 'rxjs';
import {LocationService} from '../../services/location.service';
import {MockLocationService} from '../../testing/location.service';
import {Results} from '../../search/types';
import {ResultsComponent} from '../../search/results.component';
import {SearchService} from '../../search/search.service';
import {FileNotFoundSearchComponent} from './file-not-found-search.component';

describe('FileNotFoundSearchComponent', () => {
  let fixture: ComponentFixture<FileNotFoundSearchComponent>;
  let searchService: SearchService;
  let searchResultSubject: Subject<Results>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FileNotFoundSearchComponent, ResultsComponent],
      providers: [
        {
          provide: LocationService,
          useValue: new MockLocationService('base/initial-url?some-query')
        },
        SearchService
      ]
    });

    fixture = TestBed.createComponent(FileNotFoundSearchComponent);
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
    const searchResultsComponent = fixture.debugElement.query(
      By.directive(ResultsComponent)
    ).componentInstance;
    expect(searchResultsComponent.searchResults).toBe(null);

    const results = {query: 'base initial url', results: []};
    searchResultSubject.next(results);
    fixture.detectChanges();
    expect(searchResultsComponent.searchResults).toEqual(results);
  });
});
