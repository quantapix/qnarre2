import {ApplicationRef, Injectable, Optional, OnDestroy} from '@angular/core';
import {SwUpdate} from '@angular/service-worker';
import {concat, interval, NEVER, Observable, Subject} from 'rxjs';
import {first, map, takeUntil, tap} from 'rxjs/operators';

import {LogService} from './log';

@Injectable()
export class UpdatesService implements OnDestroy {
  private interval = 1000 * 60 * 60 * 6; // 6 hours
  private onDestroy = new Subject<void>();
  active: Observable<string>;

  constructor(
    ref: ApplicationRef,
    private swu: SwUpdate,
    @Optional() private log?: LogService
  ) {
    if (!swu.isEnabled) {
      this.active = NEVER.pipe(takeUntil(this.onDestroy));
      return;
    }
    const stable = ref.isStable.pipe(first(v => v));
    concat(stable, interval(this.interval))
      .pipe(
        tap(() => this.info('Checking for update...')),
        takeUntil(this.onDestroy)
      )
      .subscribe(() => this.swu.checkForUpdate());
    this.swu.available
      .pipe(
        tap(e => this.info(`Update available: ${JSON.stringify(e)}`)),
        takeUntil(this.onDestroy)
      )
      .subscribe(() => this.swu.activateUpdate());
    this.active = this.swu.activated.pipe(
      tap(e => this.info(`Update active: ${JSON.stringify(e)}`)),
      map(e => e.current.hash),
      takeUntil(this.onDestroy)
    );
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

  private info(m: string) {
    const t = new Date().toISOString();
    this.log?.info(`[SwUpdates - ${t}]: ${m}`);
  }
}
