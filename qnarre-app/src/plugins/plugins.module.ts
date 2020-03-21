import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';

import {Effects} from './effects';
import {reducers} from './reducers';
import {PLUGINS_KEY} from './types';
import {PluginsContainer} from './plugins.container';
import {PluginsComponent} from './plugins.component';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(PLUGINS_KEY, reducers),
    EffectsModule.forFeature([Effects])
  ],
  declarations: [PluginsContainer, PluginsComponent],
  exports: [PluginsContainer]
})
export class PluginsModule {}
