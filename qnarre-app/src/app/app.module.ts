import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';

import {Router} from '@angular/router';

import {AppComponent} from './app.component';
import {PageNotFoundComponent} from './page-not-found/page-not-found.component';
import {ComposeMessageComponent} from './compose-message/compose-message.component';

import {AppRoutingModule} from './app-routing.module';

import {AuthModule} from './auth/auth.module';
import {HeroesModule} from './heroes/heroes.module';

import {GraphComponent} from '../graph/graph.component';
import {LinkComponent} from '../graph/link.component';
import {NodeComponent} from '../graph/node.component';

import {DraggableDirective} from '../graph/draggable.directive';
import {ZoomableDirective} from '../graph/zoomable.directive';

import {DataService} from '../graph/data.service';
import {SceneService} from '../graph/scene.service';

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HeroesModule,
    HttpClientModule,
    AuthModule,
    AppRoutingModule
  ],
  declarations: [
    AppComponent,
    ComposeMessageComponent,
    GraphComponent,
    LinkComponent,
    NodeComponent,
    DraggableDirective,
    ZoomableDirective,
    PageNotFoundComponent
  ],
  providers: [DataService, SceneService],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(_: Router) {
    // Use a custom replacer to display function names in the route configs
    // const replacer = (key, value) => (typeof value === 'function') ? value.name : value;
    // console.log('Routes: ', JSON.stringify(router.config, replacer, 2));
  }
}
