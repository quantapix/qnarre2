import {createAction, props} from '@ngrx/store';

import {PluginId, Plugins} from '../app/types';

export const changed = createAction(
  '[Plugins] Changed',
  props<{plugin: PluginId}>()
);

export const loaded = createAction('[Plugins] Loaded');

export const reload = createAction('[Plugins] Reload');

export const listingRequested = createAction('[Plugins] Listing Requested');

export const listingFetched = createAction(
  '[Plugins] Listing Fetched',
  props<{plugins: Plugins}>()
);
export const fetchFailed = createAction('[Plugins] Fetch Failed');

export const toggleEnabled = createAction('[Plugins] Reload Enable Toggled');

export const changePeriod = createAction(
  '[Plugins] Reload Period Changed',
  props<{period: number}>()
);
