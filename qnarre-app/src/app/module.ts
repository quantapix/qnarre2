import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {Router} from '@angular/router';

import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
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

import {DataService} from '../graph/data.service';
import {SceneServ} from '../graph/scene.serv';

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
  providers: [DataService, SceneServ],
  bootstrap: [AppComp]
})
export class AppModule {
  constructor(_: Router) {
    // Use a custom replacer to display function names in the route configs
    // const replacer = (key, value) => (typeof value === 'function') ? value.name : value;
    // console.log('Routes: ', JSON.stringify(router.config, replacer, 2));
  }
}
