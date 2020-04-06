import {DebugElement} from '@angular/core';
import {TestBed, tick, fakeAsync} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatInputModule} from '@angular/material/input';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {State} from '../app/types';
import {SettingsComponent} from './settings.component';
import {toggleEnabled, changePeriod} from '../plugins/actions';
import {createPluginsState, createState} from '../plugins/plugins.spec';

describe('settings dialog test', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatButtonModule,
        MatCheckboxModule,
        MatInputModule,
        NoopAnimationsModule,
        ReactiveFormsModule
      ],
      providers: [
        provideMockStore({
          initialState: createState(
            createPluginsState({
              reloadPeriod: 30000,
              reloadEnabled: true
            })
          )
        }),
        SettingsComponent
      ],
      declarations: [SettingsComponent]
    }).compileComponents();
    store = TestBed.get(Store);
    dispatchSpy = spyOn(store, 'dispatch');
  });
  it('renders settings', () => {
    const c = TestBed.createComponent(SettingsComponent);
    c.detectChanges();
    const checkbox = c.debugElement.query(By.css('mat-checkbox'));
    expect(checkbox.classes['mat-checkbox-checked']).toBe(true);
    const reloadPeriod = c.debugElement.query(By.css('.reload-period'));
    expect(reloadPeriod.nativeElement.value).toBe('30');
  });
  it('updates the UI according to store changes.', () => {
    const c = TestBed.createComponent(SettingsComponent);
    c.detectChanges();
    const checkbox = c.debugElement.query(By.css('mat-checkbox'));
    expect(checkbox.classes['mat-checkbox-checked']).toBe(true);
    store.setState(
      createState(
        createPluginsState({
          reloadPeriod: 60000,
          reloadEnabled: false
        })
      )
    );
    c.detectChanges();
    expect(checkbox.classes['mat-checkbox-checked']).toBe(false);
    const reloadPeriod = c.debugElement.query(By.css('.reload-period'));
    expect(reloadPeriod.nativeElement.value).toBe('60');
  });

  describe('toggleEnabled', () => {
    it('dispatches when clicking on checkbox', fakeAsync(() => {
      const c = TestBed.createComponent(SettingsComponent);
      c.detectChanges();
      const checkbox = c.debugElement.query(By.css('mat-checkbox input'));
      checkbox.nativeElement.click();
      expect(dispatchSpy).toHaveBeenCalledWith(toggleEnabled());
    }));
  });

  describe('changePeriod', () => {
    it('dispatches changing the value', fakeAsync(() => {
      const c = TestBed.createComponent(SettingsComponent);
      c.detectChanges();
      const reloadPeriod = c.debugElement.query(By.css('.reload-period'));
      reloadPeriod.nativeElement.value = 20;
      reloadPeriod.nativeElement.dispatchEvent(new Event('input'));
      expect(dispatchSpy).not.toHaveBeenCalled();
      // We debounce it so it does not spam other components on very keystroke.
      tick(500);
      expect(dispatchSpy).toHaveBeenCalledWith(changePeriod({period: 20000}));
    }));
    it('does not dispatch when input is invalid', fakeAsync(() => {
      const c = TestBed.createComponent(SettingsComponent);
      c.detectChanges();
      const reloadPeriod = c.debugElement.query(By.css('.reload-period'));
      reloadPeriod.nativeElement.value = 5;
      reloadPeriod.nativeElement.dispatchEvent(new Event('input'));
      tick(1e10);
      expect(dispatchSpy).not.toHaveBeenCalled();
    }));
    it('does not set state when reload is disabled', fakeAsync(() => {
      store.setState(
        createState(
          createPluginsState({
            reloadPeriod: 30000,
            reloadEnabled: false
          })
        )
      );
      const c = TestBed.createComponent(SettingsComponent);
      c.detectChanges();
      const reloadPeriod = c.debugElement.query(By.css('.reload-period'));
      reloadPeriod.nativeElement.value = 30;
      reloadPeriod.nativeElement.dispatchEvent(new Event('input'));
      tick(1e10);
      expect(dispatchSpy).not.toHaveBeenCalled();
    }));
  });
});
