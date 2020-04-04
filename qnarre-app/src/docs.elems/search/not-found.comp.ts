import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Results} from '../../search/types';
import {SearchService} from '../../search/service';
import {LocationService} from '../../services/location';

@Component({
  selector: 'qnr-not-found',
  template: `
    <p>Let's see if any of these search results help...</p>
    <qnr-search-results
      class="embedded"
      [results]="results | async"
    ></qnr-search-results>
  `
})
export class NotFoundComp implements OnInit {
  results = {} as Observable<Results>;
  constructor(
    private location: LocationService,
    private search: SearchService
  ) {}

  ngOnInit() {
    this.results = this.location.path.pipe(
      switchMap(path => {
        const query = path.split(/\W+/).join(' ');
        return this.search.search(query);
      })
    );
  }
}
