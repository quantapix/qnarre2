import {NgModule} from '@angular/core';
import {ROUTES} from '@angular/router';

import {ElementsLoader} from './loader';
import {ElementComponent} from './elems.component';
import {
  LOAD_CALLBACKS,
  LOAD_CALLBACKS_TOKEN,
  LOAD_CALLBACKS_AS_ROUTES
} from './registry';
import {GraphMinimapComponent} from './graph-minimap/graph-minimap.component';

@NgModule({
  declarations: [ElementComponent, GraphMinimapComponent],
  exports: [ElementComponent],
  providers: [
    ElementsLoader,
    {
      provide: LOAD_CALLBACKS_TOKEN,
      useValue: LOAD_CALLBACKS
    },
    // Providing these routes as a signal to the build system that these modules should be
    // registered as lazy-loadable.
    {
      provide: ROUTES,
      useValue: LOAD_CALLBACKS_AS_ROUTES,
      multi: true
    }
  ]
})
export class ElementsModule {}
