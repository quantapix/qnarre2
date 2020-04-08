import {Injectable, Optional} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {AsyncSubject, Observable, of} from 'rxjs';
import {catchError, switchMap, tap} from 'rxjs/operators';

import {LocService} from '../app/loc.serv';
import {LogService} from '../app/log.serv';

export const NOT_FOUND = 'file-not-found';
export const FETCH_ERR = 'fetching-error';

export const CONTENT_URL_PREFIX = 'generated/';
export const DOC_CONTENT_URL_PREFIX = CONTENT_URL_PREFIX + 'docs/';

export interface Data {
  k: string;
  v?: string;
}

@Injectable()
export class DocsService {
  private cache = new Map<string, Observable<Data>>();
  data$: Observable<Data>;

  constructor(
    loc: LocService,
    private http: HttpClient,
    @Optional() private log?: LogService
  ) {
    this.data$ = loc.path$.pipe(switchMap(p => this.data(p)!));
  }

  private data(url: string) {
    const k = url || 'index';
    this.log?.info('getting data', k);
    if (!this.cache.has(k)) this.cache.set(k, this.fetch(k));
    return this.cache.get(k)!;
  }

  private fetch(k: string) {
    const s = new AsyncSubject<Data>();
    const p = `${DOC_CONTENT_URL_PREFIX}${k}.json`;
    this.log?.info('fetching from', p);
    this.http
      .get<Data>(p, {responseType: 'json'})
      .pipe(
        tap(d => {
          if (typeof d !== 'object') {
            this.log?.info('received invalid', d);
            throw Error('Invalid data');
          }
        }),
        catchError(e => {
          return e.status === 404 ? this.notFound(k) : this.error(k, e);
        })
      )
      .subscribe(s);
    return s.asObservable();
  }

  private notFound(k: string) {
    if (k !== NOT_FOUND) {
      this.log?.fail(new Error(`Data not found at '${k}'`));
      return this.data(NOT_FOUND);
    }
    return of({k: NOT_FOUND, v: 'Data not found'} as Data);
  }

  private error(k: string, e: HttpErrorResponse) {
    this.log?.fail(new Error(`Error fetching '${k}': (${e.message})`));
    this.cache.delete(k);
    return of({k: FETCH_ERR, v: ERR_CONTENTS(k)} as Data);
  }
}

const ERR_CONTENTS = (k: string) => `
  <div class="nf-container l-flex-wrap flex-center">
    <div class="nf-icon material-icons">error_outline</div>
    <div class="nf-response l-flex-wrap">
      <h1 class="no-toc">Request for document failed.</h1>
      <p>
        Unable to retrieve "${k}" page. Please try later.
      </p>
    </div>
  </div>
`;
