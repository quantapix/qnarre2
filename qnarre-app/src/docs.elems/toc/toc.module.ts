import {NgModule, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';

import {WithElem} from '../../app/registry';
import {TocComp} from './toc.comp';

@NgModule({
  imports: [CommonModule, MatIconModule],
  declarations: [TocComp],
  entryComponents: [TocComp]
})
export class TocModule implements WithElem {
  elemComp: Type<any> = TocComp;
}
