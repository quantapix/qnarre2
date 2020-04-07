import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {ReloaderComponent} from './reloader';

import {reload} from '../plugins/actions';
import {State} from '../app/types';
import {createState, createPluginsState} from '../plugins/plugins.spec';

describe('reloader.component', () => {
  let store: MockStore<State>;
  let dispatch: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          initialState: createState(
            createPluginsState({
              reloadPeriod: 5,
              reloadEnabled: true
            })
          )
        }),
        ReloaderComponent
      ],
      declarations: [ReloaderComponent]
    }).compileComponents();
    store = TestBed.get(Store);
    dispatch = spyOn(store, 'dispatch');
  });
  it('dispatches reload action every reload period', fakeAsync(() => {
    store.setState(
      createState(
        createPluginsState({
          reloadPeriod: 5,
          reloadEnabled: true
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();
    expect(dispatch).not.toHaveBeenCalled();
    tick(5);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(reload());
    tick(5);
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledWith(reload());
    fixture.destroy();
  }));
  it('disables reload when it is not enabled', fakeAsync(() => {
    store.setState(
      createState(
        createPluginsState({
          reloadPeriod: 5,
          reloadEnabled: false
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();
    tick(10);
    expect(dispatch).not.toHaveBeenCalled();
    fixture.destroy();
  }));
  it('respects reload period', fakeAsync(() => {
    store.setState(
      createState(
        createPluginsState({
          reloadPeriod: 50,
          reloadEnabled: true
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();
    expect(dispatch).not.toHaveBeenCalled();
    tick(5);
    expect(dispatch).not.toHaveBeenCalled();
    tick(45);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(reload());
    fixture.destroy();
  }));
  it('only resets timer when store values changes', fakeAsync(() => {
    store.setState(
      createState(
        createPluginsState({
          reloadPeriod: 5,
          reloadEnabled: true
        })
      )
    );
    const fixture = TestBed.createComponent(ReloaderComponent);
    fixture.detectChanges();
    tick(4);
    store.setState(
      createState(
        createPluginsState({
          reloadPeriod: 5,
          reloadEnabled: true
        })
      )
    );
    fixture.detectChanges();
    expect(dispatch).not.toHaveBeenCalled();
    tick(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    tick(4);
    store.setState(
      createState(
        createPluginsState({
          reloadPeriod: 3,
          reloadEnabled: true
        })
      )
    );
    tick(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    tick(2);
    expect(dispatch).toHaveBeenCalledTimes(2);
    fixture.destroy();
  }));
});
