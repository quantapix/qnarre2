import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {ComposeMessageComponent} from './compose-message/compose-message.component';
import {PageNotFoundComponent} from './page-not-found/page-not-found.component';

import {AuthGuard} from './auth/auth.guard';
import {PreloadService} from './preloading-strategy.service';

const routes: Routes = [
  {
    path: 'compose',
    component: ComposeMessageComponent,
    outlet: 'popup'
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
    canLoad: [AuthGuard]
  },
  {
    path: 'crisis-center',
    loadChildren: () =>
      import('./crisis-center/crisis-center.module').then(
        m => m.CrisisCenterModule
      ),
    data: {preload: true}
  },
  {path: '', redirectTo: '/superheroes', pathMatch: 'full'},
  {path: '**', component: PageNotFoundComponent}
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadService,
      enableTracing: false
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
