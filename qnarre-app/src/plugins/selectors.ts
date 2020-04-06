import {createSelector as create, createFeatureSelector} from '@ngrx/store';

import {State, PLUGINS_KEY, PluginsState as PS} from '../app/types';

const s = createFeatureSelector<State, PS>(PLUGINS_KEY);

export const getActive = create(s, (ps: PS) => ps.active);

export const getPlugins = create(s, (ps: PS) => ps.plugins);

export const getLoadeds = create(s, (ps: PS) => ps.loaded);

export const getReloadEnabled = create(s, (ps: PS) => ps.reloadEnabled);

export const getReloadPeriods = create(s, (ps: PS) => ps.reloadPeriod);
