import {InjectionToken, Type} from '@angular/core';
import {LoadChildrenCallback} from '@angular/router';

export interface WithElem {
  elemComp: Type<any>;
}

export const LOAD_CBS = new Map<string, LoadChildrenCallback>();

export const LOAD_CBS_TOKEN = new InjectionToken<
  Map<string, LoadChildrenCallback>
>('qnr/elements-map');

export const LOAD_CBS_AS_ROUTES = [
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

LOAD_CBS_AS_ROUTES.forEach(r => LOAD_CBS.set(r.selector, r.loadChildren));
