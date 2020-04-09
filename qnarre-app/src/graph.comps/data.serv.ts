import {Injectable, Optional} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {AsyncSubject, Observable, of} from 'rxjs';
import {catchError, switchMap, tap} from 'rxjs/operators';

import {Data, DataService as _DataService} from '../app/data.serv';
import {LocService} from '../app/loc.serv';
import {LogService} from '../app/log.serv';

import {loadHier} from '../graph/load';
import {tracker} from '../graph/utils';
import {HierPs} from '../graph/params';
import {TpuCompat} from '../graph/compat';

export const FILE_NOT_FOUND = 'file-not-found';
export const FETCHING_ERROR = 'fetching-error';

export const CONTENT_URL_PREFIX = 'generated/';
export const DOC_CONTENT_URL_PREFIX = CONTENT_URL_PREFIX + 'docs/';

@Injectable()
export class DataService extends _DataService {
  progress = {v: 0, msg: ''};
  compat = () => new TpuCompat();
  params = () => {};
  slim$: Observable<Data>;
  hier$: Observable<Data>;

  constructor(loc: LocService, http: HttpClient, @Optional() log?: LogService) {
    super(loc, http, log);
    this.data$.pipe(tap(d => this.load(d)));
  }

  outGraphHierarchy: any; //  readOnly, notify
  outGraph: any; // readOnly, notify
  outHierarchyParams: any; // readOnly, notify

  load(d: Data) {
    this.progress = {v: 0, msg: ''};
    const t = tracker(this);
    const {params, compat} = this;
    const ps = Object.assign({}, HierPs, params());
    loadHier(t, d.k, d.v, compat(), ps).then(({slim, hier}) => {
      this._setOutHierarchyParams(hierarchyParams);
      this._setOutGraph(graph);
      this._setOutGraphHierarchy(graphHierarchy);
    });
  }
}
