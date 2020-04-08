import {InjectionToken} from '@angular/core';

export const DateToken = new InjectionToken('CurrentDate');
export const WindowToken = new InjectionToken<Window>('Window');

export enum LoadingCode {
  COMPONENT = 'COMPONENT',
  ELEMENT = 'ELEMENT',
  IFRAME = 'IFRAME'
}

export interface ComponentLoading {
  type: LoadingCode.COMPONENT;
}

export interface ElementLoading {
  type: LoadingCode.ELEMENT;
  name: string;
}

export interface IframeLoading {
  type: LoadingCode.IFRAME;
  path: string;
}

export interface PluginInfo {
  enabled: boolean;
  loading?: ComponentLoading | ElementLoading | IframeLoading;
  tabName: string;
  removeDom: boolean;
  disableReload: boolean;
}

export type PluginId = string;
export type Plugins = {
  [id: string]: PluginInfo;
};

export interface Plugin extends PluginInfo {
  id: PluginId;
}

export enum LoadedCode {
  LOADING,
  LOADED,
  FAILED
}

export interface LoadedState {
  state?: LoadedCode;
  timeLast?: number;
}

export interface PluginsState {
  active?: PluginId;
  plugins: Plugins;
  loaded: LoadedState;
  reloadEnabled: boolean;
  reloadPeriod: number;
}

export const PLUGINS_KEY = 'plugins';

export interface State {
  [PLUGINS_KEY]?: PluginsState;
}
