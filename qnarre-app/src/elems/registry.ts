import {InjectionToken, Type} from '@angular/core';
import {LoadChildrenCallback} from '@angular/router';

export interface WithElement {
  customElementComponent: Type<any>;
}

export const LOAD_CALLBACKS = new Map<string, LoadChildrenCallback>();

export const LOAD_CALLBACKS_TOKEN = new InjectionToken<
  Map<string, LoadChildrenCallback>
>('qnr/elements-map');

export const LOAD_CALLBACKS_AS_ROUTES = [
  {
    selector: 'qnr-resource-list',
    loadChildren: () =>
      import('./resource/resource-list.module').then(m => m.ResourceListModule)
  },
  {
    selector: 'qnr-code-example',
    loadChildren: () =>
      import('./code/example.module').then(m => m.ExampleModule)
  },
  {
    selector: 'qnr-code-tabs',
    loadChildren: () => import('./code/tabs.module').then(m => m.TabsModule)
  }
];

LOAD_CALLBACKS_AS_ROUTES.forEach(r => {
  LOAD_CALLBACKS.set(r.selector, r.loadChildren);
});
