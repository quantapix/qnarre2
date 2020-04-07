import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Results} from '../search/types';
import {SearchService} from '../search/service';
import {LocationService} from '../services/loc';

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

import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WithElem} from '../registry';
import {ServicesModule} from '../services/module';
import {NotFoundComp} from './not-found';

@NgModule({
  imports: [CommonModule, ServicesModule],
  declarations: [NotFoundComp],
  entryComponents: [NotFoundComp]
})
export class NotFoundModule implements WithElem {
  elemComp: Type<any> = NotFoundComp;
}

import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WithElem} from '../../elems/registry';
import {ServicesModule} from '../services/module';
import {NotFoundComp} from './not-found';

@NgModule({
  imports: [CommonModule, ServicesModule],
  declarations: [NotFoundComp],
  entryComponents: [NotFoundComp]
})
export class NotFoundModule implements WithElem {
  elemComp: Type<any> = NotFoundComp;
}
