import {Component, OnInit, OnDestroy} from '@angular/core';
import {FormControl, Validators} from '@angular/forms';
import {Store, select, createSelector} from '@ngrx/store';
import {Subject} from 'rxjs';
import {takeUntil, debounceTime, filter} from 'rxjs/operators';

import {getReloadEnabled, getReloadPeriods} from '../plugins/selectors';
import {toggleEnabled, changePeriod} from '../plugins/actions';
import {State} from '../plugins/types';

const getPeriod = createSelector(getReloadPeriods, period =>
  Math.round(period / 1000)
);

@Component({
  selector: 'qnr-settings-dialog',
  template: `
    <h3>Settings</h3>
    <div class="item">
      <mat-checkbox
        [checked]="reloadEnabled$ | async"
        (change)="onReloadToggle()"
        >Reload data</mat-checkbox
      >
    </div>
    <div class="item">
      <mat-form-field>
        <input
          class="reload-period"
          matInput
          type="number"
          placeholder="Reload Period"
          [formControl]="periodControl"
        />
      </mat-form-field>
      <mat-error
        *ngIf="
          periodControl.hasError('min') || periodControl.hasError('required')
        "
      >
        Reload period has to be minimum of 15 seconds.
      </mat-error>
    </div>
  `,
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy {
  readonly reloadEnabled$ = this.store.pipe(select(getReloadEnabled));
  private readonly reloadPeriod$ = this.store.pipe(select(getPeriod));
  readonly periodControl = new FormControl(15, [
    // eslint-disable-next-line @typescript-eslint/unbound-method
    Validators.required,
    Validators.min(15)
  ]);
  private unsubscribe = new Subject();

  constructor(private store: Store<State>) {}

  ngOnInit() {
    this.reloadPeriod$
      .pipe(
        takeUntil(this.unsubscribe),
        filter(value => value !== this.periodControl.value)
      )
      .subscribe(value => {
        this.periodControl.setValue(value);
      });
    this.reloadEnabled$.pipe(takeUntil(this.unsubscribe)).subscribe(v => {
      if (v) this.periodControl.enable();
      else this.periodControl.disable();
    });
    this.periodControl.valueChanges
      .pipe(takeUntil(this.unsubscribe), debounceTime(500))
      .subscribe(() => {
        if (!this.periodControl.valid) {
          return;
        }
        const period = this.periodControl.value * 1000;
        this.store.dispatch(changePeriod({period}));
      });
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  onReloadToggle(): void {
    this.store.dispatch(toggleEnabled());
  }
}
