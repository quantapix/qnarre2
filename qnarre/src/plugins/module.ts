import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';

import {Effects} from './effects';
import {reducers} from './reducers';
import {PLUGINS_KEY} from '../app/types';
import {PluginsCont} from './plugins';
import {PluginsComp} from './component';

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
