import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WithElem} from '../../app/registry';
import {ServicesModule} from '../../services/services.module';
import {NotFoundComp} from './not-found.comp';

@NgModule({
  imports: [CommonModule, ServicesModule],
  declarations: [NotFoundComp],
  entryComponents: [NotFoundComp]
})
export class NotFoundModule implements WithElem {
  elemComp: Type<any> = NotFoundComp;
}
