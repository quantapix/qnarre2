import {Component, ChangeDetectionStrategy} from '@angular/core';
import {distinctUntilChanged} from 'rxjs/operators';
import {combineLatest} from 'rxjs';
import {Store, select} from '@ngrx/store';

import {getReloadEnabled, getReloadPeriods} from '../plugins/selectors';
import {reload} from '../plugins/actions';
import {State} from '../plugins/types';

@Component({
  selector: 'qnr-reloader',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReloaderComponent {
  private readonly enabled$ = this.store.pipe(select(getReloadEnabled));
  private readonly period$ = this.store.pipe(select(getReloadPeriods));
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private store: Store<State>) {}

  ngOnInit() {
    combineLatest(
      this.enabled$.pipe(distinctUntilChanged()),
      this.period$.pipe(distinctUntilChanged())
    ).subscribe(([enabled, period]) => {
      this.cancel();
      if (enabled) {
        this.load(period);
      }
    });
  }

  ngOnDestroy() {
    this.cancel();
  }

  private load(period: number) {
    this.timer = setTimeout(() => {
      this.store.dispatch(reload());
      this.load(period);
    }, period);
  }

  private cancel() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
    }
    this.timer = undefined;
  }
}
