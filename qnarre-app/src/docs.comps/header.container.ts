import {Component} from '@angular/core';
import {Store, select, createSelector} from '@ngrx/store';

import {getActive, getPlugins} from '../plugins/selectors';
import {changed} from '../plugins/actions';

import {PluginId, Plugin, State} from '../app/types';

const getAll = createSelector(getPlugins, (ps): Plugin[] =>
  Object.keys(ps).map(key => Object.assign({}, {id: key}, ps[key]))
);

const getDisableds = createSelector(getAll, (ps): Plugin[] =>
  ps.filter(p => !p.enabled)
);

@Component({
  selector: 'qnr-header',
  template: `
    <qnr-header-component
      [actives]="plugins$ | async"
      [disableds]="disableds$ | async"
      [selected]="active$ | async"
      (onPluginSelectionChanged)="onPluginSelectionChange($event)"
    ></qnr-header-component>
  `
})
export class HeaderContainer {
  readonly active$ = this.store.pipe(select(getActive));
  readonly plugins$ = this.store.pipe(select(getAll));
  readonly disableds$ = this.store.pipe(select(getDisableds));

  constructor(private readonly store: Store<State>) {}

  onPluginSelectionChange(id: PluginId) {
    this.store.dispatch(changed({plugin: id}));
  }
}
