import {Action, createReducer, on} from '@ngrx/store';
import {LoadedCode, PluginsState} from './types';
import * as actions from './actions';

const init = {
  plugins: {},
  loaded: {},
  reloadEnabled: true,
  reloadPeriod: 30000
} as PluginsState;

const reducer = createReducer(
  init,
  on(actions.changed, (s: PluginsState, {plugin}) => {
    return {...s, active: plugin};
  }),
  on(actions.listingRequested, (s: PluginsState) => {
    return {
      ...s,
      loaded: {
        ...s.loaded,
        state: LoadedCode.LOADING
      }
    };
  }),
  on(actions.listingFetched, (s: PluginsState, {plugins}) => {
    const [first] = Object.keys(plugins);
    const active = s.active ?? first;
    return {
      ...s,
      active,
      plugins,
      loaded: {
        state: LoadedCode.LOADED,
        timeLast: Date.now()
      }
    };
  }),
  on(actions.fetchFailed, (s: PluginsState) => {
    return {
      ...s,
      loaded: {
        ...s.loaded,
        state: LoadedCode.FAILED
      }
    };
  }),
  on(actions.toggleEnabled, (s: PluginsState) => {
    return {
      ...s,
      reloadEnabled: !s.reloadEnabled
    };
  }),
  on(actions.changePeriod, (s: PluginsState, {period}) => {
    const reloadPeriod = period > 0 ? period : s.reloadPeriod;
    return {
      ...s,
      reloadPeriod
    };
  })
);

export function reducers(s: PluginsState, a: Action) {
  return reducer(s, a);
}
