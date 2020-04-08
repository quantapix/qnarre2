import {Injectable, OnDestroy, Optional} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';

import {ReplaySubject, Subject} from 'rxjs';
import {takeUntil, tap} from 'rxjs/operators';

import {LogService} from './log';
import {DOC_CONTENT_URL_PREFIX} from './docs';

export interface ApiItem {
  name: string;
  title: string;
  path: string;
  docType: string;
  stability: string;
  securityRisk: boolean;
}

export interface ApiSection {
  path: string;
  name: string;
  title: string;
  deprecated: boolean;
  items: ApiItem[] | null;
}

@Injectable()
export class ApiService implements OnDestroy {
  private apiBase = DOC_CONTENT_URL_PREFIX + 'api/';
  private apiListJsonDefault = 'api-list.json';
  private firstTime = true;
  private onDestroy = new Subject();
  private sectionsSubject = new ReplaySubject<ApiSection[]>(1);
  private _sections = this.sectionsSubject.pipe(takeUntil(this.onDestroy));

  get sections() {
    if (this.firstTime) {
      this.firstTime = false;
      this.fetchSections();
      this._sections.subscribe(sections =>
        this.log?.info(`ApiService got API ${sections.length} section(s)`)
      );
    }
    return this._sections.pipe(
      tap(sections => {
        sections.forEach(section => {
          section.deprecated =
            !!section.items &&
            section.items.every(item => item.stability === 'deprecated');
        });
      })
    );
  }

  constructor(private http: HttpClient, @Optional() private log?: LogService) {}

  ngOnDestroy() {
    this.onDestroy.next();
  }

  fetchSections(src?: string) {
    const url = this.apiBase + (src || this.apiListJsonDefault);
    this.http
      .get<ApiSection[]>(url)
      .pipe(
        takeUntil(this.onDestroy),
        tap(() => this.log?.info(`Got API sections from ${url}`))
      )
      .subscribe(
        sections => this.sectionsSubject.next(sections),
        (err: HttpErrorResponse) => {
          this.log?.error(err);
          throw err;
        }
      );
  }
}
