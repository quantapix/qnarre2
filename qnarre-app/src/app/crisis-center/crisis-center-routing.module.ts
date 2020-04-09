import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';

import {CrisisCenterHomeComponent} from './crisis-center-home/crisis-center-home.component';
import {CrisisListComponent} from './crisis-list/crisis-list.component';
import {CrisisCenterComponent} from './crisis-center/crisis-center.component';
import {CrisisDetailComponent} from './crisis-detail/crisis-detail.component';

import {GuardService} from '../guard.serv';
import {CrisisDetailResolverService} from './crisis-detail-resolver.service';

const routes: Routes = [
  {
    path: '',
    component: CrisisCenterComponent,
    children: [
      {
        path: '',
        component: CrisisListComponent,
        children: [
          {
            path: ':id',
            component: CrisisDetailComponent,
            canDeactivate: [GuardService],
            resolve: {
              crisis: CrisisDetailResolverService
            }
          },
          {
            path: '',
            component: CrisisCenterHomeComponent
          }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CrisisCenterRoutingModule {}
