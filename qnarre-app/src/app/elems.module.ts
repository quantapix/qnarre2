import {NgModule} from '@angular/core';
import {ROUTES} from '@angular/router';

import {ElemsLoader} from './loader';
import {ElemsComp} from './elems.comp';
import {LOAD_CBS, LOAD_CBS_TOKEN, LOAD_CBS_AS_ROUTES} from './registry';
import {MinimapComponent} from '../docs.elems/graph.comps/minimap.comp';

@NgModule({
  declarations: [ElemsComp, MinimapComponent],
  exports: [ElemsComp],
  providers: [
    ElemsLoader,
    {
      provide: LOAD_CBS_TOKEN,
      useValue: LOAD_CBS
    },
    // Providing these routes as a signal to the build system that these modules should be
    // registered as lazy-loadable.
    {
      provide: ROUTES,
      useValue: LOAD_CBS_AS_ROUTES,
      multi: true
    }
  ]
})
export class ElemsModule {}
