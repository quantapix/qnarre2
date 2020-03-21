import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Results} from '../../search/types';
import {SearchService} from '../../search/search.service';
import {LocationService} from '../../services/location.service';

@Component({
  selector: 'qnr-file-not-found-search',
  template: `
    <p>Let's see if any of these search results help...</p>
    <qnr-search-results
      class="embedded"
      [searchResults]="searchResults | async"
    ></qnr-search-results>
  `
})
export class FileNotFoundSearchComponent implements OnInit {
  searchResults: Observable<Results>;
  constructor(
    private location: LocationService,
    private search: SearchService
  ) {}

  ngOnInit() {
    this.searchResults = this.location.path.pipe(
      switchMap(path => {
        const query = path.split(/\W+/).join(' ');
        return this.search.search(query);
      })
    );
  }
}
