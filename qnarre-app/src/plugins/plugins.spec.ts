import {PluginInfo, PluginsState, State, PLUGINS_KEY} from './types';

export function createPluginInfo(name: string): PluginInfo {
  return {
    enabled: true,
    tabName: name,
    removeDom: false,
    disableReload: false
  };
}

export function createPluginsState(
  override?: Partial<PluginsState>
): PluginsState {
  return {
    plugins: {},
    loaded: {},
    reloadPeriod: 30000,
    reloadEnabled: true,
    ...override
  };
}

export function createState(state: PluginsState): State {
  return {[PLUGINS_KEY]: state};
}
