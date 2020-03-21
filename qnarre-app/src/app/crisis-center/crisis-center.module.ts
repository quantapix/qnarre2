import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

import {CrisisCenterRoutingModule} from './crisis-center-routing.module';

import {CrisisCenterComponent} from './crisis-center/crisis-center.component';
import {CrisisCenterHomeComponent} from './crisis-center-home/crisis-center-home.component';
import {CrisisDetailComponent} from './crisis-detail/crisis-detail.component';
import {CrisisListComponent} from './crisis-list/crisis-list.component';

@NgModule({
  declarations: [
    CrisisCenterComponent,
    CrisisCenterHomeComponent,
    CrisisDetailComponent,
    CrisisListComponent
  ],
  imports: [CommonModule, FormsModule, CrisisCenterRoutingModule]
})
export class CrisisCenterModule {}
