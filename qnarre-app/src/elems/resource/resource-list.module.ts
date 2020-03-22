import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {ResourceListComponent} from './resource-list.component';
import {ResourceService} from './resource.service';
import {WithElem} from '../registry';

@NgModule({
  imports: [CommonModule],
  declarations: [ResourceListComponent],
  entryComponents: [ResourceListComponent],
  providers: [ResourceService]
})
export class ResourceListModule implements WithElem {
  elemComp: Type<any> = ResourceListComponent;
}
