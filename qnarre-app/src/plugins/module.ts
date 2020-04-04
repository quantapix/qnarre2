import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';

import {Effects} from '../app/effects';
import {reducers} from '../app/reducers';
import {PLUGINS_KEY} from '../app/types';
import {PluginsCont} from './plugins';
import {PluginsComp} from './comp';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(PLUGINS_KEY, reducers),
    EffectsModule.forFeature([Effects])
  ],
  declarations: [PluginsCont, PluginsComp],
  exports: [PluginsCont]
})
export class PluginsModule {}
