import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {NgModule, ErrorHandler} from '@angular/core';
import {LoadChildrenCallback, ROUTES, Router} from '@angular/router';
import {
  Location,
  LocationStrategy,
  PathLocationStrategy
} from '@angular/common';

import {MatButtonModule} from '@angular/material/button';
import {MatIconModule, MatIconRegistry} from '@angular/material/icon';
import {MatListModule} from '@angular/material/list';

import {AppComp, PageNotFoundComp} from './component';
import {NavItemComp, NavMenuComp} from './nav';
import {TopMenuComp} from './top';
import {FooterComp} from './footer';
import {ElemComp} from './elem';
//import {MinimapComp} from './minimap';

//import {ComposeMessageComp} from './compose-message/compose-message.comp';

import {AppRoutingModule} from './routing.module';

import {AppComp as GraphAppComp} from '../graph.app/comp';

//import {AuthModule} from './auth/auth.module';
//import {HeroesModule} from './heroes/heroes.module';

//import {GraphComp} from '../graph/graph.comp';
//import {LinkComp} from '../graph/link.comp';
//import {NodeComp} from '../graph/node.comp';

//import {DraggableDirective} from '../graph/draggable.comp';
//import {ZoomableDirective} from '../graph/zoomable.comp';

import {DeployService} from './deploy.serv';
import {ElemService, CBS_TOKEN} from './elem.serv';
import {GaService} from './ga.serv';
import {LocService} from './loc.serv';
import {LogService} from './log.serv';
import {MessageService} from './message.serv';
import {NavService} from './nav.serv';
import {PreloadService} from './preload.serv';
import {UpdatesService} from './updates.serv';

import {DataService} from '../graph/data.service';
import {SceneServ} from '../graph/scene.serv';

import {DateToken, WindowToken} from './types';

function dateProvider() {
  return new Date();
}
function windowProvider() {
  return window;
}

const CBS_ROUTES = [
  {
    selector: 'qnr-resource-list',
    loadChildren: () =>
      import('../docs.comps/resource').then(m => m.ResourceListModule)
  },
  {
    selector: 'qnr-code-example',
    loadChildren: () =>
      import('../docs.comps/code/example').then(m => m.ExampleModule)
  },
  {
    selector: 'qnr-code-tabs',
    loadChildren: () =>
      import('../docs.comps/code/tabs').then(m => m.TabsModule)
  }
];

const CBS = new Map<string, LoadChildrenCallback>();
CBS_ROUTES.forEach(r => CBS.set(r.selector, r.loadChildren));

@NgModule({
  declarations: [
    AppComp,
    GraphAppComp,
    NavItemComp,
    NavMenuComp,
    TopMenuComp,
    FooterComp,
    ElemComp,
    //ComposeMessageComp,
    //GraphComp,
    //LinkComp,
    //NodeComp,
    //DraggableDir,
    //ZoomableDir,
    PageNotFoundComp
  ],
  imports: [
    AppRoutingModule,
    //AuthModule,
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    //HeroesModule,
    HttpClientModule,
    MatButtonModule,
    MatIconModule,
    MatListModule
  ],
  exports: [NavItemComp, NavMenuComp, TopMenuComp, FooterComp, ElemComp],
  providers: [
    DataService,
    DeployService,
    ElemService,
    ErrorHandler,
    GaService,
    Location,
    LocService,
    LogService,
    MessageService,
    NavService,
    PreloadService,
    SceneServ,
    UpdatesService,
    ScrollService,
    ScrollSpyService,
    SearchService,
    svgIconProviders,
    TocService,
    {provide: LocationStrategy, useClass: PathLocationStrategy},
    {provide: MatIconRegistry, useClass: CustomIconRegistry},
    {provide: DateToken, useFactory: dateProvider},
    {provide: WindowToken, useFactory: windowProvider},
    {
      provide: CBS_TOKEN,
      useValue: CBS
    },
    {
      provide: ROUTES,
      useValue: CBS_ROUTES,
      multi: true
    }
  ],
  bootstrap: [AppComp]
})
export class AppModule {
  constructor(_: Router) {
    // Use a custom replacer to display function names in the route configs
    // const replacer = (key, value) => (typeof value === 'function') ? value.name : value;
    // console.log('Routes: ', JSON.stringify(router.config, replacer, 2));
  }
}
