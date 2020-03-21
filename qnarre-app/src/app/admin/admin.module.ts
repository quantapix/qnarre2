import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {AdminRoutingModule} from './admin-routing.module';

import {AdminComponent} from './admin/admin.component';
import {AdminDashboardComponent} from './admin-dashboard/admin-dashboard.component';
import {ManageCrisisComponent} from './manage-crisis/manage-crisis.component';
import {ManageHeroesComponent} from './manage-heroes/manage-heroes.component';

@NgModule({
  imports: [CommonModule, AdminRoutingModule],
  declarations: [
    AdminComponent,
    AdminDashboardComponent,
    ManageCrisisComponent,
    ManageHeroesComponent
  ]
})
export class AdminModule {}
