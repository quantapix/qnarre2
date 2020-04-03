import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store, select, createSelector} from '@ngrx/store';

import {getPlugins, getActive, getLoadeds} from './selectors';
import {PluginInfo} from './types';
import {LoadedState, State} from './types';

export interface Plugin extends PluginInfo {
  id: string;
}

const active = createSelector(getPlugins, getActive, (plugins, id):
  | Plugin
  | undefined => {
  if (!id || !plugins) return undefined;
  return Object.assign({id}, plugins[id]);
});

const timeLast = createSelector(getLoadeds, (s: LoadedState) => {
  return s.timeLast;
});

@Component({
  selector: 'qnr-plugins',
  template: `
    <qnr-plugins-component
      [activePlugin]="active$ | async"
      [lastUpdated]="timeLast$ | async"
    ></qnr-plugins-component>
  `,
  styles: ['qnr-plugins-component { height: 100%; }'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PluginsCont {
  readonly active$ = this.store.pipe(select(active));
  readonly timeLast$ = this.store.pipe(select(timeLast));
  constructor(private readonly store: Store<State>) {}
}
