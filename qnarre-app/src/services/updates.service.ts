import {ApplicationRef, Injectable, OnDestroy} from '@angular/core';
import {SwUpdate} from '@angular/service-worker';
import {concat, interval, NEVER, Observable, Subject} from 'rxjs';
import {first, map, takeUntil, tap} from 'rxjs/operators';

import {LoggerService} from './logger.service';

@Injectable()
export class UpdatesService implements OnDestroy {
  private interval = 1000 * 60 * 60 * 6; // 6 hours
  private onDestroy = new Subject<void>();
  activated: Observable<string>;

  constructor(
    ref: ApplicationRef,
    private logger: LoggerService,
    private swu: SwUpdate
  ) {
    if (!swu.isEnabled) {
      this.activated = NEVER.pipe(takeUntil(this.onDestroy));
      return;
    }
    const appIsStable = ref.isStable.pipe(first(v => v));
    concat(appIsStable, interval(this.interval))
      .pipe(
        tap(() => this.log('Checking for update...')),
        takeUntil(this.onDestroy)
      )
      .subscribe(() => this.swu.checkForUpdate());
    this.swu.available
      .pipe(
        tap(evt => this.log(`Update available: ${JSON.stringify(evt)}`)),
        takeUntil(this.onDestroy)
      )
      .subscribe(() => this.swu.activateUpdate());
    this.activated = this.swu.activated.pipe(
      tap(evt => this.log(`Update activated: ${JSON.stringify(evt)}`)),
      map(evt => evt.current.hash),
      takeUntil(this.onDestroy)
    );
  }

  ngOnDestroy() {
    this.onDestroy.next();
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.logger.log(`[SwUpdates - ${timestamp}]: ${message}`);
  }
}
