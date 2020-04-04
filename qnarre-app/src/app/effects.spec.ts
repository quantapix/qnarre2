import {TestBed} from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import {ReplaySubject, of} from 'rxjs';
import {Action, Store} from '@ngrx/store';
import {provideMockActions} from '@ngrx/effects/testing';
import {MockStore, provideMockStore} from '@ngrx/store/testing';

import {Effects} from './effects';
import * as actions from './actions';
import {Plugins, LoadedCode, State} from './types';
import {SourceService} from '../services/source.service';
import {
  createPluginInfo,
  createState,
  createPluginsState
} from '../plugins/plugins.spec';

describe('core.effects', () => {
  let http: HttpTestingController;
  let effects: Effects;
  let action: ReplaySubject<Action>;
  let store: MockStore<State>;
  let runs: jasmine.Spy;
  let envs: jasmine.Spy;
  let dispatch: jasmine.Spy;
  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);
    const initialState = createState(createPluginsState({loaded: {}}));
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        provideMockActions(action),
        effects,
        SourceService,
        provideMockStore({initialState})
      ]
    }).compileComponents();
    effects = TestBed.get(effects);
    http = TestBed.get(HttpTestingController);
    store = TestBed.get(Store);
    dispatch = spyOn(store, 'dispatch');
    const source = TestBed.get(SourceService);
    runs = spyOn(source, 'runs').withArgs().and.returnValue(of(null));
    envs = spyOn(source, 'envs').withArgs().and.returnValue(of(null));
  });
  afterEach(() => {
    http.verify();
  });
  [
    {name: '#loaded', onAction: actions.loaded()},
    {name: '#reload', onAction: actions.reload()}
  ].forEach(({name, onAction}) => {
    describe(name, () => {
      let recorded: Action[] = [];
      beforeEach(() => {
        recorded = [];
        effects.loadPlugins$.subscribe((a: Action) => {
          recorded.push(a);
        });
      });
      it('fetches plugins listing and fires success action', () => {
        const plugins: Plugins = {core: createPluginInfo('Core')};
        action.next(onAction);
        http.expectOne('data/plugins').flush(plugins);
        expect(runs).toHaveBeenCalled();
        expect(envs).toHaveBeenCalled();
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(actions.listingRequested());
        const expected = actions.listingFetched({plugins});
        expect(recorded).toEqual([expected]);
      });
      it('ignores the action when loadState is loading', () => {
        store.setState(
          createState(createPluginsState({loaded: {state: LoadedCode.LOADING}}))
        );
        const plugins: Plugins = {core: createPluginInfo('Core')};
        action.next(onAction);
        http.expectNone('data/plugins');
        action.next(onAction);
        http.expectNone('data/plugins');
        expect(dispatch).not.toHaveBeenCalled();
        store.setState(
          createState(createPluginsState({loaded: {state: LoadedCode.FAILED}}))
        );
        action.next(onAction);
        http.expectOne('data/plugins').flush(plugins);
        const e = actions.listingFetched({plugins});
        expect(recorded).toEqual([e]);
        store.setState(
          createState(createPluginsState({loaded: {state: LoadedCode.LOADING}}))
        );
        action.next(onAction);
        http.expectNone('data/plugins');
      });
    });
  });
});
